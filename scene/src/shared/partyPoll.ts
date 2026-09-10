/** Adaptive Convex poll policy. Timers/countdowns stay local; network is state-driven.
 * Empty scene (0 authoritative players) does not poll. Convex scheduled lifecycle
 * jobs own unattended parties; hourly reconcile is the safety net. First join always
 * snapshots immediately before cached party state is trusted. */

export const PARTY_POLL_CHECK_MS = 1000;
/** Occupied, no playable party, and no cached next scheduledAt. Slow reconciliation only. */
export const PARTY_POLL_IDLE_SAFETY_MS = 10 * 60_000;
/** @deprecated Use PARTY_POLL_IDLE_SAFETY_MS. Occupied unknown-schedule idle is 10 minutes, not 120s. */
export const PARTY_POLL_IDLE_MS = PARTY_POLL_IDLE_SAFETY_MS;
/** Occupied known-far schedule sleeps until T-5m; this constant is not a recurring cadence. */
export const PARTY_POLL_FAR_MS = PARTY_POLL_IDLE_SAFETY_MS;
/** Occupied scene, within PARTY_NEAR_START_MS of scheduled start. */
export const PARTY_POLL_NEAR_MS = 15_000;
export const PARTY_POLL_ACTIVE_MS = 2_000;
/** Short snapshot while a playable row is still SETTLING. */
export const PARTY_POLL_COMPLETED_MS = 5_000;
export const PARTY_NEAR_START_MS = 5 * 60_000;
/** After a real playable party ends: first empty confirmation. */
export const PARTY_COMPLETED_CONFIRM_FIRST_MS = 5_000;
/** After a real playable party ends: second empty confirmation (from completedSince). */
export const PARTY_COMPLETED_CONFIRM_SECOND_MS = 15_000;
export const PARTY_COMPLETED_CONFIRMATIONS = 2;
/** Sentinel: empty scene never schedules a snapshot poll. */
export const PARTY_POLL_EMPTY_MS = Number.POSITIVE_INFINITY;

/** Slow ACTIVE safety net. Claims, party change, and start/complete trigger immediate refresh. */
export const WIN_FEED_SAFETY_POLL_MS = 25_000;
export const WIN_FEED_POLL_MS = WIN_FEED_SAFETY_POLL_MS;
export const WIN_FEED_COMPLETED_FOLLOWUP_MS = 8_000;
export const WIN_FEED_COMPLETED_FOLLOWUPS = 2;
/** Win-feed follow-up window. Independent of party snapshot confirmation. */
export const WIN_FEED_COMPLETED_GRACE_MS = 45_000;

export type PartyPollMode = "empty" | "join" | "idle" | "far" | "near" | "active" | "completed";

export type PartyPollDecision = {
  intervalMs: number;
  mode: PartyPollMode;
  useMutation: boolean;
};

export type PartyPollFetchKind = "none" | "snapshot" | "tick";

export type WinsPollDecision = {
  fetch: boolean;
  reason:
    | "idle"
    | "party-change"
    | "became-active"
    | "claim"
    | "active-safety"
    | "became-completed"
    | "completed-followup"
    | "completed-idle"
    | "not-live";
  completedSince: number | null;
  completedRefreshCount: number;
};

function normalizeStatus(status?: string | null): string {
  return (status ?? "").trim().toUpperCase();
}

function isEmptyPlayable(status: string, empty?: boolean, partyId?: string | null): boolean {
  if (empty) {
    return true;
  }
  if (!status || status === "NONE") {
    return true;
  }
  return partyId === "";
}

function occupiedPlayerCount(authoritativePlayerCount?: number): number {
  if (authoritativePlayerCount === undefined) {
    return 1;
  }
  return authoritativePlayerCount;
}

export function shouldForceJoinSnapshot(previousCount: number, currentCount: number): boolean {
  return previousCount <= 0 && currentCount > 0;
}

/** Boot snapshot is only for rebuilding live balloons when someone is already in the scene. */
export function shouldBootPartySnapshot(authoritativePlayerCount: number): boolean {
  return authoritativePlayerCount > 0;
}

export function isTrustedPlayableStatus(status?: string | null): boolean {
  const normalized = normalizeStatus(status);
  return normalized === "LOCKED" || normalized === "ACTIVE" || normalized === "SETTLING";
}

type PartyStatusRef = {
  status?: string | null;
  partyId?: string | null;
  empty?: boolean;
} | null | undefined;

/** True only when a previously bound playable party left playable state. */
export function playablePartyEnded(previous: PartyStatusRef, next: PartyStatusRef): boolean {
  if (!isTrustedPlayableStatus(previous?.status)) {
    return false;
  }
  if (next && isTrustedPlayableStatus(next.status) && next.partyId) {
    return false;
  }
  return true;
}

