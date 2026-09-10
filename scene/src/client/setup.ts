import {
  engine,
  executeTask,
  InputAction,
  inputSystem,
  PlayerIdentityData,
  PointerEventType,
  Transform,
  AvatarEquippedData,
} from "@dcl/sdk/ecs";
import { preloadSceneUiTextures } from "./preloadUiTextures";
import { preloadSceneShell } from "../world/sceneShellPreload";
import { getPlayer } from "@dcl/sdk/players";
import { isStateSyncronized } from "@dcl/sdk/network";
import { room } from "../shared/messages";
import { PartyRoundHud, PopHud, ServerHeartbeat } from "../shared/schemas";
import {
  POP_ACTION_LOCK_MS,
  POP_IMPACT_TIME_MS,
  POP_RESULT_TIMEOUT_MS,
} from "../shared/constants";
import { CONVEX_SITE_URL, DROPPARTY_BUILD_ENV, convexSiteHost } from "../shared/convexEnv";
import { isPublicDropPartyOverlapMessage } from "../shared/partyTime";
import { partyWinFeedRows, shouldSuppressWorldToastForLiveFeed, type WinView } from "../shared/wins";
import { nextWinsPoll } from "../shared/partyPoll";
import { emptyPartyHud, formatPartyHud, partyHudForAdmission, type PartyHudModel } from "../shared/partyHud";
import {
  formatNextDropTickerLine,
  nextDropTickerFromParties,
  nextDropTickerIsShown,
} from "../shared/nextDropTicker";
import {
  applyLocalUpcomingViewerFlags,
  parseUpcomingPartiesPayload,
  shouldRequestUpcomingOnOpen,
  snapshotsToScheduledPartyViews,
} from "../shared/upcomingPartiesState";
import {
  createPersonalWinToast,
  showPersonalWinToast,
  tickPersonalWinToast,
  type PersonalWinToast,
} from "../shared/personalWinToast";
import {
  createWorldToastQueue,
  enqueueWorldToast,
  tickWorldToasts,
  type WorldToastQueue,
} from "../shared/worldToast";
import { createPopAttemptPayload } from "../shared/popAttempt";
import {
  createPopUi,
  handlePopIntent,
  onPopFailure,
  onPopResult,
  syncEligible,
  type PopIntentSource,
  type PopUiModel,
} from "../shared/popUi";
import {
  beginMovementLock,
  createMovementLock,
  tickMovementLock,
  type MovementLockModel,
} from "../shared/popActionLock";
import { revealFromPopResult, type WinnerRevealPayload } from "../shared/prizeReveal";
import { choosePlantPosition, stompPositionFromPopResult } from "../shared/stompPosition";
import { ClientBalloonPresentation } from "./balloonPresentation";
import { signedConvexPost } from "./signedConvex";
import {
  isIdentityNotReadyAdmissionError,
  isPlayerNotReadyAdmission,
  isRetryableAdmissionResult,
} from "../shared/admissionResult";
import { openExternalUrl } from "~system/RestrictedActions";
import {
  captureLocalImpactPosition,
  lockLocalMovement,
  playPopStompEmote,
  unlockLocalMovement,
} from "./playerLock";
import { tickSpawnCameraLook } from "./spawnCamera";
import { isSafeMarketplaceUrl } from "../shared/hostAccess";
import { isSafeExplorerUrl } from "../shared/explorer";
import { DEPOSIT_WARNING_SKIP_PERSISTENCE_ENABLED } from "../shared/depositWarning";
import {
  backFromDeposit,
  beginContributeToParty,
  chooseDepositAsset,
  chooseNftKind,
  closeChestPanel,
  dismissOpenDepositUi,
  shouldCloseDepositUiOnPartyStart,
  confirmDeposit,
  createChestPanelModel,
  openChestPanel,
  openChestRoot,
  openDepositWarning,
  openHostAccess,
  setHostRequirements,
  selectDepositItem,
  setAutoPick,
  setChestPolicy,
  setDepositInventory,
  setDepositLeftoverAvailable,
  setDepositProgress,
  setDepositQuantity,
  setDepositStatus,
  setDepositTargets,
  setInventorySearch,
  setInventoryRarity,
  setLowMintLock,
  setManaAmount,
  setManaBalanceLabel,
  setDepositDestination,
  setShowDepositDiagnostics,
  toggleSelectedMint,
  turnInventoryPage,
  goToInventoryPage,
  type ChestPanelModel,
} from "../shared/chestPanels";
import { effectiveLowMintLock, sortMintsForPicker } from "../shared/inventoryBrowser";
import { fetchDepositChestConfig, fetchManaBalance } from "./depositChest/api";
import { fetchOwnedInventory } from "./depositChest/inventory";
import { depositRetryIsVerificationOnly } from "../shared/depositProgress";
import {
  runManaDeposit,
  retryManaVerification,
  retryNftSessionVerification,
  runNftDeposit,
  type DepositProgressEvent,
} from "./depositChest/runDeposit";
import {
  checkHostEligibility,
  fetchExtraPoolHostQuota,
  createScheduledParty,
  createScheduledPartyFromLeftovers,
  assignLeftoversToParty,
  fetchHostLeftovers,
  editScheduledParty,
  fetchContributionTargets,
  fetchHostedParties,
  fetchSceneRuntime,
  fetchScheduledPartyConfig,
  fetchPartyPrizePreview,
  fetchScheduledPartyPot,
  fetchWins,
} from "./scheduledParty/api";
import {
  applyPublicOverlapMessage,
  canOpenCreateParty,
  publicOverlapMessageForDraft,
  closePartyPanel,
  closePrizePreview,
  createPartyPanelModel,
  dismissOpenPartyUi,
  backToMyParties,
  openManageParty,
  openMyParties,
  openMyWins,
  openPartyCreate,
  applyManagePartyPot,
  canHostAddPrizes,
  canHostEditParty,
  isPastHostedParty,
  managePrizesShowConfirmedPreview,
  openPartyEdit,
  openPrizePreview,
  openUpcomingParties,
  setLeftoverInventory,
  setLeftoverSelection,
  setPrizePreview,
  setPrizePreviewOffsets,
  setViewerTimeZone,
  toggleTimezonePicker,
  setHostEligible,
  setExtraPoolQuota,
  canTurnOnExtraPool,
  extraPoolQuotaHelper,
  setManageHistory,
  setManageTab,
  setPartyConfig,
  setPartyDraft,
  setPartyNow,
  type PartyPanelModel,
  type ScheduledPartyView,
} from "../shared/partyPanels";
import { applyHostDisplayNames, applyLeaderboardDisplayNames, applyWinnerDisplayNames } from "../shared/dclProfile";
import {
  emptyLeftoverSelection,
  leftoverPrizeIdsForMints,
  leftoverGroupsToDepositItems,
  leftoverManaPartyIdFromUrn,
  isLeftoverManaUrn,
  leftoverGroupHasAssets,
  hasLeftoverSelection,
  selectAllLeftoversFromGroup,
  toggleLeftoverMana,
  toggleLeftoverPrize,
} from "../shared/leftoverInventory";
import { sanitizeProfileName } from "../shared/displayName";
import { formatChestPresentation, reconstructChestFromSnapshot, type ChestPresentation } from "../shared/chestPresentation";
import { detectLocalTimeZone } from "../shared/partyTime";
import { DEVICE_TIME_ZONE_SENTINEL, saveDisplayTimeZone } from "../shared/timezonePreference";
import {
  closeHelpWantedPanel,
  createHelpWantedPanel,
  helpWantedPanelForPlayer,
  npcGreetingStillVisible,
  npcGreetingText,
  NPC_HIRE_GIFT_TEXT,
  npcHoverText,
  type NpcGreetingTone,
  openHelpWantedPanel,
  pickNextPartyStartMs,
  type HelpWantedPanel,
} from "../shared/helpWanted";
import { selectTurnInCaptcha, submitTurnInCaptcha } from "../shared/turnInCaptcha";
import {
  HELP_WANTED_FOR_ALL_PLAYERS,
  HELP_WANTED_TRIGGER,
  isInsideEmployeeGreetingTrigger,
  shouldFireEmployeeGreeting,
  shouldFireHelpWantedWalkIn,
  stepEmployeeGreetingTrigger,
} from "../shared/employeeGreetingTrigger";
import { BALLOON_INTERVAL_MS, NPC_GREETING_MS } from "../shared/balloonProfile";
import {
  canTurnInBalloons,
  equippedKiteFingerprint,
  equippedWearablesSignature,
  isKitePerkId,
  wearableUrnsForKiteId,
  wearablesFromAvatarEquippedData,
  type KitePerkId,
} from "../shared/kitePerks";
import {
  fetchLambdasEquippedSnapshot,
  resolveLambdasKiteProfile,
} from "../shared/lambdasEquippedProfile";
import {
  BALLOON_FULL_ALERT_MS,
  balloonFullAlertVisible,
  balloonStartStillOverCap,
  blowingHudSuppressed,
  formatBalloonHud,
  shouldShowSeatedCount,
  STOP_BLOWING_CLICK_DELAY_MS,
} from "../shared/balloonHud";
import { BLOWING_EMOTE, isMeaningfulBlowMove, shouldPlayStandingBlowEmote, type BalloonMoveSample } from "../shared/balloonEmote";
import { isChairOccupied } from "../shared/tableSocialBonus";
import {
  closeBalloonRewardUi,
  createBalloonRewardUi,
  openBalloonRewardUi,
  openKiteRewardDetail,
  closeKiteRewardDetail,
  setRewardsCatalogTab,
  setRewardsEquippedFingerprint,
} from "../shared/balloonRewards";
import { emptyKiteMintCounts, parseKiteMintCounts } from "../shared/kiteMintLedger";
import { emptyKiteRedemptionLedger, parseKiteRedemptionLedger, sanitizeKiteMintClientError, type KiteRedemptionLedger } from "../shared/kiteMintRedemption";
import { buildDropPartyCastle, syncChestGoldPortalWithParty, syncEntryBlockerWithEmployment, syncHirePortalWithEmployment } from "../world/castleBuild";
import { setLeaderboardRows } from "../world/leaderboardPlanes";
import { padLeaderboardLiveRows } from "../shared/leaderboardLayout";
import { shouldPollPoppers } from "../shared/leaderboardPoll";
import { fetchPopperLeaderboard } from "./leaderboardApi";
import {
  applyBalloonSessionFields,
  balloonHudInput,
  emptyBalloonSession,
  type BalloonSessionFields,
} from "../shared/balloonSession";
import {
  applyLeaderboardUpdate,
  bindLeaderboardUpdateOnce,
  createLeaderboardHandlerSlot,
  emptyLeaderboardStore,
} from "../shared/leaderboardState";
import {
  logBalloonSessionAroundLeaderboard,
  logLeaderboardBoardRowsRendered,
  logLeaderboardClientStateUpdated,
  logLeaderboardPayloadReceived,
} from "../shared/leaderboardTrace";
import { blowerWallRowsFromEntries, parseLeaderboardUpdateMessage } from "../shared/blowerWall";
import {
  bindChestInteractions,
  setChestInteractionEnabled,
  tickChestVisual,
} from "../world/chestWorld";
import { buildDevCourtVisualization } from "../world/devCourtViz";
import {
  bindNpcInteraction,
  setNpcHoverText,
  setNpcInteractionEnabled,
  tickNpcIdle,
} from "../world/npcWorld";
import { buildEmployeeGreetingTriggerDebug } from "../world/employeeGreetingTrigger";
import { buildTableSurroundTriggerDebug } from "../world/tableSurroundTrigger";
import {
  buildTableSeatTargets,
  buildTableTopCollider,
  buildChairColliders,
  setOccupiedChairMask,
  setTableSeatPromptsHiddenForModal,
} from "../world/tableSeats";
import { sitAtTableSeat, standFromTableSeat, tickTableSit, setTableSitListener, currentTableSeat, setTableSitBlowing, isTableSitSettled, replayTableSitBlowing } from "./sitLock";
import { tickTableSurround, isWalletAroundTable } from "./tableSurround";
import {
  getBlowingVisualPlayCount,
  playAlternateBlowingEmoteVisual,
  playBlowingEmoteVisual,
  resetBlowingVisualPlayCount,
  syncBlowingEmoteSession,
} from "./blowingEmote";
import { shouldApplyLateJoinBlowingVisualRefresh } from "../shared/blowVisualRefresh";
import {
  emptyCenterToastState,
  enqueueXpAndLevelUp,
  enqueueTurnInAfterXpToast,
  playPartyCompleteToast,
  playRoundCompleteToast,
  shouldShowPartyCompleteToast,
  shouldShowRoundCompleteToast,
  blowingHudResumeAt,
} from "../shared/balloonXpToast";
import { createXpToastEntity, tickCenterToasts } from "./xpToast";
import {
  createSceneMusicController,
  nextSceneSong,
  nudgeSceneMusicVolume,
  playBalloonFillSfx,
  playBalloonPopSfx,
  tickSceneMusicController,
  toggleSceneMusic,
} from "./sceneMusic";
import { setupUi, type RewardAdmissionNotice } from "./ui";

