import { room } from "../shared/messages";
import { TRUSTED_FETCH_TIMEOUT_MS } from "../shared/constants";
import { resolveServerConvexSiteUrl } from "../shared/convexEnv";
import {
  UPCOMING_BROWSE_LIMIT,
  compactUpcomingParties,
  encodeUpcomingPartiesPayload,
  fingerprintUpcomingParties,
  shouldBroadcastUpcoming,
  shouldCoalesceUpcomingFetch,
  shouldRefreshUpcoming,
  type UpcomingPartiesState,
} from "../shared/upcomingPartiesState";

export type UpcomingPartiesCache = {
  fingerprint: string;
  lastFetchAt: number;
  payload: string;
  state: UpcomingPartiesState;
};

export function emptyUpcomingPartiesCache(): UpcomingPartiesCache {
  return {
    fingerprint: "",
    lastFetchAt: 0,
    payload: "",
    state: { nowMs: 0, parties: [] },
  };
}

export async function fetchUpcomingBrowseFromConvex(siteUrl: string): Promise<UpcomingPartiesState | null> {
  const endpoint = `${siteUrl.replace(/\/$/, "")}/scheduled-parties/upcoming`;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: UPCOMING_BROWSE_LIMIT }),
      timeout: TRUSTED_FETCH_TIMEOUT_MS,
    });
    const json = (await response.json().catch(() => ({}))) as { parties?: unknown; nowMs?: unknown };
    if (!response.ok) {
      console.log("[SERVER] upcoming browse fetch failed", { status: response.status });
      return null;
    }
    const nowMs = typeof json.nowMs === "number" && Number.isFinite(json.nowMs) ? json.nowMs : Date.now();
    return compactUpcomingParties(json.parties, nowMs);
  } catch (error) {
    console.log("[SERVER] upcoming browse fetch failed", {
      error: error instanceof Error ? error.message : "network",
    });
    return null;
  }
}

export function rememberUpcomingState(cache: UpcomingPartiesCache, state: UpcomingPartiesState, now: number): {
  cache: UpcomingPartiesCache;
  changed: boolean;
} {
  const fingerprint = fingerprintUpcomingParties(state.parties);
  const changed = shouldBroadcastUpcoming(cache.fingerprint, fingerprint);
  return {
    changed,
    cache: {
      fingerprint,
      lastFetchAt: now,
      payload: encodeUpcomingPartiesPayload(state),
      state,
    },
  };
}

export function sendUpcomingPartiesState(payload: string, to?: readonly string[]): void {
  if (!payload) {
    return;
  }
  const body = { payload };
  if (to && to.length > 0) {
    room.send("upcomingPartiesState", body, { to: [...to] });
    return;
  }
  room.send("upcomingPartiesState", body);
}

export function upcomingSiteUrl(envSiteUrl?: string, nodeEnv?: string, serverConvexOverride?: string): string {
  return resolveServerConvexSiteUrl({
    envSiteUrl,
    nodeEnv,
    serverConvexOverride,
  }).siteUrl;
}

export function decideUpcomingServerFetch(args: {
  occupied: boolean;
  lastFetchAt: number;
  now: number;
  force?: boolean;
  coalesce?: boolean;
}): { fetchConvex: boolean; reason: string } {
  if (args.coalesce && shouldCoalesceUpcomingFetch({ lastFetchAt: args.lastFetchAt, now: args.now, force: false })) {
    return { fetchConvex: false, reason: "coalesce" };
  }
  const decision = shouldRefreshUpcoming({
    occupied: args.occupied,
    lastFetchAt: args.lastFetchAt,
    now: args.now,
    force: args.force,
  });
  return decision;
}
