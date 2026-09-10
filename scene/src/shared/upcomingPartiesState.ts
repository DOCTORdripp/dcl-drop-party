import type { ScheduledPartyView } from "./partyPanels";

/** Occupied-scene safety refresh. Event-driven paths are primary; this only reconciles. */
export const UPCOMING_SAFETY_REFRESH_MS = 10 * 60_000;
/** Opening Upcoming may ask the scene server for a snapshot this stale; still not a Convex poll. */
export const UPCOMING_OPEN_UI_STALE_MS = 5_000;
/** Coalesce host/UI refresh requests so a burst of clients is one Convex POST. */
export const UPCOMING_REQUEST_COALESCE_MS = 2_000;
/** Historical per-client ticker poll (removed). Used only for traffic estimates. */
export const LEGACY_CLIENT_UPCOMING_POLL_MS = 15_000;
export const UPCOMING_BROWSE_LIMIT = 25;

export type UpcomingPartySnapshot = {
  partyId: string;
  partyType?: "AUTOMATIC" | "SCHEDULED";
  title: string;
  description: string;
  scheduledAt: number;
  status: string;
  hostWallet?: string;
  hostDisplayName?: string;
  localScheduledTime?: string;
  allowCommunityContributions: boolean;
  isContributionLocked?: boolean;
  lineupLocksAt?: number;
  attendancePrecheckAt?: number;
  isLineupLocked?: boolean;
};

export type UpcomingPartiesState = {
  nowMs: number;
  parties: UpcomingPartySnapshot[];
};

export type UpcomingRefreshDecision = {
  fetchConvex: boolean;
  reason: "empty" | "join" | "safety" | "force" | "cached" | "coalesce";
};

function asPartyType(value: unknown): "AUTOMATIC" | "SCHEDULED" | undefined {
  return value === "AUTOMATIC" || value === "SCHEDULED" ? value : undefined;
}

export function compactUpcomingParty(row: unknown): UpcomingPartySnapshot | null {
  if (!row || typeof row !== "object") {
    return null;
  }
  const party = row as Record<string, unknown>;
  if (typeof party.partyId !== "string" || !party.partyId) {
    return null;
  }
  if (typeof party.title !== "string") {
    return null;
  }
  if (typeof party.scheduledAt !== "number" || !Number.isFinite(party.scheduledAt)) {
    return null;
  }
  if (typeof party.status !== "string") {
    return null;
  }
  const snapshot: UpcomingPartySnapshot = {
    partyId: party.partyId,
    title: party.title,
    description: typeof party.description === "string" ? party.description : "",
    scheduledAt: party.scheduledAt,
    status: party.status,
    allowCommunityContributions: party.allowCommunityContributions === true,
  };
  const partyType = asPartyType(party.partyType);
  if (partyType) snapshot.partyType = partyType;
  if (typeof party.hostWallet === "string" && party.hostWallet) snapshot.hostWallet = party.hostWallet;
  if (typeof party.hostDisplayName === "string" && party.hostDisplayName) {
    snapshot.hostDisplayName = party.hostDisplayName;
  }
  if (typeof party.localScheduledTime === "string" && party.localScheduledTime) {
    snapshot.localScheduledTime = party.localScheduledTime;
  }
  if (party.isContributionLocked === true) snapshot.isContributionLocked = true;
  if (typeof party.lineupLocksAt === "number" && Number.isFinite(party.lineupLocksAt)) {
    snapshot.lineupLocksAt = party.lineupLocksAt;
  }
  if (typeof party.attendancePrecheckAt === "number" && Number.isFinite(party.attendancePrecheckAt)) {
    snapshot.attendancePrecheckAt = party.attendancePrecheckAt;
  }
  if (party.isLineupLocked === true) snapshot.isLineupLocked = true;
  return snapshot;
}

export function compactUpcomingParties(rows: unknown, nowMs = Date.now()): UpcomingPartiesState {
  const parties: UpcomingPartySnapshot[] = [];
  if (Array.isArray(rows)) {
    for (const row of rows) {
      const compact = compactUpcomingParty(row);
      if (compact) parties.push(compact);
    }
  }
  return { nowMs, parties };
}

export function fingerprintUpcomingParties(parties: readonly UpcomingPartySnapshot[]): string {
  return JSON.stringify(
    parties.map((row) => [
      row.partyId,
      row.partyType ?? "",
      row.title,
      row.description,
      row.scheduledAt,
      row.status,
      row.hostWallet ?? "",
      row.hostDisplayName ?? "",
      row.localScheduledTime ?? "",
      row.allowCommunityContributions ? 1 : 0,
      row.isContributionLocked ? 1 : 0,
      row.lineupLocksAt ?? 0,
      row.attendancePrecheckAt ?? 0,
      row.isLineupLocked ? 1 : 0,
    ]),
  );
}

export function shouldBroadcastUpcoming(previousFingerprint: string, nextFingerprint: string): boolean {
  return previousFingerprint !== nextFingerprint;
}

export function shouldForceJoinUpcomingFetch(previousCount: number, currentCount: number): boolean {
  return previousCount <= 0 && currentCount > 0;
}

/** /reload keeps the same peer; the client still needs the cached snapshot again. */
export function shouldSendUpcomingSnapshot(alreadySent: boolean, force: boolean): boolean {
  return force || !alreadySent;
}

