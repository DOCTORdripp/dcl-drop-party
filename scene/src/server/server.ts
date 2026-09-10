import {
  engine,
  Transform,
  timers,
} from "@dcl/sdk/ecs";
import { syncEntity } from "@dcl/sdk/network";
import { BalloonRuntime, PartyRoundHud, PopHud, ServerHeartbeat } from "../shared/schemas";
import { room } from "../shared/messages";
import {
  ELIGIBILITY_INTERVAL_MS,
  HEARTBEAT_INTERVAL_MS,
  PARTY_TICK_MS,
} from "../shared/constants";
import {
  CONVEX_SITE_URL,
  DROPPARTY_BUILD_ENV,
  convexSiteHost,
  resolveServerConvexSiteUrl,
} from "../shared/convexEnv";
import {
  isTrustedPlayableStatus,
  nextPartyPoll,
  partyPollFetchKind,
  partyPollIsDue,
  playablePartyEnded,
  shouldBootPartySnapshot,
  shouldForceJoinSnapshot,
} from "../shared/partyPoll";
import {
  claimFirstAvailable,
  createTrustedSession,
  trustedPartyAttendance,
  trustedPartySnapshot,
  trustedPartyTick,
} from "./convexBroker";
import { LiveBalloonRuntime } from "./gameState";
import { PopRetryLedger } from "./popRetry";
import { revalidatePopBeforeBroker } from "./popRevalidate";
import {
  MessageRateLimits,
  MAX_ADMISSION_TOKEN_CHARS,
  MAX_QUEUE_DEPTH_PER_WALLET,
  MAX_REQUEST_ID_CHARS,
  MAX_REWARD_KEY_CHARS,
  MAX_KITE_ID_CHARS,
} from "./messageLimits";
import { AuthoritativePresenceTracker } from "./presence";
import {
  BLOW_VISUAL_JOIN_REFRESH_MS,
  BLOW_VISUAL_OBSERVER_RESUME_DELAY_MS,
  LateJoinBlowVisualRefresh,
  isObserverResumeBlockedReason,
  parseObserverResumeReason,
  type BlowVisualRefreshCause,
  type BlowVisualRefreshTarget,
  type ObserverResumeReason,
} from "../shared/blowVisualRefresh";
import { getAuthoritativePlayer, listAuthoritativePlayers, presentAuthoritativePlayerCount } from "./playerState";
import { createHmacDrbg, randomHex, type RandomSource } from "./cryptoLite";
import { LEADERBOARD_BLOWERS_POLL_MS } from "../shared/leaderboardPoll";
import { leaderboardTargetsOnConnect, leaderboardTargetsOnRefresh } from "../shared/leaderboardState";
import {
  shouldForceJoinUpcomingFetch,
  shouldSendUpcomingSnapshot,
  upcomingMembershipMayHaveChanged,
  nextUpcomingScheduledAt,
} from "../shared/upcomingPartiesState";
import {
  attendanceSnapshotKey,
  dueAttendanceSnapshotPhase,
  type AttendancePartyAnchor,
} from "../shared/partyAttendance";
import {
  decideUpcomingServerFetch,
  emptyUpcomingPartiesCache,
  fetchUpcomingBrowseFromConvex,
  rememberUpcomingState,
  sendUpcomingPartiesState,
} from "./upcomingParties";
import {
  logLeaderboardRefreshRequested,
  logLeaderboardSendingUpdate,
  logLeaderboardSnapshotGenerated,
} from "../shared/leaderboardTrace";
import { requirePeerId } from "./peerId";
import { EligibilitySignal, recomputePopCandidates } from "./eligibilitySignal";
import {
  directorTransition,
  emitDirectorLogs,
  landingFor,
  type LiveSceneBalloon,
  type PartySnapshot,
} from "./partyDirector";
import {
  idlePartyHudPayload,
  interpretTrustedPartyResponse,
  nextBoundPartyState,
  type BoundPartyState,
} from "./partyBinding";
import { WaveSpawnLayout } from "../shared/spawnLayout";
import { resolveAuthoritativeStomp } from "../shared/stompPosition";
import { BalloonGameRuntime } from "./balloonGame";
import {
  kiteMintStockBroadcastScope,
  sanitizeKiteMintClientError,
} from "../shared/kiteMintRedemption";
import { fetchAuthoritativeKiteWearables } from "./kiteProfileFetch";
import { TableSocialRuntime } from "./tableSocial";
import { createDclBalloonPersist } from "./balloonStorage";
import { createConvexKiteMintChain } from "./convexKiteMint";
import { EXPECTED_KITE_MINTER_ADDRESS } from "../shared/kiteMintConfig";
import {
  playerDisplayName,
  sendBalloonCompleted,
  sendBalloonProfile,
  sendBalloonStopped,
  sendDepositWarningSkipState,
  sendKiteMintState,
  sendKiteRedeemResult,
  sendLeaderboardUpdate,
  sendEmploymentState,
  sendRewardResult,
  sendTurnInResult,
  sendTableSocialState,
} from "./balloonNet";
import { isInsideTableSurroundTrigger } from "../shared/tableSurroundTrigger";
import {
  NetworkAdmissionRegistry,
  verifyNetworkAdmissionToken,
} from "./networkAdmission";

type ServerEnv = {
  siteUrl: string;
  secret: string;
  partyId: string;
  admissionSigningSecret: string;
  admissionSigningSecretPrevious: string;
};

const sessions = new Map<string, string>();
const balloonEntities = new Map<string, ReturnType<typeof engine.addEntity>>();
const waveSpawns = new WaveSpawnLayout();
const eligibility = new EligibilitySignal();
const presence = new AuthoritativePresenceTracker();
const blowVisualRefresh = new LateJoinBlowVisualRefresh();
const networkAdmissions = new NetworkAdmissionRegistry();
const popRetry = new PopRetryLedger();
const messageLimits = new MessageRateLimits();
const leaderboardSentTo = new Set<string>();
const upcomingSentTo = new Set<string>();
let upcomingCache = emptyUpcomingPartiesCache();
let upcomingInFlight: Promise<void> | null = null;
const unresolvedPositionLoggedAt = new Map<string, number>();
const POSITION_LOG_COOLDOWN_MS = 2000;
const BLOWING_TICK_MS = 1000;
let balloonGame: BalloonGameRuntime | null = null;
const tableSocial = new TableSocialRuntime();
let partyIsActive = (): boolean => false;

async function hydrateBalloonPlayer(
  wallet: string,
  peerId: string,
  pushProfile = false,
): Promise<void> {
  if (!balloonGame) {
    return;
  }
  const existing = balloonGame.get(wallet);
  const shouldPush = pushProfile || !existing || !existing.present;
  const live = await balloonGame.hydrate({
    wallet,
    peerId,
    displayName: playerDisplayName(wallet),
  });
  if (shouldPush) {
    const wearables = await fetchAuthoritativeKiteWearables(wallet, live.profile.level);
    balloonGame.applyEquippedKite(wallet, wearables);
    sendBalloonProfile(live, partyIsActive());
    sendKiteMintState(
      balloonGame.getKiteMintCounts(),
      kiteMintStockBroadcastScope("join") === "peer" ? [peerId] : undefined,
    );
    const green = balloonGame.getKiteRedemptions(wallet).GREEN;
    sendKiteRedeemResult(peerId, {
      ok: green?.status === "CONFIRMED",
      result: green?.status === "CONFIRMED" ? "OK" : green?.status ?? "",
      kiteId: "GREEN",
      balloonPoints: live.profile.balloonPoints,
      status: green?.status ?? "",
      retrySafe: green ? green.status === "FAILED" : true,
      txHash: green?.txHash ?? "",
      lastError: green?.lastError ?? "",
    });
    sendTableSocialState(peerId, tableSocial.snapshot(), tableSocial.bonusFor(wallet));
    sendDepositWarningSkipState(peerId, live.skipDepositWarning);
  }
  await sendLeaderboardToConnectingPeer(peerId, pushProfile);
  sendUpcomingToConnectingPeer(peerId);
}

function sendUpcomingToConnectingPeer(peerId: string, force = false): void {
  if (!peerId || !upcomingCache.payload) {
    return;
  }
  if (!shouldSendUpcomingSnapshot(upcomingSentTo.has(peerId), force)) {
    return;
  }
  sendUpcomingPartiesState(upcomingCache.payload, [peerId]);
  upcomingSentTo.add(peerId);
}

async function sendLeaderboardToConnectingPeer(peerId: string, force = false): Promise<void> {
  if (!balloonGame) {
    return;
  }
  if (!force && leaderboardSentTo.has(peerId)) {
    return;
  }
  const targets = leaderboardTargetsOnConnect(peerId);
  if (targets.length === 0) {
    return;
  }
  logLeaderboardRefreshRequested(force ? "request" : "connect", { peerId });
  const now = Date.now();
  const entries = await balloonGame.currentLeaderboard(now);
  logLeaderboardSnapshotGenerated(entries.length, { source: "live" });
  leaderboardSentTo.add(peerId);
  for (const target of targets) {
    logLeaderboardSendingUpdate(target, entries.length);
  }
  sendLeaderboardUpdate(entries, { generatedAt: now, to: targets });
}