let ui: PopUiModel = createPopUi();
let personal: PersonalWinToast = createPersonalWinToast();
let world: WorldToastQueue = createWorldToastQueue();
let hud: PartyHudModel = emptyPartyHud();
let currentPartyWins: WinView[] = [];
let winFeedPartyId: string | null = null;
let lastWinFeedAt = 0;
let winFeedInFlight = false;
let lastWinsPartyId: string | null = null;
let lastWinsStatus: string | null = null;
let lastHudPhase = "";
let winsCompletedSince: number | null = null;
let winsCompletedRefreshCount = 0;
let chest: ChestPresentation = formatChestPresentation({ phase: "IDLE" });
let panels: ChestPanelModel = createChestPanelModel();
let partyBoard: PartyPanelModel = createPartyPanelModel();
let skipDepositWarning = false;
let pendingDepositContribute: { partyId: string; title: string } | undefined;
let help: HelpWantedPanel = createHelpWantedPanel();
let balloonRewards = createBalloonRewardUi();
let balloon = emptyBalloonSession();
let localWearableUrns: string[] = [];
/** Last on-demand Lambdas snapshot for Rewards equipped status. Undefined means use server kiteId. */
let rewardsLambdasUrns: string[] | undefined;
let kiteMintCounts = emptyKiteMintCounts();
let kiteRedemptions: KiteRedemptionLedger = emptyKiteRedemptionLedger();
const KITE_DETAIL_MINT_ARM_MS = 450;
let kiteMintBusyId: KitePerkId | null = null;
let kiteMintConfirmId: KitePerkId | null = null;
let kiteDetailMintEnabledAfter = 0;
let kiteDetailMintedId: KitePerkId | null = null;
let kiteDetailFailedId: KitePerkId | null = null;
let kiteMintLastResult = "";
let leaderboardStore = emptyLeaderboardStore();
const leaderboardHandlerSlot = createLeaderboardHandlerSlot();
let greeting = { text: "", hideAt: undefined as number | undefined, tone: "welcome" as NpcGreetingTone };
let fullAlert = { text: "", hideAt: undefined as number | undefined };
let balloonProfileSynced = false;
let pendingStartKiteCheck = false;
let lastBalloonSyncAt = 0;
let insideGreetingTrigger = false;
let insideHelpWantedTrigger = false;
let centerToasts = emptyCenterToastState();
let balloonHudResumeAt = 0;
let stopBlowingClickAt = 0;
let lastBlockingUiOpen = false;
let lastBlowPos: BalloonMoveSample | undefined;
let lastBlowEmoteAt = 0;
let blowWasMoving = false;
let blowMovedSincePlay = false;
let blowEmotePlaying = false;
let tableSocialHud = {
  occupiedChairCount: 0,
  occupiedChairMask: 0,
  currentSocialBonusXp: 0,
  tableFull: false,
  eligibleSocialBonusXp: 0,
};
const TABLE_SEAT_RETRY_MS = 500;
let tableSeatRequestSequence = 0;
let pendingTableSeatTransition:
  | {
      requestId: string;
      chairId: number;
      seated: boolean;
      nextSendAt: number;
    }
  | undefined;

function queueTableSeatTransition(seat: ReturnType<typeof currentTableSeat>): void {
  tableSeatRequestSequence += 1;
  pendingTableSeatTransition = {
    requestId: `${Date.now().toString(36)}-${tableSeatRequestSequence.toString(36)}`,
    chairId: seat?.id ?? 0,
    seated: Boolean(seat),
    nextSendAt: 0,
  };
}

function tickTableSeatTransition(now: number): void {
  const pending = pendingTableSeatTransition;
  if (!pending || !isStateSyncronized() || now < pending.nextSendAt) {
    return;
  }
  const localSeat = currentTableSeat();
  if (pending.seated) {
    if (!localSeat || localSeat.id !== pending.chairId) {
      pendingTableSeatTransition = undefined;
      return;
    }
    if (!isTableSitSettled()) {
      return;
    }
    room.send("tableSit", { chairId: pending.chairId, requestId: pending.requestId });
  } else {
    room.send("tableStand", { requestId: pending.requestId });
  }
  pending.nextSendAt = now + TABLE_SEAT_RETRY_MS;
}
preloadSceneShell();
const castle = buildDropPartyCastle();
buildDevCourtVisualization();
buildEmployeeGreetingTriggerDebug();
buildTableSurroundTriggerDebug();
const xpToastEntity = createXpToastEntity();
const sceneMusic = createSceneMusicController();
let movement: MovementLockModel = createMovementLock();

function blockingSceneUiOpen(): boolean {
  return (
    panels.open !== "none" ||
    partyBoard.open !== "none" ||
    balloonRewards.open ||
    (help.open && help.kind !== "none")
  );
}

function worldInteractionAllowed(): boolean {
  return rewardAdmissionReady() && !blockingSceneUiOpen();
}

buildTableSeatTargets((seat) => {
  if (
    !worldInteractionAllowed() ||
    movement.locked ||
    currentTableSeat() ||
    isChairOccupied(tableSocialHud.occupiedChairMask, seat.id)
  ) {
    return;
  }
  sitAtTableSeat(seat, Date.now(), balloon.isBlowing && !balloon.partyActive);
});
setTableSitListener((seat) => {
  if (seat) {
    if (!worldInteractionAllowed()) {
      return;
    }
  }
  queueTableSeatTransition(seat);
});
buildTableTopCollider();
buildChairColliders();
let worldToastSeq = 0;
const presentation = new ClientBalloonPresentation();
let lastHeartbeatSeenAt = 0;
let lastHeartbeatTick: number | undefined;
let popAwaitingSince: number | undefined;
let lastPoppersJoinFetchAt = 0;
let blowerBoardReadyRequested = false;
let upcomingJoinRequested = false;
let blowVisualJoinRequested = false;
let lastLeaderboardPartyStatus = "NONE";
let hadPopsThisParty = false;
let poppersInFlight = false;
type AdmissionClientStatus =
  | "waiting"
  | "requesting"
  | "token-sent"
  | "admitted"
  | "denied"
  | "unavailable";
let admissionStatus: AdmissionClientStatus = "waiting";
let admissionWallet = "";
let admissionToken = "";
let admissionFetchAttempts = 0;
let admissionTokenSends = 0;
let nextAdmissionAttemptAt = 0;
const MAX_ADMISSION_FETCH_ATTEMPTS = 6;
const MAX_ADMISSION_TOKEN_SENDS = 12;
const MAX_ADMISSION_IDENTITY_RETRIES = 15;
let admissionIdentityRetries = 0;

function rewardAdmissionReady(): boolean {
  return admissionStatus === "admitted";
}

function admissionNotice(): RewardAdmissionNotice | undefined {
  if (admissionStatus === "denied") {
    return {
      title: "NETWORK LIMIT REACHED",
      body: "Two players on this network are already participating in rewards.",
      secondary: "Disconnect another player and reconnect to try again.",
    };
  }
  if (admissionStatus === "unavailable") {
    return {
      title: "REWARD ACCESS ERROR",
      body: "We couldn't verify reward access.",
      secondary: "Please reload the scene.",
    };
  }
  return undefined;
}

function scheduleAdmissionRetry(): void {
  if (admissionFetchAttempts >= MAX_ADMISSION_FETCH_ATTEMPTS) {
    admissionStatus = "unavailable";
    return;
  }
  admissionStatus = "waiting";
  nextAdmissionAttemptAt = Date.now() + 1000 * 2 ** (admissionFetchAttempts - 1);
}

function sendAdmissionToken(): void {
  if (!admissionToken || !isStateSyncronized()) return;
  admissionTokenSends += 1;
  admissionStatus = "token-sent";
  nextAdmissionAttemptAt = Date.now() + 1500;
  room.send("admissionRequest", { token: admissionToken });
}

function classifyRewardAdmissionFailure(error: unknown): {
  category: "ADMISSION_HTTP_ERROR" | "ADMISSION_SIGNED_FETCH_ERROR";
  status?: number;
  error?: string;
} {
  const message = error instanceof Error ? error.message : "";
  const httpMatch = /^Request failed \((\d{3})\)$/.exec(message);
  if (httpMatch) {
    return { category: "ADMISSION_HTTP_ERROR", status: Number(httpMatch[1]) };
  }
  const safeErrors = new Set([
    "ADMISSION_UNAVAILABLE",
    "INVALID_WALLET",
    "Authenticated identity required",
  ]);
  if (safeErrors.has(message)) {
    return { category: "ADMISSION_HTTP_ERROR", error: message };
  }
  return { category: "ADMISSION_SIGNED_FETCH_ERROR" };
}

function requestRewardAdmission(wallet: string): void {
  admissionStatus = "requesting";
  void executeTask(async () => {
    try {
      const body = await signedConvexPost<{ token?: unknown }>(
        "/network-admission",
        { wallet },
      );
      if (typeof body.token !== "string" || body.token.length === 0) {
        console.log("[CLIENT] reward admission failed", { category: "ADMISSION_MISSING_TOKEN" });
        admissionFetchAttempts += 1;
        scheduleAdmissionRetry();
        return;
      }
      admissionIdentityRetries = 0;
      admissionToken = body.token;
      admissionTokenSends = 0;
      sendAdmissionToken();
    } catch (error) {
      const classified = classifyRewardAdmissionFailure(error);
      console.log("[CLIENT] reward admission failed", classified);
      if (isIdentityNotReadyAdmissionError(classified.error ?? "")) {
        admissionIdentityRetries += 1;
        if (admissionIdentityRetries >= MAX_ADMISSION_IDENTITY_RETRIES) {
          admissionStatus = "unavailable";
          return;
        }
        admissionStatus = "waiting";
        nextAdmissionAttemptAt = Date.now() + 1000;
        return;
      }
      admissionFetchAttempts += 1;
      scheduleAdmissionRetry();
    }
  });
}

async function refreshPopperWall(): Promise<void> {
  if (poppersInFlight) {
    return;
  }
  poppersInFlight = true;
  const rows = await fetchPopperLeaderboard();
  poppersInFlight = false;
  if (!rows) {
    return;
  }
  setLeaderboardRows("poppers", padLeaderboardLiveRows(await applyLeaderboardDisplayNames(rows)));
}

function serverAlive(now: number): boolean {
  return lastHeartbeatSeenAt > 0 && now - lastHeartbeatSeenAt < 6000;
}

function recoverInFlight(reason: string) {
  if (ui.state !== "REQUEST_IN_FLIGHT") {
    return;
  }
  console.log("[CLIENT] POP request recovered", { reason });
  ui = onPopFailure(ui);
  popAwaitingSince = undefined;
}

function sendPop() {
  console.log("[CLIENT] POP intent");
  const now = Date.now();
  if (!isStateSyncronized()) {
    console.log("[CLIENT] popAttempt not sent", { error: "state not synchronized" });
    recoverInFlight("not-synchronized");
    return;
  }
  if (!serverAlive(now)) {
    console.log("[CLIENT] popAttempt not sent", { error: "server heartbeat stale" });
    recoverInFlight("server-not-alive");
    return;
  }
  room.send("popAttempt", createPopAttemptPayload());
  popAwaitingSince = now;
  console.log("[CLIENT] popAttempt sent");
}

function readBoundPartyScheduledAt(): number | undefined {
  for (const [, round] of engine.getEntitiesWith(PartyRoundHud)) {
    const scheduledAt = Number(round.scheduledAt);
    if (Number.isFinite(scheduledAt) && scheduledAt > 0) {
      return scheduledAt;
    }
  }
  return undefined;
}

function applyEligible(count: number, source: "message" | "hud") {
  const previous = ui.eligibleCount;
  ui = syncEligible(ui, count, Date.now());
  if (source === "message" || count !== previous) {
    console.log("[CLIENT] eligibleCount received:", count);
  }
}

function showWinToast(now: number, payload: WinnerRevealPayload) {
  personal = showPersonalWinToast(now, payload);
  console.log("[CLIENT] personal win toast shown");
}

function toastTick(now: number) {
  personal = tickPersonalWinToast(personal, now);
  world = tickWorldToasts(world, now);
}

function localWinWallet(): string {
  return PlayerIdentityData.getOrNull(engine.PlayerEntity)?.address ?? "";
}

function visiblePartyWinFeed(wins: readonly WinView[]): WinView[] {
  return partyWinFeedRows(wins, localWinWallet());
}

function stampNextDrop(now: number): void {
  const model = nextDropTickerFromParties(partyBoard.parties, now);
  hud = {
    ...hud,
    nextDropVisible: nextDropTickerIsShown(model.visible, hud.visible, hud.phase),
    nextDropLine: formatNextDropTickerLine(model, now),
  };
}

let lastUpcomingReceivedAt = 0;

function cacheUpcomingParties(parties: ScheduledPartyView[], nowMs: number): void {
  partyBoard = { ...partyBoard, parties: [...parties], nowMs };
}

function requestUpcomingFromServer(intent: string): void {
  room.send("upcomingPartiesRequest", { intent });
}

function notifyUpcomingHostMutation(): void {
  requestUpcomingFromServer("host-mutation");
}

