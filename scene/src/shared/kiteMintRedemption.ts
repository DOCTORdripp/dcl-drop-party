import type { BalloonProfile } from "./balloonProfile";
import { getKitePerk, isKitePerkId, type KitePerkDefinition, type KitePerkId } from "./kitePerks";

export const KITE_REDEMPTION_LEDGER_VERSION = 1;
export const KITE_REDEMPTION_SCENE_PREFIX = "kiteMintRedemption_";

export type KiteMintTxStatus = "PENDING" | "SUBMITTED" | "CONFIRMED" | "FAILED";

export type KiteRedemptionEntry = {
  kiteId: KitePerkId;
  /** Idempotency key for one mint attempt, not a lifetime wallet+kite claim. */
  attemptId: string;
  status: KiteMintTxStatus;
  txHash: string;
  cost: number;
  bpReserved: boolean;
  lastError: string;
  updatedAt: number;
};

export type KiteRedemptionLedger = Partial<Record<KitePerkId, KiteRedemptionEntry>>;

export type KiteMintEligibility =
  | { ok: true; kite: KitePerkDefinition }
  | {
      ok: false;
      result:
        | "UNKNOWN_KITE"
        | "UNAVAILABLE"
        | "LEVEL_LOCKED"
        | "INSUFFICIENT_POINTS"
        | "ALREADY_CLAIMED"
        | "ALLOWANCE_EXHAUSTED"
        | "SUPPLY_EXHAUSTED"
        | "MINTING_DISABLED";
    };

export type KiteMintActionLabel =
  | "LOCKED"
  | "NOT ENOUGH BP"
  | "MINT"
  | "CLICK HERE TO CONFIRM"
  | "TAP HERE TO CONFIRM"
  | "MINTING..."
  | "MINTED"
  | "TRY AGAIN"
  | "SOLD OUT"
  | "MINT NOW"
  | "MINTING DISABLED"
  | "MINTER ALLOWANCE EXHAUSTED"
  | "MINT SERVER NOT CONFIGURED";

export function kiteRedemptionSceneKey(wallet: string): string {
  return `${KITE_REDEMPTION_SCENE_PREFIX}${wallet.trim().toLowerCase()}`;
}

export function emptyKiteRedemptionLedger(): KiteRedemptionLedger {
  return {};
}

function readStatus(value: unknown): KiteMintTxStatus | undefined {
  if (value === "PENDING" || value === "SUBMITTED" || value === "CONFIRMED" || value === "FAILED") {
    return value;
  }
  return undefined;
}

export function parseKiteRedemptionLedger(raw: unknown): KiteRedemptionLedger {
  const ledger = emptyKiteRedemptionLedger();
  if (!raw || typeof raw !== "object") {
    return ledger;
  }
  const row = raw as Record<string, unknown>;
  const entries =
    row.entries && typeof row.entries === "object" ? (row.entries as Record<string, unknown>) : row;
  for (const [key, value] of Object.entries(entries)) {
    if (!isKitePerkId(key) || !value || typeof value !== "object") {
      continue;
    }
    const entry = value as Record<string, unknown>;
    const status = readStatus(entry.status);
    if (!status) {
      continue;
    }
    const cost = typeof entry.cost === "number" ? entry.cost : Number(entry.cost);
    ledger[key] = {
      kiteId: key,
      attemptId: typeof entry.attemptId === "string" ? entry.attemptId : "",
      status,
      txHash: typeof entry.txHash === "string" ? entry.txHash : "",
      cost: Number.isInteger(cost) && cost >= 0 ? cost : 0,
      bpReserved: entry.bpReserved === true,
      lastError: typeof entry.lastError === "string" ? entry.lastError : "",
      updatedAt: typeof entry.updatedAt === "number" ? entry.updatedAt : 0,
    };
  }
  return ledger;
}

export function encodeKiteRedemptionLedger(ledger: KiteRedemptionLedger): {
  version: typeof KITE_REDEMPTION_LEDGER_VERSION;
  entries: KiteRedemptionLedger;
} {
  return {
    version: KITE_REDEMPTION_LEDGER_VERSION,
    entries: { ...ledger },
  };
}

export function kiteMintAttemptNeedsNewIntent(entry: KiteRedemptionEntry | undefined): boolean {
  if (!entry) {
    return true;
  }
  if (entry.status === "CONFIRMED" || entry.status === "FAILED") {
    return true;
  }
  return entry.status === "PENDING" && !entry.txHash && !entry.bpReserved;
}

