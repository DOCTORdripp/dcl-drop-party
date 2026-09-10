import { decodeUtf8 } from "@dcl/sdk/internal/utf8";
import { hmacSha256Hex } from "./cryptoLite";

export const NETWORK_ADMISSION_VERSION = 1;
export const NETWORK_ADMISSION_WORLD = "dropparty.dcl.eth";
export const NETWORK_ADMISSION_TOKEN_TTL_MS = 60_000;
export const NETWORK_ADMISSION_CLOCK_SKEW_MS = 10_000;
export const MAX_REWARD_PLAYERS_PER_NETWORK = 2;

export type AdmissionResultReason =
  | "ADMITTED"
  | "NETWORK_LIMIT_REACHED"
  | "INVALID_TOKEN"
  | "TOKEN_EXPIRED"
  | "TOKEN_REPLAY"
  | "WALLET_MISMATCH"
  | "WRONG_WORLD"
  | "ADMISSION_UNAVAILABLE"
  | "PLAYER_NOT_READY";

export type NetworkAdmissionPayload = {
  version: number;
  wallet: string;
  networkHash: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
  world: string;
};

export type WalletAdmission = {
  networkHash: string;
  nonce: string;
  admittedAt: number;
};

type VerificationResult =
  | { ok: true; payload: NetworkAdmissionPayload }
  | { ok: false; reason: AdmissionResultReason };

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error("Malformed hex");
  }
  const out = new Uint8Array(hex.length / 2);
  for (let index = 0; index < out.length; index++) {
    out[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return out;
}

function signaturesEqual(expected: string, supplied: string): boolean {
  if (expected.length !== supplied.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index++) {
    difference |= expected.charCodeAt(index) ^ supplied.charCodeAt(index);
  }
  return difference === 0;
}

function isCanonicalWallet(wallet: unknown): wallet is string {
  return typeof wallet === "string" && /^0x[0-9a-f]{40}$/.test(wallet);
}

function parsePayload(payloadHex: string): NetworkAdmissionPayload | null {
  try {
    const parsed = JSON.parse(decodeUtf8(hexToBytes(payloadHex), { fatal: true })) as Record<
      string,
      unknown
    >;
    if (
      parsed.version !== NETWORK_ADMISSION_VERSION ||
      !isCanonicalWallet(parsed.wallet) ||
      typeof parsed.networkHash !== "string" ||
      !/^[0-9a-f]{64}$/.test(parsed.networkHash) ||
      !Number.isSafeInteger(parsed.issuedAt) ||
      !Number.isSafeInteger(parsed.expiresAt) ||
      typeof parsed.nonce !== "string" ||
      !/^[0-9a-f]{64}$/.test(parsed.nonce) ||
      typeof parsed.world !== "string"
    ) {
      return null;
    }
    return parsed as NetworkAdmissionPayload;
  } catch {
    return null;
  }
}

export function verifyNetworkAdmissionToken(args: {
  token: string;
  expectedWallet: string;
  signingSecrets: readonly string[];
  now?: number;
}): VerificationResult {
  const now = args.now ?? Date.now();
  const secrets = args.signingSecrets.filter((secret) => secret.length >= 32);
  if (secrets.length === 0) {
    return { ok: false, reason: "ADMISSION_UNAVAILABLE" };
  }
  if (args.token.length === 0 || args.token.length > 2048) {
    return { ok: false, reason: "INVALID_TOKEN" };
  }
  const parts = args.token.split(".");
  if (parts.length !== 2) {
    return { ok: false, reason: "INVALID_TOKEN" };
  }
  const [payloadHex, suppliedSignature] = parts as [string, string];
  if (!/^[0-9a-f]+$/.test(payloadHex) || !/^[0-9a-f]{64}$/.test(suppliedSignature)) {
    return { ok: false, reason: "INVALID_TOKEN" };
  }
  const signatureValid = secrets.some((secret) =>
    signaturesEqual(
      hmacSha256Hex(secret, `network-admission|${payloadHex}`),
      suppliedSignature,
    ),
  );
  if (!signatureValid) {
    return { ok: false, reason: "INVALID_TOKEN" };
  }
  const payload = parsePayload(payloadHex);
  if (!payload) {
    return { ok: false, reason: "INVALID_TOKEN" };
  }
  if (payload.world.toLowerCase() !== NETWORK_ADMISSION_WORLD) {
    return { ok: false, reason: "WRONG_WORLD" };
  }
  if (payload.wallet !== args.expectedWallet.toLowerCase()) {
    return { ok: false, reason: "WALLET_MISMATCH" };
  }
  if (
    payload.expiresAt <= payload.issuedAt ||
    payload.expiresAt - payload.issuedAt !== NETWORK_ADMISSION_TOKEN_TTL_MS ||
    payload.issuedAt > now + NETWORK_ADMISSION_CLOCK_SKEW_MS
  ) {
    return { ok: false, reason: "INVALID_TOKEN" };
  }
  if (now >= payload.expiresAt) {
    return { ok: false, reason: "TOKEN_EXPIRED" };
  }
  return { ok: true, payload };
}

/**
 * Authoritative per-scene-instance admission state.
 * Scene-version overlap intentionally does not share these counts.
 */
export class NetworkAdmissionRegistry {
  private readonly walletAdmission = new Map<string, WalletAdmission>();
  private readonly activeNetworkWallets = new Map<string, Set<string>>();
  private readonly usedAdmissionNonces = new Map<
    string,
    {
      expiresAt: number;
      wallet: string;
      networkHash: string;
      result: "ADMITTED" | "NETWORK_LIMIT_REACHED";
    }
  >();

  admit(payload: NetworkAdmissionPayload, now = Date.now()): AdmissionResultReason {
    this.pruneNonces(now);
    const wallet = payload.wallet.toLowerCase();
    const existing = this.walletAdmission.get(wallet);
    if (existing) {
      if (existing.networkHash !== payload.networkHash) {
        return "INVALID_TOKEN";
      }
      return "ADMITTED";
    }
    const used = this.usedAdmissionNonces.get(payload.nonce);
    if (used) {
      if (used.wallet === wallet && used.networkHash === payload.networkHash) {
        return used.result;
      }
      return "TOKEN_REPLAY";
    }
    const active = this.activeNetworkWallets.get(payload.networkHash) ?? new Set<string>();
    if (active.size >= MAX_REWARD_PLAYERS_PER_NETWORK) {
      this.usedAdmissionNonces.set(payload.nonce, {
        expiresAt: payload.expiresAt,
        wallet,
        networkHash: payload.networkHash,
        result: "NETWORK_LIMIT_REACHED",
      });
      return "NETWORK_LIMIT_REACHED";
    }
    active.add(wallet);
    this.activeNetworkWallets.set(payload.networkHash, active);
    this.walletAdmission.set(wallet, {
      networkHash: payload.networkHash,
      nonce: payload.nonce,
      admittedAt: now,
    });
    this.usedAdmissionNonces.set(payload.nonce, {
      expiresAt: payload.expiresAt,
      wallet,
      networkHash: payload.networkHash,
      result: "ADMITTED",
    });
    return "ADMITTED";
  }

  isAdmitted(wallet: string): boolean {
    return this.walletAdmission.has(wallet.toLowerCase());
  }

  release(wallet: string): boolean {
    const canonical = wallet.toLowerCase();
    const admission = this.walletAdmission.get(canonical);
    if (!admission) return false;
    this.walletAdmission.delete(canonical);
    const active = this.activeNetworkWallets.get(admission.networkHash);
    active?.delete(canonical);
    if (active?.size === 0) {
      this.activeNetworkWallets.delete(admission.networkHash);
    }
    return true;
  }

  retain(activeWallets: readonly string[]): string[] {
    const active = new Set(activeWallets.map((wallet) => wallet.toLowerCase()));
    const released: string[] = [];
    for (const wallet of [...this.walletAdmission.keys()]) {
      if (!active.has(wallet) && this.release(wallet)) {
        released.push(wallet);
      }
    }
    return released;
  }

  networkSize(networkHash: string): number {
    return this.activeNetworkWallets.get(networkHash)?.size ?? 0;
  }

  usedNonceCount(): number {
    return this.usedAdmissionNonces.size;
  }

  private pruneNonces(now: number): void {
    for (const [nonce, use] of this.usedAdmissionNonces) {
      if (now >= use.expiresAt) {
        this.usedAdmissionNonces.delete(nonce);
      }
    }
    const MAX_USED = 256;
    while (this.usedAdmissionNonces.size > MAX_USED) {
      const first = this.usedAdmissionNonces.keys().next().value;
      if (!first) break;
      this.usedAdmissionNonces.delete(first);
    }
  }
}