function syncPartyHud(now: number) {
  for (const [, round] of engine.getEntitiesWith(PartyRoundHud)) {
    hud = {
      ...formatPartyHud(
        {
          partyId: round.partyId,
          status: round.status,
          now,
          scheduledAt: Number(round.scheduledAt),
          startedAt: Number(round.startedAt) || undefined,
          wavePhaseEndsAt: Number(round.wavePhaseEndsAt) || undefined,
          nextWaveAt: Number(round.nextWaveAt) || undefined,
          finalWaveSpawnedAt: Number(round.finalWaveSpawnedAt) || undefined,
          finalBalloonExpiresAt: Number(round.finalBalloonExpiresAt) || undefined,
          liveBalloonCount: round.liveCount,
          waveNumber: round.waveNumber || undefined,
          playerCount: round.playerCount,
        },
        now,
      ),
      winFeed: winFeedPartyId === round.partyId ? currentPartyWins : [],
    };
    break;
  }
  if (!hud.visible && currentPartyWins.length > 0) {
    hud = { ...hud, winFeed: currentPartyWins };
  }
  stampNextDrop(now);
}

function refreshWinFeed() {
  if (winFeedInFlight) {
    return;
  }
  winFeedInFlight = true;
  void executeTask(async () => {
    try {
      const result = await fetchWins({
        partyId: hud.partyId,
        limit: 50,
      });
      winFeedPartyId = result.partyId;
      currentPartyWins = visiblePartyWinFeed(result.wins);
      if (result.wins.length > 0) {
        hadPopsThisParty = true;
      }
      hud = { ...hud, winFeed: currentPartyWins };
    } catch {
      // Keep the last durable list; do not treat local pops as truth.
    } finally {
      winFeedInFlight = false;
    }
  });
}

function stillManaging(partyId: string): boolean {
  return partyBoard.open === "manage" && partyBoard.selected?.partyId === partyId;
}

function loadManagePrizeHistory(partyId: string): void {
  const loadPreview = managePrizesShowConfirmedPreview(partyBoard.selected?.status ?? "");
  partyBoard = {
    ...partyBoard,
    manageHistoryLoading: true,
    prizePreviewLoading: loadPreview,
    prizePreview: loadPreview ? null : partyBoard.prizePreview,
  };
  void executeTask(async () => {
    try {
      const [result, preview, pot] = await Promise.all([
        fetchWins({ partyId, limit: 50 }),
        loadPreview ? fetchPartyPrizePreview(partyId) : Promise.resolve(null),
        fetchScheduledPartyPot(partyId).catch(() => null),
      ]);
      if (!stillManaging(partyId)) {
        return;
      }
      let next = setManageHistory(partyBoard, await applyWinnerDisplayNames(result.wins));
      if (pot) {
        next = applyManagePartyPot(next, partyId, pot);
      }
      if (loadPreview) {
        next = setPrizePreview(next, preview);
      }
      partyBoard = next;
    } catch (error) {
      if (!stillManaging(partyId)) {
        return;
      }
      partyBoard = {
        ...setManageHistory(partyBoard, []),
        prizePreviewLoading: false,
        message: error instanceof Error ? error.message : "Could not load prize history",
      };
    }
  });
}

function openHostedPartyManager(partyId: string, initialTab: "details" | "prizes"): void {
  const selected = partyBoard.hosted.find((row) => row.partyId === partyId);
  if (!selected) {
    return;
  }
  partyBoard = setManageTab(
    openManageParty(partyBoard, selected, Date.now(), partyBoard.pots[partyId]),
    initialTab,
  );
  loadManagePrizeHistory(partyId);
  const wallet = PlayerIdentityData.getOrNull(engine.PlayerEntity)?.address;
  if (wallet) {
    void executeTask(async () => {
      const leftovers = await loadHostLeftovers(wallet);
      if (stillManaging(partyId)) {
        partyBoard = setLeftoverInventory(partyBoard, leftovers);
      }
    });
  }
}

async function loadHostLeftovers(wallet: string, scheduledPartyId?: string) {
  const result = await fetchHostLeftovers(wallet, scheduledPartyId);
  return result.groups ?? [];
}

function beginWonPresentation(
  balloonId: string,
  now: number,
  winnerReveal: WinnerRevealPayload,
  serverStomp?: { x: number; y: number; z: number },
) {
  const plant = choosePlantPosition({
    serverStomp,
    localFallback: captureLocalImpactPosition(),
  });
  if (plant.source !== "server") {
    console.log("[CLIENT] pop stomp position unresolved; falling back to local plant");
  }
  movement = beginMovementLock(now, POP_IMPACT_TIME_MS, plant.position);
  lockLocalMovement(plant.position);
  playPopStompEmote();
  presentation.beginWinnerClaim(balloonId, now, winnerReveal);
  console.log("[CLIENT] claim animation started");
  if (presentation.isPastBurst(balloonId)) {
    presentation.takePendingReveal(balloonId);
    showWinToast(now, winnerReveal);
    releasePopAction(now);
  }
}

function releasePopAction(now: number) {
  movement = {
    locked: false,
    unlockAt: undefined,
    emoteRequested: movement.emoteRequested,
    planted: false,
    impactPosition: undefined,
  };
  unlockLocalMovement();
  if (ui.state === "POP_ACTION_LOCK") {
    ui = syncEligible({ ...ui, lockUntil: now }, ui.eligibleCount, now);
  }
}

function localWalletOrThrow(): string {
  const me = PlayerIdentityData.getOrNull(engine.PlayerEntity);
  if (!me?.address) {
    throw new Error("Connect a Web3 wallet");
  }
  return me.address;
}

function loadManaBalance(): void {
  const wallet = PlayerIdentityData.getOrNull(engine.PlayerEntity)?.address;
  panels = setManaBalanceLabel(panels, "…");
  if (!wallet) {
    panels = setManaBalanceLabel(panels, "—");
    return;
  }
  void executeTask(async () => {
    try {
      const result = await fetchManaBalance(wallet);
      if (panels.open !== "depositMana") {
        return;
      }
      panels = setManaBalanceLabel(panels, result.display);
    } catch {
      if (panels.open !== "depositMana") {
        return;
      }
      panels = setManaBalanceLabel(panels, "—");
    }
  });
}

function refreshLocalBlowingEmoteVisual(intent?: string): void {
  const seated = currentTableSeat() !== undefined;
  const seatedReady = seated && isTableSitSettled();
  console.log("[blow-sync] refresh guard", {
    intent,
    blowing: balloon.isBlowing,
    partyActive: balloon.partyActive,
    seated,
    seatedReady,
    visualPlays: getBlowingVisualPlayCount(),
  });
  if (!shouldApplyLateJoinBlowingVisualRefresh(balloon.isBlowing, balloon.partyActive)) {
    return;
  }
  if (intent === "joiner-self" && getBlowingVisualPlayCount() >= 2) {
    console.log("[blow-sync] joiner self refresh skipped - fresh emote already emitted");
    return;
  }
  if (intent === "existing") {
    console.log("[blow-sync] existing blower refresh");
  } else {
    console.log("[blow-sync] joiner self refresh");
  }
  playAlternateBlowingEmoteVisual(seatedReady);
}

function releaseBlowingVisual() {
  blowEmotePlaying = false;
  blowWasMoving = false;
  blowMovedSincePlay = false;
  lastBlowEmoteAt = 0;
  resetBlowingVisualPlayCount();
}

function tickBlowingVisual(now: number) {
  const seated = currentTableSeat() !== undefined;
  const sitReady = seated && isTableSitSettled();
  if (!balloon.isBlowing || balloon.partyActive || movement.locked) {
    if (seated) {
      if (sitReady && !movement.locked) {
        setTableSitBlowing(false);
      }
      blowEmotePlaying = false;
      lastBlowPos = undefined;
      return;
    }
    releaseBlowingVisual();
    lastBlowPos = undefined;
    return;
  }
  const transform = Transform.getOrNull(engine.PlayerEntity);
  if (!transform) {
    return;
  }
  const pos = {
    x: transform.position.x,
    y: transform.position.y,
    z: transform.position.z,
  };
  if (seated) {
    if (sitReady) {
      setTableSitBlowing(true);
    }
    blowEmotePlaying = true;
    lastBlowPos = pos;
    blowWasMoving = false;
    blowMovedSincePlay = false;
    lastBlowEmoteAt = 0;
    return;
  }
  const moving = isMeaningfulBlowMove(lastBlowPos, pos);
  if (moving) {
    blowMovedSincePlay = true;
  }
  lastBlowPos = pos;
  if (
    shouldPlayStandingBlowEmote({
      seated: false,
      moving,
      wasMoving: blowWasMoving,
      playing: blowEmotePlaying,
      lastPlayedAt: lastBlowEmoteAt,
      now,
      replayMs: BLOWING_EMOTE.replayMs,
      walkRetriggerMs: BLOWING_EMOTE.walkRetriggerMs,
      movedSincePlay: blowMovedSincePlay,
    })
  ) {
    playBlowingEmoteVisual();
    blowEmotePlaying = true;
    lastBlowEmoteAt = now;
    blowMovedSincePlay = false;
  }
  blowWasMoving = moving;
}

function fireEmployeeGreeting(now: number): void {
  const name = localPlayerName() || "friend";
  greeting = { text: npcGreetingText(name), hideAt: now + NPC_GREETING_MS, tone: "welcome" };
  console.log("[BALLOON] greeting fired", { name });
}

function fireHireGiftGreeting(now: number): void {
  greeting = { text: NPC_HIRE_GIFT_TEXT, hideAt: now + NPC_GREETING_MS, tone: "hireGift" };
  console.log("[HELP WANTED] hire gift greeting fired");
}

function openNpcConversation(forcedKind?: ReturnType<typeof helpWantedPanelForPlayer> | "alreadyHired"): void {
  const kind =
    forcedKind ??
    (HELP_WANTED_FOR_ALL_PLAYERS
      ? "hire"
      : helpWantedPanelForPlayer({
          employed: balloon.employed,
          carriedBalloons: balloon.carriedBalloons,
          capacity: localEffectiveCapacity(),
        }));
  if (kind === "none") {
    return;
  }
  const nextPartyAt = pickNextPartyStartMs(readBoundPartyScheduledAt(), Date.now(), partyBoard.parties);
  help = openHelpWantedPanel(help, kind, nextPartyAt);
  if (kind === "learn" && lastUpcomingReceivedAt <= 0) {
    requestUpcomingFromServer("sync");
  }
}

function tickEmployeeGreetingTrigger(now: number): void {
  const transform = Transform.getOrNull(engine.PlayerEntity);
  if (!transform) {
    return;
  }
  const inside = isInsideEmployeeGreetingTrigger(transform.position);
  const edge = stepEmployeeGreetingTrigger(inside, insideGreetingTrigger);
  if (edge === "enter") {
    console.log("[BALLOON] player entered trigger", { employed: balloon.employed });
    if (shouldFireEmployeeGreeting(edge, balloon.employed)) {
      fireEmployeeGreeting(now);
    }
  } else if (edge === "exit") {
    console.log("[BALLOON] player exited trigger", { employed: balloon.employed });
  }
  insideGreetingTrigger = inside;
}

function tickHelpWantedTrigger(): void {
  if (balloon.employed && !HELP_WANTED_FOR_ALL_PLAYERS) {
    insideHelpWantedTrigger = false;
    return;
  }
  const transform = Transform.getOrNull(engine.PlayerEntity);
  if (!transform) {
    return;
  }
  const inside = isInsideEmployeeGreetingTrigger(transform.position, HELP_WANTED_TRIGGER);
  const edge = stepEmployeeGreetingTrigger(inside, insideHelpWantedTrigger);
  if (edge === "enter") {
    console.log("[HELP WANTED] player entered trigger", { employed: balloon.employed });
    if (shouldFireHelpWantedWalkIn(edge, balloon.employed)) {
      openNpcConversation("hire");
    }
  } else if (edge === "exit") {
    console.log("[HELP WANTED] player exited trigger", { employed: balloon.employed });
  }
  insideHelpWantedTrigger = inside;
}

function applyEquippedWearableUrns(urns: readonly string[]): void {
  if (equippedWearablesSignature(urns) === equippedWearablesSignature(localWearableUrns)) {
    return;
  }
  localWearableUrns = [...urns];
}

function rewardsEquippedWearableUrns(): readonly string[] {
  if (rewardsLambdasUrns !== undefined) {
    return rewardsLambdasUrns;
  }
  return wearableUrnsForKiteId(balloon.kiteId);
}

function refreshRewardsEquippedFromLambdas(): void {
  balloonRewards = setRewardsEquippedFingerprint(balloonRewards, balloon.kiteId || "");
  const userId = getPlayer()?.userId || PlayerIdentityData.getOrNull(engine.PlayerEntity)?.address;
  if (!userId) {
    rewardsLambdasUrns = wearableUrnsForKiteId(balloon.kiteId);
    return;
  }
  void executeTask(async () => {
    try {
      const result = await fetchLambdasEquippedSnapshot(userId);
      if (!balloonRewards.open) {
        return;
      }
      if (!result.snapshot) {
        rewardsLambdasUrns = wearableUrnsForKiteId(balloon.kiteId);
        balloonRewards = setRewardsEquippedFingerprint(balloonRewards, balloon.kiteId || "");
        console.log("[KITE] rewards profile fetch failed", { status: result.status, error: result.error ?? "unknown" });
        return;
      }
      rewardsLambdasUrns = result.snapshot.wearables;
      balloonRewards = setRewardsEquippedFingerprint(balloonRewards, equippedKiteFingerprint(rewardsLambdasUrns));
    } catch (error) {
      if (!balloonRewards.open) {
        return;
      }
      rewardsLambdasUrns = wearableUrnsForKiteId(balloon.kiteId);
      balloonRewards = setRewardsEquippedFingerprint(balloonRewards, balloon.kiteId || "");
      const message = error instanceof Error ? error.message || error.name : String(error);
      console.log("[KITE] rewards profile fetch failed", { error: message });
    }
  });
}