function completedConfirmationInterval(confirmCount: number): number | null {
  if (confirmCount < 0 || confirmCount >= PARTY_COMPLETED_CONFIRMATIONS) {
    return null;
  }
  if (confirmCount === 0) {
    return PARTY_COMPLETED_CONFIRM_FIRST_MS;
  }
  return PARTY_COMPLETED_CONFIRM_SECOND_MS - PARTY_COMPLETED_CONFIRM_FIRST_MS;
}

function earliestScheduledAt(values: readonly (number | null | undefined)[]): number | null {
  let earliest: number | null = null;
  for (const value of values) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      continue;
    }
    if (earliest === null || value < earliest) {
      earliest = value;
    }
  }
  return earliest;
}

/** Milliseconds until the T-5m near-start window. Negative means already in/near that window. */
export function msUntilNearWindow(now: number, scheduledAt: number): number {
  return scheduledAt - PARTY_NEAR_START_MS - now;
}

/** Idle/far sleep: known far schedule waits until T-5m; unknown schedule uses 10m safety. */
export function scheduleAwareIdleDecision(now: number, nextScheduledAt: number | null): PartyPollDecision {
  if (nextScheduledAt != null) {
    const untilNear = msUntilNearWindow(now, nextScheduledAt);
    if (untilNear <= 0) {
      return { intervalMs: PARTY_POLL_NEAR_MS, mode: "near", useMutation: false };
    }
    return { intervalMs: untilNear, mode: "far", useMutation: false };
  }
  return { intervalMs: PARTY_POLL_IDLE_SAFETY_MS, mode: "idle", useMutation: false };
}

function emptyOrFinishedPoll(input: {
  now: number;
  nextScheduledAt?: number | null;
  completedSince?: number | null;
  completedConfirmCount?: number;
}): PartyPollDecision {
  const count = input.completedConfirmCount ?? 0;
  const confirmMs =
    input.completedSince != null ? completedConfirmationInterval(count) : null;
  if (confirmMs != null) {
    return { intervalMs: confirmMs, mode: "completed", useMutation: false };
  }
  return scheduleAwareIdleDecision(input.now, input.nextScheduledAt ?? null);
}

export function nextPartyPoll(input: {
  now: number;
  status?: string | null;
  scheduledAt?: number | null;
  nextScheduledAt?: number | null;
  partyId?: string | null;
  empty?: boolean;
  completedSince?: number | null;
  completedConfirmCount?: number;
  authoritativePlayerCount?: number;
  forceImmediateSnapshot?: boolean;
}): PartyPollDecision {
  const playerCount = occupiedPlayerCount(input.authoritativePlayerCount);
  if (playerCount <= 0) {
    return { intervalMs: PARTY_POLL_EMPTY_MS, mode: "empty", useMutation: false };
  }
  if (input.forceImmediateSnapshot) {
    return { intervalMs: 0, mode: "join", useMutation: false };
  }
  const status = normalizeStatus(input.status);
  if (
    isEmptyPlayable(status, input.empty, input.partyId) ||
    status === "COMPLETED" ||
    status === "CANCELLED"
  ) {
    return emptyOrFinishedPoll({
      now: input.now,
      nextScheduledAt: input.nextScheduledAt,
      completedSince: input.completedSince,
      completedConfirmCount: input.completedConfirmCount,
    });
  }
  if (status === "ACTIVE") {
    return { intervalMs: PARTY_POLL_ACTIVE_MS, mode: "active", useMutation: true };
  }
  if (status === "SETTLING") {
    return { intervalMs: PARTY_POLL_COMPLETED_MS, mode: "completed", useMutation: false };
  }
  const scheduledAt = earliestScheduledAt([input.scheduledAt, input.nextScheduledAt]) ?? 0;
  const untilStart = scheduledAt - input.now;
  if (status === "LOCKED" && untilStart <= 0) {
    return { intervalMs: PARTY_POLL_NEAR_MS, mode: "near", useMutation: true };
  }
  if (untilStart <= PARTY_NEAR_START_MS) {
    return { intervalMs: PARTY_POLL_NEAR_MS, mode: "near", useMutation: false };
  }
  return scheduleAwareIdleDecision(input.now, scheduledAt || input.nextScheduledAt || null);
}

export function partyPollIsDue(lastPollAt: number, intervalMs: number, now: number): boolean {
  if (!Number.isFinite(intervalMs) || intervalMs < 0) {
    return false;
  }
  return now - lastPollAt >= intervalMs;
}