export function sanitizeKiteMintClientError(error: string): string {
  return error
    .replace(/0x[a-fA-F0-9]{64}/g, "[redacted]")
    .replace(/https?:\/\/\S+/gi, "[rpc]")
    .replace(/\b[a-fA-F0-9]{64}\b/g, "[redacted]")
    .slice(0, 140);
}

export function kiteMintRetrySafe(entry: KiteRedemptionEntry | undefined): boolean {
  if (!entry) {
    return true;
  }
  if (entry.status === "SUBMITTED") {
    return false;
  }
  if (entry.status === "PENDING" && entry.txHash) {
    return false;
  }
  return true;
}

export function evaluateKiteMintEligibility(
  profile: Pick<BalloonProfile, "level" | "balloonPoints">,
  kiteId: string,
  entry: KiteRedemptionEntry | undefined,
): KiteMintEligibility {
  if (!isKitePerkId(kiteId)) {
    return { ok: false, result: "UNKNOWN_KITE" };
  }
  const kite = getKitePerk(kiteId);
  if (!kite.sceneMintable) {
    return { ok: false, result: "UNAVAILABLE" };
  }
  if (profile.level < kite.mintRequiredLevel) {
    return { ok: false, result: "LEVEL_LOCKED" };
  }
  const reserved = Boolean(entry?.bpReserved && entry.status !== "CONFIRMED");
  const availablePoints = reserved && entry ? profile.balloonPoints + entry.cost : profile.balloonPoints;
  if (availablePoints < kite.balloonPointCost) {
    return { ok: false, result: "INSUFFICIENT_POINTS" };
  }
  return { ok: true, kite };
}

export function kiteMintConfirmLabel(mobile = false): "CLICK HERE TO CONFIRM" | "TAP HERE TO CONFIRM" {
  return mobile ? "TAP HERE TO CONFIRM" : "CLICK HERE TO CONFIRM";
}

export function isKiteMintConfirmAction(action: KiteMintActionLabel): boolean {
  return action === "CLICK HERE TO CONFIRM" || action === "TAP HERE TO CONFIRM";
}

export function formatKiteMintAction(args: {
  kite: Pick<KitePerkDefinition, "sceneMintable" | "mintRequiredLevel" | "balloonPointCost">;
  playerLevel: number;
  balloonPoints: number;
  soldOut?: boolean;
  entry?: KiteRedemptionEntry;
  busy?: boolean;
  justMinted?: boolean;
  justFailed?: boolean;
  confirmPending?: boolean;
  mobile?: boolean;
  lastResult?: string;
}): KiteMintActionLabel {
  if (!args.kite.sceneMintable) {
    if (args.soldOut) {
      return "SOLD OUT";
    }
    return "MINT NOW";
  }
  if (args.justMinted) {
    return "MINTED";
  }
  if (args.soldOut || args.lastResult === "SUPPLY_EXHAUSTED") {
    return "SOLD OUT";
  }
  if (args.lastResult === "MINTING_DISABLED") {
    return "MINTING DISABLED";
  }
  if (args.lastResult === "ALLOWANCE_EXHAUSTED") {
    return "MINTER ALLOWANCE EXHAUSTED";
  }
  if (args.lastResult === "NOT_CONFIGURED") {
    return "MINT SERVER NOT CONFIGURED";
  }
  if (args.busy || args.entry?.status === "SUBMITTED" || (args.entry?.status === "PENDING" && Boolean(args.entry.txHash))) {
    return "MINTING...";
  }
  if (args.playerLevel < args.kite.mintRequiredLevel) {
    return "LOCKED";
  }
  if (args.justFailed) {
    return args.confirmPending ? kiteMintConfirmLabel(args.mobile) : "TRY AGAIN";
  }
  if (args.balloonPoints < args.kite.balloonPointCost && !args.entry?.bpReserved) {
    return "NOT ENOUGH BP";
  }
  if (args.confirmPending) {
    return kiteMintConfirmLabel(args.mobile);
  }
  return "MINT";
}

export function kiteMintCanStartNewAttempt(action: KiteMintActionLabel): boolean {
  return action === "MINT" || action === "TRY AGAIN" || isKiteMintConfirmAction(action);
}

/** Join hydrates one peer. Confirmed mints and stock inspects broadcast the room. */
export function kiteMintStockBroadcastScope(event: "join" | "inspect" | "confirmed"): "peer" | "room" {
  return event === "join" ? "peer" : "room";
}
