import { isWithinPopProximity } from "./distance";
import type { AuthorizedCandidate, LiveBalloonRuntime } from "./gameState";
import type { AuthoritativePresenceTracker } from "./presence";

export type PopFinalCheckResult =
  | { ok: true; candidates: AuthorizedCandidate[] }
  | { ok: false; result: "NOT_ELIGIBLE" };

export function revalidatePopBeforeBroker(args: {
  wallet: string;
  runtime: LiveBalloonRuntime;
  presence: AuthoritativePresenceTracker;
  getPlayer: (wallet: string) =>
    | { entityPresent: boolean; position: { x: number; y: number; z: number } }
    | undefined;
  isAdmitted: (wallet: string) => boolean;
  previousCandidates: AuthorizedCandidate[];
  now?: number;
}): PopFinalCheckResult {
  const now = args.now ?? Date.now();
  if (!args.isAdmitted(args.wallet)) {
    return { ok: false, result: "NOT_ELIGIBLE" };
  }
  const player = args.getPlayer(args.wallet);
  if (!player?.entityPresent) {
    return { ok: false, result: "NOT_ELIGIBLE" };
  }
  let snapshot;
  try {
    snapshot = args.presence.observe(
      {
        wallet: args.wallet,
        peerId: args.wallet,
        readSucceeded: true,
        position: player.position,
      },
      now,
    );
  } catch {
    return { ok: false, result: "NOT_ELIGIBLE" };
  }
  if (!snapshot.positionFresh) {
    return { ok: false, result: "NOT_ELIGIBLE" };
  }
  try {
    args.runtime.observePlayer(args.wallet, snapshot.position, snapshot.lastAuthoritativeReadAt);
  } catch {
    return { ok: false, result: "NOT_ELIGIBLE" };
  }
  const live = args.runtime.authorizeCandidates(snapshot.position, now);
  const allowed = new Set(live.map((row) => `${row.balloonId}:${row.waveId}:${row.spawnGeneration}`));
  const stillValid = args.previousCandidates.filter((row) =>
    allowed.has(`${row.balloonId}:${row.waveId}:${row.spawnGeneration}`),
  );
  if (stillValid.length === 0) {
    return { ok: false, result: "NOT_ELIGIBLE" };
  }
  for (const candidate of stillValid) {
    const balloon = args.runtime.get(candidate.balloonId);
    if (!balloon || balloon.runtimeStatus !== "SPAWNED") {
      return { ok: false, result: "NOT_ELIGIBLE" };
    }
    if (!isWithinPopProximity(snapshot.position, balloon.position)) {
      return { ok: false, result: "NOT_ELIGIBLE" };
    }
  }
  return { ok: true, candidates: stillValid };
}
