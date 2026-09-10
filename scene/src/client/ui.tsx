import { Color4 } from "@dcl/sdk/math";
import ReactEcs, { Button, Label, ReactEcsRenderer, UiEntity } from "@dcl/sdk/react-ecs";
import { engine } from "@dcl/sdk/ecs";
import { getPlatform, isMobile } from "@dcl/sdk/platform";
import {
  POP_BUTTON_SIZE,
  POP_ELIGIBLE_LABEL_GAP,
  POP_ELIGIBLE_LABEL_HEIGHT,
  WIN_TOAST_HEIGHT,
  WORLD_TOAST_ROW_HEIGHT,
} from "../shared/constants";
import { emptyPartyHud, type PartyHudModel } from "../shared/partyHud";
import { createPersonalWinToast, type PersonalWinToast } from "../shared/personalWinToast";
import {
  DEPOSIT_BG_SRC,
  chestLayoutForRenderer,
  depositBgCloseRect,
  ensureMinTapRect,
  type ChestUiMetrics,
} from "../shared/chestUiLayout";
import { isBlockingSceneModal, showGameplayActionHud, showNextDropTicker } from "../shared/modalHud";
import {
  EMPLOYEE_GREETING_PORTRAIT_SIZE,
  balloonBlowingHudLayout,
  balloonFullAlertInSafe,
  balloonRewardsStackLayout,
  musicControlButtonRects,
  musicControlsLayout,
  tableSeatedCountLayout,
  canvasForLayout,
  centeredAbsoluteTransform,
  employeeGreetingBannerInSafe,
  gameplayControlLayout,
  learnMorePanelLayout,
  helpWantedHirePanelLayout,
  turnInBalloonsPanelLayout,
  nextDropTickerLayout,
  partyHudLayout,
  partyWinFeedLayout,
  personalNotifyLayout,
  worldEventToastLayout,
} from "../shared/uiLayout";
import { readLiveUiCanvas } from "./readLiveUiCanvas";
import { type ChestPanelModel } from "../shared/chestPanels";
import { ChestDashboard, type ChestUiActions } from "./chestUi";
import { PartyDashboard, type PartyUiActions } from "./partyUi";
import { type ChestPresentation } from "../shared/chestPresentation";
import { createWorldToastQueue, type WorldToastQueue } from "../shared/worldToast";
import {
  devEligibleLabel,
  POP_BUTTON_IMAGE_SRC,
  shouldShowPop,
  SHOW_DEV_ELIGIBLE_LABEL,
  type PopUiModel,
} from "../shared/popUi";
import {
  HELP_WANTED_ALREADY_HIRED_COPY,
  HELP_WANTED_HIRE_COPY,
  HELP_WANTED_HOVER_HIRE,
  HELP_WANTED_TURN_IN_COPY,
  LEARN_ABOUT_BODY_LEAD,
  LEARN_ABOUT_BODY_TRAIL,
  LEARN_ABOUT_OK_LABEL,
  NPC_GREETING_PORTRAIT_SRC,
  NPC_GREETING_SPEAKER,
  type NpcGreetingTone,
  formatPartyStartsIn,
  helpWantedPanelLayout,
  type HelpWantedPanel,
} from "../shared/helpWanted";
import {
  balloonHudArtSlots,
  balloonHudArtSrc,
  balloonHudBoldValue,
  balloonHudSlotBox,
  balloonHudSlotRect,
  balloonHudValueFontSize,
} from "../shared/balloonHudArt";
import {
  BALLOON_FULL_ALERT_LINE_1,
  BALLOON_FULL_ALERT_LINE_2,
  emptyBalloonHud,
  formatCarriedCount,
  formatClockMs,
  remainingIntervalMs,
  type BalloonHudModel,
} from "../shared/balloonHud";
import { xpRemainingToNextLevel } from "../shared/balloonXpCurve";
import { musicToggleIconSrc, MUSIC_ICON_NEXT_SRC, MUSIC_ICON_VOL_DOWN_SRC, MUSIC_ICON_VOL_UP_SRC, type SceneMusicHud } from "../shared/sceneMusic";
import { NEXT_DROP_TICKER_SLICES, NEXT_DROP_TICKER_SRC } from "../shared/nextDropTicker";
import {
  BALLOON_REWARDS,
  BALLOON_REWARDS_BALLOONS_COMING_SOON,
  formatRewardCost,
  formatRewardLevel,
  formatRewardStats,
  formatRewardStatus,
  kiteRewardDetail,
  kiteRewardRows,
  type BalloonRewardUi,
  type RewardsCatalogTab,
  createBalloonRewardUi,
} from "../shared/balloonRewards";
import { emptyKiteMintCounts, type KiteMintCounts } from "../shared/kiteMintLedger";
import { emptyKiteRedemptionLedger, type KiteRedemptionLedger } from "../shared/kiteMintRedemption";
import { PARTY_BACK_ARROW } from "../shared/partyDisplay";
import { isSafeMarketplaceUrl } from "../shared/hostAccess";
import {
  BALLOON_REWARDS_ART_SRC,
  BALLOON_REWARDS_DETAIL_ART_SRC,
  BALLOON_REWARDS_DETAIL_SLOTS,
  BALLOON_REWARDS_SLOTS,
  balloonRewardRowCount,
  balloonRewardRowSlots,
  balloonRewardsSlotBox,
  balloonRewardsSlotRect,
  balloonRewardsTabLabelSlot,
  kiteDetailOwnershipSlot,
} from "../shared/balloonRewardsArt";
import {
  HELP_WANTED_ART_SRC,
  HELP_WANTED_SLOTS,
  helpWantedBodyFontSize,
  helpWantedSlotBox,
} from "../shared/helpWantedArt";
import {
  LEARN_MORE_ART_SRC,
  LEARN_MORE_SLOTS,
  learnMoreSlotBox,
} from "../shared/learnMoreArt";
import {
  TURN_IN_ART_SRC,
  TURN_IN_SLOTS,
  turnInBodyFontSize,
  turnInCaptchaIconSlots,
  turnInSlotBox,
} from "../shared/turnInBalloonsArt";
import { PRELOAD_UI_TEXTURES } from "../shared/uiTexturePreload";
import { balloonCaptchaSrc, turnInCaptchaPromptParts, type BalloonCaptchaShape } from "../shared/turnInCaptcha";
import { registerDropPartyUiRenderer, rendererOptionsForPlatform } from "./uiRenderer";
import { applyLeaderboardLineSpacing } from "../world/leaderboardPlanes";
import { type ManagePartyTab, type PartyPanelModel } from "../shared/partyPanels";
import { type DayPeriod } from "../shared/partyTime";
import {
  formatWinPrizeDetail,
  isFeaturedPartyWin,
  PARTY_WIN_FEED_MAX_VISIBLE,
  winThumbnailUrl,
} from "../shared/wins";
import {
  PARTY_WIN_FEED_ROW_HEIGHT,
} from "../shared/constants";
import { kiteCatalystThumbnailUrl, kiteListName, type KitePerkId } from "../shared/kitePerks";

let lastChestUiLog = "";

export type RewardAdmissionNotice = {
  title: string;
  body: string;
  secondary: string;
};

function HiddenUiTextureWarmup() {
  return (
    <UiEntity
      uiTransform={{
        positionType: "absolute",
        position: { left: -64, top: -64 },
        width: 1,
        height: 1,
        pointerFilter: "none",
      }}
    >
      {PRELOAD_UI_TEXTURES.map((src) => (
        <UiEntity
          uiTransform={{ width: 1, height: 1, pointerFilter: "none" }}
          uiBackground={{
            texture: { src },
            textureMode: "stretch",
          }}
        />
      ))}
    </UiEntity>
  );
}

function SceneTapButton(args: {
  left: number;
  top: number;
  width: number;
  height: number;
  onClick: () => void;
}) {
  return (
    <Button
      value=" "
      variant="secondary"
      fontSize={1}
      onMouseDown={args.onClick}
      uiTransform={{
        positionType: "absolute",
        position: { left: args.left, top: args.top },
        width: args.width,
        height: args.height,
        pointerFilter: "block",
      }}
      uiBackground={{ color: Color4.create(0, 0, 0, 0.01) }}
      color={Color4.create(0, 0, 0, 0)}
    />
  );
}

function logChestUiOnce(open: string, layout: ChestUiMetrics): void {
  const key = `${open}:${layout.density}:${layout.panel.left}:${layout.panel.top}:${layout.panel.width}:${layout.panel.height}`;
  if (key === lastChestUiLog) return;
  lastChestUiLog = key;
  console.log("[CHEST UI] showing", {
    open,
    density: layout.density,
    panel: layout.panel,
    renderer: layout.canvas,
  });
}

function popLabel(model: PopUiModel): string {
  if (model.state === "REQUEST_IN_FLIGHT") {
    return "...";
  }
  return "POP";
}

function personalMeta(toast: PersonalWinToast): string {
  const bits = [toast.announcementTier, toast.dclRarity].filter(
    (value) => value && value.length > 0,
  );
  return bits.join("  ");
}