function playerWearableUrns(): string[] {
  try {
    return [...(getPlayer()?.wearables ?? [])];
  } catch {
    return [];
  }
}

function bindLocalEquippedWearableListener(): void {
  applyEquippedWearableUrns(playerWearableUrns());
  AvatarEquippedData.onChange(engine.PlayerEntity, (equipped) => {
    if (!equipped) {
      return;
    }
    applyEquippedWearableUrns(wearablesFromAvatarEquippedData(equipped));
  });
}

function localEffectiveCapacity(): number {
  return balloon.capacity;
}

function applyClientKiteHintIfUnsynced(): void {
  const userId = getPlayer()?.userId || PlayerIdentityData.getOrNull(engine.PlayerEntity)?.address;
  if (!userId) {
    return;
  }
  void executeTask(async () => {
    try {
      const result = await fetchLambdasEquippedSnapshot(userId);
      if (balloonProfileSynced || !result.snapshot) {
        return;
      }
      const resolved = resolveLambdasKiteProfile(
        { avatars: [{ version: result.snapshot.version, avatar: { wearables: result.snapshot.wearables } }] },
        balloon.level,
      );
      if (!resolved || balloonProfileSynced) {
        return;
      }
      applyBalloonFields({
        kiteId: resolved.perk.kiteId,
        kiteName: resolved.perk.kiteName,
        kiteXpBonus: resolved.perk.kiteXpBonus,
        capacity: resolved.perk.capacity,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message || error.name : String(error);
      console.log("[KITE] client profile hint failed", { error: message });
    }
  });
}

function applyBalloonFields(fields: BalloonSessionFields) {
  balloon = applyBalloonSessionFields(balloon, fields);
  syncEntryBlockerWithEmployment(castle.entryBlocker, balloon.employed);
  syncHirePortalWithEmployment(
    castle.hirePortal,
    balloon.employed,
    canTurnInBalloons(balloon.carriedBalloons, balloon.capacity),
  );
  syncChestGoldPortalWithParty(castle.indicatorPortal, balloon.partyActive);
  if (syncBlowingEmoteSession(balloon.sessionId, balloon.isBlowing && !balloon.partyActive)) {
    blowEmotePlaying = false;
    lastBlowEmoteAt = 0;
    replayTableSitBlowing();
  }
  if (!balloon.isBlowing || balloon.partyActive) {
    resetBlowingVisualPlayCount();
  }
  if ((!balloon.isBlowing || balloon.partyActive) && !currentTableSeat()) {
    releaseBlowingVisual();
  }
}

function applyIncomingLeaderboard(data: { generatedAt?: number; payload?: string }): void {
  const now = Date.now();
  logBalloonSessionAroundLeaderboard("before", balloon, now);
  const parsed = parseLeaderboardUpdateMessage(data);
  logLeaderboardPayloadReceived(parsed.entries.length, { generatedAt: parsed.generatedAt });
  leaderboardStore = applyLeaderboardUpdate(leaderboardStore, parsed);
  logLeaderboardClientStateUpdated(leaderboardStore);
  const rows = blowerWallRowsFromEntries(leaderboardStore.entries);
  setLeaderboardRows("blowers", padLeaderboardLiveRows(rows));
  logLeaderboardBoardRowsRendered(rows.length);
  logBalloonSessionAroundLeaderboard("after", balloon, now);
}

function localPlayerName(): string | undefined {
  try {
    return sanitizeProfileName(getPlayer()?.name);
  } catch {
    return undefined;
  }
}

async function withResolvedHostNames(parties: ScheduledPartyView[]): Promise<ScheduledPartyView[]> {
  return applyHostDisplayNames(parties, {
    localName: localPlayerName(),
    localWallet: PlayerIdentityData.getOrNull(engine.PlayerEntity)?.address,
  });
}

async function applyUpcomingViews(parties: ScheduledPartyView[], nowMs: number): Promise<void> {
  const wallet = PlayerIdentityData.getOrNull(engine.PlayerEntity)?.address;
  const named = await withResolvedHostNames(applyLocalUpcomingViewerFlags(parties, wallet));
  cacheUpcomingParties(named, nowMs);
  if (partyBoard.open === "upcoming") {
    partyBoard = { ...partyBoard, parties: named, nowMs };
  } else if (partyBoard.open === "create" || partyBoard.open === "edit") {
    partyBoard = applyPublicOverlapMessage({ ...partyBoard, parties: named, nowMs });
  }
  if (help.open && help.kind === "learn") {
    help = {
      ...help,
      nextPartyAt: pickNextPartyStartMs(readBoundPartyScheduledAt(), nowMs, named),
    };
  }
}

function applyIncomingUpcomingState(data: { payload?: string }): void {
  const parsed = parseUpcomingPartiesPayload(data.payload ?? "");
  if (!parsed) {
    return;
  }
  lastUpcomingReceivedAt = Date.now();
  void executeTask(async () => {
    await applyUpcomingViews(snapshotsToScheduledPartyViews(parsed.parties), parsed.nowMs);
  });
}

async function upcomingPartiesForUi(): Promise<ScheduledPartyView[]> {
  const wallet = PlayerIdentityData.getOrNull(engine.PlayerEntity)?.address;
  if (shouldRequestUpcomingOnOpen(lastUpcomingReceivedAt, Date.now())) {
    requestUpcomingFromServer("open");
  }
  return await withResolvedHostNames(applyLocalUpcomingViewerFlags(partyBoard.parties, wallet));
}

async function openUpcomingFromServerCache(): Promise<void> {
  await refreshEligibilityAndConfig();
  const parties = await upcomingPartiesForUi();
  partyBoard = openUpcomingParties(partyBoard, parties, partyBoard.nowMs || Date.now());
  panels = closeChestPanel(panels);
  if (shouldRequestUpcomingOnOpen(lastUpcomingReceivedAt, Date.now())) {
    requestUpcomingFromServer("open");
  }
}

async function refreshEligibilityAndConfig() {
  const wallet = PlayerIdentityData.getOrNull(engine.PlayerEntity)?.address;
  try {
    const [config, runtime, chestConfig] = await Promise.all([
      fetchScheduledPartyConfig(),
      fetchSceneRuntime(),
      fetchDepositChestConfig(),
    ]);
    if (config) {
      partyBoard = setPartyConfig(partyBoard, {
        descriptionMaxLength: config.descriptionMaxLength,
        rescheduleLockMinutes: config.rescheduleLockMinutes,
        contributionLockMinutes: config.contributionLockMinutes,
        minLeadTimeMinutes: config.minLeadTimeMinutes,
        maxHorizonDays: config.maxHorizonDays,
        productionPlayableWindowMinutes: config.productionPlayableWindowMinutes,
      });
    }
    panels = setShowDepositDiagnostics(panels, false);
    if (chestConfig) {
      let minMana = panels.deposit.minMana;
      try {
        const wei = BigInt(chestConfig.minManaDeposit);
        const whole = Number(wei / 10n ** 18n);
        if (whole > 0) minMana = whole;
      } catch {
        /* keep last known display minimum */
      }
      panels = setChestPolicy(panels, {
        maxNftsPerDeposit: chestConfig.maxNftsPerDeposit,
        protectedMintNumbers: chestConfig.protectedMintNumbers,
        minMana,
      });
    }
  } catch {
    /* config stays Convex-authoritative; UI labels use last known values */
  }
  if (wallet) {
    try {
      const eligibility = await checkHostEligibility(wallet, []);
      partyBoard = setHostEligible(partyBoard, eligibility.eligible, eligibility.reason);
      panels = setHostRequirements(panels, eligibility.requiredWearables ?? []);
      try {
        partyBoard = setExtraPoolQuota(partyBoard, await fetchExtraPoolHostQuota(wallet));
      } catch {
        /* Extra Pool quota stays last known; create/edit still enforce it on the server */
      }
    } catch {
      partyBoard = setHostEligible(partyBoard, false, "Could not check host eligibility");
    }
  } else {
    partyBoard = setHostEligible(partyBoard, false, "");
  }
}

async function refreshExtraPoolQuota(wallet: string): Promise<void> {
  try {
    partyBoard = setExtraPoolQuota(partyBoard, await fetchExtraPoolHostQuota(wallet));
  } catch {
    /* server still enforces the Extra Pool party cap */
  }
}

function returnToChestRoot() {
  closeRewardsUi();
  partyBoard = closePartyPanel(partyBoard);
  panels = openChestRoot(panels);
}

/** Top-right X leaves the world. Back arrows still step through screens. */
function dismissDepositUi(resumeWorld = true) {
  const wasOpen = panels.open !== "none" || partyBoard.open !== "none";
  partyBoard = closePartyPanel(partyBoard);
  panels = closeChestPanel(panels);
  if (resumeWorld && wasOpen && isStateSyncronized()) {
    room.send("observerResumed", { reason: "deposit-chest-return" });
  }
}

function closeRewardsUi() {
  balloonRewards = closeBalloonRewardUi(balloonRewards);
}

function openDepositChestFromWorld() {
  if (!worldInteractionAllowed()) {
    return;
  }
  closeRewardsUi();
  panels = openChestRoot(panels);
  void executeTask(async () => {
    await refreshEligibilityAndConfig();
  });
}

function proceedOpenDepositTargets() {
  panels = openChestPanel(panels, "deposit");
  const wallet = PlayerIdentityData.getOrNull(engine.PlayerEntity)?.address;
  if (wallet) {
    void executeTask(async () => {
      try {
        const targets = await fetchContributionTargets(wallet);
        panels = setDepositTargets(
          panels,
          await withResolvedHostNames(targets.targets),
          targets.nextPublicPartyAt,
        );
      } catch (error) {
        panels = setDepositStatus(
          panels,
          "failed",
          error instanceof Error ? error.message : "Could not load deposit targets",
        );
      }
    });
  }
}

function openDepositEntry() {
  closeRewardsUi();
  pendingDepositContribute = undefined;
  if (DEPOSIT_WARNING_SKIP_PERSISTENCE_ENABLED && skipDepositWarning) {
    proceedOpenDepositTargets();
    return;
  }
  panels = openDepositWarning(panels);
}

function acceptDepositWarning(dontShowAgain: boolean) {
  if (DEPOSIT_WARNING_SKIP_PERSISTENCE_ENABLED && dontShowAgain) {
    skipDepositWarning = true;
    room.send("setDepositWarningSkip", { skip: true });
  }
  const contribute = pendingDepositContribute;
  pendingDepositContribute = undefined;
  if (contribute) {
    panels = beginContributeToParty(panels, contribute);
    return;
  }
  proceedOpenDepositTargets();
}

function exitDepositWarning() {
  pendingDepositContribute = undefined;
  panels = openChestRoot(panels);
}

function openContributeEntry(partyId: string, title: string) {
  closeRewardsUi();
  partyBoard = closePartyPanel(partyBoard);
  pendingDepositContribute = { partyId, title };
  if (DEPOSIT_WARNING_SKIP_PERSISTENCE_ENABLED && skipDepositWarning) {
    panels = beginContributeToParty(panels, { partyId, title });
    pendingDepositContribute = undefined;
    return;
  }
  panels = openDepositWarning(panels);
}

function handlePop(source: PopIntentSource) {
  if (!rewardAdmissionReady()) {
    return;
  }
  const tapped = handlePopIntent(ui, source);
  ui = tapped.model;
  if (tapped.shouldSend) {
    sendPop();
  }
}

export function startClient() {
  console.log("[CLIENT] startClient");
  console.log("[blow-sync] client handler installed");
  bindLocalEquippedWearableListener();
  applyClientKiteHintIfUnsynced();
  preloadSceneUiTextures();
  console.log("CLIENT ENV:", DROPPARTY_BUILD_ENV);
  console.log("CLIENT CONVEX:", convexSiteHost(CONVEX_SITE_URL));
  room.onMessage("admissionResult", (data) => {
    if (data.admitted && data.reason === "ADMITTED") {
      admissionStatus = "admitted";
      admissionToken = "";
      return;
    }
    if (data.reason === "NETWORK_LIMIT_REACHED") {
      admissionStatus = "denied";
      admissionToken = "";
      return;
    }
    if (isPlayerNotReadyAdmission(data.reason)) {
      admissionStatus = "token-sent";
      nextAdmissionAttemptAt = Date.now() + 400;
      return;
    }
    if (isRetryableAdmissionResult(data.reason) && admissionFetchAttempts < MAX_ADMISSION_FETCH_ATTEMPTS) {
      admissionToken = "";
      admissionFetchAttempts += 1;
      scheduleAdmissionRetry();
      return;
    }
    admissionStatus = "unavailable";
    admissionToken = "";
  });
  bindLeaderboardUpdateOnce(leaderboardHandlerSlot, () => {
    room.onMessage("leaderboardUpdate", (data) => {
      applyIncomingLeaderboard(data);
    });
  });
  room.onMessage("upcomingPartiesState", (data) => {
    applyIncomingUpcomingState(data);
  });
  try {
    console.log("[CLIENT] registering React ECS renderer");
    bindChestInteractions(castle, openDepositChestFromWorld);
    bindNpcInteraction(castle, () => {
      if (!worldInteractionAllowed()) {
        return;
      }
      openNpcConversation();
    });
    setupUi(
      () => ui,
      () => handlePop("ui"),
      () => (rewardAdmissionReady() ? personal : createPersonalWinToast()),
      () => (rewardAdmissionReady() ? world : createWorldToastQueue()),
      () => partyHudForAdmission(hud, rewardAdmissionReady()),
      () => (rewardAdmissionReady() ? chest : undefined),
      () => (rewardAdmissionReady() ? panels : undefined),
      {
        onClosePanel: () => {
          dismissDepositUi();
        },
        onOpenDeposit: () => {
          openDepositEntry();
        },
        onAcceptDepositWarning: (dontShowAgain) => {
          acceptDepositWarning(dontShowAgain);
        },
        onExitDepositWarning: () => {
          exitDepositWarning();
        },
        onOpenParties: () => {
          closeRewardsUi();
          void executeTask(async () => {
            try {
              await openUpcomingFromServerCache();
            } catch (error) {
              partyBoard = {
                ...openUpcomingParties(partyBoard, partyBoard.parties, Date.now()),
                message: error instanceof Error ? error.message : "Could not load parties",
              };
            }
          });
        },
        onOpenUpcoming: () => {
          closeRewardsUi();
          void executeTask(async () => {
            try {
              await openUpcomingFromServerCache();
            } catch (error) {
              partyBoard = {
                ...openUpcomingParties(partyBoard, partyBoard.parties, Date.now()),
                message: error instanceof Error ? error.message : "Could not load parties",
              };
            }
          });
        },
        onOpenMyParties: () => {
          closeRewardsUi();
          void executeTask(async () => {
            try {
              const wallet = localWalletOrThrow();
              await refreshEligibilityAndConfig();
              const hosted = await fetchHostedParties(wallet);
              const leftovers = await loadHostLeftovers(wallet);
              partyBoard = setLeftoverInventory(
                openMyParties(partyBoard, await withResolvedHostNames(hosted.parties), hosted.nowMs, hosted.pots),
                leftovers,
              );
              panels = closeChestPanel(panels);
            } catch (error) {
              partyBoard = {
                ...openMyParties(partyBoard, [], Date.now()),
                message: error instanceof Error ? error.message : "Could not load your parties",
              };
            }
          });
        },
        onOpenMyWins: () => {
          closeRewardsUi();
          void executeTask(async () => {
            partyBoard = { ...partyBoard, open: "wins", winsLoading: true, message: "" };
            panels = closeChestPanel(panels);
            try {
              const wallet = PlayerIdentityData.getOrNull(engine.PlayerEntity)?.address;
              if (!wallet) {
                partyBoard = {
                  ...openMyWins(partyBoard, [], Date.now()),
                  message: "Connect a wallet to see your wins.",
                };
                return;
              }
              const result = await fetchWins({ wallet, limit: 50 });
              partyBoard = openMyWins(partyBoard, result.wins, Date.now());
            } catch (error) {
              partyBoard = {
                ...openMyWins(partyBoard, partyBoard.wins, Date.now()),
                message: error instanceof Error ? error.message : "Could not load wins",
              };
            }
          });
        },
        onOpenCreate: () => {
          closeRewardsUi();
          void executeTask(async () => {
            await refreshEligibilityAndConfig();
            if (canOpenCreateParty(partyBoard)) {
              const wallet = PlayerIdentityData.getOrNull(engine.PlayerEntity)?.address;
              const upcoming = await upcomingPartiesForUi();
              const leftovers = wallet ? await loadHostLeftovers(wallet) : [];
              partyBoard = applyPublicOverlapMessage(
                openPartyCreate(
                  { ...partyBoard, parties: upcoming },
                  Date.now(),
                  { groups: leftovers },
                ),
              );
              panels = closeChestPanel(panels);
              return;
            }
            partyBoard = closePartyPanel(partyBoard);
            panels = openHostAccess(panels);
          });
        },
        onOpenMarketplace: (url) => {
          if (isSafeMarketplaceUrl(url)) {
            void openExternalUrl({ url });
          }
        },
        onOpenExplorer: (url) => {
          if (isSafeExplorerUrl(url)) {
            void openExternalUrl({ url });
          }
        },
        onCloseParties: () => {
          dismissDepositUi();
        },
        onBackToChest: () => {
          if (partyBoard.open === "create" || partyBoard.open === "manage") {
            partyBoard = backToMyParties(partyBoard);
            return;
          }
          returnToChestRoot();
        },
        onCreateParty: () => {
          if (!canOpenCreateParty(partyBoard)) {
            partyBoard = {
              ...partyBoard,
              message: partyBoard.hostEligibilityReason || "This wallet is not eligible to host a Drop Party.",
            };
            return;
          }
          void executeTask(async () => {
            const wallet = PlayerIdentityData.getOrNull(engine.PlayerEntity)?.address;
            const upcoming = await upcomingPartiesForUi();
            const leftovers = wallet ? await loadHostLeftovers(wallet) : [];
            partyBoard = applyPublicOverlapMessage(
              openPartyCreate(
                { ...partyBoard, parties: upcoming },
                Date.now(),
                { groups: leftovers },
              ),
            );
          });
        },
        onEditSelectedParty: () => {
          const selected = partyBoard.selected ?? partyBoard.hosted.find((row) => canHostEditParty(row));
          if (!selected || !canHostEditParty(selected)) {
            partyBoard = {
              ...partyBoard,
              message: "This party is locked and can no longer be edited.",
            };
            return;
          }
          partyBoard = openPartyEdit(partyBoard, selected, Date.now());
        },
        onManageParty: (partyId) => {
          openHostedPartyManager(partyId, "details");
        },
        onCreateAgain: () => {
          const selected = partyBoard.selected;
          if (!selected) return;
          void executeTask(async () => {
            try {
              const wallet = localWalletOrThrow();
              await refreshEligibilityAndConfig();
              if (!canOpenCreateParty(partyBoard)) {
                partyBoard = {
                  ...partyBoard,
                  message: partyBoard.hostEligibilityReason || "This wallet is not eligible to host a Drop Party.",
                };
                return;
              }
              const leftovers = await loadHostLeftovers(wallet);
              const group = leftovers.find((row) => row.sourcePartyId === selected.partyId);
              partyBoard = applyPublicOverlapMessage(
                openPartyCreate(
                  { ...partyBoard, parties: await upcomingPartiesForUi() },
                  Date.now(),
                  {
                    groups: leftovers,
                    selection: group ? selectAllLeftoversFromGroup(group) : emptyLeftoverSelection,
                  },
                ),
              );
            } catch (error) {
              partyBoard = {
                ...partyBoard,
                message: error instanceof Error ? error.message : "Could not load leftovers",
              };
            }
          });
        },
        onToggleLeftoverPrize: (prizeId) => {
          partyBoard = setLeftoverSelection(partyBoard, toggleLeftoverPrize(partyBoard.leftoverSelection, prizeId));
        },
        onToggleLeftoverMana: (partyId) => {
          partyBoard = setLeftoverSelection(partyBoard, toggleLeftoverMana(partyBoard.leftoverSelection, partyId));
        },
        onContribute: (partyId, title) => {
          openContributeEntry(partyId, title);
        },
        onAddPrizes: () => {
          const selected = partyBoard.selected;
          if (!selected || !canHostAddPrizes(selected)) {
            partyBoard = {
              ...partyBoard,
              message: "This party is locked and can no longer accept prizes.",
            };
            return;
          }
          openContributeEntry(selected.partyId, selected.title);
        },
        onDraftTitle: (value) => {
          partyBoard = setPartyDraft(partyBoard, { title: value });
        },
        onDraftDescription: (value) => {
          partyBoard = setPartyDraft(partyBoard, { description: value });
        },
        onDraftDate: (value) => {
          partyBoard = setPartyDraft(partyBoard, { localDateInput: value });
        },
        onDraftTime: (value) => {
          partyBoard = setPartyDraft(partyBoard, { localTimeClock: value });
        },
        onDraftDayPeriod: (period) => {
          partyBoard = setPartyDraft(partyBoard, { localTimePeriod: period });
        },
        onToggleDraftCommunity: () => {
          if (partyBoard.open === "manage" && partyBoard.selected) {
            void executeTask(async () => {
              try {
                const wallet = localWalletOrThrow();
                const next = !partyBoard.selected!.allowCommunityContributions;
                await editScheduledParty({
                  wallet,
                  partyId: partyBoard.selected!.partyId,
                  allowCommunityContributions: next,
                });
                const updated = { ...partyBoard.selected!, allowCommunityContributions: next };
                partyBoard = openManageParty(partyBoard, updated, Date.now(), partyBoard.pot);
                notifyUpcomingHostMutation();
              } catch (error) {
                partyBoard = {
                  ...partyBoard,
                  message: error instanceof Error ? error.message : "Could not update community setting",
                };
              }
            });
            return;
          }
          partyBoard = setPartyDraft(partyBoard, {
            allowCommunityContributions: !partyBoard.draft.allowCommunityContributions,
          });
        },
        onToggleDraftExtraPool: () => {
          if (partyBoard.open === "manage" && partyBoard.selected) {
            const next = !partyBoard.selected.supplementFromExtraPool;
            if (next && !canTurnOnExtraPool(partyBoard, partyBoard.selected.supplementFromExtraPool)) {
              partyBoard = { ...partyBoard, message: extraPoolQuotaHelper(partyBoard.extraPoolQuota) };
              return;
            }
            void executeTask(async () => {
              try {
                const wallet = localWalletOrThrow();
                await editScheduledParty({
                  wallet,
                  partyId: partyBoard.selected!.partyId,
                  supplementFromExtraPool: next,
                });
                const updated = { ...partyBoard.selected!, supplementFromExtraPool: next };
                partyBoard = openManageParty(partyBoard, updated, Date.now(), partyBoard.pot);
                await refreshExtraPoolQuota(wallet);
              } catch (error) {
                partyBoard = {
                  ...partyBoard,
                  message: error instanceof Error ? error.message : "Could not update Extra Pool setting",
                };
              }
            });
            return;
          }
          partyBoard = setPartyDraft(partyBoard, {
            supplementFromExtraPool: !partyBoard.draft.supplementFromExtraPool,
          });
        },
        onToggleDraftUnclaimedPolicy: () => {
          if (partyBoard.open === "manage" && partyBoard.selected) {
            void executeTask(async () => {
              try {
                const wallet = localWalletOrThrow();
                const next =
                  partyBoard.selected!.unclaimedPrizePolicy === "EXTRA_POOL"
                    ? ("HOST_LEFTOVERS" as const)
                    : ("EXTRA_POOL" as const);
                await editScheduledParty({
                  wallet,
                  partyId: partyBoard.selected!.partyId,
                  unclaimedPrizePolicy: next,
                });
                const updated = { ...partyBoard.selected!, unclaimedPrizePolicy: next };
                partyBoard = openManageParty(partyBoard, updated, Date.now(), partyBoard.pot);
              } catch (error) {
                partyBoard = {
                  ...partyBoard,
                  message: error instanceof Error ? error.message : "Could not update leftover policy",
                };
              }
            });
            return;
          }
          partyBoard = setPartyDraft(partyBoard, {
            unclaimedPrizePolicy:
              partyBoard.draft.unclaimedPrizePolicy === "EXTRA_POOL" ? "HOST_LEFTOVERS" : "EXTRA_POOL",
          });
        },
        onPickPublicDestination: () => {
          panels = setDepositDestination(panels, "PUBLIC_ROLLING");
        },
        onPickScheduledDestination: (partyId, title) => {
          panels = setDepositDestination(panels, "SCHEDULED_PARTY", { partyId, title });
        },
        onSubmitParty: () => {
          partyBoard = applyPublicOverlapMessage(partyBoard);
          const overlap = publicOverlapMessageForDraft(partyBoard);
          if (overlap || isPublicDropPartyOverlapMessage(partyBoard.message)) {
            if (overlap) {
              partyBoard = { ...partyBoard, message: overlap };
            }
            return;
          }
          void executeTask(async () => {
            try {
              const wallet = localWalletOrThrow();
              const draft = partyBoard.draft;
              if (partyBoard.open === "edit" && partyBoard.selected) {
                const locked = partyBoard.selected.isHostRescheduleLocked;
                await editScheduledParty({
                  wallet,
                  partyId: partyBoard.selected.partyId,
                  title: draft.title,
                  description: draft.description,
                  allowCommunityContributions: draft.allowCommunityContributions,
                  supplementFromExtraPool: draft.supplementFromExtraPool,
                  unclaimedPrizePolicy: draft.unclaimedPrizePolicy,
                  ...(locked
                    ? {}
                    : {
                        timeZone: draft.timeZone,
                        localScheduledDate: draft.localDate,
                        localScheduledTime: draft.localTime,
                      }),
                });
              } else if (hasLeftoverSelection(partyBoard.leftoverSelection)) {
                await createScheduledPartyFromLeftovers({
                  wallet,
                  title: draft.title,
                  description: draft.description,
                  timeZone: draft.timeZone,
                  localScheduledDate: draft.localDate,
                  localScheduledTime: draft.localTime,
                  allowCommunityContributions: draft.allowCommunityContributions,
                  supplementFromExtraPool: draft.supplementFromExtraPool,
                  unclaimedPrizePolicy: draft.unclaimedPrizePolicy,
                  prizeIds: partyBoard.leftoverSelection.prizeIds,
                  includeManaFromPartyIds: partyBoard.leftoverSelection.manaPartyIds,
                  sourcePartyId: partyBoard.leftoverSelection.manaPartyIds[0] ?? partyBoard.leftoverGroups.find((group) =>
                    group.nftPrizes.some((prize) => partyBoard.leftoverSelection.prizeIds.includes(prize.prizeId)),
                  )?.sourcePartyId,
                });
              } else {
                await createScheduledParty({
                  wallet,
                  title: draft.title,
                  description: draft.description,
                  timeZone: draft.timeZone,
                  localScheduledDate: draft.localDate,
                  localScheduledTime: draft.localTime,
                  allowCommunityContributions: draft.allowCommunityContributions,
                  supplementFromExtraPool: draft.supplementFromExtraPool,
                  unclaimedPrizePolicy: draft.unclaimedPrizePolicy,
                });
              }
              const hosted = await fetchHostedParties(wallet);
              const leftovers = await loadHostLeftovers(wallet);
              partyBoard = setLeftoverInventory(
                openMyParties(partyBoard, await withResolvedHostNames(hosted.parties), hosted.nowMs, hosted.pots),
                leftovers,
              );
              await refreshExtraPoolQuota(wallet);
              notifyUpcomingHostMutation();
            } catch (error) {
              partyBoard = {
                ...partyBoard,
                message: error instanceof Error ? error.message : "Party save failed",
              };
            }
          });
        },
        onDepositAsset: (asset) => {
          panels = chooseDepositAsset(panels, asset);
          if (asset === "MANA") {
            loadManaBalance();
          }
        },
        onNftKind: (kind) => {
          panels = chooseNftKind(panels, kind);
          const wallet = PlayerIdentityData.getOrNull(engine.PlayerEntity)?.address;
          if (!wallet) {
            panels = setDepositInventory(panels, []);
            panels = setDepositStatus(panels, "failure", "Connect a Web3 wallet to load inventory.");
            return;
          }
          void executeTask(async () => {
            try {
              if (kind === "leftover") {
                const groups = await loadHostLeftovers(wallet);
                const items = leftoverGroupsToDepositItems(groups);
                if (panels.deposit.nftKind !== kind || panels.open !== "depositNftPick") {
                  return;
                }
                panels = setDepositLeftoverAvailable(setDepositInventory(panels, items), items.length > 0);
                return;
              }
              const [items, groups] = await Promise.all([
                fetchOwnedInventory(wallet, kind),
                loadHostLeftovers(wallet).catch(() => []),
              ]);
              if (panels.deposit.nftKind !== kind || panels.open !== "depositNftPick") {
                return;
              }
              panels = setDepositLeftoverAvailable(
                setDepositInventory(panels, items),
                groups.some(leftoverGroupHasAssets),
              );
            } catch (error) {
              if (panels.deposit.nftKind !== kind) {
                return;
              }
              panels = setDepositInventory(panels, []);
              panels = setDepositStatus(
                panels,
                "failure",
                error instanceof Error ? error.message : kind === "leftover" ? "Leftover load failed" : "Inventory load failed",
              );
            }
          });
        },
        onSelectItem: (urn) => {
          const item = panels.deposit.inventory.find((row) => row.urn === urn);
          if (item) panels = selectDepositItem(panels, item);
        },
        onAdjustQuantity: (delta) => {
          if (panels.open === "depositMana") {
            panels = setManaAmount(panels, panels.deposit.manaAmount + delta);
            return;
          }
          panels = setDepositQuantity(panels, panels.deposit.quantity + delta);
        },
        onToggleAutoPick: () => {
          panels = setAutoPick(panels, !panels.deposit.autoPick);
        },
        onToggleLowMintLock: () => {
          panels = setLowMintLock(panels, !panels.deposit.lowMintLock);
        },
        onInventorySearch: (value) => {
          panels = setInventorySearch(panels, value);
        },
        onInventoryRarity: (rarity) => {
          panels = setInventoryRarity(panels, rarity);
        },
        onInventoryPage: (delta) => {
          panels = turnInventoryPage(panels, delta);
        },
        onInventoryGoToPage: (page) => {
          panels = goToInventoryPage(panels, page);
        },
        onToggleMint: (tokenId) => {
          panels = toggleSelectedMint(panels, tokenId);
        },
        onSetManaAmount: (value) => {
          const parsed = Number(value);
          if (Number.isFinite(parsed)) {
            panels = setManaAmount(panels, parsed);
          }
        },
        onBackDeposit: () => {
          const fromHostAccess = panels.open === "hostAccess";
          const refreshKind =
            panels.open === "depositStatus" &&
            panels.deposit.asset === "NFT" &&
            panels.deposit.nftKind !== "leftover"
              ? panels.deposit.nftKind
              : null;
          const refreshMana = panels.open === "depositStatus" && panels.deposit.asset === "MANA";
          panels = backFromDeposit(panels);
          if (fromHostAccess) {
            partyBoard = backToMyParties(partyBoard);
          }
          if (refreshMana && panels.open === "depositMana") {
            loadManaBalance();
            return;
          }
          if (!refreshKind || panels.open !== "depositNftPick") {
            return;
          }
          const wallet = PlayerIdentityData.getOrNull(engine.PlayerEntity)?.address;
          if (!wallet) {
            return;
          }
          void executeTask(async () => {
            try {
              const items = await fetchOwnedInventory(wallet, refreshKind);
              if (panels.open !== "depositNftPick" || panels.deposit.nftKind !== refreshKind) {
                return;
              }
              panels = setDepositInventory(panels, items);
            } catch {
              /* inventory refresh after a confirmed deposit is best-effort */
            }
          });
        },
        onManageTab: (tab) => {
          partyBoard = setManageTab(partyBoard, tab);
          if (tab === "prizes" && partyBoard.selected) {
            loadManagePrizeHistory(partyBoard.selected.partyId);
          }
        },
        onViewPrizes: (partyId) => {
          if (
            partyBoard.open === "mine" &&
            partyBoard.hosted.some((party) => party.partyId === partyId)
          ) {
            openHostedPartyManager(partyId, "prizes");
            return;
          }
          const row =
            partyBoard.hosted.find((party) => party.partyId === partyId) ??
            partyBoard.parties.find((party) => party.partyId === partyId);
          if (!row) return;
          const returnOpen =
            partyBoard.open === "mine" || partyBoard.open === "manage" ? partyBoard.open : "upcoming";
          partyBoard = openPrizePreview(partyBoard, row, null, Date.now(), returnOpen);
          void executeTask(async () => {
            try {
              const preview = await fetchPartyPrizePreview(partyId);
              partyBoard = setPrizePreview(partyBoard, preview);
            } catch (error) {
              partyBoard = {
                ...setPrizePreview(partyBoard, null),
                message: error instanceof Error ? error.message : "Could not load prizes",
              };
            }
          });
        },
        onClosePrizePreview: () => {
          partyBoard = closePrizePreview(partyBoard);
        },
        onToggleTimezonePicker: () => {
          partyBoard = toggleTimezonePicker(partyBoard);
        },
        onSelectDisplayTimeZone: (timeZone) => {
          if (timeZone === DEVICE_TIME_ZONE_SENTINEL) {
            saveDisplayTimeZone(DEVICE_TIME_ZONE_SENTINEL);
            partyBoard = setViewerTimeZone(partyBoard, detectLocalTimeZone(), false);
            return;
          }
          saveDisplayTimeZone(timeZone);
          partyBoard = setViewerTimeZone(partyBoard, timeZone, true);
        },
        onPrizePreviewPage: (section, delta) => {
          const selected = partyBoard.selected;
          if (!selected) return;
          const page = 20;
          const possibleOffset =
            section === "community"
              ? Math.max(0, partyBoard.prizePreviewPossibleOffset + delta * page)
              : partyBoard.prizePreviewPossibleOffset;
          const extraOffset =
            section === "extra"
              ? Math.max(0, partyBoard.prizePreviewExtraOffset + delta * page)
              : partyBoard.prizePreviewExtraOffset;
          partyBoard = setPrizePreviewOffsets(partyBoard, { possibleOffset, extraOffset });
          void executeTask(async () => {
            try {
              const next = await fetchPartyPrizePreview(selected.partyId, {
                possibleOffset,
                extraOffset,
              });
              partyBoard = setPrizePreview(partyBoard, next);
            } catch {
              partyBoard = { ...partyBoard, prizePreviewLoading: false, message: "Could not load more prizes" };
            }
          });
        },
        onConfirmDeposit: () => {
          const receipt = panels.deposit.receipt;
          if (
            depositRetryIsVerificationOnly(receipt) &&
            (panels.deposit.stage === "waiting_confirmation" || panels.deposit.stage === "failed")
          ) {
            void executeTask(async () => {
              try {
                const wallet = PlayerIdentityData.getOrNull(engine.PlayerEntity)?.address;
                if (!wallet) {
                  throw new Error("Connect a Web3 wallet to deposit");
                }
                const onProgress = (event: DepositProgressEvent) => {
                  panels = setDepositProgress(panels, event.stage, event.message, event.receipt);
                };
                if (panels.deposit.asset === "NFT" && receipt.sessionId && receipt.txHash) {
                  await retryNftSessionVerification({
                    wallet,
                    sessionId: receipt.sessionId,
                    txHash: receipt.txHash,
                    onProgress,
                  });
                  return;
                }
                if (panels.deposit.asset === "MANA" && receipt.depositIntentId && receipt.txHash) {
                  await retryManaVerification({
                    wallet,
                    depositIntentId: receipt.depositIntentId,
                    txHash: receipt.txHash,
                    onProgress,
                  });
                }
              } catch (error) {
                if (depositRetryIsVerificationOnly(panels.deposit.receipt)) {
                  panels = setDepositProgress(
                    panels,
                    "waiting_confirmation",
                    error instanceof Error ? error.message : "Confirmation is taking longer than expected.",
                    { verificationNeedsRetry: true },
                  );
                  return;
                }
                panels = setDepositStatus(
                  panels,
                  "failed",
                  error instanceof Error ? error.message : "Deposit failed",
                );
              }
            });
            return;
          }
          panels = confirmDeposit(panels);
          if (panels.deposit.stage !== "preparing") return;
          void executeTask(async () => {
            try {
              if (panels.deposit.asset === "MANA") {
                const amount = (BigInt(Math.floor(panels.deposit.manaAmount)) * 10n ** 18n).toString();
                await runManaDeposit(
                  amount,
                  panels.deposit.destination,
                  panels.deposit.scheduledPartyId,
                  {
                    manaAmount: panels.deposit.manaAmount,
                    scheduledPartyTitle: panels.deposit.scheduledPartyTitle,
                    onProgress: (event) => {
                      panels = setDepositProgress(panels, event.stage, event.message, event.receipt);
                    },
                  },
                );
                return;
              }
              const item = panels.deposit.selectedItem;
              if (!item) {
                panels = setDepositStatus(panels, "failed", "Select a wearable or emote first.");
                return;
              }
              const depositMints = panels.deposit.autoPick
                ? sortMintsForPicker(item).slice(0, panels.deposit.quantity)
                : panels.deposit.selectedMints;
              if (panels.deposit.nftKind === "leftover") {
                const wallet = localWalletOrThrow();
                const manaPartyId = leftoverManaPartyIdFromUrn(item.urn);
                await assignLeftoversToParty({
                  wallet,
                  prizeIds: isLeftoverManaUrn(item.urn)
                    ? []
                    : leftoverPrizeIdsForMints(item.leftoverPrizeByMint, depositMints).leftoverPrizeIds,
                  includeManaFromPartyIds: manaPartyId ? [manaPartyId] : [],
                  targetPartyId: panels.deposit.scheduledPartyId,
                  destination: panels.deposit.destination,
                });
                panels = setDepositProgress(panels, "confirmed", "Leftover prize added to the party.");
                try {
                  const groups = await loadHostLeftovers(wallet);
                  const items = leftoverGroupsToDepositItems(groups);
                  panels = setDepositLeftoverAvailable(setDepositInventory(panels, items), items.length > 0);
                } catch {
                  /* leftover list refresh is best-effort after a successful assign */
                }
                return;
              }
              const split = leftoverPrizeIdsForMints(item.leftoverPrizeByMint, depositMints);
              if (split.leftoverPrizeIds.length > 0) {
                const wallet = localWalletOrThrow();
                await assignLeftoversToParty({
                  wallet,
                  prizeIds: split.leftoverPrizeIds,
                  targetPartyId: panels.deposit.scheduledPartyId,
                  destination: panels.deposit.destination,
                });
                panels = setDepositProgress(panels, "confirmed", "Leftover prize added to the party.");
                if (split.walletMints.length === 0) {
                  return;
                }
              }
              await runNftDeposit({
                item: split.walletMints.length > 0 ? { ...item, mints: split.walletMints } : item,
                quantity: split.walletMints.length > 0 ? split.walletMints.length : panels.deposit.quantity,
                autoPick: panels.deposit.autoPick,
                lowMintLock: effectiveLowMintLock(panels.deposit.lowMintLock, item.rarity),
                selectedMints: split.walletMints.length > 0 ? split.walletMints : panels.deposit.selectedMints,
                destination: panels.deposit.destination,
                scheduledPartyId: panels.deposit.scheduledPartyId,
                scheduledPartyTitle: panels.deposit.scheduledPartyTitle,
                onProgress: (event) => {
                  panels = setDepositProgress(panels, event.stage, event.message, event.receipt);
                },
              });
            } catch (error) {
              if (depositRetryIsVerificationOnly(panels.deposit.receipt)) {
                panels = setDepositProgress(
                  panels,
                  "waiting_confirmation",
                  error instanceof Error ? error.message : "Confirmation is taking longer than expected.",
                  { verificationNeedsRetry: true },
                );
                return;
              }
              panels = setDepositStatus(
                panels,
                "failed",
                error instanceof Error ? error.message : "Deposit failed",
              );
            }
          });
        },
        onCloseHelp: () => {
          help = closeHelpWantedPanel(help);
        },
        onAcceptHire: () => {
          if (!rewardAdmissionReady()) {
            return;
          }
          console.log("[HELP WANTED] accept tapped", { synced: isStateSyncronized() });
          help = closeHelpWantedPanel(help);
          applyBalloonFields({ employed: true });
          fireHireGiftGreeting(Date.now());
          room.send("employmentAccept", { intent: "accept" });
        },
        onDeclineHire: () => {
          console.log("[HELP WANTED] decline tapped");
          help = closeHelpWantedPanel(help);
        },
        onTurnInBalloons: () => {
          if (!rewardAdmissionReady()) {
            return;
          }
          if (help.kind === "turnIn" && help.captcha) {
            const result = submitTurnInCaptcha(help.captcha);
            if (!result.ok) {
              help = { ...help, captcha: result.captcha };
              return;
            }
          }
          help = closeHelpWantedPanel(help);
          if (isStateSyncronized()) {
            room.send("turnInBalloons", { intent: "turnIn" });
          }
        },
        onSelectTurnInCaptcha: (shape) => {
          if (!help.captcha) {
            return;
          }
          help = { ...help, captcha: selectTurnInCaptcha(help.captcha, shape) };
        },
        onToggleMusic: () => {
          toggleSceneMusic(sceneMusic);
        },
        onNextSong: () => {
          nextSceneSong(sceneMusic);
        },
        onMusicVolumeDown: () => {
          nudgeSceneMusicVolume(sceneMusic, -1);
        },
        onMusicVolumeUp: () => {
          nudgeSceneMusicVolume(sceneMusic, 1);
        },
        onBalloonButton: () => {
          console.log("[BALLOON] action tapped", {
            synced: isStateSyncronized(),
            employed: balloon.employed,
            blowing: balloon.isBlowing,
            partyActive: balloon.partyActive,
          });
          if (
            !rewardAdmissionReady() ||
            !balloon.employed ||
            blowingHudSuppressed({ partyActive: balloon.partyActive, suppressHudUntil: balloonHudResumeAt }, Date.now())
          ) {
            return;
          }
          if (balloon.isBlowing) {
            if (Date.now() < stopBlowingClickAt) {
              return;
            }
            room.send("stopBlowing", { intent: "stop" });
            return;
          }
          pendingStartKiteCheck = true;
          stopBlowingClickAt = Date.now() + STOP_BLOWING_CLICK_DELAY_MS;
          room.send("startBlowing", { intent: "start" });
        },
        onOpenRewards: () => {
          if (!rewardAdmissionReady()) {
            return;
          }
          dismissDepositUi(false);
          rewardsLambdasUrns = undefined;
          balloonRewards = openBalloonRewardUi(balloonRewards);
          refreshRewardsEquippedFromLambdas();
          room.send("kiteStockRequest", { intent: "refresh" });
        },
        onCloseRewards: () => {
          kiteDetailMintedId = null;
          kiteDetailFailedId = null;
          kiteMintConfirmId = null;
          kiteDetailMintEnabledAfter = 0;
          kiteMintLastResult = "";
          balloonRewards = closeBalloonRewardUi(balloonRewards);
        },
        onRewardsTab: (tab) => {
          balloonRewards = setRewardsCatalogTab(balloonRewards, tab);
          if (tab === "KITES") {
            rewardsLambdasUrns = undefined;
            refreshRewardsEquippedFromLambdas();
            room.send("kiteStockRequest", { intent: "refresh" });
          }
        },
        onSelectKiteReward: (kiteId) => {
          kiteMintConfirmId = null;
          kiteDetailMintEnabledAfter = Date.now() + KITE_DETAIL_MINT_ARM_MS;
          balloonRewards = openKiteRewardDetail(balloonRewards, kiteId);
          room.send("kiteStockRequest", { intent: "refresh" });
        },
        onBackKiteRewardDetail: () => {
          kiteDetailMintedId = null;
          kiteDetailFailedId = null;
          kiteMintConfirmId = null;
          kiteDetailMintEnabledAfter = 0;
          kiteMintLastResult = "";
          balloonRewards = closeKiteRewardDetail(balloonRewards);
        },
        onRedeemKite: (kiteId) => {
          if (!rewardAdmissionReady() || kiteMintBusyId || Date.now() < kiteDetailMintEnabledAfter) {
            return;
          }
          if (kiteMintConfirmId !== kiteId) {
            kiteMintConfirmId = kiteId;
            return;
          }
          kiteMintConfirmId = null;
          kiteMintBusyId = kiteId;
          kiteDetailFailedId = null;
          room.send("redeemKiteReward", { kiteId });
        },
      },
      () => (rewardAdmissionReady() ? help : undefined),
      () => (rewardAdmissionReady() ? partyBoard : undefined),
      () => Boolean(PlayerIdentityData.getOrNull(engine.PlayerEntity)?.address),
      () => {
        const model = formatBalloonHud(
          {
            ...balloonHudInput(balloon),
            suppressHudUntil: balloonHudResumeAt,
            occupiedChairCount: tableSocialHud.occupiedChairCount,
            socialBonusXp: tableSocialHud.eligibleSocialBonusXp,
            stopClickAvailableAt: stopBlowingClickAt,
            showSeatedCount: shouldShowSeatedCount({
              seatedAtTable: currentTableSeat() !== undefined,
              aroundTable: Boolean(
                PlayerIdentityData.getOrNull(engine.PlayerEntity)?.address &&
                  isWalletAroundTable(PlayerIdentityData.getOrNull(engine.PlayerEntity)!.address),
              ),
            }),
          },
          Date.now(),
        );
        return rewardAdmissionReady() ? model : { ...model, visible: false };
      },
      () => (rewardAdmissionReady() ? balloonRewards : createBalloonRewardUi()),
      () => rewardsEquippedWearableUrns(),
      () => (rewardAdmissionReady() ? greeting.text : ""),
      () => greeting.tone,
      () =>
        rewardAdmissionReady() && balloonFullAlertVisible(fullAlert.hideAt, Date.now())
          ? fullAlert.text
          : "",
      () => ({ paused: sceneMusic.playback.paused, volume: sceneMusic.playback.volume }),
      () => admissionNotice(),
      () => !rewardAdmissionReady(),
      () => kiteMintCounts,
      () => kiteRedemptions,
      () => kiteMintBusyId,
      () => kiteMintConfirmId,
      () => kiteDetailMintEnabledAfter,
      () => kiteDetailMintedId,
      () => kiteDetailFailedId,
      () => kiteMintLastResult,
    );
    console.log("[CLIENT] UI renderer registered");
  } catch (error) {
    console.log("[CLIENT] UI initialization failed:", error);
    throw error;
  }

  room.onMessage("tableSocialState", (data) => {
    tableSocialHud = {
      occupiedChairCount: data.occupiedChairCount,
      occupiedChairMask: data.occupiedChairMask ?? 0,
      currentSocialBonusXp: data.currentSocialBonusXp,
      tableFull: data.tableFull,
      eligibleSocialBonusXp: data.eligibleSocialBonusXp,
    };
    setOccupiedChairMask(tableSocialHud.occupiedChairMask);
    const localSeat = currentTableSeat();
    if (
      localSeat &&
      isTableSitSettled() &&
      !pendingTableSeatTransition &&
      !isChairOccupied(tableSocialHud.occupiedChairMask, localSeat.id)
    ) {
      queueTableSeatTransition(localSeat);
    }
  });

  room.onMessage("tableSeatResult", (data) => {
    const pending = pendingTableSeatTransition;
    if (!pending || data.requestId !== pending.requestId) {
      return;
    }
    if (data.accepted && data.chairId === pending.chairId) {
      pendingTableSeatTransition = undefined;
      return;
    }
    if (
      pending.seated &&
      (data.reason === "CHAIR_OCCUPIED" || data.reason === "INVALID_CHAIR")
    ) {
      pendingTableSeatTransition = undefined;
      const localSeat = currentTableSeat();
      if (localSeat?.id === pending.chairId) {
        standFromTableSeat(Date.now());
      }
    }
  });

  room.onMessage("depositWarningSkipState", (data) => {
    if (!DEPOSIT_WARNING_SKIP_PERSISTENCE_ENABLED) {
      skipDepositWarning = false;
      return;
    }
    skipDepositWarning = data.skip === true;
  });

  room.onMessage("balloonProfile", (data) => {
    balloonProfileSynced = true;
    applyBalloonFields({
      employed: data.employed,
      blowing: data.blowing,
      partyActive: data.partyActive,
      carriedBalloons: data.carriedBalloons,
      lifetimeBalloons: data.lifetimeBalloons,
      balloonPoints: data.balloonPoints,
      xp: data.xp,
      level: data.level,
      intervalStartedAt: Number(data.intervalStartedAt),
      intervalMs: data.intervalMs || BALLOON_INTERVAL_MS,
      kiteId: data.kiteId ?? "",
      kiteName: data.kiteName ?? "",
      kiteXpBonus: data.kiteXpBonus ?? 0,
      capacity: data.capacity > 0 ? data.capacity : balloon.capacity,
    });
    if (
      balloonStartStillOverCap({
        pendingStart: pendingStartKiteCheck,
        blowing: balloon.isBlowing,
        carriedBalloons: balloon.carriedBalloons,
        capacity: balloon.capacity,
      })
    ) {
      fullAlert = { text: "full", hideAt: Date.now() + BALLOON_FULL_ALERT_MS };
    }
    pendingStartKiteCheck = false;
  });

  room.onMessage("kiteMintState", (data) => {
    kiteMintCounts = parseKiteMintCounts(data);
  });

  room.onMessage("kiteRedeemResult", (data) => {
    applyBalloonFields({ balloonPoints: data.balloonPoints });
    const wasBusy = kiteMintBusyId !== null;
    kiteMintBusyId = null;
    kiteMintConfirmId = null;
    if (isKitePerkId(data.kiteId) && data.status) {
      kiteRedemptions = parseKiteRedemptionLedger({
        ...kiteRedemptions,
        [data.kiteId]: {
          kiteId: data.kiteId,
          attemptId: "",
          status: data.status,
          txHash: data.txHash,
          cost: 0,
          bpReserved: data.status === "SUBMITTED" || data.status === "PENDING",
          lastError: data.ok ? "" : sanitizeKiteMintClientError(data.lastError ?? ""),
          updatedAt: Date.now(),
        },
      });
    }
    if (!wasBusy) {
      return;
    }
    if (data.ok && isKitePerkId(data.kiteId)) {
      kiteDetailMintedId = data.kiteId;
      kiteDetailFailedId = null;
      kiteMintLastResult = data.result;
    } else if (isKitePerkId(data.kiteId)) {
      kiteMintLastResult = data.result;
      if (data.retrySafe) {
        kiteDetailFailedId = data.kiteId;
      }
    }
    console.log(
      `[KITE MINT] client result ${JSON.stringify({
        ok: data.ok,
        result: data.result,
        status: data.status,
        retrySafe: data.retrySafe,
        lastError: data.lastError ?? "",
        txHash: data.txHash ? "set" : "",
      })}`,
    );
    const unavailableDetail = sanitizeKiteMintClientError(data.lastError ?? "").trim();
    balloonRewards = {
      ...balloonRewards,
      message: data.ok
        ? "Minted."
        : data.result === "SUBMITTED"
          ? "Minting..."
          : data.result === "LEVEL_LOCKED"
            ? "Level too low."
            : data.result === "INSUFFICIENT_POINTS"
              ? "Not enough BP."
              : data.result === "ALLOWANCE_EXHAUSTED"
                ? "Minter allowance exhausted."
                : data.result === "SUPPLY_EXHAUSTED"
                  ? "Sold out."
                  : data.result === "MINTING_DISABLED"
                    ? "Minting disabled."
                    : data.result === "NOT_CONFIGURED"
                      ? "Mint server not configured."
                      : data.result === "UNAVAILABLE"
                        ? unavailableDetail
                          ? `Mint failed: ${unavailableDetail}`
                          : "Mint unavailable."
                        : data.retrySafe
                          ? "Mint failed. Try again."
                          : data.result,
    };
  });

  room.onMessage("balloonCompleted", (data) => {
    const previousLevel = balloon.level;
    applyBalloonFields({
      blowing: data.blowing,
      carriedBalloons: data.carriedBalloons,
      lifetimeBalloons: data.lifetimeBalloons,
      balloonPoints: data.balloonPoints,
      xp: data.xp,
      level: data.level,
      intervalStartedAt: Number(data.intervalStartedAt),
      intervalMs: data.intervalMs || balloon.intervalMs || BALLOON_INTERVAL_MS,
      kiteId: data.kiteId ?? balloon.kiteId,
      kiteName: data.kiteName ?? balloon.kiteName,
      kiteXpBonus: data.kiteXpBonus ?? balloon.kiteXpBonus,
      capacity: data.capacity > 0 ? data.capacity : balloon.capacity,
    });
    playBalloonFillSfx(sceneMusic);
    const now = Date.now();
    centerToasts = enqueueXpAndLevelUp(
      centerToasts,
      now,
      data.awardedXp,
      data.level > previousLevel,
    );
    if (data.carriedBalloons >= localEffectiveCapacity()) {
      centerToasts = enqueueTurnInAfterXpToast(centerToasts, now, data.awardedXp);
    }
  });

  room.onMessage("refreshBlowingVisual", (data) => {
    console.log("[blow-sync] refresh message received", { intent: data.intent });
    refreshLocalBlowingEmoteVisual(data.intent);
  });
  room.onMessage("balloonStopped", (data) => {
    applyBalloonFields({
      blowing: false,
      carriedBalloons: data.carriedBalloons,
      intervalStartedAt: 0,
      partyActive: data.reason === "party" ? true : balloon.partyActive,
    });
  });

  room.onMessage("employmentState", (data) => {
    console.log("[HELP WANTED] employmentState", data);
    applyBalloonFields({ employed: data.employed });
    if (!data.employed) {
      help = openHelpWantedPanel(help, "hire");
    }
  });

  room.onMessage("turnInResult", (data) => {
    if (data.ok) {
      applyBalloonFields({
        carriedBalloons: data.carriedBalloons,
        blowing: false,
        intervalStartedAt: 0,
      });
      fireHireGiftGreeting(Date.now());
    }
  });

  room.onMessage("rewardResult", (data) => {
    applyBalloonFields({ balloonPoints: data.balloonPoints });
    balloonRewards = {
      ...balloonRewards,
      message: data.ok ? "Redeemed." : data.result === "UNAVAILABLE" ? "Reward is not configured yet." : data.result,
    };
  });

  room.onMessage("eligibleCount", (data) => {
    applyEligible(data.count, "message");
  });

  room.onMessage("worldToast", (data) => {
    if (shouldSuppressWorldToastForLiveFeed({ livePartyHud: hud.visible, phase: hud.phase })) {
      return;
    }
    worldToastSeq += 1;
    world = enqueueWorldToast(world, {
      id: `world-${worldToastSeq}`,
      title: data.title,
      body: data.body,
      tier: data.tier,
    }, Date.now());
  });

  room.onMessage("popResult", (data) => {
    console.log("[CLIENT] popResult received", { result: data.result });
    popAwaitingSince = undefined;
    const next = onPopResult(ui, data.result, {
      now: Date.now(),
      lockMs: POP_ACTION_LOCK_MS,
      eligibleCount: ui.eligibleCount,
    });
    ui = next.model;
    if (data.result === "WON" && data.balloonId) {
      const now = Date.now();
      const winnerReveal = revealFromPopResult(data);
      console.log("[CLIENT] WON", { balloonId: data.balloonId });
      console.log("[CLIENT] WON reveal received", {
        type: winnerReveal.type,
        hasDisplayName: Boolean(data.revealName),
      });
      beginWonPresentation(data.balloonId, now, winnerReveal, stompPositionFromPopResult(data));
      lastWinFeedAt = now;
      hadPopsThisParty = true;
      refreshWinFeed();
    }
    if (next.shouldSend) {
      sendPop();
    }
  });

  engine.addSystem(() => {
    const now = Date.now();
    const wallet = PlayerIdentityData.getOrNull(engine.PlayerEntity)?.address?.toLowerCase() ?? "";
    if (wallet && wallet !== admissionWallet) {
      admissionWallet = wallet;
      admissionStatus = "waiting";
      admissionToken = "";
      admissionFetchAttempts = 0;
      admissionTokenSends = 0;
      admissionIdentityRetries = 0;
      nextAdmissionAttemptAt = now;
    }
    if (
      wallet &&
      isStateSyncronized() &&
      admissionStatus === "waiting" &&
      now >= nextAdmissionAttemptAt
    ) {
      requestRewardAdmission(wallet);
    } else if (
      admissionStatus === "token-sent" &&
      now >= nextAdmissionAttemptAt
    ) {
      if (admissionTokenSends < MAX_ADMISSION_TOKEN_SENDS) {
        sendAdmissionToken();
      } else if (admissionFetchAttempts < MAX_ADMISSION_FETCH_ATTEMPTS) {
        admissionToken = "";
        admissionFetchAttempts += 1;
        scheduleAdmissionRetry();
      } else {
        admissionStatus = "unavailable";
        admissionToken = "";
      }
    }
    for (const [, beat] of engine.getEntitiesWith(ServerHeartbeat)) {
      if (beat.tick !== lastHeartbeatTick) {
        lastHeartbeatTick = beat.tick;
        lastHeartbeatSeenAt = now;
      }
    }
    const me = PlayerIdentityData.getOrNull(engine.PlayerEntity);
    if (me) {
      for (const [, popHud] of engine.getEntitiesWith(PopHud)) {
        if (popHud.playerId.toLowerCase() === me.address.toLowerCase()) {
          applyEligible(popHud.eligibleCount, "hud");
        }
      }
    }
    if (ui.state === "POP_ACTION_LOCK") {
      ui = syncEligible(ui, ui.eligibleCount, now);
    }
    const lockTick = tickMovementLock(movement, now);
    movement = lockTick.model;
    if (lockTick.justUnlocked) {
      unlockLocalMovement();
      ui = syncEligible(ui, ui.eligibleCount, now);
      console.log("[CLIENT] pop action lock released");
    }
    toastTick(now);
    if (partyBoard.open !== "none") {
      partyBoard = setPartyNow(partyBoard, now);
    }
    syncPartyHud(now);
    let roundPartyId = "";
    let roundStatus = "NONE";
    for (const [, round] of engine.getEntitiesWith(PartyRoundHud)) {
      roundPartyId = round.partyId;
      roundStatus = round.status || "NONE";
      break;
    }
    if (shouldCloseDepositUiOnPartyStart(lastWinsStatus, roundStatus)) {
      const wasOpen = panels.open !== "none" || partyBoard.open !== "none";
      panels = dismissOpenDepositUi(panels);
      partyBoard = dismissOpenPartyUi(partyBoard);
      balloonRewards = closeBalloonRewardUi(balloonRewards);
      if (wasOpen && isStateSyncronized()) {
        room.send("observerResumed", { reason: "deposit-chest-return" });
      }
    }
    if (shouldShowPartyCompleteToast(lastWinsStatus, roundStatus)) {
      currentPartyWins = [];
      winFeedPartyId = null;
      hud = { ...hud, winFeed: [] };
      centerToasts = playPartyCompleteToast(centerToasts, now);
      balloonHudResumeAt = blowingHudResumeAt(now);
    }
    if (shouldShowRoundCompleteToast(lastHudPhase, hud.phase, hud.liveBalloonCount)) {
      centerToasts = playRoundCompleteToast(centerToasts, now);
    }
    lastHudPhase = hud.phase;
    const winsDecision = nextWinsPoll({
      now,
      partyId: roundPartyId,
      status: roundStatus,
      previousPartyId: lastWinsPartyId,
      previousStatus: lastWinsStatus,
      lastFetchAt: lastWinFeedAt,
      completedSince: winsCompletedSince,
      completedRefreshCount: winsCompletedRefreshCount,
    });
    winsCompletedSince = winsDecision.completedSince;
    winsCompletedRefreshCount = winsDecision.completedRefreshCount;
    lastWinsPartyId = roundPartyId || null;
    lastWinsStatus = roundStatus;
    if (isStateSyncronized() && !blowerBoardReadyRequested) {
      blowerBoardReadyRequested = true;
      room.send("blowerLeaderboardRequest", { intent: "ready" });
    }
    if (isStateSyncronized() && !upcomingJoinRequested) {
      upcomingJoinRequested = true;
      requestUpcomingFromServer("sync");
    }
    if (isStateSyncronized() && !blowVisualJoinRequested) {
      blowVisualJoinRequested = true;
      room.send("blowVisualJoin", { intent: "sync" });
    }
    if (lastPoppersJoinFetchAt <= 0) {
      lastPoppersJoinFetchAt = now;
      void refreshPopperWall();
    }
    if (
      shouldPollPoppers({
        status: roundStatus,
        previousStatus: lastLeaderboardPartyStatus,
        hadPopsThisParty,
      })
    ) {
      hadPopsThisParty = false;
      void refreshPopperWall();
    }
    lastLeaderboardPartyStatus = roundStatus;
    if ((roundStatus === "ACTIVE") !== balloon.partyActive) {
      applyBalloonFields({ partyActive: roundStatus === "ACTIVE" });
    }
    if (winsDecision.fetch) {
      lastWinFeedAt = now;
      refreshWinFeed();
    }
    for (const [, round] of engine.getEntitiesWith(PartyRoundHud)) {
      chest = reconstructChestFromSnapshot({
        status: round.status,
        phase: round.phase,
        headline: hud.headline,
        timerLabel: hud.timerLine,
        scheduledAt: Number(round.scheduledAt),
        now,
      });
      break;
    }
    tickChestVisual(castle, chest, now);
    tickNpcIdle(castle, now);
    setNpcHoverText(
      castle,
      rewardAdmissionReady()
        ? npcHoverText({
            employed: balloon.employed,
            carriedBalloons: balloon.carriedBalloons,
            capacity: localEffectiveCapacity(),
          })
        : "",
    );
    const worldActionsEnabled = worldInteractionAllowed();
    setChestInteractionEnabled(castle, worldActionsEnabled);
    setNpcInteractionEnabled(castle, worldActionsEnabled);
    setTableSeatPromptsHiddenForModal(!worldActionsEnabled);
    if (!npcGreetingStillVisible(greeting.hideAt, now)) {
      greeting = { text: "", hideAt: undefined, tone: "welcome" };
    }
    if (!balloonFullAlertVisible(fullAlert.hideAt, now)) {
      fullAlert = { text: "", hideAt: undefined };
    }
    if (isStateSyncronized() && !balloonProfileSynced && now - lastBalloonSyncAt > 1500) {
      lastBalloonSyncAt = now;
      room.send("balloonSync", { intent: "sync" });
    }
    tickEmployeeGreetingTrigger(now);
    tickHelpWantedTrigger();
    tickSpawnCameraLook();
    tickSceneMusicController(sceneMusic);
    const blockingUiOpen = blockingSceneUiOpen();
    if (blockingUiOpen && !lastBlockingUiOpen && isStateSyncronized()) {
      room.send("observerResumed", { reason: "blocked" });
    }
    lastBlockingUiOpen = blockingUiOpen;
    const surround = worldInteractionAllowed()
      ? tickTableSurround(PlayerIdentityData.getOrNull(engine.PlayerEntity)?.address)
      : { localChanged: false, localInside: false };
    if (surround.localChanged && isStateSyncronized()) {
      room.send("tableSurround", { inside: surround.localInside });
    }
    if (worldInteractionAllowed() && !movement.locked) {
      tickTableSit(now);
    }
    tickTableSeatTransition(now);
    centerToasts = tickCenterToasts(xpToastEntity, centerToasts, now);
    tickBlowingVisual(now);
    const stepped = presentation.syncWorld(now);
    for (const balloonId of stepped.bursted) {
      console.log("[CLIENT] balloon burst");
      playBalloonPopSfx(sceneMusic);
      const pending = presentation.takePendingReveal(balloonId);
      if (pending) {
        showWinToast(now, pending);
      }
      if (movement.locked) {
        releasePopAction(now);
      }
    }
    for (const _balloonId of stepped.completed) {
      console.log("[CLIENT] claim animation complete");
    }
    presentation.applyTransforms(now, rewardAdmissionReady());
    if (
      ui.state === "REQUEST_IN_FLIGHT" &&
      popAwaitingSince !== undefined &&
      now - popAwaitingSince >= POP_RESULT_TIMEOUT_MS
    ) {
      recoverInFlight("no popResult");
    }
    if (inputSystem.isTriggered(InputAction.IA_PRIMARY, PointerEventType.PET_DOWN)) {
      handlePop("primary");
    }
  });
}
