import { getPlayer } from "@dcl/sdk/players";
import { room } from "../shared/messages";
import { BALLOON_INTERVAL_MS, MAX_CARRIED_BALLOONS, profilePublicView, type BalloonLeaderboardEntry, type BalloonProfile } from "../shared/balloonProfile";
import { encodeBlowerLeaderboardPayload } from "../shared/blowerWall";
import { sanitizeProfileName } from "../shared/displayName";
import type { KiteMintCounts } from "../shared/kiteMintLedger";
import type { BalloonStopReason, LiveBalloonPlayer } from "./balloonGame";

export function playerDisplayName(wallet: string): string {
  try {
    const player = getPlayer({ userId: wallet });
    return sanitizeProfileName(player?.name) ?? "";
  } catch {
    return "";
  }
}

function kiteNetworkFields(live: LiveBalloonPlayer): {
  kiteId: string;
  kiteName: string;
  kiteXpBonus: number;
  capacity: number;
} {
  return {
    kiteId: live.kiteId,
    kiteName: live.kiteName,
    kiteXpBonus: live.kiteXpBonus,
    capacity: live.capacity > 0 ? live.capacity : MAX_CARRIED_BALLOONS,
  };
}

export function sendDepositWarningSkipState(peerId: string, skip: boolean): void {
  room.send("depositWarningSkipState", { skip }, { to: [peerId] });
}

export function sendBalloonProfile(
  live: LiveBalloonPlayer,
  partyActive: boolean,
  extra?: { showGreeting?: boolean; greetingName?: string },
): void {
  const view = profilePublicView(live.profile);
  room.send(
    "balloonProfile",
    {
      ...view,
      blowing: live.blowing,
      intervalStartedAt: live.intervalStartedAt,
      intervalMs: live.intervalMs > 0 ? live.intervalMs : BALLOON_INTERVAL_MS,
      ...kiteNetworkFields(live),
      partyActive,
      showGreeting: extra?.showGreeting === true,
      greetingName: extra?.greetingName ?? "",
    },
    { to: [live.peerId] },
  );
}

export function sendBalloonCompleted(
  peerId: string,
  profile: BalloonProfile,
  awardedXp: number,
  intervalStartedAt: number,
  blowing: boolean,
  intervalMs = BALLOON_INTERVAL_MS,
  kite?: { kiteId: string; kiteName: string; kiteXpBonus: number; capacity: number },
): void {
  room.send(
    "balloonCompleted",
    {
      carriedBalloons: profile.carriedBalloons,
      lifetimeBalloons: profile.lifetimeBalloons,
      balloonPoints: profile.balloonPoints,
      xp: profile.xp,
      level: profile.level,
      awardedXp,
      intervalStartedAt,
      intervalMs,
      kiteId: kite?.kiteId ?? "",
      kiteName: kite?.kiteName ?? "",
      kiteXpBonus: kite?.kiteXpBonus ?? 0,
      capacity: kite?.capacity && kite.capacity > 0 ? kite.capacity : MAX_CARRIED_BALLOONS,
      blowing,
    },
    { to: [peerId] },
  );
}

export function sendBalloonStopped(
  peerId: string,
  reason: BalloonStopReason,
  carriedBalloons: number,
): void {
  room.send(
    "balloonStopped",
    { reason, carriedBalloons, blowing: false },
    { to: [peerId] },
  );
}

export function sendEmploymentState(peerId: string, employed: boolean, result: string): void {
  room.send("employmentState", { employed, result }, { to: [peerId] });
}

export function sendTurnInResult(
  peerId: string,
  result: { ok: boolean; result: string; carriedBalloons: number; onboardingComplete: boolean },
): void {
  room.send("turnInResult", result, { to: [peerId] });
}

export function sendRewardResult(
  peerId: string,
  result: { ok: boolean; result: string; rewardKey: string; balloonPoints: number },
): void {
  room.send("rewardResult", result, { to: [peerId] });
}

export function sendLeaderboardUpdate(
  entries: readonly BalloonLeaderboardEntry[],
  args: { generatedAt?: number; to?: readonly string[] } = {},
): void {
  const generatedAt = args.generatedAt ?? Date.now();
  const body = {
    payload: encodeBlowerLeaderboardPayload(entries, generatedAt),
  };
  if (args.to && args.to.length > 0) {
    room.send("leaderboardUpdate", body, { to: [...args.to] });
    return;
  }
  room.send("leaderboardUpdate", body);
}

export function sendKiteRedeemResult(
  peerId: string,
  result: {
    ok: boolean;
    result: string;
    kiteId: string;
    balloonPoints: number;
    status: string;
    retrySafe: boolean;
    txHash: string;
    lastError: string;
  },
): void {
  room.send("kiteRedeemResult", result, { to: [peerId] });
}

export function sendKiteMintState(counts: KiteMintCounts, to?: readonly string[]): void {
  const body = {
    GREEN: counts.GREEN,
    DCL2: counts.DCL2,
    RED: counts.RED,
    LAVA: counts.LAVA,
    FROST: counts.FROST,
    BLACK: counts.BLACK,
    CROSS: counts.CROSS,
  };
  if (to && to.length > 0) {
    room.send("kiteMintState", body, { to: [...to] });
    return;
  }
  room.send("kiteMintState", body);
}

export function sendTableSocialState(
  peerId: string,
  snapshot: { occupiedChairCount: number; occupiedChairMask: number; currentSocialBonusXp: number; tableFull: boolean },
  eligibleSocialBonusXp: number,
): void {
  room.send(
    "tableSocialState",
    {
      occupiedChairCount: snapshot.occupiedChairCount,
      occupiedChairMask: snapshot.occupiedChairMask,
      currentSocialBonusXp: snapshot.currentSocialBonusXp,
      tableFull: snapshot.tableFull,
      eligibleSocialBonusXp,
    },
    { to: [peerId] },
  );
}