export function DropPartyUi(props: {
  model: PopUiModel;
  personal: PersonalWinToast;
  world: WorldToastQueue;
  hud: PartyHudModel;
  onPop: () => void;
  chest?: ChestPresentation;
  panels?: ChestPanelModel;
  onClosePanel?: () => void;
  onOpenDeposit?: () => void;
  onAcceptDepositWarning?: (dontShowAgain: boolean) => void;
  onExitDepositWarning?: () => void;
  onDepositAsset?: (asset: "NFT" | "MANA") => void;
  onConfirmDeposit?: () => void;
  onNftKind?: (kind: "wearable" | "emote" | "leftover") => void;
  onSelectItem?: (urn: string) => void;
  onAdjustQuantity?: (delta: number) => void;
  onToggleAutoPick?: () => void;
  onToggleLowMintLock?: () => void;
  help?: HelpWantedPanel;
  onCloseHelp?: () => void;
  onAcceptHire?: () => void;
  onDeclineHire?: () => void;
  onTurnInBalloons?: () => void;
  onSelectTurnInCaptcha?: (shape: BalloonCaptchaShape) => void;
  balloon?: BalloonHudModel;
  onBalloonButton?: () => void;
  music?: SceneMusicHud;
  onToggleMusic?: () => void;
  onNextSong?: () => void;
  onMusicVolumeDown?: () => void;
  onMusicVolumeUp?: () => void;
  rewards?: BalloonRewardUi;
  equippedWearableUrns?: readonly string[];
  onOpenRewards?: () => void;
  onCloseRewards?: () => void;
  onRewardsTab?: (tab: RewardsCatalogTab) => void;
  onSelectKiteReward?: (kiteId: KitePerkId) => void;
  onBackKiteRewardDetail?: () => void;
  onRedeemKite?: (kiteId: KitePerkId) => void;
  kiteMintCounts?: KiteMintCounts;
  kiteRedemptions?: KiteRedemptionLedger;
  kiteMintBusyId?: KitePerkId | null;
  kiteMintConfirmId?: KitePerkId | null;
  kiteDetailMintEnabledAfter?: number;
  kiteDetailMintedId?: KitePerkId | null;
  kiteDetailFailedId?: KitePerkId | null;
  kiteMintLastResult?: string;
  party?: PartyPanelModel;
  onOpenParties?: () => void;
  onCloseParties?: () => void;
  onCreateParty?: () => void;
  onSubmitParty?: () => void;
  onEditSelectedParty?: () => void;
  onDraftTitle?: (value: string) => void;
  onDraftDescription?: (value: string) => void;
  onDraftDate?: (value: string) => void;
  onDraftTime?: (value: string) => void;
  onDraftDayPeriod?: (period: DayPeriod) => void;
  onToggleDraftCommunity?: () => void;
  onToggleDraftExtraPool?: () => void;
  onToggleDraftUnclaimedPolicy?: () => void;
  onPickPublicDestination?: () => void;
  onPickScheduledDestination?: (partyId: string, title: string) => void;
  onOpenUpcoming?: () => void;
  onOpenMyParties?: () => void;
  onOpenMyWins?: () => void;
  onOpenCreate?: () => void;
  onManageParty?: (partyId: string) => void;
  onContribute?: (partyId: string, title: string) => void;
  onAddPrizes?: () => void;
  onDraftTimeZone?: (value: string) => void;
  onBackToChest?: () => void;
  onInventorySearch?: (value: string) => void;
  onInventoryRarity?: (rarity: string) => void;
  onInventoryPage?: (delta: number) => void;
  onInventoryGoToPage?: (page: number) => void;
  onToggleMint?: (tokenId: string) => void;
  onSetManaAmount?: (value: string) => void;
  onBackDeposit?: () => void;
  onOpenMarketplace?: (url: string) => void;
  onOpenExplorer?: (url: string) => void;
  onManageTab?: (tab: ManagePartyTab) => void;
  onViewPrizes?: (partyId: string) => void;
  onCreateAgain?: () => void;
  onToggleLeftoverPrize?: (prizeId: string) => void;
  onToggleLeftoverMana?: (partyId: string) => void;
  onClosePrizePreview?: () => void;
  onToggleTimezonePicker?: () => void;
  onSelectDisplayTimeZone?: (timeZone: string) => void;
  onPrizePreviewPage?: (section: "community" | "extra", delta: number) => void;
  walletConnected?: boolean;
  greetingText?: string;
  greetingTone?: NpcGreetingTone;
  fullAlertText?: string;
  admissionNotice?: RewardAdmissionNotice;
  interactionLocked?: boolean;
}) {
  const { model, personal, world, hud, onPop, chest, panels, onClosePanel, onOpenDeposit, onAcceptDepositWarning, onExitDepositWarning, onDepositAsset, onConfirmDeposit, onNftKind, onSelectItem, onAdjustQuantity, onToggleAutoPick, onToggleLowMintLock, help, onCloseHelp, onAcceptHire, onDeclineHire, onTurnInBalloons, onSelectTurnInCaptcha, balloon, onBalloonButton, music, onToggleMusic, onNextSong, onMusicVolumeDown, onMusicVolumeUp, rewards, equippedWearableUrns, onOpenRewards, onCloseRewards, onRewardsTab, onSelectKiteReward, onBackKiteRewardDetail, onRedeemKite, kiteMintCounts, kiteRedemptions, kiteMintBusyId, kiteMintConfirmId, kiteDetailMintEnabledAfter, kiteDetailMintedId, kiteDetailFailedId, kiteMintLastResult, party, onCloseParties, onCreateParty, onSubmitParty, onEditSelectedParty, onDraftTitle, onDraftDescription, onDraftDate, onDraftTime, onDraftDayPeriod, onToggleDraftCommunity, onToggleDraftExtraPool, onToggleDraftUnclaimedPolicy, onPickPublicDestination, onPickScheduledDestination, onOpenUpcoming, onOpenMyParties, onOpenMyWins, onOpenCreate, onManageParty, onContribute, onAddPrizes, onDraftTimeZone, onBackToChest, onInventorySearch, onInventoryRarity, onInventoryPage, onInventoryGoToPage, onToggleMint, onSetManaAmount, onBackDeposit, onOpenMarketplace, onOpenExplorer, onManageTab, onViewPrizes, onCreateAgain, onToggleLeftoverPrize, onToggleLeftoverMana, onClosePrizePreview, onToggleTimezonePicker, onSelectDisplayTimeZone, onPrizePreviewPage, walletConnected, greetingText, greetingTone, fullAlertText, admissionNotice, interactionLocked } = props;
  const chestPanels =
    panels && panels.open !== "none" && (!party || party.open === "none") ? panels : undefined;
  const live = readLiveUiCanvas();
  const mobile = isMobile() || getPlatform() === "mobile";
  const canvas = canvasForLayout(live.canvas, mobile);
  const insets = undefined;
  const compact = mobile;
  const chestLayout = chestLayoutForRenderer(canvas, { canvas, insets }, mobile ? "compact" : "desktop");
  const blocking = isBlockingSceneModal({
    helpOpen: Boolean(help?.open && help.kind !== "none"),
    chestOpen: Boolean(chestPanels),
    partyOpen: Boolean(party && party.open !== "none"),
    rewardsOpen: Boolean(rewards?.open),
  });
  const showActionHud = !interactionLocked && showGameplayActionHud(blocking);
  const showNextDrop = showNextDropTicker(blocking);
  const chestBgClose = depositBgCloseRect(chestLayout.background);
  const depositClose = ensureMinTapRect(
    {
      left: chestBgClose.left - chestLayout.background.left,
      top: chestBgClose.top - chestLayout.background.top,
      width: chestBgClose.width,
      height: chestBgClose.height,
    },
    { width: chestLayout.background.width, height: chestLayout.background.height },
    compact ? 48 : 28,
  );
  if (chestPanels) {
    logChestUiOnce(chestPanels.open, chestLayout);
  } else if (panels && panels.open !== "none") {
    console.log("[CHEST UI] state is open but hidden by party panel", {
      chestOpen: panels.open,
      partyOpen: party?.open,
    });
  }
  const chestActions: ChestUiActions = {
    onClosePanel,
    onOpenDeposit,
    onAcceptDepositWarning,
    onExitDepositWarning,
    onDepositAsset,
    onConfirmDeposit,
    onNftKind,
    onSelectItem,
    onAdjustQuantity,
    onToggleAutoPick,
    onToggleLowMintLock,
    onPickPublicDestination,
    onPickScheduledDestination,
    onOpenUpcoming,
    onOpenMyParties,
    onOpenMyWins,
    onInventorySearch,
    onInventoryRarity,
    onInventoryPage,
    onInventoryGoToPage,
    onToggleMint,
    onSetManaAmount,
    onBackDeposit,
    onOpenMarketplace,
  };
  const partyActions: PartyUiActions = {
    onCloseParties,
    onCreateParty,
    onSubmitParty,
    onEditSelectedParty,
    onDraftTitle,
    onDraftDescription,
    onDraftDate,
    onDraftTime,
    onDraftDayPeriod,
    onToggleDraftCommunity,
    onToggleDraftExtraPool,
    onToggleDraftUnclaimedPolicy,
    onManageParty,
    onContribute,
    onAddPrizes,
    onDraftTimeZone,
    onBackToChest,
    onManageTab,
    onViewPrizes,
    onCreateAgain,
    onToggleLeftoverPrize,
    onToggleLeftoverMana,
    onClosePrizePreview,
    onToggleTimezonePicker,
    onSelectDisplayTimeZone,
    onPrizePreviewPage,
    onOpenCreate,
    onOpenMarketplace,
    onOpenExplorer,
  };
  const baseHudRect = partyHudLayout(canvas);
  const baseTickerRect = nextDropTickerLayout(canvas, mobile ? "compact" : "desktop");
  const personalRect = personalNotifyLayout(canvas);
  const popRect = gameplayControlLayout(canvas, insets);
  const worldRect = worldEventToastLayout(canvas, insets);
  const balloonRect = balloonBlowingHudLayout(canvas, insets);
  const compactBannerLeft = Math.max(8, baseTickerRect.left);
  const compactBannerWidth = Math.max(
    1,
    Math.min(
      860,
      balloonRect.left - compactBannerLeft - 16,
      canvas.virtualWidth - compactBannerLeft - 8,
    ),
  );
  const compactPartyHudLeft = Math.max(-8, compactBannerLeft - 40);
  const compactTickerLeft = -32;
  const compactTickerExtraWidth = compactBannerLeft - compactTickerLeft;
  const hudRect = compact
    ? { ...baseHudRect, left: compactPartyHudLeft, width: compactBannerWidth }
    : baseHudRect;
  const tickerRect = compact
    ? {
        ...baseTickerRect,
        left: compactTickerLeft,
        width: Math.min(baseTickerRect.width + compactTickerExtraWidth, compactBannerWidth + compactTickerExtraWidth),
      }
    : baseTickerRect;
  const musicRect = musicControlsLayout(canvas, insets);
  const musicButtons = musicControlButtonRects(musicRect);
  const admissionNoticeWidth = compact
    ? compactBannerWidth
    : Math.min(860, canvas.virtualWidth - 32);
  const admissionNoticeLeft = compact
    ? compactBannerLeft
    : (canvas.virtualWidth - admissionNoticeWidth) / 2;
  const seatedCountRect = tableSeatedCountLayout(canvas, insets);
  const balloonSlots = balloonHudArtSlots(balloon?.mode === "blowing" ? "blowing" : "idle", compact);
  const balloonActionTap = ensureMinTapRect(
    balloonHudSlotRect(balloonRect, balloonSlots.action),
    balloonRect,
    compact ? 48 : 28,
  );
  const balloonRewardsTap = ensureMinTapRect(
    balloonHudSlotRect(balloonRect, balloonSlots.rewards),
    balloonRect,
    compact ? 48 : 28,
  );
  const rewardsStack = balloonRewardsStackLayout(canvas, insets);
  const rewardsRect = rewardsStack.panel;
  const learnRect = learnMorePanelLayout(canvas, insets);
  const hireRect = helpWantedHirePanelLayout(canvas, insets);
  const turnInRect = turnInBalloonsPanelLayout(canvas, insets);
  const alreadyHiredRect = helpWantedPanelLayout(canvas);
  const winFeedRect = partyWinFeedLayout(canvas, insets, balloonRect);
  const greetingRect = employeeGreetingBannerInSafe(
    chestLayout.safe,
    compact,
    greetingTone === "welcome",
  );
  const greetingSidePadding = compact ? 42 : 70;
  const fullAlertRect = balloonFullAlertInSafe(chestLayout.safe);
  const hireOkay = ensureMinTapRect(
    {
      left: HELP_WANTED_SLOTS.okay.left * hireRect.width,
      top: HELP_WANTED_SLOTS.okay.top * hireRect.height,
      width: HELP_WANTED_SLOTS.okay.width * hireRect.width,
      height: HELP_WANTED_SLOTS.okay.height * hireRect.height,
    },
    hireRect,
    compact ? 48 : 28,
  );
  const hireDecline = ensureMinTapRect(
    {
      left: HELP_WANTED_SLOTS.decline.left * hireRect.width,
      top: HELP_WANTED_SLOTS.decline.top * hireRect.height,
      width: HELP_WANTED_SLOTS.decline.width * hireRect.width,
      height: HELP_WANTED_SLOTS.decline.height * hireRect.height,
    },
    hireRect,
    compact ? 48 : 28,
  );
  const turnInTap = ensureMinTapRect(
    {
      left: TURN_IN_SLOTS.turnIn.left * turnInRect.width,
      top: TURN_IN_SLOTS.turnIn.top * turnInRect.height,
      width: TURN_IN_SLOTS.turnIn.width * turnInRect.width,
      height: TURN_IN_SLOTS.turnIn.height * turnInRect.height,
    },
    turnInRect,
    compact ? 48 : 28,
  );
  const turnInClose = ensureMinTapRect(
    {
      left: TURN_IN_SLOTS.close.left * turnInRect.width,
      top: TURN_IN_SLOTS.close.top * turnInRect.height,
      width: TURN_IN_SLOTS.close.width * turnInRect.width,
      height: TURN_IN_SLOTS.close.height * turnInRect.height,
    },
    turnInRect,
    compact ? 48 : 28,
  );
  const learnClose = ensureMinTapRect(
    {
      left: LEARN_MORE_SLOTS.close.left * learnRect.width,
      top: LEARN_MORE_SLOTS.close.top * learnRect.height,
      width: LEARN_MORE_SLOTS.close.width * learnRect.width,
      height: LEARN_MORE_SLOTS.close.height * learnRect.height,
    },
    learnRect,
    compact ? 48 : 28,
  );
  const admissionBody =
    mobile && admissionNotice?.title === "NETWORK LIMIT REACHED"
      ? "Two players are already participating."
      : admissionNotice?.body;
  const admissionTop =
    mobile && admissionNotice?.title === "NETWORK LIMIT REACHED" ? 48 : 210;
  return (
    <UiEntity
      uiTransform={{
        width: "100%",
        height: "100%",
      }}
    >
      {HiddenUiTextureWarmup()}
      {admissionNotice ? (
        <UiEntity
          uiTransform={{
            positionType: "absolute",
            position: { top: admissionTop, left: admissionNoticeLeft },
            width: admissionNoticeWidth,
            height: 104,
            padding: { top: 8, bottom: 8, left: 64, right: 64 },
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
          uiBackground={{
            texture: { src: NEXT_DROP_TICKER_SRC },
            textureMode: "nine-slices",
            textureSlices: NEXT_DROP_TICKER_SLICES,
          }}
        >
          <Label
            value={admissionNotice.title}
            fontSize={22}
            color={Color4.create(1, 0.86, 0.38, 1)}
            textAlign="middle-center"
            uiTransform={{ width: admissionNoticeWidth - 128, height: 30 }}
          />
          <Label
            value={admissionBody ?? ""}
            fontSize={17}
            color={Color4.create(1, 0.93, 0.72, 1)}
            textAlign="middle-center"
            uiTransform={{ width: admissionNoticeWidth - 128, height: 28 }}
          />
          <Label
            value={admissionNotice.secondary}
            fontSize={15}
            color={Color4.create(0.92, 0.86, 0.72, 1)}
            textAlign="middle-center"
            uiTransform={{ width: admissionNoticeWidth - 128, height: 22 }}
          />
        </UiEntity>
      ) : null}
      {hud.visible ? (
        <UiEntity
          uiTransform={{
            ...centeredAbsoluteTransform(hudRect),
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: { top: 10, bottom: 10, left: compact ? 72 : 96, right: compact ? 72 : 96 },
          }}
          uiBackground={{
            texture: { src: NEXT_DROP_TICKER_SRC },
            textureMode: "nine-slices",
            textureSlices: NEXT_DROP_TICKER_SLICES,
          }}
        >
          <Label
            value={hud.headline}
            fontSize={24}
            color={Color4.White()}
            textAlign="middle-center"
            uiTransform={{ width: hudRect.width - (compact ? 144 : 192), height: 28 }}
          />
          {hud.timerLine ? (
            <Label
              value={hud.timerLine}
              fontSize={34}
              color={Color4.create(1, 0.92, 0.45, 1)}
              textAlign="middle-center"
              uiTransform={{ width: hudRect.width - (compact ? 144 : 192), height: 38 }}
            />
          ) : null}
          <Label
            value={`${hud.playersLine}   ·   ${hud.balloonsLine}`}
            fontSize={15}
            color={Color4.create(0.78, 0.84, 0.94, 1)}
            textAlign="middle-center"
            uiTransform={{ width: hudRect.width - (compact ? 144 : 192), height: 22 }}
          />
        </UiEntity>
      ) : null}
      {showNextDrop && hud.nextDropVisible && hud.nextDropLine ? (
        <UiEntity
          uiTransform={{
            ...centeredAbsoluteTransform(tickerRect),
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            padding: { left: compact ? 56 : 80, right: compact ? 56 : 80 },
            pointerFilter: "none",
          }}
          uiBackground={{
            texture: { src: NEXT_DROP_TICKER_SRC },
            textureMode: "nine-slices",
            textureSlices: NEXT_DROP_TICKER_SLICES,
          }}
        >
          <Label
            value={hud.nextDropLine}
            fontSize={compact ? 15 : 18}
            color={Color4.create(1, 0.93, 0.62, 1)}
            textAlign="middle-center"
            textWrap="nowrap"
            uiTransform={{
              width: tickerRect.width - (compact ? 112 : 160),
              height: tickerRect.height,
            }}
          />
        </UiEntity>
      ) : null}
      {showActionHud &&
      hud.visible &&
      hud.phase !== "SETTLING" &&
      hud.phase !== "COMPLETED" &&
      hud.winFeed.length > 0 ? (
        <UiEntity
          uiTransform={{
            positionType: "absolute",
            position: { top: winFeedRect.top, left: winFeedRect.left },
            width: winFeedRect.width,
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "stretch",
            pointerFilter: "none",
          }}
        >
          {hud.winFeed.slice(0, PARTY_WIN_FEED_MAX_VISIBLE).map((win) => {
            const thumbSrc = winThumbnailUrl(win);
            return (
            <UiEntity
              uiTransform={{
                width: winFeedRect.width,
                height: PARTY_WIN_FEED_ROW_HEIGHT,
                margin: { bottom: 4 },
                padding: { left: 38, right: 38 },
                flexDirection: "row",
                alignItems: "center",
              }}
              uiBackground={{
                texture: { src: NEXT_DROP_TICKER_SRC },
                textureMode: "nine-slices",
                textureSlices: NEXT_DROP_TICKER_SLICES,
              }}
            >
              <UiEntity
                uiTransform={{ width: 26, height: 26, margin: { right: 6 }, flexShrink: 0 }}
                uiBackground={
                  thumbSrc
                    ? { texture: { src: thumbSrc }, textureMode: "stretch" as const }
                    : { color: Color4.create(0.16, 0.2, 0.28, 1) }
                }
              />
              <Label
                value={
                  isFeaturedPartyWin(win)
                    ? balloonHudBoldValue(
                        `${win.displayName}  ${formatWinPrizeDetail(win)}`,
                      )
                    : `${win.displayName}  ${formatWinPrizeDetail(win)}`
                }
                fontSize={isFeaturedPartyWin(win) ? 14 : 13}
                color={
                  isFeaturedPartyWin(win)
                    ? Color4.create(1, 0.84, 0.28, 1)
                    : Color4.create(0.96, 0.93, 0.86, 1)
                }
                textAlign="middle-left"
                textWrap="nowrap"
                uiTransform={{
                  width: winFeedRect.width - 108,
                  height: PARTY_WIN_FEED_ROW_HEIGHT,
                }}
              />
            </UiEntity>
            );
          })}
        </UiEntity>
      ) : null}
      <UiEntity
        uiTransform={{
          ...centeredAbsoluteTransform(personalRect),
          flexDirection: "column",
          justifyContent: "flex-start",
          alignItems: "center",
        }}
      >
        {personal.visible ? (
          <UiEntity
            uiTransform={{
              width: personalRect.width,
              height: WIN_TOAST_HEIGHT,
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              padding: { top: 12, bottom: 12, left: 20, right: 20 },
            }}
            uiBackground={{ color: Color4.create(0.28, 0.16, 0.02, 0.88) }}
          >
            <Label
              value="YOU WON!"
              fontSize={40}
              color={Color4.create(1, 0.95, 0.55, 1)}
              textAlign="middle-center"
              uiTransform={{ width: personalRect.width - 40, height: 48 }}
            />
            <Label
              value={personal.displayName}
              fontSize={28}
              color={Color4.White()}
              textAlign="middle-center"
              uiTransform={{ width: personalRect.width - 40, height: 36 }}
            />
            {personalMeta(personal) ? (
              <Label
                value={personalMeta(personal)}
                fontSize={16}
                color={Color4.create(1, 0.78, 0.38, 1)}
                textAlign="middle-center"
                uiTransform={{ width: personalRect.width - 40, height: 22 }}
              />
            ) : null}
          </UiEntity>
        ) : null}
      </UiEntity>
      {showActionHud ? (
      <UiEntity
        uiTransform={{
          positionType: "absolute",
          position: { top: worldRect.top, right: worldRect.right },
          width: worldRect.width,
          flexDirection: "column",
          justifyContent: "flex-start",
          alignItems: "flex-end",
        }}
      >
        {world.visible.map((toast) => (
          <UiEntity
            uiTransform={{
              width: worldRect.width,
              height: WORLD_TOAST_ROW_HEIGHT,
              margin: { bottom: 8 },
              padding: { top: 8, bottom: 8, left: 12, right: 12 },
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-start",
            }}
            uiBackground={{ color: Color4.create(0.05, 0.08, 0.14, 0.78) }}
          >
            <Label
              value={toast.title}
              fontSize={18}
              color={Color4.create(0.65, 0.85, 1, 1)}
              textAlign="middle-left"
              uiTransform={{ width: worldRect.width - 24, height: 22 }}
            />
            <Label
              value={toast.body}
              fontSize={16}
              color={Color4.White()}
              textAlign="middle-left"
              uiTransform={{ width: worldRect.width - 24, height: 22 }}
            />
          </UiEntity>
        ))}
      </UiEntity>
      ) : null}
      {showActionHud ? (
      <UiEntity
        uiTransform={{
          positionType: "absolute",
          position: { top: popRect.clusterTop, left: popRect.clusterLeft },
          width: popRect.clusterWidth,
          height: popRect.clusterHeight,
          flexDirection: "column",
          justifyContent: "flex-start",
          alignItems: "center",
        }}
      >
        {SHOW_DEV_ELIGIBLE_LABEL ? (
          <Label
            value={devEligibleLabel(model.eligibleCount)}
            fontSize={28}
            color={Color4.White()}
            textAlign="middle-center"
            uiTransform={{
              width: 280,
              height: POP_ELIGIBLE_LABEL_HEIGHT,
              margin: { bottom: POP_ELIGIBLE_LABEL_GAP },
            }}
            uiBackground={{ color: Color4.create(0, 0, 0, 0.55) }}
          />
        ) : null}
        {shouldShowPop(model) ? (
          <UiEntity
            onMouseDown={onPop}
            uiTransform={{
              width: POP_BUTTON_SIZE,
              height: POP_BUTTON_SIZE,
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              pointerFilter: "block",
            }}
            uiBackground={{
              texture: { src: POP_BUTTON_IMAGE_SRC },
              textureMode: "stretch",
            }}
          >
            <UiEntity
              uiTransform={{
                width: POP_BUTTON_SIZE * 0.72,
                height: 94,
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                pointerFilter: "none",
              }}
            >
              <Label
                value={balloonHudBoldValue(mobile ? "TAP HERE TO" : "PRESS E TO")}
                fontSize={18}
                color={Color4.White()}
                textAlign="middle-center"
                textWrap="nowrap"
                uiTransform={
                  mobile
                    ? {
                        positionType: "absolute",
                        position: { top: 2, left: 0 },
                        width: "100%",
                        height: 24,
                      }
                    : { width: "100%", height: 24, margin: { bottom: -10 } }
                }
              />
              <Label
                value={balloonHudBoldValue(popLabel(model))}
                fontSize={56}
                color={Color4.White()}
                textAlign="middle-center"
                textWrap="nowrap"
                uiTransform={
                  mobile
                    ? {
                        positionType: "absolute",
                        position: { top: 12, left: 0 },
                        width: "100%",
                        height: 64,
                      }
                    : { width: "100%", height: 70 }
                }
              />
            </UiEntity>
          </UiEntity>
        ) : null}
      </UiEntity>
      ) : null}
      {!blocking && !interactionLocked ? (
        <UiEntity
          uiTransform={{
            ...centeredAbsoluteTransform(musicRect),
            pointerFilter: "block",
          }}
        >
          {[
            musicToggleIconSrc(Boolean(music?.paused)),
            MUSIC_ICON_NEXT_SRC,
            MUSIC_ICON_VOL_DOWN_SRC,
            MUSIC_ICON_VOL_UP_SRC,
          ].map((src, index) => (
            <UiEntity
              key={src}
              uiTransform={{
                positionType: "absolute",
                position: { left: musicButtons[index]!.left, top: musicButtons[index]!.top },
                width: musicButtons[index]!.width,
                height: musicButtons[index]!.height,
                pointerFilter: "none",
              }}
              uiBackground={{
                texture: { src },
                textureMode: "stretch",
              }}
            />
          ))}
          {SceneTapButton({
            left: musicButtons[0]!.left,
            top: musicButtons[0]!.top,
            width: musicButtons[0]!.width,
            height: musicButtons[0]!.height,
            onClick: () => onToggleMusic?.(),
          })}
          {SceneTapButton({
            left: musicButtons[1]!.left,
            top: musicButtons[1]!.top,
            width: musicButtons[1]!.width,
            height: musicButtons[1]!.height,
            onClick: () => onNextSong?.(),
          })}
          {SceneTapButton({
            left: musicButtons[2]!.left,
            top: musicButtons[2]!.top,
            width: musicButtons[2]!.width,
            height: musicButtons[2]!.height,
            onClick: () => onMusicVolumeDown?.(),
          })}
          {SceneTapButton({
            left: musicButtons[3]!.left,
            top: musicButtons[3]!.top,
            width: musicButtons[3]!.width,
            height: musicButtons[3]!.height,
            onClick: () => onMusicVolumeUp?.(),
          })}
        </UiEntity>
      ) : null}
      {balloon?.visible && showActionHud ? (
        <UiEntity
          uiTransform={{
            ...centeredAbsoluteTransform(balloonRect),
            pointerFilter: "block",
          }}
          uiBackground={{
            texture: { src: balloonHudArtSrc(balloon.mode) },
            textureMode: "stretch",
          }}
        >
          {(() => {
            const slots = balloonHudArtSlots(balloon.mode, compact);
            const countSize = balloonHudValueFontSize(balloonRect.width, "count");
            const statSize = balloonHudValueFontSize(balloonRect.width, "stat");
            const levelSize = balloonHudValueFontSize(balloonRect.width, "level");
            const timerSize = balloonHudValueFontSize(balloonRect.width, "timer");
            const nextValue = balloon.mode === "blowing" ? formatClockMs(remainingIntervalMs(balloon, Date.now())) : "";
            const promptSize = balloonHudValueFontSize(balloonRect.width, "prompt");
            return (
              <UiEntity uiTransform={{ width: "100%", height: "100%", pointerFilter: "none" }}>
                <Label
                  value={balloonHudBoldValue(formatCarriedCount(balloon.carriedBalloons, balloon.capacity))}
                  fontSize={countSize}
                  color={Color4.White()}
                  textAlign="middle-center"
                  textWrap="nowrap"
                  uiTransform={{ ...balloonHudSlotBox(balloonRect, slots.carried), pointerFilter: "none" }}
                />
                {balloon.mode === "full" && slots.turnInPrompt ? (
                  <Label
                    value={balloonHudBoldValue(balloon.nextLine)}
                    fontSize={promptSize}
                    color={Color4.create(0.28, 0.92, 0.42, 1)}
                    textAlign="middle-center"
                    textWrap="nowrap"
                    uiTransform={{ ...balloonHudSlotBox(balloonRect, slots.turnInPrompt), pointerFilter: "none" }}
                  />
                ) : null}
                {slots.next && nextValue ? (
                  <Label
                    value={balloonHudBoldValue(nextValue)}
                    fontSize={timerSize}
                    color={Color4.create(1, 0.86, 0.32, 1)}
                    textAlign="middle-center"
                    textWrap="nowrap"
                    uiTransform={{ ...balloonHudSlotBox(balloonRect, slots.next), pointerFilter: "none" }}
                  />
                ) : null}
                {balloon.kiteBonusLine && slots.kiteBonus ? (
                  <Label
                    value={balloonHudBoldValue(balloon.kiteBonusLine)}
                    fontSize={balloonHudValueFontSize(balloonRect.width, "bonus")}
                    color={Color4.create(0.55, 1, 0.72, 1)}
                    textAlign="middle-center"
                    textWrap="nowrap"
                    uiTransform={{ ...balloonHudSlotBox(balloonRect, slots.kiteBonus), pointerFilter: "none" }}
                  />
                ) : null}
                <Label
                  value={balloonHudBoldValue(String(balloon.level))}
                  fontSize={levelSize}
                  color={Color4.create(0.55, 0.84, 1, 1)}
                  textAlign="middle-center"
                  textWrap="nowrap"
                  uiTransform={{ ...balloonHudSlotBox(balloonRect, slots.level), pointerFilter: "none" }}
                />
                <Label
                  value={String(balloon.xp)}
                  fontSize={statSize}
                  color={Color4.create(0.55, 0.84, 1, 1)}
                  textAlign="middle-center"
                  textWrap="nowrap"
                  uiTransform={{ ...balloonHudSlotBox(balloonRect, slots.totalXp), pointerFilter: "none" }}
                />
                <Label
                  value={String(xpRemainingToNextLevel(balloon.xp))}
                  fontSize={statSize}
                  color={Color4.create(0.55, 0.84, 1, 1)}
                  textAlign="middle-center"
                  textWrap="nowrap"
                  uiTransform={{ ...balloonHudSlotBox(balloonRect, slots.xpToLvl), pointerFilter: "none" }}
                />
              </UiEntity>
            );
          })()}
          {balloon.actionClickable !== false ? SceneTapButton({
            left: balloonActionTap.left,
            top: balloonActionTap.top,
            width: balloonActionTap.width,
            height: balloonActionTap.height,
            onClick: () => onBalloonButton?.(),
          }) : null}
          {SceneTapButton({
            left: balloonRewardsTap.left,
            top: balloonRewardsTap.top,
            width: balloonRewardsTap.width,
            height: balloonRewardsTap.height,
            onClick: () => onOpenRewards?.(),
          })}
        </UiEntity>
      ) : null}
      {balloon?.visible && showActionHud && (balloon.socialBoostLine || balloon.seatedCountLine) ? (
        <UiEntity
          uiTransform={{
            ...centeredAbsoluteTransform(seatedCountRect),
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            pointerFilter: "none",
          }}
          uiBackground={{ color: Color4.create(0.05, 0.07, 0.12, 0.88) }}
        >
          {balloon.socialBoostLine ? (
            <Label
              value={balloonHudBoldValue(balloon.socialBoostLine)}
              fontSize={Math.max(15, Math.round(compact ? 16 : 18))}
              color={Color4.create(0.45, 1, 0.55, 1)}
              textAlign="middle-center"
              textWrap="nowrap"
              uiTransform={{ width: "100%", height: balloon.seatedCountLine ? "50%" : "100%", pointerFilter: "none" }}
            />
          ) : null}
          {balloon.seatedCountLine ? (
            <Label
              value={balloonHudBoldValue(balloon.seatedCountLine)}
              fontSize={Math.max(16, Math.round(compact ? 17 : 20))}
              color={Color4.create(1, 0.9, 0.45, 1)}
              textAlign="middle-center"
              textWrap="nowrap"
              uiTransform={{ width: "100%", height: balloon.socialBoostLine ? "50%" : "100%", pointerFilter: "none" }}
            />
          ) : null}
        </UiEntity>
      ) : null}
      {chestPanels || (party && party.open !== "none") ? (
        <UiEntity
          uiTransform={{
            ...centeredAbsoluteTransform(chestLayout.background),
            pointerFilter: "none",
          }}
          uiBackground={{
            texture: { src: DEPOSIT_BG_SRC },
            textureMode: "stretch",
          }}
        >
          <Button
            value=" "
            variant="secondary"
            fontSize={1}
            onMouseDown={() => {
              if (party && party.open !== "none") onCloseParties?.();
              else onClosePanel?.();
            }}
            uiTransform={{
              positionType: "absolute",
              position: {
                left: depositClose.left,
                top: depositClose.top,
              },
              width: depositClose.width,
              height: depositClose.height,
              pointerFilter: "block",
            }}
            uiBackground={{ color: Color4.create(0, 0, 0, 0) }}
            color={Color4.create(0, 0, 0, 0)}
          />
        </UiEntity>
      ) : null}
      {chestPanels ? (
        <UiEntity
          uiTransform={{
            ...centeredAbsoluteTransform(chestLayout.panel),
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "stretch",
            padding: 0,
            overflow: "hidden",
          }}
          uiBackground={{ color: Color4.create(0, 0, 0, 0) }}
        >
          <ChestDashboard
            panels={chestPanels}
            chest={chest}
            walletConnected={walletConnected}
            hostEligible={party?.hostEligible}
            nowMs={party?.nowMs ?? Date.now()}
            actions={chestActions}
            layout={chestLayout}
          />
        </UiEntity>
      ) : null}
      {fullAlertText && showActionHud ? (
        <UiEntity
          uiTransform={{
            ...centeredAbsoluteTransform(fullAlertRect),
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: { top: 16, bottom: 16, left: 20, right: 20 },
            pointerFilter: "none",
          }}
          uiBackground={{ color: Color4.create(0.05, 0.07, 0.08, 0.92) }}
        >
          <Label
            value={balloonHudBoldValue(BALLOON_FULL_ALERT_LINE_1)}
            fontSize={26}
            color={Color4.create(0.35, 0.95, 0.48, 1)}
            textAlign="middle-center"
            textWrap="wrap"
            uiTransform={{ width: fullAlertRect.width - 40, height: 40 }}
          />
          <Label
            value={balloonHudBoldValue(BALLOON_FULL_ALERT_LINE_2)}
            fontSize={18}
            color={Color4.White()}
            textAlign="middle-center"
            textWrap="nowrap"
            uiTransform={{ width: fullAlertRect.width - 40, height: 36 }}
          />
        </UiEntity>
      ) : null}
      {greetingText && showActionHud ? (
        <UiEntity
          uiTransform={{
            ...centeredAbsoluteTransform(greetingRect),
            flexDirection: "row",
            justifyContent: "flex-start",
            alignItems: "center",
            padding: {
              top: 12,
              bottom: 12,
              left: greetingSidePadding,
              right: greetingSidePadding,
            },
            pointerFilter: "none",
          }}
          uiBackground={{
            texture: { src: NEXT_DROP_TICKER_SRC },
            textureMode: "nine-slices",
            textureSlices: NEXT_DROP_TICKER_SLICES,
          }}
        >
          {greetingTone === "welcome" ? (
            <Label
              value={balloonHudBoldValue(NPC_GREETING_SPEAKER)}
              fontSize={compact ? 12 : 13}
              color={Color4.create(1, 0.84, 0.28, 1)}
              textAlign="middle-right"
              textWrap="nowrap"
              uiTransform={{
                positionType: "absolute",
                position: {
                  top: 6,
                  right: compact ? greetingSidePadding + 40 : greetingSidePadding,
                },
                width: 100,
                height: 18,
                pointerFilter: "none",
              }}
            />
          ) : null}
          <UiEntity
            uiTransform={{
              width: EMPLOYEE_GREETING_PORTRAIT_SIZE,
              height: EMPLOYEE_GREETING_PORTRAIT_SIZE,
              flexShrink: 0,
              margin: { right: 14 },
              pointerFilter: "none",
            }}
            uiBackground={{
              texture: { src: NPC_GREETING_PORTRAIT_SRC },
              textureMode: "stretch",
            }}
          />
          <Label
            value={greetingText}
            fontSize={18}
            color={greetingTone === "hireGift" ? Color4.create(0.35, 0.95, 0.48, 1) : Color4.White()}
            textAlign="middle-left"
            uiTransform={{
              width:
                greetingRect.width -
                EMPLOYEE_GREETING_PORTRAIT_SIZE -
                greetingSidePadding * 2 -
                14,
              height: greetingRect.height - 24,
            }}
          />
        </UiEntity>
      ) : null}
      {help?.open && help.kind === "hire" ? (
        <UiEntity
          uiTransform={{
            ...centeredAbsoluteTransform(hireRect),
            pointerFilter: "block",
          }}
          uiBackground={{
            texture: { src: HELP_WANTED_ART_SRC },
            textureMode: "stretch",
          }}
        >
          <Label
            value={HELP_WANTED_HIRE_COPY}
            fontSize={helpWantedBodyFontSize(hireRect.width)}
            color={Color4.White()}
            textAlign="middle-center"
            textWrap="wrap"
            uiTransform={{ ...helpWantedSlotBox(hireRect, HELP_WANTED_SLOTS.body), pointerFilter: "none" }}
          />
          {SceneTapButton({
            left: hireDecline.left,
            top: hireDecline.top,
            width: hireDecline.width,
            height: hireDecline.height,
            onClick: () => onDeclineHire?.(),
          })}
          {SceneTapButton({
            left: hireOkay.left,
            top: hireOkay.top,
            width: hireOkay.width,
            height: hireOkay.height,
            onClick: () => onAcceptHire?.(),
          })}
        </UiEntity>
      ) : null}
      {help?.open && help.kind === "turnIn" ? (
        <UiEntity
          uiTransform={{
            ...centeredAbsoluteTransform(turnInRect),
            pointerFilter: "block",
          }}
          uiBackground={{
            texture: { src: TURN_IN_ART_SRC },
            textureMode: "stretch",
          }}
        >
          <Label
            value={HELP_WANTED_TURN_IN_COPY}
            fontSize={turnInBodyFontSize(turnInRect.width, compact)}
            color={Color4.White()}
            textAlign="middle-center"
            textWrap="wrap"
            uiTransform={{ ...turnInSlotBox(turnInRect, TURN_IN_SLOTS.body), pointerFilter: "none" }}
          />
          {help.captcha ? (
            <UiEntity
              uiTransform={{
                ...turnInSlotBox(turnInRect, TURN_IN_SLOTS.prompt),
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                pointerFilter: "none",
              }}
            >
              <Label
                value={turnInCaptchaPromptParts(help.captcha.required).prefix}
                fontSize={Math.max(16, Math.round(turnInBodyFontSize(turnInRect.width, compact) * 0.92))}
                color={Color4.create(1, 0.93, 0.62, 1)}
                textAlign="middle-center"
                textWrap="nowrap"
                uiTransform={{ pointerFilter: "none" }}
              />
              <Label
                value={turnInCaptchaPromptParts(help.captcha.required).word}
                fontSize={Math.max(16, Math.round(turnInBodyFontSize(turnInRect.width, compact) * 0.92))}
                color={Color4.create(0.28, 0.9, 0.32, 1)}
                textAlign="middle-center"
                textWrap="nowrap"
                uiTransform={{ pointerFilter: "none" }}
              />
              <Label
                value={turnInCaptchaPromptParts(help.captcha.required).suffix}
                fontSize={Math.max(16, Math.round(turnInBodyFontSize(turnInRect.width, compact) * 0.92))}
                color={Color4.create(1, 0.93, 0.62, 1)}
                textAlign="middle-center"
                textWrap="nowrap"
                uiTransform={{ pointerFilter: "none" }}
              />
            </UiEntity>
          ) : null}
          {help.captcha
            ? turnInCaptchaIconSlots().map((slot, index) => {
                const shape = help.captcha!.order[index];
                if (!shape) {
                  return null;
                }
                const selected = help.captcha!.selected === shape;
                const box = turnInSlotBox(turnInRect, slot);
                return (
                  <UiEntity uiTransform={{ ...box, pointerFilter: "none" }}>
                    {selected ? (
                      <UiEntity
                        uiTransform={{
                          width: "100%",
                          height: "100%",
                          pointerFilter: "none",
                        }}
                        uiBackground={{ color: Color4.create(1, 0.84, 0.28, 0.92) }}
                      />
                    ) : null}
                    <UiEntity
                      uiTransform={{
                        positionType: "absolute",
                        position: { left: selected ? 3 : 0, top: selected ? 3 : 0 },
                        width: selected ? box.width - 6 : box.width,
                        height: selected ? box.height - 6 : box.height,
                        pointerFilter: "none",
                      }}
                      uiBackground={{
                        texture: { src: balloonCaptchaSrc(shape) },
                        textureMode: "stretch",
                      }}
                    />
                  </UiEntity>
                );
              })
            : null}
          {help.captcha
            ? turnInCaptchaIconSlots().map((slot, index) => {
                const shape = help.captcha!.order[index];
                if (!shape) {
                  return null;
                }
                const box = turnInSlotBox(turnInRect, slot);
                return SceneTapButton({
                  left: box.position.left,
                  top: box.position.top,
                  width: box.width,
                  height: box.height,
                  onClick: () => onSelectTurnInCaptcha?.(shape),
                });
              })
            : null}
          <SceneTapButton
            left={turnInTap.left}
            top={turnInTap.top}
            width={turnInTap.width}
            height={turnInTap.height}
            onClick={() => onTurnInBalloons?.()}
          />
          <SceneTapButton
            left={turnInClose.left}
            top={turnInClose.top}
            width={turnInClose.width}
            height={turnInClose.height}
            onClick={() => onCloseHelp?.()}
          />
        </UiEntity>
      ) : null}
      {help?.open && help.kind === "learn" ? (
        <UiEntity
          uiTransform={{
            ...centeredAbsoluteTransform(learnRect),
            pointerFilter: "block",
          }}
          uiBackground={{
            texture: { src: LEARN_MORE_ART_SRC },
            textureMode: "stretch",
          }}
        >
          <Label
            value={LEARN_ABOUT_BODY_LEAD}
            fontSize={Math.max(14, Math.round(18 * (learnRect.width / 860)))}
            color={Color4.create(0.95, 0.18, 0.18, 1)}
            textAlign="middle-center"
            textWrap="wrap"
            uiTransform={{ ...learnMoreSlotBox(learnRect, LEARN_MORE_SLOTS.bodyLead), pointerFilter: "none" }}
          />
          <Label
            value={LEARN_ABOUT_BODY_TRAIL}
            fontSize={Math.max(14, Math.round(18 * (learnRect.width / 860)))}
            color={Color4.White()}
            textAlign="middle-center"
            textWrap="wrap"
            uiTransform={{ ...learnMoreSlotBox(learnRect, LEARN_MORE_SLOTS.bodyTrail), pointerFilter: "none" }}
          />
          <Label
            value={formatPartyStartsIn(help.nextPartyAt, Date.now())}
            fontSize={Math.max(15, Math.round(20 * (learnRect.width / 860)))}
            color={Color4.create(1, 0.93, 0.72, 1)}
            textAlign="middle-center"
            textWrap="wrap"
            uiTransform={{ ...learnMoreSlotBox(learnRect, LEARN_MORE_SLOTS.pill), pointerFilter: "none" }}
          />
          <SceneTapButton
            left={learnClose.left}
            top={learnClose.top}
            width={learnClose.width}
            height={learnClose.height}
            onClick={() => onCloseHelp?.()}
          />
        </UiEntity>
      ) : null}
      {help?.open && help.kind === "alreadyHired" ? (
        <UiEntity
          uiTransform={{
            ...centeredAbsoluteTransform(alreadyHiredRect),
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: { top: 20, bottom: 20, left: 28, right: 28 },
          }}
          uiBackground={{ color: Color4.create(0.07, 0.06, 0.1, 0.94) }}
        >
          <Label value={HELP_WANTED_HOVER_HIRE} fontSize={28} color={Color4.create(1, 0.9, 0.45, 1)} textAlign="middle-center" uiTransform={{ width: alreadyHiredRect.width - 56, height: 42 }} />
          <Label value={HELP_WANTED_ALREADY_HIRED_COPY} fontSize={22} color={Color4.White()} textAlign="middle-center" uiTransform={{ width: alreadyHiredRect.width - 56, height: 80 }} />
          <Button value={LEARN_ABOUT_OK_LABEL} variant="primary" fontSize={20} onMouseDown={() => onCloseHelp?.()} uiTransform={{ width: Math.min(220, alreadyHiredRect.width - 56), height: compact ? 48 : 48, margin: { top: 8 } }} />
        </UiEntity>
      ) : null}
      {rewards?.open ? (
        <UiEntity
          uiTransform={{
            ...centeredAbsoluteTransform(rewardsStack.disclaimer),
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            padding: { left: 48, right: 48 },
            pointerFilter: "none",
          }}
          uiBackground={{
            texture: { src: NEXT_DROP_TICKER_SRC },
            textureMode: "nine-slices",
            textureSlices: NEXT_DROP_TICKER_SLICES,
          }}
        >
          <Label
            value={rewards.message || formatRewardStats(balloon?.level ?? 1, balloon?.balloonPoints ?? 0)}
            fontSize={Math.max(14, Math.round(18 * (rewardsRect.width / 520)))}
            color={Color4.create(1, 0.92, 0.62, 1)}
            textAlign="middle-center"
            textWrap="nowrap"
            uiTransform={{ width: rewardsStack.disclaimer.width - 96, height: rewardsStack.disclaimer.height }}
          />
        </UiEntity>
      ) : null}
      {rewards?.open && !rewards.detailKiteId ? (
        <UiEntity
          uiTransform={{
            ...centeredAbsoluteTransform(rewardsRect),
            pointerFilter: "none",
          }}
          uiBackground={{
            texture: { src: BALLOON_REWARDS_ART_SRC },
            textureMode: "stretch",
          }}
        >
          {(() => {
            const scale = rewardsRect.width / 520;
            const nameSize = Math.max(12, Math.round(15 * scale));
            const cellSize = Math.max(11, Math.round(14 * scale));
            const statusSize = Math.max(10, Math.round(12 * scale));
            const tabSize = Math.max(12, Math.round(14 * scale));
            const tab = rewards.tab === "KITES" ? "KITES" : "BALLOONS";
            const closeTap = ensureMinTapRect(
              balloonRewardsSlotRect(rewardsRect, BALLOON_REWARDS_SLOTS.closeX),
              rewardsRect,
              compact ? 48 : 28,
            );
            const balloonsTap = ensureMinTapRect(
              balloonRewardsSlotRect(rewardsRect, BALLOON_REWARDS_SLOTS.tabBalloons),
              rewardsRect,
              compact ? 48 : 28,
            );
            const kitesTap = ensureMinTapRect(
              balloonRewardsSlotRect(rewardsRect, BALLOON_REWARDS_SLOTS.tabKites),
              rewardsRect,
              compact ? 48 : 28,
            );
            const kiteRows = kiteRewardRows(
              balloon?.level ?? 1,
              equippedWearableUrns ?? [],
              kiteMintCounts ?? emptyKiteMintCounts(),
              undefined,
              {
                balloonPoints: balloon?.balloonPoints ?? 0,
                ledger: kiteRedemptions ?? emptyKiteRedemptionLedger(),
                busyKiteId: kiteMintBusyId,
                justMintedKiteId: kiteDetailMintedId,
              },
            );
            const balloonRows = BALLOON_REWARDS.slice(0, balloonRewardRowCount());
            const activeTabColor = Color4.create(0.14, 0.05, 0.28, 1);
            const idleTabColor = Color4.create(0.32, 0.16, 0.08, 1);
            return (
              <UiEntity uiTransform={{ width: "100%", height: "100%", pointerFilter: "none" }}>
                <Label
                  value={rewards.equippedFingerprint || "none"}
                  fontSize={1}
                  color={Color4.create(0, 0, 0, 0)}
                  textAlign="middle-center"
                  textWrap="nowrap"
                  uiTransform={{ width: 0, height: 0, pointerFilter: "none" }}
                />
                {tab === "BALLOONS" ? (
                  <Label
                    value={BALLOON_REWARDS_BALLOONS_COMING_SOON}
                    fontSize={Math.max(11, Math.round(13 * scale))}
                    color={Color4.create(0.95, 0.16, 0.16, 1)}
                    textAlign="middle-center"
                    textWrap="nowrap"
                    uiTransform={{
                      ...balloonRewardsSlotBox(rewardsRect, BALLOON_REWARDS_SLOTS.balloonsComingSoon),
                      pointerFilter: "none",
                    }}
                  />
                ) : null}
                {tab === "BALLOONS"
                  ? balloonRows.map((reward, index) => {
                      const row = balloonRewardRowSlots(index);
                      const status = formatRewardStatus({
                        requiredLevel: reward.requiredLevel,
                        playerLevel: balloon?.level ?? 1,
                        balloonPointCost: reward.balloonPointCost,
                        balloonPoints: balloon?.balloonPoints ?? 0,
                      });
                      const statusColor =
                        status === "UNLOCKED"
                          ? Color4.create(0.55, 0.86, 1, 1)
                          : Color4.create(1, 0.86, 0.42, 1);
                      return (
                        <UiEntity
                          uiTransform={{
                            positionType: "absolute",
                            position: { left: 0, top: 0 },
                            width: rewardsRect.width,
                            height: rewardsRect.height,
                            pointerFilter: "none",
                          }}
                        >
                          <UiEntity
                            uiTransform={{ ...balloonRewardsSlotBox(rewardsRect, row.icon), pointerFilter: "none" }}
                            uiBackground={{
                              texture: { src: reward.iconSrc },
                              textureMode: "stretch",
                            }}
                          />
                          <Label
                            value={reward.displayName}
                            fontSize={nameSize}
                            color={Color4.create(0.96, 0.93, 0.86, 1)}
                            textAlign="middle-left"
                            textWrap="nowrap"
                            uiTransform={{ ...balloonRewardsSlotBox(rewardsRect, row.name), pointerFilter: "none" }}
                          />
                          <Label
                            value={formatRewardLevel(reward.requiredLevel)}
                            fontSize={cellSize}
                            color={Color4.create(0.96, 0.93, 0.86, 1)}
                            textAlign="middle-center"
                            textWrap="nowrap"
                            uiTransform={{ ...balloonRewardsSlotBox(rewardsRect, row.level), pointerFilter: "none" }}
                          />
                          <Label
                            value={formatRewardCost(reward.balloonPointCost)}
                            fontSize={cellSize}
                            color={Color4.create(0.96, 0.93, 0.86, 1)}
                            textAlign="middle-center"
                            textWrap="nowrap"
                            uiTransform={{ ...balloonRewardsSlotBox(rewardsRect, row.cost), pointerFilter: "none" }}
                          />
                          <Label
                            value={status}
                            fontSize={statusSize}
                            color={statusColor}
                            textAlign="middle-center"
                            textWrap="nowrap"
                            uiTransform={{ ...balloonRewardsSlotBox(rewardsRect, row.status), pointerFilter: "none" }}
                          />
                        </UiEntity>
                      );
                    })
                  : kiteRows.map((kite, index) => {
                      const row = balloonRewardRowSlots(index);
                      const statusColor =
                        kite.status === "CLAIMABLE" || kite.status === "EQUIPPED"
                          ? Color4.create(0.35, 0.95, 0.48, 1)
                          : kite.status === "UNLOCKED"
                            ? Color4.create(0.55, 0.86, 1, 1)
                            : kite.status === "SOLD OUT"
                              ? Color4.create(0.92, 0.62, 0.55, 1)
                              : Color4.create(1, 0.86, 0.42, 1);
                      const rowTap = balloonRewardsSlotRect(rewardsRect, row.hit);
                      return (
                        <UiEntity
                          uiTransform={{
                            positionType: "absolute",
                            position: { left: 0, top: 0 },
                            width: rewardsRect.width,
                            height: rewardsRect.height,
                            pointerFilter: "none",
                          }}
                        >
                          <UiEntity
                            uiTransform={{ ...balloonRewardsSlotBox(rewardsRect, row.icon), pointerFilter: "none" }}
                            uiBackground={{
                              texture: { src: kiteCatalystThumbnailUrl(kite.canonicalUrn) },
                              textureMode: "stretch",
                            }}
                          />
                          <Label
                            value={kiteListName(kite)}
                            fontSize={nameSize}
                            color={Color4.create(0.96, 0.93, 0.86, 1)}
                            textAlign="middle-left"
                            textWrap="nowrap"
                            uiTransform={{ ...balloonRewardsSlotBox(rewardsRect, row.name), pointerFilter: "none" }}
                          />
                          <Label
                            value={formatRewardLevel(kite.requiredLevel)}
                            fontSize={cellSize}
                            color={Color4.create(0.96, 0.93, 0.86, 1)}
                            textAlign="middle-center"
                            textWrap="nowrap"
                            uiTransform={{ ...balloonRewardsSlotBox(rewardsRect, row.level), pointerFilter: "none" }}
                          />
                          <Label
                            value={
                              kite.status === "SOLD OUT" || kite.balloonPointCost <= 0
                                ? ""
                                : formatRewardCost(kite.balloonPointCost)
                            }
                            fontSize={cellSize}
                            color={Color4.create(0.96, 0.93, 0.86, 1)}
                            textAlign="middle-center"
                            textWrap="nowrap"
                            uiTransform={{ ...balloonRewardsSlotBox(rewardsRect, row.cost), pointerFilter: "none" }}
                          />
                          <Label
                            value={kite.status}
                            fontSize={statusSize}
                            color={statusColor}
                            textAlign="middle-center"
                            textWrap="nowrap"
                            uiTransform={{ ...balloonRewardsSlotBox(rewardsRect, row.status), pointerFilter: "none" }}
                          />
                          <SceneTapButton
                            left={rowTap.left}
                            top={rowTap.top}
                            width={rowTap.width}
                            height={rowTap.height}
                            onClick={() => onSelectKiteReward?.(kite.id)}
                          />
                        </UiEntity>
                      );
                    })}
                <Label
                  value={balloonHudBoldValue("BALLOONS")}
                  fontSize={tabSize}
                  color={tab === "BALLOONS" ? activeTabColor : idleTabColor}
                  textAlign="middle-center"
                  textWrap="nowrap"
                  uiTransform={{
                    ...balloonRewardsSlotBox(rewardsRect, balloonRewardsTabLabelSlot(BALLOON_REWARDS_SLOTS.tabBalloons)),
                    pointerFilter: "none",
                  }}
                />
                <Label
                  value={balloonHudBoldValue("KITES")}
                  fontSize={tabSize}
                  color={tab === "KITES" ? activeTabColor : idleTabColor}
                  textAlign="middle-center"
                  textWrap="nowrap"
                  uiTransform={{
                    ...balloonRewardsSlotBox(rewardsRect, balloonRewardsTabLabelSlot(BALLOON_REWARDS_SLOTS.tabKites)),
                    pointerFilter: "none",
                  }}
                />
                <SceneTapButton
                  left={balloonsTap.left}
                  top={balloonsTap.top}
                  width={balloonsTap.width}
                  height={balloonsTap.height}
                  onClick={() => onRewardsTab?.("BALLOONS")}
                />
                <SceneTapButton
                  left={kitesTap.left}
                  top={kitesTap.top}
                  width={kitesTap.width}
                  height={kitesTap.height}
                  onClick={() => onRewardsTab?.("KITES")}
                />
                <SceneTapButton
                  left={closeTap.left}
                  top={closeTap.top}
                  width={closeTap.width}
                  height={closeTap.height}
                  onClick={() => onCloseRewards?.()}
                />
              </UiEntity>
            );
          })()}
        </UiEntity>
      ) : null}
      {rewards?.open && rewards.detailKiteId ? (
        <UiEntity
          uiTransform={{
            ...centeredAbsoluteTransform(rewardsRect),
            pointerFilter: "none",
          }}
          uiBackground={{
            texture: { src: BALLOON_REWARDS_DETAIL_ART_SRC },
            textureMode: "stretch",
          }}
        >
          {(() => {
            const scale = rewardsRect.width / 520;
            const titleSize = Math.max(16, Math.round(22 * scale));
            const bodySize = Math.max(12, Math.round(15 * scale));
            const levelSize = Math.max(22, Math.round(32 * scale));
            const mintSize = Math.max(18, Math.round(24 * scale));
            const detail = kiteRewardDetail(
              rewards.detailKiteId,
              balloon?.level ?? 1,
              equippedWearableUrns ?? [],
              kiteMintCounts ?? emptyKiteMintCounts(),
              {
                balloonPoints: balloon?.balloonPoints ?? 0,
                entry: (kiteRedemptions ?? emptyKiteRedemptionLedger())[rewards.detailKiteId],
                busy: kiteMintBusyId === rewards.detailKiteId,
                justMinted: kiteDetailMintedId === rewards.detailKiteId,
                justFailed: kiteDetailFailedId === rewards.detailKiteId,
                confirmPending: kiteMintConfirmId === rewards.detailKiteId,
                mobile,
                lastResult: kiteMintLastResult,
              },
            );
            const mintTapReady = Date.now() >= (kiteDetailMintEnabledAfter ?? 0);
            const kiteReqMetColor = Color4.create(0.28, 0.92, 0.42, 1);
            const kiteReqUnmetColor = Color4.create(0.95, 0.18, 0.18, 1);
            const ownershipSlot = balloonRewardsSlotBox(
              rewardsRect,
              kiteDetailOwnershipSlot(detail.ownership === "SOLD OUT" || detail.mintAction === "MINTED"),
            );
            const ownershipShowsSplitCost =
              Boolean(detail.ownershipCost) &&
              (detail.mintAction === "LOCKED" ||
                detail.mintAction === "NOT ENOUGH BP" ||
                detail.mintAction === "MINT" ||
                detail.mintAction === "TRY AGAIN");
            const closeTap = ensureMinTapRect(
              balloonRewardsSlotRect(rewardsRect, BALLOON_REWARDS_DETAIL_SLOTS.closeX),
              rewardsRect,
              compact ? 48 : 28,
            );
            const backTap = ensureMinTapRect(
              balloonRewardsSlotRect(rewardsRect, BALLOON_REWARDS_DETAIL_SLOTS.back),
              rewardsRect,
              compact ? 48 : 28,
            );
            const backArrowTap = ensureMinTapRect(
              balloonRewardsSlotRect(rewardsRect, BALLOON_REWARDS_DETAIL_SLOTS.backArrow),
              rewardsRect,
              compact ? 48 : 28,
            );
            const marketplaceTap = ensureMinTapRect(
              balloonRewardsSlotRect(rewardsRect, BALLOON_REWARDS_DETAIL_SLOTS.marketplace),
              rewardsRect,
              compact ? 40 : 24,
            );
            const ownershipTap = ensureMinTapRect(
              balloonRewardsSlotRect(rewardsRect, kiteDetailOwnershipSlot(detail.ownership === "SOLD OUT")),
              rewardsRect,
              compact ? 48 : 28,
            );
            return (
              <UiEntity uiTransform={{ width: "100%", height: "100%", pointerFilter: "none" }}>
                <Label
                  value={rewards.equippedFingerprint || "none"}
                  fontSize={1}
                  color={Color4.create(0, 0, 0, 0)}
                  textAlign="middle-center"
                  textWrap="nowrap"
                  uiTransform={{ width: 0, height: 0, pointerFilter: "none" }}
                />
                <Label
                  value={PARTY_BACK_ARROW}
                  fontSize={Math.max(22, Math.round(28 * scale))}
                  color={Color4.create(1, 0.93, 0.72, 1)}
                  textAlign="middle-center"
                  textWrap="nowrap"
                  uiTransform={{ ...balloonRewardsSlotBox(rewardsRect, BALLOON_REWARDS_DETAIL_SLOTS.backArrow), pointerFilter: "none" }}
                />
                <UiEntity
                  uiTransform={{ ...balloonRewardsSlotBox(rewardsRect, BALLOON_REWARDS_DETAIL_SLOTS.preview), pointerFilter: "none" }}
                  uiBackground={{
                    texture: { src: detail.iconSrc },
                    textureMode: "stretch",
                  }}
                />
                <Label
                  value="MARKETPLACE"
                  fontSize={Math.max(8, Math.round(9 * scale))}
                  color={Color4.create(1, 0.86, 0.42, 1)}
                  textAlign="middle-left"
                  textWrap="nowrap"
                  uiTransform={{ ...balloonRewardsSlotBox(rewardsRect, BALLOON_REWARDS_DETAIL_SLOTS.marketplace), pointerFilter: "none" }}
                />
                <Label
                  value={balloonHudBoldValue(detail.name)}
                  fontSize={titleSize}
                  color={Color4.create(1, 0.93, 0.72, 1)}
                  textAlign="middle-center"
                  textWrap="nowrap"
                  uiTransform={{ ...balloonRewardsSlotBox(rewardsRect, BALLOON_REWARDS_DETAIL_SLOTS.name), pointerFilter: "none" }}
                />
                <Label
                  value={detail.description}
                  fontSize={bodySize}
                  color={Color4.create(0.96, 0.93, 0.86, 1)}
                  textAlign="middle-center"
                  textWrap="wrap"
                  uiTransform={{ ...balloonRewardsSlotBox(rewardsRect, BALLOON_REWARDS_DETAIL_SLOTS.description), pointerFilter: "none" }}
                />
                <Label
                  value={balloonHudBoldValue(detail.requirements)}
                  fontSize={levelSize}
                  color={detail.requirementLevelMet ? kiteReqMetColor : kiteReqUnmetColor}
                  textAlign="middle-center"
                  textWrap="nowrap"
                  uiTransform={{ ...balloonRewardsSlotBox(rewardsRect, BALLOON_REWARDS_DETAIL_SLOTS.requirements), pointerFilter: "none" }}
                />
                <Label
                  value={detail.perks}
                  fontSize={bodySize}
                  color={Color4.create(0.96, 0.93, 0.86, 1)}
                  textAlign="middle-center"
                  textWrap="wrap"
                  uiTransform={{ ...balloonRewardsSlotBox(rewardsRect, BALLOON_REWARDS_DETAIL_SLOTS.perks), pointerFilter: "none" }}
                />
                {ownershipShowsSplitCost ? (
                  <UiEntity
                    uiTransform={{
                      ...ownershipSlot,
                      flexDirection: "row",
                      justifyContent: "center",
                      alignItems: "center",
                      pointerFilter: "none",
                    }}
                  >
                    <Label
                      value={balloonHudBoldValue(detail.ownership)}
                      fontSize={mintSize}
                      color={
                        detail.mintAction === "MINT" || detail.mintAction === "TRY AGAIN"
                          ? Color4.create(1, 0.93, 0.55, 1)
                          : detail.requirementLevelMet
                            ? kiteReqMetColor
                            : kiteReqUnmetColor
                      }
                      textAlign="middle-center"
                      textWrap="nowrap"
                      uiTransform={{ width: "auto", height: "100%" }}
                    />
                    <Label
                      value={balloonHudBoldValue(detail.ownershipCost)}
                      fontSize={mintSize}
                      color={detail.requirementCostMet ? kiteReqMetColor : kiteReqUnmetColor}
                      textAlign="middle-center"
                      textWrap="nowrap"
                      uiTransform={{ width: "auto", height: "100%", margin: { left: 12 } }}
                    />
                  </UiEntity>
                ) : (
                  <Label
                    value={
                      detail.ownershipCost
                        ? `${balloonHudBoldValue(detail.ownership)}   ${balloonHudBoldValue(detail.ownershipCost)}`
                        : balloonHudBoldValue(detail.ownership)
                    }
                    fontSize={mintSize}
                    color={
                      detail.mintAction === "MINTED"
                        ? kiteReqMetColor
                        : detail.mintAction === "CLICK HERE TO CONFIRM" || detail.mintAction === "TAP HERE TO CONFIRM"
                          ? Color4.create(1, 0.78, 0.38, 1)
                          : Color4.create(1, 0.93, 0.55, 1)
                    }
                    textAlign="middle-center"
                    textWrap="nowrap"
                    uiTransform={{ ...ownershipSlot, pointerFilter: "none" }}
                  />
                )}
                <SceneTapButton
                  left={marketplaceTap.left}
                  top={marketplaceTap.top}
                  width={marketplaceTap.width}
                  height={marketplaceTap.height}
                  onClick={() => {
                    if (isSafeMarketplaceUrl(detail.marketplaceUrl)) {
                      onOpenMarketplace?.(detail.marketplaceUrl);
                    }
                  }}
                />
                {detail.canMint && mintTapReady ? (
                <SceneTapButton
                  left={ownershipTap.left}
                  top={ownershipTap.top}
                  width={ownershipTap.width}
                  height={ownershipTap.height}
                  onClick={() => {
                    if (detail.canMint && rewards.detailKiteId) {
                      onRedeemKite?.(rewards.detailKiteId);
                    }
                  }}
                />
                ) : null}
                <SceneTapButton
                  left={backArrowTap.left}
                  top={backArrowTap.top}
                  width={backArrowTap.width}
                  height={backArrowTap.height}
                  onClick={() => onBackKiteRewardDetail?.()}
                />
                <SceneTapButton
                  left={backTap.left}
                  top={backTap.top}
                  width={backTap.width}
                  height={backTap.height}
                  onClick={() => onBackKiteRewardDetail?.()}
                />
                <SceneTapButton
                  left={closeTap.left}
                  top={closeTap.top}
                  width={closeTap.width}
                  height={closeTap.height}
                  onClick={() => onCloseRewards?.()}
                />
              </UiEntity>
            );
          })()}
        </UiEntity>
      ) : null}
      {party && party.open !== "none" ? (
        <UiEntity
          uiTransform={{
            ...centeredAbsoluteTransform(chestLayout.panel),
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "stretch",
            padding: 0,
            overflow: "hidden",
          }}
          uiBackground={{ color: Color4.create(0, 0, 0, 0) }}
        >
          <PartyDashboard party={party} actions={partyActions} layout={chestLayout} />
        </UiEntity>
      ) : null}
    </UiEntity>
  );
}

export function setupUi(
  getModel: () => PopUiModel,
  onPop: () => void,
  getPersonal: () => PersonalWinToast = createPersonalWinToast,
  getWorld: () => WorldToastQueue = createWorldToastQueue,
  getHud: () => PartyHudModel = emptyPartyHud,
  getChest?: () => ChestPresentation | undefined,
  getPanels?: () => ChestPanelModel | undefined,
  actions?: {
    onClosePanel?: () => void;
    onOpenDeposit?: () => void;
    onAcceptDepositWarning?: (dontShowAgain: boolean) => void;
    onExitDepositWarning?: () => void;
    onDepositAsset?: (asset: "NFT" | "MANA") => void;
    onConfirmDeposit?: () => void;
    onNftKind?: (kind: "wearable" | "emote" | "leftover") => void;
    onSelectItem?: (urn: string) => void;
    onAdjustQuantity?: (delta: number) => void;
    onToggleAutoPick?: () => void;
    onToggleLowMintLock?: () => void;
    onCloseHelp?: () => void;
    onAcceptHire?: () => void;
    onDeclineHire?: () => void;
    onTurnInBalloons?: () => void;
    onSelectTurnInCaptcha?: (shape: BalloonCaptchaShape) => void;
    onBalloonButton?: () => void;
    onToggleMusic?: () => void;
    onNextSong?: () => void;
    onMusicVolumeDown?: () => void;
    onMusicVolumeUp?: () => void;
    onOpenRewards?: () => void;
    onCloseRewards?: () => void;
    onRewardsTab?: (tab: RewardsCatalogTab) => void;
    onSelectKiteReward?: (kiteId: KitePerkId) => void;
    onBackKiteRewardDetail?: () => void;
    onRedeemKite?: (kiteId: KitePerkId) => void;
    onOpenParties?: () => void;
    onCloseParties?: () => void;
    onCreateParty?: () => void;
    onSubmitParty?: () => void;
    onEditSelectedParty?: () => void;
    onDraftTitle?: (value: string) => void;
    onDraftDescription?: (value: string) => void;
    onDraftDate?: (value: string) => void;
    onDraftTime?: (value: string) => void;
    onDraftDayPeriod?: (period: DayPeriod) => void;
    onToggleDraftCommunity?: () => void;
    onToggleDraftExtraPool?: () => void;
    onToggleDraftUnclaimedPolicy?: () => void;
    onPickPublicDestination?: () => void;
    onPickScheduledDestination?: (partyId: string, title: string) => void;
    onOpenUpcoming?: () => void;
    onOpenMyParties?: () => void;
    onOpenMyWins?: () => void;
    onOpenCreate?: () => void;
    onManageParty?: (partyId: string) => void;
    onContribute?: (partyId: string, title: string) => void;
    onAddPrizes?: () => void;
    onDraftTimeZone?: (value: string) => void;
    onBackToChest?: () => void;
    onInventorySearch?: (value: string) => void;
    onInventoryRarity?: (rarity: string) => void;
    onInventoryPage?: (delta: number) => void;
    onInventoryGoToPage?: (page: number) => void;
    onToggleMint?: (tokenId: string) => void;
    onSetManaAmount?: (value: string) => void;
    onBackDeposit?: () => void;
    onOpenMarketplace?: (url: string) => void;
    onOpenExplorer?: (url: string) => void;
    onManageTab?: (tab: ManagePartyTab) => void;
    onViewPrizes?: (partyId: string) => void;
    onCreateAgain?: () => void;
    onToggleLeftoverPrize?: (prizeId: string) => void;
    onToggleLeftoverMana?: (partyId: string) => void;
    onClosePrizePreview?: () => void;
    onToggleTimezonePicker?: () => void;
    onSelectDisplayTimeZone?: (timeZone: string) => void;
    onPrizePreviewPage?: (section: "community" | "extra", delta: number) => void;
  },
  getHelp?: () => HelpWantedPanel | undefined,
  getParty?: () => PartyPanelModel | undefined,
  getWalletConnected?: () => boolean,
  getBalloon?: () => BalloonHudModel,
  getRewards?: () => BalloonRewardUi,
  getEquippedWearableUrns?: () => readonly string[],
  getGreeting?: () => string,
  getGreetingTone?: () => NpcGreetingTone,
  getFullAlert?: () => string,
  getMusic?: () => SceneMusicHud,
  getAdmissionNotice?: () => RewardAdmissionNotice | undefined,
  getInteractionLocked?: () => boolean,
  getKiteMintCounts?: () => KiteMintCounts,
  getKiteRedemptions?: () => KiteRedemptionLedger,
  getKiteMintBusyId?: () => KitePerkId | null,
  getKiteMintConfirmId?: () => KitePerkId | null,
  getKiteDetailMintEnabledAfter?: () => number,
  getKiteDetailMintedId?: () => KitePerkId | null,
  getKiteDetailFailedId?: () => KitePerkId | null,
  getKiteMintLastResult?: () => string,
) {
  const render = () => (
    <DropPartyUi
      model={getModel()}
      personal={getPersonal()}
      world={getWorld()}
      hud={getHud()}
      onPop={onPop}
      chest={getChest?.()}
      panels={getPanels?.()}
      onClosePanel={actions?.onClosePanel}
      onOpenDeposit={actions?.onOpenDeposit}
      onAcceptDepositWarning={actions?.onAcceptDepositWarning}
      onExitDepositWarning={actions?.onExitDepositWarning}
      onDepositAsset={actions?.onDepositAsset}
      onConfirmDeposit={actions?.onConfirmDeposit}
      onNftKind={actions?.onNftKind}
      onSelectItem={actions?.onSelectItem}
      onAdjustQuantity={actions?.onAdjustQuantity}
      onToggleAutoPick={actions?.onToggleAutoPick}
      onToggleLowMintLock={actions?.onToggleLowMintLock}
      help={getHelp?.()}
      onCloseHelp={actions?.onCloseHelp}
      onAcceptHire={actions?.onAcceptHire}
      onDeclineHire={actions?.onDeclineHire}
      onTurnInBalloons={actions?.onTurnInBalloons}
      onSelectTurnInCaptcha={actions?.onSelectTurnInCaptcha}
      balloon={getBalloon?.() ?? emptyBalloonHud()}
      onBalloonButton={actions?.onBalloonButton}
      music={getMusic?.()}
      onToggleMusic={actions?.onToggleMusic}
      onNextSong={actions?.onNextSong}
      onMusicVolumeDown={actions?.onMusicVolumeDown}
      onMusicVolumeUp={actions?.onMusicVolumeUp}
      rewards={getRewards?.() ?? createBalloonRewardUi()}
      equippedWearableUrns={getEquippedWearableUrns?.() ?? []}
      kiteMintCounts={getKiteMintCounts?.() ?? emptyKiteMintCounts()}
      kiteRedemptions={getKiteRedemptions?.() ?? emptyKiteRedemptionLedger()}
      kiteMintBusyId={getKiteMintBusyId?.() ?? null}
      kiteMintConfirmId={getKiteMintConfirmId?.() ?? null}
      kiteDetailMintEnabledAfter={getKiteDetailMintEnabledAfter?.() ?? 0}
      kiteDetailMintedId={getKiteDetailMintedId?.() ?? null}
      kiteDetailFailedId={getKiteDetailFailedId?.() ?? null}
      kiteMintLastResult={getKiteMintLastResult?.() ?? ""}
      onOpenRewards={actions?.onOpenRewards}
      onCloseRewards={actions?.onCloseRewards}
      onRewardsTab={actions?.onRewardsTab}
      onSelectKiteReward={actions?.onSelectKiteReward}
      onBackKiteRewardDetail={actions?.onBackKiteRewardDetail}
      onRedeemKite={actions?.onRedeemKite}
      greetingText={getGreeting?.() ?? ""}
      greetingTone={getGreetingTone?.() ?? "welcome"}
      fullAlertText={getFullAlert?.() ?? ""}
      admissionNotice={getAdmissionNotice?.()}
      interactionLocked={getInteractionLocked?.()}
      party={getParty?.()}
      onOpenParties={actions?.onOpenParties}
      onCloseParties={actions?.onCloseParties}
      onCreateParty={actions?.onCreateParty}
      onSubmitParty={actions?.onSubmitParty}
      onEditSelectedParty={actions?.onEditSelectedParty}
      onDraftTitle={actions?.onDraftTitle}
      onDraftDescription={actions?.onDraftDescription}
      onDraftDate={actions?.onDraftDate}
      onDraftTime={actions?.onDraftTime}
      onDraftDayPeriod={actions?.onDraftDayPeriod}
      onToggleDraftCommunity={actions?.onToggleDraftCommunity}
      onToggleDraftExtraPool={actions?.onToggleDraftExtraPool}
      onToggleDraftUnclaimedPolicy={actions?.onToggleDraftUnclaimedPolicy}
      onPickPublicDestination={actions?.onPickPublicDestination}
      onPickScheduledDestination={actions?.onPickScheduledDestination}
      onOpenUpcoming={actions?.onOpenUpcoming}
      onOpenMyParties={actions?.onOpenMyParties}
      onOpenMyWins={actions?.onOpenMyWins}
      onOpenCreate={actions?.onOpenCreate}
      onManageParty={actions?.onManageParty}
      onContribute={actions?.onContribute}
      onAddPrizes={actions?.onAddPrizes}
      onDraftTimeZone={actions?.onDraftTimeZone}
      onBackToChest={actions?.onBackToChest}
      onInventorySearch={actions?.onInventorySearch}
      onInventoryRarity={actions?.onInventoryRarity}
      onInventoryPage={actions?.onInventoryPage}
      onInventoryGoToPage={actions?.onInventoryGoToPage}
      onToggleMint={actions?.onToggleMint}
      onSetManaAmount={actions?.onSetManaAmount}
      onBackDeposit={actions?.onBackDeposit}
      onOpenMarketplace={actions?.onOpenMarketplace}
      onOpenExplorer={actions?.onOpenExplorer}
      onManageTab={actions?.onManageTab}
      onViewPrizes={actions?.onViewPrizes}
      onCreateAgain={actions?.onCreateAgain}
      onToggleLeftoverPrize={actions?.onToggleLeftoverPrize}
      onToggleLeftoverMana={actions?.onToggleLeftoverMana}
      onClosePrizePreview={actions?.onClosePrizePreview}
      onToggleTimezonePicker={actions?.onToggleTimezonePicker}
      onSelectDisplayTimeZone={actions?.onSelectDisplayTimeZone}
      onPrizePreviewPage={actions?.onPrizePreviewPage}
      walletConnected={getWalletConnected?.()}
    />
  );
  let registeredFor: "mobile" | "desktop" = "desktop";
  registerDropPartyUiRenderer(
    ReactEcsRenderer,
    render,
    rendererOptionsForPlatform("desktop"),
  );
  engine.addSystem(function dropPartyPlatformUiRenderer() {
    const mobile = isMobile() || getPlatform() === "mobile";
    const next: "mobile" | "desktop" = mobile ? "mobile" : "desktop";
    if (next === registeredFor) return;
    registeredFor = next;
    applyLeaderboardLineSpacing(next === "mobile");
    registerDropPartyUiRenderer(ReactEcsRenderer, render, rendererOptionsForPlatform(next));
  });
}
