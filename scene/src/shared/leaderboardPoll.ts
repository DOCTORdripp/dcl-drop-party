/** Scene multiplayer storage is cheap to read; server pushes on join and every 10 minutes. */
export const LEADERBOARD_BLOWERS_POLL_MS = 10 * 60 * 1000;

export function shouldPollBlowers(lastFetchAt: number, now: number): boolean {
  if (lastFetchAt <= 0) {
    return true;
  }
  return now - lastFetchAt >= LEADERBOARD_BLOWERS_POLL_MS;
}

/** Connecting players get a targeted snapshot. Interval refresh may broadcast. */
export function shouldBroadcastLeaderboardRefresh(lastBroadcastAt: number, now: number): boolean {
  return lastBroadcastAt > 0 && shouldPollBlowers(lastBroadcastAt, now);
}

export function shouldPollPoppers(args: {
  status: string;
  previousStatus: string;
  hadPopsThisParty: boolean;
}): boolean {
  const status = args.status.trim().toUpperCase();
  const previous = args.previousStatus.trim().toUpperCase();
  if (status !== "COMPLETED" && status !== "SETTLING") {
    return false;
  }
  if (previous === "COMPLETED" || previous === "SETTLING") {
    return false;
  }
  return args.hadPopsThisParty;
}