async function broadcastLeaderboardRefresh(): Promise<void> {
  if (!balloonGame) {
    return;
  }
  const peerIds = listAuthoritativePlayers().map((player) => player.peerId);
  const targets = leaderboardTargetsOnRefresh(peerIds);
  if (targets.length === 0) {
    return;
  }
  logLeaderboardRefreshRequested("interval", { peers: targets.length });
  const now = Date.now();
  const entries = await balloonGame.currentLeaderboard(now);
  logLeaderboardSnapshotGenerated(entries.length, { source: "live" });
  for (const peerId of targets) {
    logLeaderboardSendingUpdate(peerId, entries.length);
  }
  sendLeaderboardUpdate(entries, { generatedAt: now, to: targets });
}

async function ensureBalloonPlayer(wallet: string, peerId: string): Promise<void> {
  if (!balloonGame) {
    return;
  }
  await balloonGame.enqueue(wallet, () => hydrateBalloonPlayer(wallet, peerId));
}

async function loadEnv(): Promise<ServerEnv | null> {
  const { EnvVar } = await import("@dcl/sdk/server");
  const secret = await EnvVar.get("DROPPARTY_TRUSTED_SERVICE_SECRET");
  const admissionSigningSecret = await EnvVar.get("NETWORK_ADMISSION_SIGNING_SECRET");
  const admissionSigningSecretPrevious =
    (await EnvVar.get("NETWORK_ADMISSION_SIGNING_SECRET_PREVIOUS")) || "";
  const envSiteUrl = (await EnvVar.get("CONVEX_SITE_URL")) || "";
  const serverConvexOverride = (await EnvVar.get("DROPPARTY_SERVER_CONVEX")) || "";
  const resolvedSite = resolveServerConvexSiteUrl({
    envSiteUrl,
    nodeEnv: DROPPARTY_BUILD_ENV,
    serverConvexOverride,
  });
  const siteUrl = resolvedSite.siteUrl;
  const partyId = (await EnvVar.get("SYNTHETIC_PARTY_ID")) || "";
  if (!secret) {
    console.log("[SERVER] Missing DROPPARTY_TRUSTED_SERVICE_SECRET");
    return null;
  }
  if (!admissionSigningSecret || admissionSigningSecret.length < 32) {
    console.log("[SERVER] Missing NETWORK_ADMISSION_SIGNING_SECRET; reward admission unavailable");
  }
  console.log("[SERVER] ENV:", resolvedSite.env);
  console.log("[SERVER] CONVEX:", convexSiteHost(siteUrl));
  if (resolvedSite.ignoredEnvSiteUrl) {
    console.log("[SERVER] CONVEX_SITE_URL env ignored; using build-mode Convex site");
  }
  return {
    siteUrl,
    secret,
    partyId,
    admissionSigningSecret: admissionSigningSecret || "",
    admissionSigningSecretPrevious,
  };
}

function spawnLiveBalloon(
  runtime: LiveBalloonRuntime,
  partyId: string,
  balloon: {
    balloonId: string;
    waveId: string;
    spawnGeneration: string;
    spawnedAt: number;
  },
  waveNumber: number,
  waveBalloonIds: string[],
  avoid: Array<{ x: number; y: number; z: number }>,
) {
  if (runtime.get(balloon.balloonId)?.runtimeStatus === "SPAWNED") {
    return;
  }
  const position = landingFor(balloon, waveNumber, waveSpawns, partyId, waveBalloonIds, avoid);
  runtime.upsert({
    balloonId: balloon.balloonId,
    partyId,
    waveId: balloon.waveId,
    spawnGeneration: balloon.spawnGeneration,
    position,
    spawnedAt: balloon.spawnedAt,
    runtimeStatus: "SPAWNED",
  });
  if (balloonEntities.has(balloon.balloonId)) {
    return;
  }
  const entity = engine.addEntity();
  Transform.create(entity, { position: { ...position }, scale: { x: 1, y: 1, z: 1 } });
  BalloonRuntime.create(entity, {
    balloonId: balloon.balloonId,
    status: "SPAWNED",
    partyId,
    waveId: balloon.waveId,
    spawnedAt: balloon.spawnedAt,
  });
  syncEntity(entity, [Transform.componentId, BalloonRuntime.componentId]);
  balloonEntities.set(balloon.balloonId, entity);
}

function hideBalloon(balloonId: string, status: "CLAIMED" | "EXPIRED" = "CLAIMED") {
  const entity = balloonEntities.get(balloonId);
  if (!entity || !BalloonRuntime.has(entity)) {
    return;
  }
  BalloonRuntime.getMutable(entity).status = status;
}

function applyLiveSet(
  runtime: LiveBalloonRuntime,
  partyId: string,
  snapshot: PartySnapshot,
) {
  for (const balloonId of runtime.removeOtherPartyBalloons(partyId)) {
    hideBalloon(balloonId, "EXPIRED");
  }
  const liveIds = new Set(snapshot.liveBalloons.map((row) => row.balloonId));
  const byWave = new Map<string, LiveSceneBalloon[]>();
  for (const balloon of snapshot.liveBalloons) {
    const group = byWave.get(balloon.waveId) ?? [];
    group.push(balloon);
    byWave.set(balloon.waveId, group);
  }
  for (const group of byWave.values()) {
    const waveBalloonIds = group.map((row) => row.balloonId);
    const waveId = group[0]?.waveId;
    const avoid = runtime
      .listLive()
      .filter((row) => row.waveId !== waveId)
      .map((row) => row.position);
    for (const balloon of group) {
      spawnLiveBalloon(runtime, partyId, balloon, snapshot.waveNumber ?? 1, waveBalloonIds, avoid);
    }
  }
  for (const live of runtime.listLive()) {
    if (!liveIds.has(live.balloonId)) {
      runtime.markExpired(live.balloonId);
      hideBalloon(live.balloonId, "EXPIRED");
    }
  }
}

function writeIdlePartyHud() {
  writePartyHudPayload(idlePartyHudPayload());
}

function writePartyHud(snapshot: PartySnapshot, playerCount: number) {
  writePartyHudPayload({
    partyId: snapshot.partyId,
    status: snapshot.status,
    phase: snapshot.phase,
    headline: snapshot.headline,
    scheduledAt: snapshot.scheduledAt,
    startedAt: snapshot.startedAt ?? 0,
    wavePhaseEndsAt: snapshot.wavePhaseEndsAt ?? 0,
    nextWaveAt: snapshot.nextWaveAt ?? 0,
    finalWaveSpawnedAt: snapshot.finalWaveSpawnedAt ?? 0,
    finalBalloonExpiresAt: snapshot.finalBalloonExpiresAt ?? 0,
    waveNumber: snapshot.waveNumber ?? 0,
    isFinal: snapshot.isFinal === true,
    playerCount,
    liveCount: snapshot.liveBalloonCount,
  });
}

function writePartyHudPayload(payload: {
  partyId: string;
  status: string;
  phase: string;
  headline: string;
  scheduledAt: number;
  startedAt: number;
  wavePhaseEndsAt: number;
  nextWaveAt: number;
  finalWaveSpawnedAt: number;
  finalBalloonExpiresAt: number;
  waveNumber: number;
  isFinal: boolean;
  playerCount: number;
  liveCount: number;
}) {
  let entity: ReturnType<typeof engine.addEntity> | undefined;
  for (const [existing] of engine.getEntitiesWith(PartyRoundHud)) {
    entity = existing;
    break;
  }
  if (!entity) {
    entity = engine.addEntity();
    PartyRoundHud.create(entity, payload);
    syncEntity(entity, [PartyRoundHud.componentId]);
    return;
  }
  const hud = PartyRoundHud.getMutable(entity);
  hud.partyId = payload.partyId;
  hud.status = payload.status;
  hud.phase = payload.phase;
  hud.headline = payload.headline;
  hud.scheduledAt = payload.scheduledAt;
  hud.startedAt = payload.startedAt;
  hud.wavePhaseEndsAt = payload.wavePhaseEndsAt;
  hud.nextWaveAt = payload.nextWaveAt;
  hud.finalWaveSpawnedAt = payload.finalWaveSpawnedAt;
  hud.finalBalloonExpiresAt = payload.finalBalloonExpiresAt;
  hud.waveNumber = payload.waveNumber;
  hud.isFinal = payload.isFinal;
  hud.playerCount = payload.playerCount;
  hud.liveCount = payload.liveCount;
}

function setHud(wallet: string, count: number) {
  let entity: ReturnType<typeof engine.addEntity> | undefined;
  for (const [existing, hud] of engine.getEntitiesWith(PopHud)) {
    if (hud.playerId.toLowerCase() === wallet) {
      entity = existing;
      break;
    }
  }
  if (!entity) {
    entity = engine.addEntity();
    PopHud.create(entity, { playerId: wallet, eligibleCount: count, visible: count > 0 });
    syncEntity(entity, [PopHud.componentId]);
    return;
  }
  const hud = PopHud.getMutable(entity);
  hud.eligibleCount = count;
  hud.visible = count > 0;
}

function logPlayerEligibility(
  peerId: string,
  args: { positionAvailable: boolean; position?: { x: number; y: number; z: number }; eligibleCount: number },
) {
  console.log("[SERVER] player authoritative", {
    peerId,
    positionAvailable: args.positionAvailable,
    position: args.position,
    eligibleCount: args.eligibleCount,
  });
}