export function partyPollFetchKind(decision: PartyPollDecision): PartyPollFetchKind {
  if (decision.mode === "empty" || !Number.isFinite(decision.intervalMs)) {
    return "none";
  }
  if (decision.mode === "join" || !decision.useMutation) {
    return "snapshot";
  }
  return "tick";
}

function isCompletedStatus(status: string): boolean {
  return status === "COMPLETED" || status === "SETTLING";
}

export function nextWinsPoll(input: {
  now: number;
  partyId?: string | null;
  status?: string | null;
  previousPartyId?: string | null;
  previousStatus?: string | null;
  lastFetchAt: number;
  completedSince?: number | null;
  completedRefreshCount?: number;
  claimRefreshRequested?: boolean;
}): WinsPollDecision {
  const partyId = input.partyId ?? "";
  const status = normalizeStatus(input.status);
  const previousPartyId = input.previousPartyId ?? "";
  const previousStatus = normalizeStatus(input.previousStatus);
  const completedRefreshCount = input.completedRefreshCount ?? 0;

  if (partyId && previousPartyId && partyId !== previousPartyId) {
    return { fetch: true, reason: "party-change", completedSince: null, completedRefreshCount: 0 };
  }
  if (status === "ACTIVE" && previousStatus !== "ACTIVE") {
    return { fetch: true, reason: "became-active", completedSince: null, completedRefreshCount: 0 };
  }
  if (input.claimRefreshRequested && (status === "ACTIVE" || isCompletedStatus(status))) {
    return {
      fetch: true,
      reason: "claim",
      completedSince: isCompletedStatus(status) ? (input.completedSince ?? input.now) : null,
      completedRefreshCount,
    };
  }

  const idle = isEmptyPlayable(status, false, partyId);
  if (idle) {
    return { fetch: false, reason: "idle", completedSince: null, completedRefreshCount: 0 };
  }
  if (status === "ACTIVE") {
    return {
      fetch: input.lastFetchAt > 0 && input.now - input.lastFetchAt >= WIN_FEED_SAFETY_POLL_MS,
      reason: "active-safety",
      completedSince: null,
      completedRefreshCount: 0,
    };
  }
  if (isCompletedStatus(status)) {
    if (!isCompletedStatus(previousStatus)) {
      return {
        fetch: true,
        reason: "became-completed",
        completedSince: input.now,
        completedRefreshCount: 1,
      };
    }
    const since = input.completedSince ?? input.now;
    if (completedRefreshCount >= 1 + WIN_FEED_COMPLETED_FOLLOWUPS) {
      return { fetch: false, reason: "completed-idle", completedSince: since, completedRefreshCount };
    }
    if (input.now - input.lastFetchAt >= WIN_FEED_COMPLETED_FOLLOWUP_MS) {
      return {
        fetch: true,
        reason: "completed-followup",
        completedSince: since,
        completedRefreshCount: completedRefreshCount + 1,
      };
    }
    return { fetch: false, reason: "completed-idle", completedSince: since, completedRefreshCount };
  }
  return { fetch: false, reason: "not-live", completedSince: null, completedRefreshCount: 0 };
}

/** MY WINS is fetch-on-open only. */
export function historicalWinsShouldPollForever(): boolean {
  return false;
}

export function partyNetworkRequestsPerHour(mode: PartyPollMode): number {
  if (mode === "empty" || mode === "join" || mode === "far") {
    return 0;
  }
  const interval =
    mode === "idle"
      ? PARTY_POLL_IDLE_SAFETY_MS
      : mode === "near"
        ? PARTY_POLL_NEAR_MS
        : mode === "active"
          ? PARTY_POLL_ACTIVE_MS
          : PARTY_POLL_COMPLETED_MS;
  return Math.round(3_600_000 / interval);
}

/** Occupied idle trusted snapshots/hour. Known far schedule sleeps (0) until T-5m. */
export function trustedIdleSnapshotsPerHour(args: {
  occupied: boolean;
  now: number;
  nextScheduledAt: number | null;
}): number {
  if (!args.occupied) {
    return 0;
  }
  const decision = scheduleAwareIdleDecision(args.now, args.nextScheduledAt);
  if (decision.mode === "far" || !Number.isFinite(decision.intervalMs)) {
    return 0;
  }
  if (decision.mode === "idle") {
    return Math.round(3_600_000 / PARTY_POLL_IDLE_SAFETY_MS);
  }
  return Math.round(3_600_000 / decision.intervalMs);
}

export function winsNetworkRequestsPerPlayerHour(kind: "idle" | "active" | "my-wins-open"): number {
  if (kind === "idle" || kind === "my-wins-open") {
    return 0;
  }
  return Math.round(3_600_000 / WIN_FEED_SAFETY_POLL_MS);
}
