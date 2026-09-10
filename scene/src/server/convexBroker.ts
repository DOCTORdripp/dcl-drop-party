import { TRUSTED_FETCH_TIMEOUT_MS } from "../shared/constants";
import { describeFetchFailure } from "../shared/fetchLog";
import { parseWonReveal } from "../shared/prizeReveal";
import { randomHex, signServiceRequest, type RandomSource } from "./cryptoLite";

export type ClaimCandidate = {
  balloonId: string;
  waveId: string;
  spawnGeneration: string;
};

export type ClaimReveal = {
  type: string;
  displayName: string;
  announcementTier?: string;
  dclRarity?: string;
};

export type WorldToastBroadcast = {
  title: string;
  body: string;
  tier: string;
  winnerLabel: string;
};

export type ClaimBrokerResult =
  | {
      result: "WON";
      balloonId: string;
      claimId: string;
      idempotent?: boolean;
      reveal?: ClaimReveal;
      worldToast?: WorldToastBroadcast;
    }
  | { result: "NO_AVAILABLE_BALLOON"; idempotent?: boolean }
  | { result: "RACE_LOST"; idempotent?: boolean }
  | { result: "SESSION_EXPIRED" }
  | { result: "NOT_ELIGIBLE" }
  | { result: "RATE_LIMITED" }
  | { result: "INVALID_INTERACTION" }
  | { result: "NETWORK_ERROR" };

export type TrustedFetchResult = {
  status: number;
  json: unknown;
  endpoint: string;
  error?: string;
};

function readReveal(json: unknown): ClaimReveal | undefined {
  return parseWonReveal(json);
}

export function readWorldToast(json: unknown): WorldToastBroadcast | undefined {
  if (!json || typeof json !== "object") {
    return undefined;
  }
  const row = json as Record<string, unknown>;
  const nested =
    row.worldToast && typeof row.worldToast === "object"
      ? (row.worldToast as Record<string, unknown>)
      : undefined;
  const title =
    (typeof row.worldTitle === "string" && row.worldTitle) ||
    (typeof nested?.title === "string" && nested.title) ||
    "";
  const body =
    (typeof row.worldBody === "string" && row.worldBody) ||
    (typeof nested?.body === "string" && nested.body) ||
    "";
  const tier =
    (typeof row.worldTier === "string" && row.worldTier) ||
    (typeof nested?.tier === "string" && nested.tier) ||
    "";
  const winnerLabel =
    (typeof row.winnerLabel === "string" && row.winnerLabel) ||
    (typeof nested?.winnerLabel === "string" && nested.winnerLabel) ||
    "";
  if (!title || !body) {
    return undefined;
  }
  return { title, body, tier, winnerLabel };
}

export async function trustedPartyTick(args: {
  siteUrl: string;
  secret: string;
  partyId?: string;
  randomBytes: RandomSource;
}): Promise<{ status: number; json: unknown }> {
  return await trustedPost({
    siteUrl: args.siteUrl,
    secret: args.secret,
    path: "/trusted/party/tick",
    body: args.partyId ? { partyId: args.partyId } : {},
    randomBytes: args.randomBytes,
  });
}

export async function trustedPartySnapshot(args: {
  siteUrl: string;
  secret: string;
  partyId?: string;
  randomBytes: RandomSource;
}): Promise<{ status: number; json: unknown }> {
  return await trustedPost({
    siteUrl: args.siteUrl,
    secret: args.secret,
    path: "/trusted/party/snapshot",
    body: args.partyId ? { partyId: args.partyId } : {},
    randomBytes: args.randomBytes,
  });
}

export async function trustedPartyAttendance(args: {
  siteUrl: string;
  secret: string;
  partyId: string;
  phase: "PRECHECK" | "LOCK";
  playerCount: number;
  randomBytes: RandomSource;
}): Promise<{ status: number; json: unknown }> {
  return await trustedPost({
    siteUrl: args.siteUrl,
    secret: args.secret,
    path: "/trusted/party/attendance",
    body: {
      partyId: args.partyId,
      phase: args.phase,
      playerCount: args.playerCount,
    },
    randomBytes: args.randomBytes,
  });
}

export async function trustedActiveDevParty(args: {
  siteUrl: string;
  secret: string;
  randomBytes: RandomSource;
}): Promise<string | null> {
  const fetched = await trustedPost({
    siteUrl: args.siteUrl,
    secret: args.secret,
    path: "/trusted/party/active-dev",
    body: {},
    randomBytes: args.randomBytes,
  });
  if (fetched.json && typeof fetched.json === "object" && "partyId" in fetched.json) {
    const partyId = (fetched.json as { partyId?: string | null }).partyId;
    return typeof partyId === "string" && partyId.length > 0 ? partyId : null;
  }
  return null;
}