function publishCount(
  wallet: string,
  peerId: string,
  count: number,
  args: { positionAvailable: boolean; position?: { x: number; y: number; z: number } },
) {
  const update = eligibility.note(peerId, count);
  if (!update) {
    return;
  }
  setHud(wallet, update.eligibleCount);
  room.send("eligibleCount", { count: update.eligibleCount }, { to: [peerId] });
  logPlayerEligibility(peerId, {
    positionAvailable: args.positionAvailable,
    position: args.position,
    eligibleCount: update.eligibleCount,
  });
}

function fireLateJoinBlowVisualRefresh(
  targets: readonly BlowVisualRefreshTarget[],
  intent: "existing" | "joiner-self",
  cause: BlowVisualRefreshCause,
): void {
  if (targets.length > 0) {
    logBlowVisualCause(cause, targets.length);
  }
  for (const target of targets) {
    const live = balloonGame?.get(target.wallet);
    if (!live?.blowing) {
      console.log("[blow-sync] skip send", {
        wallet: target.wallet,
        peerId: target.peerId,
        intent,
        cause,
        reason: live ? "not-blowing" : "no-session",
      });
      if (intent === "existing") {
        blowVisualRefresh.cancelExistingPending(target.wallet);
      } else {
        blowVisualRefresh.cancelJoinerSelfPending(target.wallet);
      }
      continue;
    }
    if (intent === "existing") {
      console.log("[blow-sync] existing blower refresh", {
        wallet: target.wallet,
        peerId: target.peerId,
        cause,
      });
      room.send("refreshBlowingVisual", { intent: "existing" }, { to: [target.peerId] });
      blowVisualRefresh.markExistingSent(target.wallet, Date.now());
      continue;
    }
    if (!blowVisualRefresh.isJoinerSelfPending(target.wallet)) {
      continue;
    }
    console.log("[blow-sync] joiner self refresh", {
      wallet: target.wallet,
      peerId: target.peerId,
    });
    room.send("refreshBlowingVisual", { intent: "joiner-self" }, { to: [target.peerId] });
    blowVisualRefresh.markJoinerSelfSent(target.wallet);
  }
}

function logBlowVisualCause(cause: BlowVisualRefreshCause, count: number): void {
  if (cause === "join-10s") {
    console.log("[blow-sync] join refresh 10s", { count });
    return;
  }
  if (cause === "deposit-chest-return") {
    console.log("[blow-sync] deposit-chest-return refresh 4s", { count });
    return;
  }
  if (cause === "turn-in-return") {
    console.log("[blow-sync] turn-in-return refresh 4s", { count });
  }
}

function fireJoinExistingWave(epochId: number, cause: "join-10s"): void {
  if (!blowVisualRefresh.isJoinEpochActive(epochId)) {
    console.log("[blow-sync] join wave skipped - epoch gone", { cause, epochId });
    return;
  }
  const players = listAuthoritativePlayers();
  const existing = blowVisualRefresh.planExistingBlowers({
    players,
    blowingWallets: currentBlowingWallets(players),
    excludeWallets: blowVisualRefresh.joinersForEpoch(epochId),
    now: Date.now(),
  });
  if (existing.length === 0) {
    console.log("[blow-sync] join wave skipped - no existing blowers", { cause, epochId });
    return;
  }
  fireLateJoinBlowVisualRefresh(existing, "existing", cause);
}

function noteLateJoinBlowVisualRefresh(
  players: { wallet: string; peerId: string }[],
  now: number,
): void {
  const blowingWallets = currentBlowingWallets(players);
  const plan = blowVisualRefresh.onPresence({
    players,
    blowingWallets,
    now,
  });
  if (plan.joiners.length === 0) {
    return;
  }
  for (const joiner of plan.joiners) {
    console.log("[blow-sync] late join", joiner);
  }
  console.log("[blow-sync] join snapshot", {
    joiners: plan.joiners,
    epochId: plan.epochId,
    dueAt: blowVisualRefresh.joinEpochDueAt(plan.epochId),
    playerCount: players.length,
    blowing: blowingWallets,
    existing: plan.existing.map((target) => target.wallet),
    joinerSelf: plan.joinerSelf.map((target) => target.wallet),
  });
}

function noteClientReadyBlowVisualRefresh(wallet: string, peerId: string, now: number): void {
  const players = listAuthoritativePlayers();
  const blowingWallets = currentBlowingWallets(players);
  const plan = blowVisualRefresh.onClientReady({
    wallet,
    peerId,
    players,
    blowingWallets,
    now,
  });
  if (plan.joiners.length === 0) {
    return;
  }
  console.log("[blow-sync] client-ready join", {
    joiners: plan.joiners,
    epochId: plan.epochId,
    dueAt: blowVisualRefresh.joinEpochDueAt(plan.epochId),
    existing: plan.existing.map((target) => target.wallet),
    joinerSelf: plan.joinerSelf.map((target) => target.wallet),
  });
}

function fireDueBlowVisualRefresh(now: number): void {
  const players = listAuthoritativePlayers();
  for (const epochId of blowVisualRefresh.consumeDueJoinEpochs(now)) {
    fireJoinExistingWave(epochId, "join-10s");
  }
  const joinerSelf = blowVisualRefresh.consumeDueJoinerSelf(now, players);
  if (joinerSelf.length > 0) {
    fireLateJoinBlowVisualRefresh(joinerSelf, "joiner-self", "joiner-self");
  }
}

function currentBlowingWallets(players: readonly { wallet: string }[]): string[] {
  if (!balloonGame) {
    return [];
  }
  return players.filter((player) => balloonGame!.get(player.wallet)?.blowing).map((player) => player.wallet);
}

function noteObserverResumeBlowVisual(
  observerWallet: string,
  reason: ObserverResumeReason,
  now = Date.now(),
): void {
  const players = listAuthoritativePlayers();
  const plan = blowVisualRefresh.onObserverResume({
    observerWallet,
    reason,
    players,
    blowingWallets: currentBlowingWallets(players),
    now,
  });
  if (plan.skipped) {
    return;
  }
  const token = plan.token;
  console.log("[blow-sync] observer resume scheduled", {
    reason,
    observer: observerWallet,
    delayMs: BLOW_VISUAL_OBSERVER_RESUME_DELAY_MS,
    token,
  });
  timers.setTimeout(() => {
    const still = blowVisualRefresh.consumeObserverResume(observerWallet, token);
    if (!still) {
      console.log("[blow-sync] observer resume skipped - cancelled", {
        reason,
        observer: observerWallet,
        token,
      });
      return;
    }
    const livePlayers = listAuthoritativePlayers();
    const observerId = observerWallet.toLowerCase();
    if (!livePlayers.some((player) => player.wallet.toLowerCase() === observerId)) {
      console.log("[blow-sync] observer resume skipped - observer gone", {
        reason,
        observer: observerWallet,
      });
      return;
    }
    const existing = blowVisualRefresh.planExistingBlowers({
      players: livePlayers,
      blowingWallets: currentBlowingWallets(livePlayers),
      excludeWallets: [observerWallet],
      now: Date.now(),
    });
    fireLateJoinBlowVisualRefresh(existing, "existing", reason);
  }, BLOW_VISUAL_OBSERVER_RESUME_DELAY_MS);
}

function publishEligibility(runtime: LiveBalloonRuntime) {
  const now = Date.now();
  const players = listAuthoritativePlayers();
  const activeWallets = players.map((player) => player.wallet);
  networkAdmissions.retain(activeWallets);
  const left = presence.retain(activeWallets);
  eligibility.retain(activeWallets);
  for (const departed of left) {
    runtime.forgetPlayer(departed.wallet);
    popRetry.forget(departed.wallet);
    messageLimits.forget(departed.wallet);
    unresolvedPositionLoggedAt.delete(departed.wallet);
    publishCount(departed.wallet, departed.peerId, 0, { positionAvailable: false });
    tableSocial.forget(departed.wallet);
    if (balloonGame) {
      void balloonGame.enqueue(departed.wallet, () => balloonGame!.leave(departed.wallet));
    }
    leaderboardSentTo.delete(departed.peerId);
    upcomingSentTo.delete(departed.peerId);
  }
  if (left.length > 0) {
    tableSocial.reconcile(
      players.map((player) => ({
        wallet: player.wallet,
        present: player.entityPresent,
        position: player.entityPresent ? player.position : undefined,
      })),
    );
  }
  for (const player of players) {
    void ensureBalloonPlayer(player.wallet, player.peerId);
  }
  noteLateJoinBlowVisualRefresh(players, now);
  fireDueBlowVisualRefresh(now);

  for (const player of players) {
    let snapshot;
    try {
      snapshot = presence.observe(
        {
          wallet: player.wallet,
          peerId: player.peerId,
          readSucceeded: player.entityPresent,
          position: player.entityPresent ? player.position : undefined,
        },
        now,
      );
    } catch {
      publishCount(player.wallet, player.peerId, 0, {
        positionAvailable: false,
        position: player.position,
      });
      continue;
    }

    if (player.entityPresent && snapshot.positionFresh) {
      runtime.observePlayer(player.wallet, snapshot.position, snapshot.lastAuthoritativeReadAt);
    }

    if (!snapshot.positionFresh) {
      const last = unresolvedPositionLoggedAt.get(player.wallet) ?? 0;
      if (now - last >= POSITION_LOG_COOLDOWN_MS) {
        unresolvedPositionLoggedAt.set(player.wallet, now);
        logPlayerEligibility(player.peerId, { positionAvailable: false, eligibleCount: 0 });
      }
      publishCount(player.wallet, player.peerId, 0, { positionAvailable: false });
      continue;
    }

    unresolvedPositionLoggedAt.delete(player.wallet);
    const count = requireRewardAdmission(player.wallet)
      ? runtime.eligibleCount(snapshot.position, now)
      : 0;
    publishCount(player.wallet, player.peerId, count, {
      positionAvailable: true,
      position: snapshot.position,
    });
  }
}

