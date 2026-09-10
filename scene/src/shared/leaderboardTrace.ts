import { balloonSessionSnapshot, type BalloonSessionState } from "./balloonSession";
import type { LeaderboardStore } from "./leaderboardState";

const DEV_LEADERBOARD_TRACE = true;

export function logLeaderboardRefreshRequested(reason: "connect" | "interval" | "request", extra?: Record<string, unknown>): void {
  if (!DEV_LEADERBOARD_TRACE) {
    return;
  }
  console.log("[LEADERBOARD] refresh requested", { reason, ...extra });
}

export function logLeaderboardSnapshotGenerated(count: number, extra?: Record<string, unknown>): void {
  if (!DEV_LEADERBOARD_TRACE) {
    return;
  }
  console.log("[LEADERBOARD] snapshot generated", { count, ...extra });
}

export function logLeaderboardSendingUpdate(peerId: string, count: number): void {
  if (!DEV_LEADERBOARD_TRACE) {
    return;
  }
  console.log("[LEADERBOARD] sending update", { peerId, count });
}

export function logLeaderboardPayloadReceived(count: number, extra?: Record<string, unknown>): void {
  if (!DEV_LEADERBOARD_TRACE) {
    return;
  }
  console.log("[LEADERBOARD] server payload received", { count, ...extra });
}

export function logLeaderboardClientStateUpdated(store: LeaderboardStore): void {
  if (!DEV_LEADERBOARD_TRACE) {
    return;
  }
  console.log("[LEADERBOARD] client state updated", { count: store.entries.length, generatedAt: store.generatedAt });
}

export function logLeaderboardBoardRowsRendered(count: number): void {
  if (!DEV_LEADERBOARD_TRACE) {
    return;
  }
  console.log("[LEADERBOARD] board rows rendered", { count });
}

export function logBalloonSessionAroundLeaderboard(phase: "before" | "after", session: BalloonSessionState, now: number): void {
  if (!DEV_LEADERBOARD_TRACE) {
    return;
  }
  const label =
    phase === "before"
      ? "[BALLOON BLOWING] session state before leaderboard update"
      : "[BALLOON BLOWING] session state after leaderboard update";
  console.log(label, balloonSessionSnapshot(session, now));
}
