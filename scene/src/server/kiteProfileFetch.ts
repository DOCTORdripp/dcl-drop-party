import {
  failClosedLambdasKiteProfile,
  fetchLambdasEquippedSnapshot,
  resolveLambdasKiteProfile,
  type LambdasKiteProfile,
} from "../shared/lambdasEquippedProfile";

export type KiteProfileFetcher = (wallet: string) => Promise<{
  status: number;
  snapshot?: { version: string; wearables: string[] };
  error?: string;
}>;

/** No background profile refresh. Gameplay events fetch on demand. */
export const KITE_PROFILE_BACKGROUND_REFRESH_MS = 0;

let fetcher: KiteProfileFetcher = fetchLambdasEquippedSnapshot;
const inFlight = new Map<string, Promise<LambdasKiteProfile>>();
const lastReport = new Map<string, { version: string; kiteId: string }>();

function normalizeWallet(wallet: string): string {
  return wallet.trim().toLowerCase();
}

export function setKiteProfileFetcherForTests(next: KiteProfileFetcher): void {
  fetcher = next;
}

export function resetKiteProfileFetchForTests(): void {
  fetcher = fetchLambdasEquippedSnapshot;
  inFlight.clear();
  lastReport.clear();
}

export function lastReportedKiteProfile(wallet: string): { version: string; kiteId: string } | undefined {
  return lastReport.get(normalizeWallet(wallet));
}

async function loadLambdasKiteProfile(wallet: string, level: number): Promise<LambdasKiteProfile> {
  const key = normalizeWallet(wallet);
  try {
    const result = await fetcher(key);
    if (!result.snapshot) {
      console.log("[KITE] profile fetch failed", { wallet: key, status: result.status, error: result.error ?? "unknown" });
      return failClosedLambdasKiteProfile();
    }
    const resolved = resolveLambdasKiteProfile(
      { avatars: [{ version: result.snapshot.version, avatar: { wearables: result.snapshot.wearables } }] },
      level,
    );
    if (!resolved) {
      console.log("[KITE] profile malformed", { wallet: key, status: result.status });
      return failClosedLambdasKiteProfile();
    }
    lastReport.set(key, { version: resolved.version, kiteId: resolved.perk.kiteId || "none" });
    return resolved;
  } catch (error) {
    const message = error instanceof Error ? error.message || error.name : String(error);
    console.log("[KITE] profile fetch failed", { wallet: key, error: message });
    return failClosedLambdasKiteProfile();
  }
}

/**
 * Fresh Lambdas profile for a gameplay event.
 * Dedupes in-flight HTTP for the same wallet; never skips a fetch because a prior result is cached.
 */
export function fetchAuthoritativeKiteProfile(wallet: string, level: number): Promise<LambdasKiteProfile> {
  const key = normalizeWallet(wallet);
  const pending = inFlight.get(key);
  if (pending) {
    return pending.then((profile) => ({
      ...profile,
      kite: profile.kite,
      perk: resolveLambdasKiteProfile(
        { avatars: [{ version: profile.version, avatar: { wearables: profile.wearables } }] },
        level,
      )?.perk ?? failClosedLambdasKiteProfile().perk,
    }));
  }
  const request = loadLambdasKiteProfile(key, level).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, request);
  return request;
}

export async function fetchAuthoritativeKiteWearables(wallet: string, level: number): Promise<readonly string[]> {
  const profile = await fetchAuthoritativeKiteProfile(wallet, level);
  return profile.wearables;
}