export function shouldRefreshUpcoming(args: {
  occupied: boolean;
  lastFetchAt: number;
  now: number;
  force?: boolean;
}): UpcomingRefreshDecision {
  if (!args.occupied) {
    return { fetchConvex: false, reason: "empty" };
  }
  if (args.force || args.lastFetchAt <= 0) {
    return { fetchConvex: true, reason: args.lastFetchAt <= 0 ? "join" : "force" };
  }
  if (args.now - args.lastFetchAt >= UPCOMING_SAFETY_REFRESH_MS) {
    return { fetchConvex: true, reason: "safety" };
  }
  return { fetchConvex: false, reason: "cached" };
}

export function shouldCoalesceUpcomingFetch(args: {
  lastFetchAt: number;
  now: number;
  force: boolean;
}): boolean {
  if (args.force) {
    return false;
  }
  if (args.lastFetchAt <= 0) {
    return false;
  }
  return args.now - args.lastFetchAt < UPCOMING_REQUEST_COALESCE_MS;
}

export function shouldRequestUpcomingOnOpen(lastReceivedAt: number, now: number): boolean {
  if (lastReceivedAt <= 0) {
    return true;
  }
  return now - lastReceivedAt >= UPCOMING_OPEN_UI_STALE_MS;
}

/** Earliest non-terminal upcoming start. Used to wake trusted polling at T-5m locally. */
export function nextUpcomingScheduledAt(
  parties: ReadonlyArray<{ scheduledAt: number; status?: string }>,
  nowMs = 0,
): number | null {
  void nowMs;
  const times = parties
    .filter((row) => {
      const status = (row.status ?? "").trim().toUpperCase();
      return status !== "COMPLETED" && status !== "CANCELLED";
    })
    .map((row) => row.scheduledAt)
    .filter((at) => Number.isFinite(at) && at > 0)
    .sort((a, b) => a - b);
  return times[0] ?? null;
}

export function upcomingMembershipMayHaveChanged(
  previous: { partyId?: string; status?: string; scheduledAt?: number } | null | undefined,
  next: { partyId?: string; status?: string; scheduledAt?: number } | null | undefined,
): boolean {
  const prevId = previous?.partyId ?? "";
  const nextId = next?.partyId ?? "";
  const prevStatus = (previous?.status ?? "").trim().toUpperCase();
  const nextStatus = (next?.status ?? "").trim().toUpperCase();
  const prevAt = previous?.scheduledAt ?? 0;
  const nextAt = next?.scheduledAt ?? 0;
  if (prevId !== nextId) {
    return true;
  }
  if (prevStatus !== nextStatus) {
    return true;
  }
  return prevAt !== nextAt;
}

export function encodeUpcomingPartiesPayload(state: UpcomingPartiesState): string {
  return JSON.stringify({
    nowMs: state.nowMs,
    parties: state.parties,
  });
}

export function parseUpcomingPartiesPayload(payload: string): UpcomingPartiesState | null {
  try {
    const parsed = JSON.parse(payload) as { nowMs?: unknown; parties?: unknown };
    const nowMs = typeof parsed.nowMs === "number" && Number.isFinite(parsed.nowMs) ? parsed.nowMs : Date.now();
    return compactUpcomingParties(parsed.parties, nowMs);
  } catch {
    return null;
  }
}

export function snapshotToScheduledPartyView(row: UpcomingPartySnapshot): ScheduledPartyView {
  return {
    partyId: row.partyId,
    partyType: row.partyType,
    title: row.title,
    description: row.description,
    hostWallet: row.hostWallet,
    hostDisplayName: row.hostDisplayName,
    scheduledAt: row.scheduledAt,
    localScheduledTime: row.localScheduledTime,
    allowCommunityContributions: row.allowCommunityContributions,
    supplementFromExtraPool: false,
    status: row.status,
    isContributionLocked: row.isContributionLocked === true,
    isHostRescheduleLocked: false,
    canCurrentUserContribute: false,
    canCurrentUserEdit: false,
    lineupLocksAt: row.lineupLocksAt,
    isLineupLocked: row.isLineupLocked,
  };
}

export function snapshotsToScheduledPartyViews(
  parties: readonly UpcomingPartySnapshot[],
): ScheduledPartyView[] {
  return parties.map(snapshotToScheduledPartyView);
}

export function applyLocalUpcomingViewerFlags(
  parties: readonly ScheduledPartyView[],
  wallet?: string,
): ScheduledPartyView[] {
  const viewer = (wallet ?? "").trim().toLowerCase();
  return parties.map((row) => {
    const automatic = row.partyType === "AUTOMATIC";
    const host = (row.hostWallet ?? "").trim().toLowerCase();
    const isHost = Boolean(viewer && host && viewer === host);
    return {
      ...row,
      canCurrentUserEdit: !automatic && isHost,
      canCurrentUserContribute:
        !automatic &&
        !isHost &&
        row.allowCommunityContributions &&
        !row.isContributionLocked &&
        Boolean(viewer),
    };
  });
}

export function upcomingConvexPostsPerMinuteBefore(playerCount: number): number {
  if (playerCount <= 0) {
    return 0;
  }
  return playerCount * (60_000 / LEGACY_CLIENT_UPCOMING_POLL_MS);
}

export function upcomingConvexPostsPerMinuteAfter(playerCount: number): number {
  if (playerCount <= 0) {
    return 0;
  }
  return 60_000 / UPCOMING_SAFETY_REFRESH_MS;
}
