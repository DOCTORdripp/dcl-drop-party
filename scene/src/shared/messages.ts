import { Schemas } from "@dcl/sdk/ecs";
import { registerMessages } from "@dcl/sdk/network";

/**
 * registerMessages must run at module load (static import from index.ts).
 * Client → server POP carries no wallet, position, distance, or candidate list.
 */
export const Messages = {
  admissionRequest: Schemas.Map({
    token: Schemas.String,
  }),
  admissionResult: Schemas.Map({
    admitted: Schemas.Boolean,
    reason: Schemas.String,
  }),
  popAttempt: Schemas.Map({
    intent: Schemas.String,
  }),
  popResult: Schemas.Map({
    result: Schemas.String,
    balloonId: Schemas.String,
    claimId: Schemas.String,
    revealType: Schemas.String,
    revealName: Schemas.String,
    announceTier: Schemas.String,
    dclRarity: Schemas.String,
    hasStompPosition: Schemas.Boolean,
    stompPosition: Schemas.Vector3,
  }),
  eligibleCount: Schemas.Map({
    count: Schemas.Int,
  }),
  worldToast: Schemas.Map({
    title: Schemas.String,
    body: Schemas.String,
    tier: Schemas.String,
    winnerLabel: Schemas.String,
  }),
  startBlowing: Schemas.Map({
    intent: Schemas.String,
  }),
  stopBlowing: Schemas.Map({
    intent: Schemas.String,
  }),
  tableSit: Schemas.Map({
    chairId: Schemas.Int,
    requestId: Schemas.String,
  }),
  tableStand: Schemas.Map({
    requestId: Schemas.String,
  }),
  tableSeatResult: Schemas.Map({
    requestId: Schemas.String,
    accepted: Schemas.Boolean,
    chairId: Schemas.Int,
    reason: Schemas.String,
  }),
  tableSurround: Schemas.Map({
    inside: Schemas.Boolean,
  }),
  tableSocialState: Schemas.Map({
    occupiedChairCount: Schemas.Int,
    occupiedChairMask: Schemas.Int,
    currentSocialBonusXp: Schemas.Int,
    tableFull: Schemas.Boolean,
    eligibleSocialBonusXp: Schemas.Int,
  }),
  employmentAccept: Schemas.Map({
    intent: Schemas.String,
  }),
  balloonSync: Schemas.Map({
    intent: Schemas.String,
  }),
  turnInBalloons: Schemas.Map({
    intent: Schemas.String,
  }),
  redeemBalloonReward: Schemas.Map({
    rewardKey: Schemas.String,
  }),
  balloonProfile: Schemas.Map({
    employed: Schemas.Boolean,
    carriedBalloons: Schemas.Int,
    lifetimeBalloons: Schemas.Int,
    balloonPoints: Schemas.Int,
    xp: Schemas.Int,
    level: Schemas.Int,
    onboardingComplete: Schemas.Boolean,
    xpForNextLevel: Schemas.Int,
    blowing: Schemas.Boolean,
    intervalStartedAt: Schemas.Int64,
    intervalMs: Schemas.Int,
    kiteId: Schemas.String,
    kiteName: Schemas.String,
    kiteXpBonus: Schemas.Int,
    capacity: Schemas.Int,
    partyActive: Schemas.Boolean,
    showGreeting: Schemas.Boolean,
    greetingName: Schemas.String,
  }),
  balloonCompleted: Schemas.Map({
    carriedBalloons: Schemas.Int,
    lifetimeBalloons: Schemas.Int,
    balloonPoints: Schemas.Int,
    xp: Schemas.Int,
    level: Schemas.Int,
    awardedXp: Schemas.Int,
    intervalStartedAt: Schemas.Int64,
    intervalMs: Schemas.Int,
    kiteId: Schemas.String,
    kiteName: Schemas.String,
    kiteXpBonus: Schemas.Int,
    capacity: Schemas.Int,
    blowing: Schemas.Boolean,
  }),
  balloonStopped: Schemas.Map({
    reason: Schemas.String,
    carriedBalloons: Schemas.Int,
    blowing: Schemas.Boolean,
  }),
  employmentState: Schemas.Map({
    employed: Schemas.Boolean,
    result: Schemas.String,
  }),
  turnInResult: Schemas.Map({
    ok: Schemas.Boolean,
    result: Schemas.String,
    carriedBalloons: Schemas.Int,
    onboardingComplete: Schemas.Boolean,
  }),
  rewardResult: Schemas.Map({
    ok: Schemas.Boolean,
    result: Schemas.String,
    rewardKey: Schemas.String,
    balloonPoints: Schemas.Int,
  }),
  blowerLeaderboardRequest: Schemas.Map({
    intent: Schemas.String,
  }),
  leaderboardUpdate: Schemas.Map({
    payload: Schemas.String,
  }),
  upcomingPartiesRequest: Schemas.Map({
    intent: Schemas.String,
  }),
  upcomingPartiesState: Schemas.Map({
    payload: Schemas.String,
  }),
  refreshBlowingVisual: Schemas.Map({
    intent: Schemas.String,
  }),
  observerResumed: Schemas.Map({
    reason: Schemas.String,
  }),
  blowVisualJoin: Schemas.Map({
    intent: Schemas.String,
  }),
  kiteMintState: Schemas.Map({
    GREEN: Schemas.Int,
    DCL2: Schemas.Int,
    RED: Schemas.Int,
    LAVA: Schemas.Int,
    FROST: Schemas.Int,
    BLACK: Schemas.Int,
    CROSS: Schemas.Int,
  }),
  kiteStockRequest: Schemas.Map({
    intent: Schemas.String,
  }),
  redeemKiteReward: Schemas.Map({
    kiteId: Schemas.String,
  }),
  kiteRedeemResult: Schemas.Map({
    ok: Schemas.Boolean,
    result: Schemas.String,
    kiteId: Schemas.String,
    balloonPoints: Schemas.Int,
    status: Schemas.String,
    retrySafe: Schemas.Boolean,
    txHash: Schemas.String,
    lastError: Schemas.String,
  }),
  depositWarningSkipState: Schemas.Map({
    skip: Schemas.Boolean,
  }),
  setDepositWarningSkip: Schemas.Map({
    skip: Schemas.Boolean,
  }),
};

export const room = registerMessages(Messages);