function logFetchFailure(args: { endpoint: string; status?: number; error?: unknown }): void {
  console.log("[SERVER] fetch failed", describeFetchFailure(args));
}

export async function trustedPost(args: {
  siteUrl: string;
  secret: string;
  path: string;
  body: unknown;
  randomBytes: RandomSource;
}): Promise<TrustedFetchResult> {
  const endpoint = `${args.siteUrl.replace(/\/$/, "")}${args.path}`;
  const body = JSON.stringify(args.body);
  const timestamp = Date.now();
  const nonce = randomHex(32, args.randomBytes);
  const signature = signServiceRequest(args.secret, {
    method: "POST",
    path: args.path,
    timestamp,
    nonce,
    body,
  });
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-dropparty-timestamp": String(timestamp),
        "x-dropparty-nonce": nonce,
        "x-dropparty-signature": signature,
      },
      body,
      timeout: TRUSTED_FETCH_TIMEOUT_MS,
    } as RequestInit & { timeout: number });
    let json: unknown = {};
    try {
      json = await response.json();
    } catch {
      json = {};
    }
    if (!response.ok) {
      logFetchFailure({
        endpoint,
        status: response.status,
        error: json && typeof json === "object" && "error" in json
          ? String((json as { error: unknown }).error)
          : response.statusText || "http error",
      });
    }
    return { status: response.status, json, endpoint };
  } catch (error) {
    const described = describeFetchFailure({ endpoint, error });
    logFetchFailure(described);
    return { status: 0, json: {}, endpoint, error: described.error };
  }
}

export async function createTrustedSession(args: {
  siteUrl: string;
  secret: string;
  wallet: string;
  randomBytes: RandomSource;
}): Promise<{ sessionId: string } | { sessionId: null; status: number; error: string }> {
  const fetched = await trustedPost({
    siteUrl: args.siteUrl,
    secret: args.secret,
    path: "/trusted/session",
    body: {
      wallet: args.wallet,
      authenticationMethod: "dcl-authoritative-server",
      isGuest: false,
    },
    randomBytes: args.randomBytes,
  });
  if (fetched.json && typeof fetched.json === "object" && "sessionId" in fetched.json) {
    return { sessionId: String((fetched.json as { sessionId: string }).sessionId) };
  }
  return {
    sessionId: null,
    status: fetched.status,
    error: fetched.error ?? "session response missing sessionId",
  };
}

export async function claimFirstAvailable(args: {
  siteUrl: string;
  secret: string;
  sessionId: string;
  wallet: string;
  partyId: string;
  interactionRequestId: string;
  runtimeInstanceId: string;
  candidates: ClaimCandidate[];
  randomBytes: RandomSource;
}): Promise<ClaimBrokerResult & { status: number }> {
  const fetched = await trustedPost({
    siteUrl: args.siteUrl,
    secret: args.secret,
    path: "/trusted/claim",
    body: {
      sessionId: args.sessionId,
      wallet: args.wallet,
      partyId: args.partyId,
      interactionRequestId: args.interactionRequestId,
      runtimeInstanceId: args.runtimeInstanceId,
      observedAt: Date.now(),
      candidates: args.candidates,
    },
    randomBytes: args.randomBytes,
  });
  if (fetched.error && fetched.status === 0) {
    return { result: "NETWORK_ERROR", status: 0 };
  }
  if (fetched.status === 401) return { result: "SESSION_EXPIRED", status: fetched.status };
  if (fetched.status === 429) return { result: "RATE_LIMITED", status: fetched.status };
  if (fetched.json && typeof fetched.json === "object" && "result" in fetched.json) {
    const parsed = fetched.json as ClaimBrokerResult;
    if (parsed.result === "WON") {
      return {
        ...parsed,
        reveal: readReveal(fetched.json),
        worldToast: readWorldToast(fetched.json),
        status: fetched.status,
      };
    }
    return { ...parsed, status: fetched.status };
  }
  if (fetched.json && typeof fetched.json === "object" && "error" in fetched.json) {
    const error = String((fetched.json as { error: string }).error);
    if (
      error === "NOT_ELIGIBLE" ||
      error === "SESSION_EXPIRED" ||
      error === "RATE_LIMITED" ||
      error === "NETWORK_ERROR"
    ) {
      return { result: error, status: fetched.status };
    }
  }
  return { result: "INVALID_INTERACTION", status: fetched.status };
}