function requireRewardAdmission(wallet: string): boolean {
  return networkAdmissions.isAdmitted(wallet);
}

function rewardAdmittedPlayerCount(): number {
  return listAuthoritativePlayers().filter((player) =>
    requireRewardAdmission(player.wallet),
  ).length;
}

async function sessionFor(
  env: ServerEnv,
  wallet: string,
  randomBytes: RandomSource,
): Promise<{ sessionId: string } | { sessionId: null; status?: number; error: string; cached?: boolean }> {
  const cached = sessions.get(wallet);
  if (cached) {
    return { sessionId: cached };
  }
  const created = await createTrustedSession({
    siteUrl: env.siteUrl,
    secret: env.secret,
    wallet,
    randomBytes,
  });
  if (created.sessionId) {
    sessions.set(wallet, created.sessionId);
    return { sessionId: created.sessionId };
  }
  return created;
}

export async function startServer(): Promise<void> {
  console.log("[SERVER] DropParty Multiplayer Server starting");
  const { Storage } = await import("@dcl/sdk/server");
  const persist = createDclBalloonPersist(Storage);
  balloonGame = new BalloonGameRuntime(persist);
  await balloonGame.loadLeaderboard();
  await balloonGame.loadKiteMintLedger();
  const env = await loadEnv();
  const randomBytes = env ? createHmacDrbg(env.secret) : null;
  if (env && randomBytes) {
    balloonGame.setKiteMintChain(
      createConvexKiteMintChain({
        siteUrl: env.siteUrl,
        secret: env.secret,
        randomBytes,
      }),
    );
    console.log(
      `[KITE MINT] ${JSON.stringify({
        configured: true,
        submitter: "convex",
        expectedMinter: EXPECTED_KITE_MINTER_ADDRESS,
        path: "/trusted/kite-mint",
      })}`,
    );
  } else {
    console.log(
      `[KITE MINT] not configured ${JSON.stringify({
        error: "Convex trusted env missing",
        expectedMinter: EXPECTED_KITE_MINTER_ADDRESS,
        hint: "Kite issuance is submitted by the private service. The DCL runtime only requests the trusted mint endpoint.",
      })}`,
    );
  }
  const runtime = new LiveBalloonRuntime(
    randomBytes ? randomHex(16, randomBytes) : `unconfigured-${Date.now()}`,
  );
  const pinnedPartyId = env?.partyId ?? "";
  let bind: BoundPartyState = { partyId: pinnedPartyId, lastSnapshot: null };
  let completedSince: number | null = null;
  let completedConfirmCount = 0;
  let pendingUpcomingFromPlayable = false;
  const attendanceSent = new Set<string>();
  const attendanceInFlight = new Set<string>();
  let attendanceBatchInFlight = false;
  partyIsActive = () => bind.lastSnapshot?.status === "ACTIVE";

  function tableSocialPlayers() {
    return listAuthoritativePlayers()
      .filter((player) => requireRewardAdmission(player.wallet))
      .map((player) => ({
        wallet: player.wallet,
        present: player.entityPresent,
        position: player.entityPresent ? player.position : undefined,
      }));
  }

  function broadcastTableSocial(force = false): void {
    if (!force && !tableSocial.takeChanged()) {
      return;
    }
    if (force) {
      tableSocial.takeChanged();
    }
    const snapshot = tableSocial.snapshot();
    for (const player of listAuthoritativePlayers()) {
      sendTableSocialState(player.peerId, snapshot, tableSocial.bonusFor(player.wallet));
    }
  }

  function syncTableSocial(force = false): void {
    tableSocial.reconcile(tableSocialPlayers());
    broadcastTableSocial(force);
  }

  function sendTableSocialToPeer(peerId: string, wallet: string): void {
    sendTableSocialState(peerId, tableSocial.snapshot(), tableSocial.bonusFor(wallet));
  }

  function sendTableSeatResult(
    peerId: string,
    requestId: string,
    accepted: boolean,
    chairId: number,
    reason: string,
  ): void {
    room.send(
      "tableSeatResult",
      { requestId, accepted, chairId, reason },
      { to: [peerId] },
    );
  }

  function notifyPartyCancelledBlowing() {
    if (!balloonGame) {
      return;
    }
    for (const stopped of balloonGame.cancelAllForParty()) {
      tableSocial.endSession(stopped.wallet);
      sendBalloonStopped(stopped.peerId, "party", stopped.profile.carriedBalloons);
      const live = balloonGame.get(stopped.wallet);
      if (live) {
        sendBalloonProfile(live, true);
      }
    }
    broadcastTableSocial();
  }

  function resetLiveRuntime() {
    for (const live of runtime.listLive()) {
      hideBalloon(live.balloonId, "EXPIRED");
    }
    runtime.clearBalloons();
  }

  function applyTickResult(status: number, json: unknown, now: number) {
    const interpreted = interpretTrustedPartyResponse(status, json);
    if (interpreted.kind === "error") {
      console.log("[SERVER] party tick/snapshot error; keeping last playable state", { status });
      return;
    }
    const next = nextBoundPartyState(bind, interpreted, pinnedPartyId);
    if (next.resetRuntime) {
      resetLiveRuntime();
    }
    const previous = bind.lastSnapshot;
    bind = next.next;
    if (upcomingMembershipMayHaveChanged(previous, bind.lastSnapshot)) {
      pendingUpcomingFromPlayable = true;
    }
    if (previous?.status !== "ACTIVE" && bind.lastSnapshot?.status === "ACTIVE") {
      notifyPartyCancelledBlowing();
    }
    if (next.applySnapshot && isTrustedPlayableStatus(next.applySnapshot.status)) {
      completedSince = null;
      completedConfirmCount = 0;
    } else if (playablePartyEnded(previous, next.writeIdle ? { empty: true } : next.applySnapshot)) {
      completedSince = completedSince ?? now;
    } else if (next.writeIdle && completedSince != null) {
      completedConfirmCount += 1;
    }
    if (next.writeIdle) {
      if (previous?.status === "ACTIVE") {
        notifyPartyCancelledBlowing();
      }
      writeIdlePartyHud();
      return;
    }
    if (!next.applySnapshot) {
      return;
    }
    const snapshot = next.applySnapshot;
    const logs = directorTransition(previous, snapshot, now);
    emitDirectorLogs(logs);
    applyLiveSet(runtime, snapshot.partyId, snapshot);
    writePartyHud(snapshot, rewardAdmittedPlayerCount());
  }

  async function refreshUpcoming(opts: { force?: boolean; coalesce?: boolean; to?: readonly string[] } = {}): Promise<void> {
    const occupied = listAuthoritativePlayers().length > 0;
    const now = Date.now();
    const decision = decideUpcomingServerFetch({
      occupied,
      lastFetchAt: upcomingCache.lastFetchAt,
      now,
      force: opts.force,
      coalesce: opts.coalesce,
    });
    if (!decision.fetchConvex) {
      if (opts.to && opts.to.length > 0 && upcomingCache.payload) {
        sendUpcomingPartiesState(upcomingCache.payload, opts.to);
        for (const peerId of opts.to) {
          upcomingSentTo.add(peerId);
        }
      }
      return;
    }
    if (upcomingInFlight) {
      await upcomingInFlight;
      if (opts.to && opts.to.length > 0 && upcomingCache.payload) {
        sendUpcomingPartiesState(upcomingCache.payload, opts.to);
        for (const peerId of opts.to) {
          upcomingSentTo.add(peerId);
        }
      }
      return;
    }
    upcomingInFlight = (async () => {
      const fetched = await fetchUpcomingBrowseFromConvex(env?.siteUrl ?? CONVEX_SITE_URL);
      if (!fetched) {
        return;
      }
      const remembered = rememberUpcomingState(upcomingCache, fetched, Date.now());
      upcomingCache = remembered.cache;
      const players = listAuthoritativePlayers();
      if (remembered.changed) {
        sendUpcomingPartiesState(upcomingCache.payload);
        for (const player of players) {
          upcomingSentTo.add(player.peerId);
        }
        return;
      }
      const unsynced = players.map((player) => player.peerId).filter((peerId) => !upcomingSentTo.has(peerId));
      const extra = (opts.to ?? []).filter((peerId) => !upcomingSentTo.has(peerId));
      const targets = [...new Set([...unsynced, ...extra])];
      if (targets.length > 0) {
        sendUpcomingPartiesState(upcomingCache.payload, targets);
        for (const peerId of targets) {
          upcomingSentTo.add(peerId);
        }
      }
    })();
    try {
      await upcomingInFlight;
    } finally {
      upcomingInFlight = null;
    }
  }

  if (env && randomBytes && shouldBootPartySnapshot(listAuthoritativePlayers().length)) {
    const rebuilt = await trustedPartySnapshot({
      siteUrl: env.siteUrl,
      secret: env.secret,
      partyId: pinnedPartyId || undefined,
      randomBytes,
    });
    applyTickResult(rebuilt.status, rebuilt.json, Date.now());
    console.log("[SERVER] rebuilt live balloons from snapshot", {
      count: runtime.listLive().length,
      partyId: bind.lastSnapshot?.partyId ?? null,
    });
  } else if (env && randomBytes) {
    console.log("[SERVER] skip boot party snapshot; scene empty");
  } else {
    console.log("[SERVER] No trusted secret. Claims fail closed.");
  }

  const heartbeatEntity = engine.addEntity();
  ServerHeartbeat.create(heartbeatEntity, { tick: Date.now() });
  syncEntity(heartbeatEntity, [ServerHeartbeat.componentId]);
  timers.setInterval(() => {
    if (ServerHeartbeat.has(heartbeatEntity)) {
      ServerHeartbeat.getMutable(heartbeatEntity).tick = Date.now();
    }
  }, HEARTBEAT_INTERVAL_MS);
  timers.setInterval(() => {
    publishEligibility(runtime);
    syncTableSocial();
    if (bind.lastSnapshot) {
      writePartyHud(bind.lastSnapshot, rewardAdmittedPlayerCount());
    } else {
      writeIdlePartyHud();
    }
  }, ELIGIBILITY_INTERVAL_MS);
  const dueKiteFetchPending = new Set<string>();

  function kiteFieldsFor(wallet: string): { kiteId: string; kiteName: string; kiteXpBonus: number; capacity: number } {
    const view = balloonGame!.kiteView(wallet);
    return {
      kiteId: view.kiteId,
      kiteName: view.kiteName,
      kiteXpBonus: view.kiteXpBonus,
      capacity: view.capacity,
    };
  }

  function emitBalloonTickEvents(
    events: Array<{
      type: "completed" | "stopped" | "greeting";
      wallet: string;
      peerId: string;
      profile?: { carriedBalloons: number };
      awardedXp?: number;
      intervalStartedAt?: number;
      intervalMs?: number;
      reason?: "stop" | "cap" | "party" | "leave" | "restart";
    }>,
  ): void {
    for (const event of events) {
      const live = balloonGame!.get(event.wallet);
      if (event.type === "completed") {
        if (!live) {
          continue;
        }
        sendBalloonCompleted(
          event.peerId,
          live.profile,
          event.awardedXp ?? 0,
          event.intervalStartedAt ?? 0,
          (event.intervalStartedAt ?? 0) > 0,
          event.intervalMs,
          kiteFieldsFor(event.wallet),
        );
        if ((event.intervalStartedAt ?? 0) > 0 && blowVisualRefresh.noteFreshEmote(event.wallet)) {
          console.log("[blow-sync] joiner self refresh skipped - fresh emote already emitted", {
            wallet: event.wallet,
          });
        }
        void balloonGame!.flush(live);
        sendBalloonProfile(live, partyIsActive());
        sendTableSocialToPeer(event.peerId, event.wallet);
      }
      if (event.type === "stopped") {
        tableSocial.endSession(event.wallet);
        sendBalloonStopped(event.peerId, event.reason ?? "stop", event.profile?.carriedBalloons ?? 0);
      }
    }
  }

  timers.setInterval(() => {
    if (!balloonGame) {
      return;
    }
    const now = Date.now();
    syncTableSocial();
    const present = listAuthoritativePlayers().map((player) => ({
      wallet: player.wallet,
      peerId: player.peerId,
    }));
    const events = balloonGame.tick(
      now,
      present,
      partyIsActive(),
      (wallet) => tableSocial.bonusFor(wallet),
      (wallet) => requireRewardAdmission(wallet),
      () => [],
      { completeDue: false },
    );
    emitBalloonTickEvents(events);
    for (const wallet of balloonGame.dueBlowingWallets(now)) {
      if (dueKiteFetchPending.has(wallet)) {
        continue;
      }
      dueKiteFetchPending.add(wallet);
      void balloonGame.enqueue(wallet, async () => {
        try {
          const live = balloonGame!.get(wallet);
          if (!live?.blowing) {
            return;
          }
          const cycleStartedAt = live.intervalStartedAt;
          if (cycleStartedAt <= 0 || !balloonGame!.isDue(wallet, Date.now())) {
            return;
          }
          const wearables = await fetchAuthoritativeKiteWearables(wallet, live.profile.level);
          const dueNow = Date.now();
          if (!balloonGame!.canCompleteCycle(wallet, cycleStartedAt, dueNow)) {
            return;
          }
          const result = balloonGame!.completeIfDue(
            wallet,
            dueNow,
            partyIsActive(),
            tableSocial.bonusFor(wallet),
            wearables,
            cycleStartedAt,
          );
          if (result.completed) {
            balloonGame!.recordCompletedBalloon(wallet, Date.now());
            emitBalloonTickEvents([
              {
                type: "completed",
                wallet: live.wallet,
                peerId: live.peerId,
                profile: live.profile,
                awardedXp: result.completed.awardedXp,
                intervalStartedAt: result.intervalStartedAt,
                intervalMs: result.intervalMs,
              },
            ]);
          }
          if (result.stopped) {
            emitBalloonTickEvents([
              {
                type: "stopped",
                wallet: live.wallet,
                peerId: live.peerId,
                profile: live.profile,
                reason: result.stopped,
              },
            ]);
          }
        } finally {
          dueKiteFetchPending.delete(wallet);
        }
      });
    }
    broadcastTableSocial();
    void balloonGame.flushDirty();
  }, BLOWING_TICK_MS);
  let lastPartyNetworkAt = Date.now();
  let partyNetworkInFlight = false;
  let lastAuthoritativePlayerCount = 0;
  let pendingJoinSnapshot = false;
  let lastUpcomingPlayerCount = 0;

  function attendanceAnchors(): AttendancePartyAnchor[] {
    const anchors: AttendancePartyAnchor[] = upcomingCache.state.parties.map((party) => ({
      partyId: party.partyId,
      scheduledAt: party.scheduledAt,
      status: party.status,
      lineupLocksAt: party.lineupLocksAt,
      attendancePrecheckAt: party.attendancePrecheckAt,
      isLineupLocked: party.isLineupLocked,
    }));
    const snapshot = bind.lastSnapshot;
    if (snapshot?.partyId && typeof snapshot.scheduledAt === "number" && Number.isFinite(snapshot.scheduledAt)) {
      anchors.push({
        partyId: snapshot.partyId,
        scheduledAt: snapshot.scheduledAt,
        status: snapshot.status,
      });
    }
    return anchors;
  }

  function hasUnsentLockAttendance(now: number): boolean {
    const seen = new Set<string>();
    for (const party of attendanceAnchors()) {
      if (seen.has(party.partyId)) {
        continue;
      }
      seen.add(party.partyId);
      if (dueAttendanceSnapshotPhase(party, now) !== "LOCK") {
        continue;
      }
      const key = attendanceSnapshotKey(party.partyId, "LOCK");
      if (!attendanceSent.has(key)) {
        return true;
      }
    }
    return false;
  }

  async function sendDueAttendanceSnapshots(now: number): Promise<void> {
    if (!env || !randomBytes) {
      return;
    }
    const seen = new Set<string>();
    const jobs: Promise<void>[] = [];
    for (const party of attendanceAnchors()) {
      if (seen.has(party.partyId)) {
        continue;
      }
      seen.add(party.partyId);
      const phase = dueAttendanceSnapshotPhase(party, now);
      if (!phase) {
        continue;
      }
      const key = attendanceSnapshotKey(party.partyId, phase);
      if (attendanceSent.has(key) || attendanceInFlight.has(key)) {
        continue;
      }
      if (phase === "LOCK") {
        attendanceSent.add(attendanceSnapshotKey(party.partyId, "PRECHECK"));
      }
      attendanceInFlight.add(key);
      jobs.push(
        trustedPartyAttendance({
          siteUrl: env.siteUrl,
          secret: env.secret,
          partyId: party.partyId,
          phase,
          playerCount: presentAuthoritativePlayerCount(),
          randomBytes,
        })
          .then((fetched) => {
            if (fetched.status >= 200 && fetched.status < 300) {
              attendanceSent.add(key);
            }
          })
          .finally(() => {
            attendanceInFlight.delete(key);
          }),
      );
    }
    if (jobs.length > 0) {
      await Promise.all(jobs);
    }
  }

  timers.setInterval(() => {
    const playerCount = listAuthoritativePlayers().length;
    if (shouldForceJoinUpcomingFetch(lastUpcomingPlayerCount, playerCount)) {
      void refreshUpcoming({ force: true });
    } else if (pendingUpcomingFromPlayable) {
      pendingUpcomingFromPlayable = false;
      void refreshUpcoming({ force: true });
    } else {
      void refreshUpcoming();
    }
    lastUpcomingPlayerCount = playerCount;
    if (!env || !randomBytes) {
      return;
    }
    if (shouldForceJoinSnapshot(lastAuthoritativePlayerCount, playerCount)) {
      pendingJoinSnapshot = true;
    }
    if (playerCount <= 0) {
      pendingJoinSnapshot = false;
      pendingUpcomingFromPlayable = false;
      completedSince = null;
      completedConfirmCount = 0;
    }
    lastAuthoritativePlayerCount = playerCount;
    const now = Date.now();
    const runPartyPoll = () => {
      if (partyNetworkInFlight) {
        return;
      }
      const snapshot = bind.lastSnapshot;
      const decision = nextPartyPoll({
        now,
        status: snapshot?.status,
        scheduledAt: snapshot?.scheduledAt,
        nextScheduledAt: nextUpcomingScheduledAt(upcomingCache.state.parties, now),
        partyId: snapshot?.partyId ?? (bind.partyId || null),
        empty: !snapshot,
        completedSince,
        completedConfirmCount,
        authoritativePlayerCount: playerCount,
        forceImmediateSnapshot: pendingJoinSnapshot,
      });
      const fetchKind = partyPollFetchKind(decision);
      if (fetchKind === "none" || !partyPollIsDue(lastPartyNetworkAt, decision.intervalMs, now)) {
        return;
      }
      lastPartyNetworkAt = now;
      partyNetworkInFlight = true;
      if (pendingJoinSnapshot) {
        pendingJoinSnapshot = false;
      }
      const fetchParty = fetchKind === "tick" ? trustedPartyTick : trustedPartySnapshot;
      void fetchParty({
        siteUrl: env.siteUrl,
        secret: env.secret,
        partyId: pinnedPartyId || undefined,
        randomBytes,
      })
        .then((fetched) => applyTickResult(fetched.status, fetched.json, Date.now()))
        .finally(() => {
          partyNetworkInFlight = false;
        });
    };
    const waitForLock = hasUnsentLockAttendance(now);
    if (!attendanceBatchInFlight) {
      attendanceBatchInFlight = true;
      if (waitForLock) {
        void sendDueAttendanceSnapshots(now)
          .then(() => runPartyPoll())
          .finally(() => {
            attendanceBatchInFlight = false;
          });
        return;
      }
      void sendDueAttendanceSnapshots(now).finally(() => {
        attendanceBatchInFlight = false;
      });
    } else if (waitForLock) {
      return;
    }
    runPartyPoll();
  }, PARTY_TICK_MS);
  timers.setInterval(() => {
    void broadcastLeaderboardRefresh();
  }, LEADERBOARD_BLOWERS_POLL_MS);
  publishEligibility(runtime);

  room.onMessage("admissionRequest", (data, context) => {
    const peerId = requirePeerId(context);
    if (!peerId) {
      return;
    }
    if (!getAuthoritativePlayer(peerId)) {
      console.log("[SERVER] admissionResult", {
        reason: "PLAYER_NOT_READY",
        instanceId: runtime.runtimeInstanceId,
      });
      room.send("admissionResult", { admitted: false, reason: "PLAYER_NOT_READY" }, { to: [peerId] });
      return;
    }
    console.log("[SERVER] admissionRequest received");
    const wallet = peerId.toLowerCase();
    if (!messageLimits.allow("admissionRequest", wallet).allowed) {
      return;
    }
    if (typeof data.token !== "string" || data.token.length > MAX_ADMISSION_TOKEN_CHARS) {
      console.log("[SERVER] admissionResult", {
        reason: "INVALID_TOKEN",
        instanceId: runtime.runtimeInstanceId,
      });
      room.send("admissionResult", { admitted: false, reason: "INVALID_TOKEN" }, { to: [peerId] });
      return;
    }
    const verified = verifyNetworkAdmissionToken({
      token: data.token,
      expectedWallet: wallet,
      signingSecrets: env
        ? [env.admissionSigningSecret, env.admissionSigningSecretPrevious]
        : [],
    });
    if (!verified.ok) {
      console.log("[SERVER] admissionResult", {
        reason: verified.reason,
        instanceId: runtime.runtimeInstanceId,
      });
      room.send(
        "admissionResult",
        { admitted: false, reason: verified.reason },
        { to: [peerId] },
      );
      return;
    }
    const reason = networkAdmissions.admit(verified.payload);
    console.log("[SERVER] admissionResult", {
      reason,
      network: verified.payload.networkHash.slice(0, 8),
      occupancy: networkAdmissions.networkSize(verified.payload.networkHash),
      instanceId: runtime.runtimeInstanceId,
    });
    room.send(
      "admissionResult",
      { admitted: reason === "ADMITTED", reason },
      { to: [peerId] },
    );
  });

  room.onMessage("popAttempt", async (_data, context) => {
    const peerId = requirePeerId(context);
    console.log("[SERVER] popAttempt received", { peerId: peerId ?? "missing" });
    if (!peerId) {
      return;
    }
    const wallet = peerId.toLowerCase();
    let resultSent = false;
    const sendResult = (
      result: string,
      extra?: {
        balloonId?: string;
        claimId?: string;
        revealType?: string;
        revealName?: string;
        announceTier?: string;
        dclRarity?: string;
        stompPosition?: { x: number; y: number; z: number };
      },
    ) => {
      if (resultSent) {
        return;
      }
      resultSent = true;
      console.log("[SERVER] sending popResult", { result });
      room.send(
        "popResult",
        {
          result,
          balloonId: extra?.balloonId ?? "",
          claimId: extra?.claimId ?? "",
          revealType: extra?.revealType ?? "",
          revealName: extra?.revealName ?? "",
          announceTier: extra?.announceTier ?? "",
          dclRarity: extra?.dclRarity ?? "",
          hasStompPosition: Boolean(extra?.stompPosition),
          stompPosition: extra?.stompPosition ?? { x: 0, y: 0, z: 0 },
        },
        { to: [peerId] },
      );
    };
    if (!requireRewardAdmission(wallet)) {
      sendResult("NOT_ELIGIBLE");
      return;
    }
    if (!messageLimits.allow("popAttempt", wallet).allowed) {
      sendResult("RATE_LIMITED");
      return;
    }
    try {
      const player = getAuthoritativePlayer(wallet);
      const now = Date.now();
      let snapshot;
      try {
        snapshot = presence.observe(
          {
            wallet,
            peerId,
            readSucceeded: Boolean(player?.entityPresent),
            position: player?.entityPresent ? player.position : undefined,
          },
          now,
        );
      } catch {
        sendResult("NOT_ELIGIBLE");
        return;
      }
      if (!snapshot.positionFresh) {
        sendResult("NOT_ELIGIBLE");
        return;
      }
      console.log("[SERVER] authoritative player resolved");
      try {
        runtime.observePlayer(wallet, snapshot.position, snapshot.lastAuthoritativeReadAt);
      } catch {
        sendResult("NOT_ELIGIBLE");
        return;
      }

      const gate = runtime.tryBeginPop(wallet, now);
      if (gate !== "ok") {
        sendResult("RATE_LIMITED");
        return;
      }

      const recomputed = recomputePopCandidates((position) => runtime.authorizeCandidates(position), {
        authoritativePosition: snapshot.position,
        positionAvailable: snapshot.positionFresh,
        advertisedEligibleCount: eligibility.advertisedCount(peerId),
      });
      if (!recomputed.ok) {
        runtime.finishPop(wallet, false, now);
        sendResult(recomputed.result);
        publishEligibility(runtime);
        return;
      }
      const candidates = recomputed.candidates;
      console.log("[SERVER] candidates authorized", { count: candidates.length });
      if (!env || !randomBytes) {
        console.log("[SERVER] session failed", { error: "convex env missing" });
        runtime.finishPop(wallet, false, now);
        sendResult("NETWORK_ERROR");
        return;
      }

      console.log("[SERVER] obtaining session");
      const session = await sessionFor(env, wallet, randomBytes);
      if (session.sessionId === null) {
        console.log("[SERVER] session failed", {
          status: session.status,
          error: session.error,
        });
        runtime.finishPop(wallet, false, now);
        sendResult("SESSION_EXPIRED");
        return;
      }
      console.log("[SERVER] session ready");

      if (!requireRewardAdmission(wallet)) {
        runtime.finishPop(wallet, false, now);
        sendResult("NOT_ELIGIBLE");
        return;
      }
      const finalCheck = revalidatePopBeforeBroker({
        wallet,
        runtime,
        presence,
        getPlayer: (id) => {
          const row = getAuthoritativePlayer(id);
          return row?.entityPresent ? { entityPresent: true, position: row.position } : undefined;
        },
        isAdmitted: (id) => requireRewardAdmission(id),
        previousCandidates: candidates,
      });
      if (!finalCheck.ok) {
        runtime.finishPop(wallet, false, Date.now());
        sendResult(finalCheck.result);
        return;
      }
      const interactionRequestId = popRetry.bind(wallet, finalCheck.candidates, Date.now(), () =>
        randomHex(32, randomBytes),
      );
      console.log("[SERVER] calling Convex trusted claim");
      const result = await claimFirstAvailable({
        siteUrl: env.siteUrl,
        secret: env.secret,
        sessionId: session.sessionId,
        wallet,
        partyId: bind.lastSnapshot?.partyId || pinnedPartyId || env.partyId,
        interactionRequestId,
        runtimeInstanceId: runtime.runtimeInstanceId,
        candidates: finalCheck.candidates,
        randomBytes,
      });
      if (result.result !== "NETWORK_ERROR") {
        popRetry.resolve(wallet);
      }
      console.log("[SERVER] Convex claim response", { result: result.result, status: result.status });
      const won = result.result === "WON";
      runtime.finishPop(wallet, won, Date.now());
      if (won && "balloonId" in result && result.balloonId) {
        runtime.markClaimed(result.balloonId);
        hideBalloon(result.balloonId);
        const stomp = resolveAuthoritativeStomp(
          (balloonId) => {
            const landing = runtime.landingPosition(balloonId);
            return landing ? { position: landing } : undefined;
          },
          result.balloonId,
        );
        if (!stomp.resolved) {
          console.log("[SERVER] pop stomp position unresolved", { balloonId: result.balloonId });
        }
        const revealType = result.reveal?.type ?? "";
        const revealName = result.reveal?.displayName ?? "";
        console.log("[SERVER] WON reveal available", {
          type: revealType || "missing",
          hasDisplayName: revealName.length > 0,
        });
        sendResult("WON", {
          balloonId: result.balloonId,
          claimId: "claimId" in result ? result.claimId : "",
          revealType,
          revealName,
          announceTier: result.reveal?.announcementTier ?? "",
          dclRarity: result.reveal?.dclRarity ?? "",
          stompPosition: stomp.stompPosition,
        });
        if (result.worldToast) {
          console.log("[WORLD TOAST] emitted", { tier: result.worldToast.tier });
          const peers = listAuthoritativePlayers().map((player) => player.peerId);
          room.send(
            "worldToast",
            {
              title: result.worldToast.title,
              body: result.worldToast.body,
              tier: result.worldToast.tier,
              winnerLabel: result.worldToast.winnerLabel,
            },
            peers.length > 0 ? { to: peers } : undefined,
          );
        }
      } else {
        sendResult(result.result);
      }
      publishEligibility(runtime);
    } catch (error) {
      const message = error instanceof Error ? error.message : "popAttempt failed";
      console.log("[SERVER] fetch failed", {
        endpoint: "popAttempt",
        error: message.slice(0, 160),
      });
      runtime.finishPop(wallet, false, Date.now());
      sendResult("NETWORK_ERROR");
    } finally {
      if (!resultSent) {
        runtime.finishPop(wallet, false, Date.now());
        sendResult("NETWORK_ERROR");
      }
    }
  });

  room.onMessage("startBlowing", (_data, context) => {
    const peerId = requirePeerId(context);
    if (!peerId || !balloonGame) {
      return;
    }
    const wallet = peerId.toLowerCase();
    if (!messageLimits.allow("startBlowing", wallet).allowed) {
      return;
    }
    if (!requireRewardAdmission(wallet)) {
      return;
    }
    void balloonGame.enqueue(wallet, async () => {
      await hydrateBalloonPlayer(wallet, peerId);
      if (!requireRewardAdmission(wallet)) {
        return;
      }
      tableSocial.reconcile(tableSocialPlayers());
      const liveBefore = balloonGame!.get(wallet);
      const wearables = await fetchAuthoritativeKiteWearables(wallet, liveBefore?.profile.level ?? 1);
      const started = balloonGame!.startBlowing(wallet, Date.now(), partyIsActive(), wearables);
      const live = balloonGame!.get(wallet);
      if (!live) {
        return;
      }
      if (!started.ok) {
        if (started.result === "PARTY_ACTIVE") {
          sendBalloonStopped(peerId, "party", live.profile.carriedBalloons);
        }
      } else if (!started.already) {
        tableSocial.beginSession(wallet);
        const selfRefresh = blowVisualRefresh.onStartBlowing(wallet, peerId, Date.now());
        if (selfRefresh) {
          console.log("[blow-sync] joiner self refresh scheduled", {
            wallet: selfRefresh.wallet,
            peerId: selfRefresh.peerId,
            delayMs: BLOW_VISUAL_JOIN_REFRESH_MS,
          });
        }
      }
      sendBalloonProfile(live, partyIsActive());
      sendTableSocialToPeer(peerId, wallet);
      broadcastTableSocial();
    });
  });

  room.onMessage("stopBlowing", (_data, context) => {
    const peerId = requirePeerId(context);
    if (!peerId || !balloonGame) {
      return;
    }
    const wallet = peerId.toLowerCase();
    if (!messageLimits.allow("stopBlowing", wallet).allowed) {
      return;
    }
    void balloonGame.enqueue(wallet, () => {
      balloonGame!.stopBlowing(wallet, "stop");
      tableSocial.endSession(wallet);
      const live = balloonGame!.get(wallet);
      if (live) {
        sendBalloonStopped(peerId, "stop", live.profile.carriedBalloons);
        sendBalloonProfile(live, partyIsActive());
      }
      sendTableSocialToPeer(peerId, wallet);
      broadcastTableSocial();
    });
  });

  room.onMessage("tableSit", (data, context) => {
    const peerId = requirePeerId(context);
    if (!peerId) {
      return;
    }
    const wallet = peerId.toLowerCase();
    if (!messageLimits.allow("tableSit", wallet).allowed) {
      return;
    }
    if (typeof data.requestId === "string" && data.requestId.length > MAX_REQUEST_ID_CHARS) {
      return;
    }
    if (!requireRewardAdmission(wallet)) {
      return;
    }
    const apply = () => {
      if (!requireRewardAdmission(wallet)) {
        return;
      }
      const player = getAuthoritativePlayer(wallet);
      if (!player?.entityPresent) {
        sendTableSeatResult(peerId, data.requestId, false, 0, "POSITION_UNAVAILABLE");
        return;
      }
      const result = tableSocial.claimFromSit(wallet, data.chairId, player.position);
      sendTableSeatResult(
        peerId,
        data.requestId,
        result.ok,
        result.ok ? data.chairId : 0,
        result.ok ? "SEATED" : result.reason,
      );
      sendTableSocialToPeer(peerId, wallet);
      broadcastTableSocial();
    };
    if (balloonGame) {
      void balloonGame.enqueue(wallet, apply);
      return;
    }
    apply();
  });

  room.onMessage("tableStand", (data, context) => {
    const peerId = requirePeerId(context);
    if (!peerId) {
      return;
    }
    const wallet = peerId.toLowerCase();
    if (!messageLimits.allow("tableStand", wallet).allowed) {
      return;
    }
    const apply = () => {
      tableSocial.releaseFromStand(wallet);
      tableSocial.reconcile(tableSocialPlayers());
      sendTableSeatResult(peerId, data.requestId, true, 0, "STANDING");
      broadcastTableSocial();
    };
    if (balloonGame) {
      void balloonGame.enqueue(wallet, apply);
      return;
    }
    apply();
  });

  room.onMessage("tableSurround", (_data, context) => {
    const peerId = requirePeerId(context);
    if (!peerId) {
      return;
    }
    const wallet = peerId.toLowerCase();
    if (!messageLimits.allow("tableSurround", wallet).allowed) {
      return;
    }
    if (!requireRewardAdmission(wallet)) {
      tableSocial.setSurrounding(wallet, false);
      return;
    }
    const player = getAuthoritativePlayer(wallet);
    const inside = Boolean(player?.entityPresent && isInsideTableSurroundTrigger(player.position));
    tableSocial.setSurrounding(wallet, inside);
    broadcastTableSocial();
    if (blowVisualRefresh.consumeTurnInReturn(wallet, inside)) {
      noteObserverResumeBlowVisual(wallet, "turn-in-return");
    }
  });

  room.onMessage("observerResumed", (data, context) => {
    const peerId = requirePeerId(context);
    if (!peerId) {
      return;
    }
    const wallet = peerId.toLowerCase();
    if (!messageLimits.allow("observerResumed", wallet).allowed) {
      return;
    }
    const reasonValue = typeof data.reason === "string" ? data.reason : "";
    if (isObserverResumeBlockedReason(reasonValue)) {
      if (blowVisualRefresh.cancelObserverResume(wallet)) {
        console.log("[blow-sync] observer resume cancelled - blocked", { observer: wallet });
      }
      return;
    }
    const reason = parseObserverResumeReason(reasonValue);
    if (!reason) {
      return;
    }
    noteObserverResumeBlowVisual(wallet, reason);
  });

  room.onMessage("blowVisualJoin", (_data, context) => {
    const peerId = requirePeerId(context);
    if (!peerId) {
      return;
    }
    const wallet = peerId.toLowerCase();
    if (!messageLimits.allow("blowVisualJoin", wallet).allowed) {
      return;
    }
    noteClientReadyBlowVisualRefresh(wallet, peerId, Date.now());
  });

  room.onMessage("balloonSync", (_data, context) => {
    const peerId = requirePeerId(context);
    if (!peerId || !balloonGame) {
      return;
    }
    const wallet = peerId.toLowerCase();
    if (!messageLimits.allow("balloonSync", wallet).allowed) {
      return;
    }
    void balloonGame.enqueue(wallet, async () => {
      await hydrateBalloonPlayer(wallet, peerId, true);
    });
  });

  room.onMessage("blowerLeaderboardRequest", (_data, context) => {
    const peerId = requirePeerId(context);
    if (!peerId || !balloonGame) {
      return;
    }
    if (!messageLimits.allow("blowerLeaderboardRequest", peerId.toLowerCase()).allowed) {
      return;
    }
    void sendLeaderboardToConnectingPeer(peerId, true);
  });

  room.onMessage("upcomingPartiesRequest", (data, context) => {
    const peerId = requirePeerId(context);
    if (!peerId) {
      return;
    }
    const intent = typeof data?.intent === "string" ? data.intent : "sync";
    if (!messageLimits.allow("upcomingPartiesRequest", peerId.toLowerCase()).allowed) {
      return;
    }
    if (intent === "host-mutation") {
      void refreshUpcoming({ force: true });
      return;
    }
    if (intent === "open" || intent === "refresh") {
      void refreshUpcoming({ force: true, coalesce: true, to: [peerId] });
      return;
    }
    sendUpcomingToConnectingPeer(peerId, true);
    if (!upcomingCache.payload) {
      void refreshUpcoming({ force: true, to: [peerId] });
    }
  });

  room.onMessage("employmentAccept", (_data, context) => {
    const peerId = requirePeerId(context);
    if (!peerId || !balloonGame) {
      console.log("[BALLOON] employmentAccept dropped", { hasPeer: Boolean(peerId), hasGame: Boolean(balloonGame) });
      return;
    }
    const wallet = peerId.toLowerCase();
    if (!messageLimits.allow("employmentAccept", wallet).allowed) {
      return;
    }
    if (!requireRewardAdmission(wallet)) {
      sendEmploymentState(peerId, false, "ADMISSION_REQUIRED");
      return;
    }
    void balloonGame.enqueue(wallet, async () => {
      await hydrateBalloonPlayer(wallet, peerId);
      if (!requireRewardAdmission(wallet)) {
        sendEmploymentState(peerId, false, "ADMISSION_REQUIRED");
        return;
      }
      const hired = balloonGame!.employ(wallet, Date.now());
      const live = balloonGame!.get(wallet);
      if (!live) {
        sendEmploymentState(peerId, false, "NOT_PRESENT");
        return;
      }
      if ("result" in hired) {
        sendEmploymentState(peerId, false, hired.result);
        return;
      }
      const saved = await balloonGame!.flush(live);
      if (!saved) {
        console.log("[BALLOON] employment persist pending retry", { wallet });
      }
      sendEmploymentState(peerId, true, hired.already ? "ALREADY" : "HIRED");
      sendBalloonProfile(live, partyIsActive());
    });
  });

  room.onMessage("turnInBalloons", (_data, context) => {
    const peerId = requirePeerId(context);
    if (!peerId || !balloonGame) {
      return;
    }
    const wallet = peerId.toLowerCase();
    if (!messageLimits.allow("turnInBalloons", wallet).allowed) {
      return;
    }
    if (!requireRewardAdmission(wallet)) {
      const live = balloonGame.get(wallet);
      sendTurnInResult(peerId, {
        ok: false,
        result: "ADMISSION_REQUIRED",
        carriedBalloons: live?.profile.carriedBalloons ?? 0,
        onboardingComplete: live?.profile.onboardingComplete ?? false,
      });
      return;
    }
    void balloonGame.enqueue(wallet, async () => {
      await hydrateBalloonPlayer(wallet, peerId);
      if (!requireRewardAdmission(wallet)) {
        const live = balloonGame!.get(wallet);
        sendTurnInResult(peerId, {
          ok: false,
          result: "ADMISSION_REQUIRED",
          carriedBalloons: live?.profile.carriedBalloons ?? 0,
          onboardingComplete: live?.profile.onboardingComplete ?? false,
        });
        return;
      }
      const liveBefore = balloonGame!.get(wallet);
      const wearables = await fetchAuthoritativeKiteWearables(wallet, liveBefore?.profile.level ?? 1);
      const result = balloonGame!.turnIn(wallet, wearables);
      const live = balloonGame!.get(wallet);
      if (!result.ok) {
        sendTurnInResult(peerId, {
          ok: false,
          result: result.result,
          carriedBalloons: live?.profile.carriedBalloons ?? 0,
          onboardingComplete: live?.profile.onboardingComplete ?? false,
        });
        if (live) {
          sendBalloonProfile(live, partyIsActive());
        }
        return;
      }
      if (live) {
        await balloonGame!.flush(live);
      }
      sendTurnInResult(peerId, {
        ok: true,
        result: "OK",
        carriedBalloons: result.profile.carriedBalloons,
        onboardingComplete: result.profile.onboardingComplete,
      });
      blowVisualRefresh.armTurnInReturn(wallet);
      const player = getAuthoritativePlayer(wallet);
      const inside = Boolean(player?.entityPresent && isInsideTableSurroundTrigger(player.position));
      if (blowVisualRefresh.consumeTurnInReturn(wallet, inside)) {
        noteObserverResumeBlowVisual(wallet, "turn-in-return");
      }
      if (live) {
        sendBalloonProfile(live, partyIsActive());
      }
    });
  });

  room.onMessage("redeemBalloonReward", (data, context) => {
    const peerId = requirePeerId(context);
    if (!peerId || !balloonGame) {
      return;
    }
    const wallet = peerId.toLowerCase();
    if (!messageLimits.allow("redeemBalloonReward", wallet).allowed) {
      return;
    }
    if (typeof data.rewardKey === "string" && data.rewardKey.length > MAX_REWARD_KEY_CHARS) {
      return;
    }
    if (!requireRewardAdmission(wallet)) {
      sendRewardResult(peerId, {
        ok: false,
        result: "ADMISSION_REQUIRED",
        rewardKey: data.rewardKey,
        balloonPoints: balloonGame.get(wallet)?.profile.balloonPoints ?? 0,
      });
      return;
    }
    void balloonGame.enqueue(wallet, async () => {
      await hydrateBalloonPlayer(wallet, peerId);
      if (!requireRewardAdmission(wallet)) {
        sendRewardResult(peerId, {
          ok: false,
          result: "ADMISSION_REQUIRED",
          rewardKey: data.rewardKey,
          balloonPoints: balloonGame!.get(wallet)?.profile.balloonPoints ?? 0,
        });
        return;
      }
      const result = await balloonGame!.redeem(wallet, data.rewardKey);
      const live = balloonGame!.get(wallet);
      sendRewardResult(peerId, {
        ok: result.ok,
        result: result.ok ? "OK" : result.result,
        rewardKey: data.rewardKey,
        balloonPoints: live?.profile.balloonPoints ?? 0,
      });
      if (live) {
        sendBalloonProfile(live, partyIsActive());
      }
    });
  });

  room.onMessage("kiteStockRequest", (_data, context) => {
    const peerId = requirePeerId(context);
    if (!peerId || !balloonGame) {
      return;
    }
    const wallet = peerId.toLowerCase();
    if (!messageLimits.allow("kiteStockRequest", wallet).allowed) {
      return;
    }
    void balloonGame.enqueue(wallet, async () => {
      await balloonGame!.refreshMintableKiteStock();
      sendKiteMintState(balloonGame!.getKiteMintCounts());
    });
  });

  room.onMessage("setDepositWarningSkip", (data, context) => {
    const peerId = requirePeerId(context);
    if (!peerId || !balloonGame || data.skip !== true) {
      return;
    }
    const wallet = peerId.toLowerCase();
    void balloonGame.enqueue(wallet, async () => {
      await balloonGame!.setSkipDepositWarning(wallet, true);
      sendDepositWarningSkipState(peerId, true);
    });
  });

  room.onMessage("redeemKiteReward", (data, context) => {
    const peerId = requirePeerId(context);
    if (!peerId || !balloonGame) {
      return;
    }
    const wallet = peerId.toLowerCase();
    if (!messageLimits.allow("redeemKiteReward", wallet).allowed) {
      return;
    }
    if (typeof data.kiteId === "string" && data.kiteId.length > MAX_KITE_ID_CHARS) {
      return;
    }
    if (!requireRewardAdmission(wallet)) {
      sendKiteRedeemResult(peerId, {
        ok: false,
        result: "ADMISSION_REQUIRED",
        kiteId: data.kiteId,
        balloonPoints: balloonGame.get(wallet)?.profile.balloonPoints ?? 0,
        status: "",
        retrySafe: true,
        txHash: "",
        lastError: "",
      });
      return;
    }
    void balloonGame.enqueue(wallet, async () => {
      try {
        await hydrateBalloonPlayer(wallet, peerId);
        const result = await balloonGame!.redeemKite(wallet, data.kiteId);
        const lastError = result.ok ? "" : result.lastError;
        console.log(
          `[KITE MINT] redeem ${JSON.stringify({
            wallet,
            kiteId: result.kiteId,
            ok: result.ok,
            result: result.result,
            status: result.status,
            retrySafe: result.ok ? false : result.retrySafe,
            lastError,
            txHash: result.txHash ? "set" : "",
          })}`,
        );
        const live = balloonGame!.get(wallet);
        sendKiteRedeemResult(peerId, {
          ok: result.ok,
          result: result.result,
          kiteId: result.kiteId,
          balloonPoints: result.ok ? result.profile.balloonPoints : result.balloonPoints,
          status: result.status,
          retrySafe: result.ok ? false : result.retrySafe,
          txHash: result.txHash,
          lastError: result.ok ? "" : sanitizeKiteMintClientError(result.lastError),
        });
        sendKiteMintState(balloonGame!.getKiteMintCounts());
        if (live) {
          sendBalloonProfile(live, partyIsActive());
        }
      } catch (error) {
        const lastError = error instanceof Error ? error.message : String(error);
        console.log(`[KITE MINT] redeem threw ${lastError}`);
        sendKiteRedeemResult(peerId, {
          ok: false,
          result: "UNAVAILABLE",
          kiteId: data.kiteId,
          balloonPoints: balloonGame!.get(wallet)?.profile.balloonPoints ?? 0,
          status: "",
          retrySafe: true,
          txHash: "",
          lastError: sanitizeKiteMintClientError(lastError),
        });
      }
    });
  });

  console.log("[SERVER] DropParty Multiplayer Server ready", {
    partyId: bind.lastSnapshot?.partyId ?? pinnedPartyId,
    balloons: runtime.listLive().length,
    convexSite: env?.siteUrl ?? "",
  });
}
