import ReactEcs, { UiEntity } from "@dcl/sdk/react-ecs";
import {
  browseTypeLabel,
  canShowContribute,
  canShowDepositPrizesPreview,
  communityLabel,
  descriptionCounter,
  extraPoolLabel,
  extraPoolQuotaHelper,
  canTurnOnExtraPool,
  unclaimedPrizePolicyHelper,
  unclaimedPrizePolicyLabel,
  canHostAddPrizes,
  canHostEditParty,
  hostedCardExtraMeta,
  hostedManagePrizeCountsCopy,
  isAutomaticBrowseParty,
  isEditTimeLocked,
  isHostedPartyLocked,
  isPastHostedParty,
  managePrizesShowConfirmedPreview,
  MANAGE_LIVE_PRIZES_HEADING,
  MANAGE_NO_CLAIMS_YET,
  MANAGE_NO_POT_PRIZES,
  MANAGE_POT_PRIZES_HEADING,
  type ManagePartyTab,
  type PartyPanelModel,
  type PartyPotSummary,
  type PartyPrizePreview,
  type PrizePreviewCard,
  type ScheduledPartyView,
  type UpcomingBrowseKind,
} from "../shared/partyPanels";
import {
  CHANGE_TIMEZONE_LABEL,
  PARTY_BACK_ARROW,
  PARTY_BACK_LABEL,
  CONFIRMED_EMPTY_AUTOMATIC,
  CONFIRMED_EMPTY_HOSTED,
  confirmedHeading,
  formatManaAmount,
  manaPrizeAmountText,
  MANA_PRIZE_CHIP,
  HERO_STACK_ALIGN,
  HERO_TITLE_ALIGN,
  HERO_WHEN_ALIGN,
  VIEW_PRIZES_BUTTON_HEIGHT,
  VIEW_PRIZES_BUTTON_HEIGHT_COMPACT,
  VIEW_PRIZES_BUTTON_WIDTH,
  VIEW_PRIZES_BUTTON_WIDTH_COMPACT,
  VIEW_PRIZES_FONT,
  VIEW_PRIZES_FONT_COMPACT,
  VIEW_PRIZES_LABEL,
  NEXT_PARTY_CHIP,
  myPartiesStatusChip,
  operationalStatusChip,
  possibleCountHeading,
  possiblePrizesHeading,
  mixedPossibleSourceParts,
  POSSIBLE_EMPTY,
  POSSIBLE_FOOTER,
  prizePreviewQtyLabel,
  prizeSourceChip,
  DEPOSIT_PRIZES_LABEL,
  PRIZE_PREVIEW_HEADING,
  selectUpcomingEventBoard,
  upcomingDisplayDescription,
  upcomingDisplayTitle,
  prizePreviewNeedsScroll,
  stackPrizePreviewCards,
  upcomingNeedsScroll,
  myPartiesNeedsScroll,
  MY_PARTIES_ACTION_BUTTON_WIDTH,
  MY_PARTIES_ACTION_BUTTON_WIDTH_COMPACT,
  UPCOMING_DROP_PARTIES_HEADING,
  CREATE_PARTY_ACTION_LABEL,
  CREATE_PARTY_HEADING,
  EDIT_PARTY_HEADING,
  MANAGE_PARTY_HEADING,
  MY_PARTIES_COMPLETED_HEADING,
  MY_PARTIES_EMPTY,
  MY_PARTIES_HEADING,
  MY_PARTIES_UPCOMING_HEADING,
  MY_WINS_TAB_LABEL,
  PARTY_HEADER_TITLE_ALIGN,
  PARTY_PANELS_WITH_TIMEZONE_CHROME,
  createPartyActionButtonSize,
  createPartyFieldSize,
  createPartyFormNeedsScroll,
  manageTabNeedsScroll,
  CREATE_PARTY_TIME_FIELD_WIDTH,
  CREATE_PARTY_PERIOD_BUTTON_WIDTH,
  PARTY_DESCRIPTION_MAX_LENGTH,
  PARTY_TITLE_MAX_LENGTH,
  partyHeaderMetrics,
  viewerTimeLabel,
} from "../shared/partyDisplay";
import { hostCardLabel } from "../shared/displayName";
import { EXPLORER_LABEL } from "../shared/explorer";
import { color, font, measureWrappedTextHeight, radius, s, spacing } from "../ui/theme";
import {
  formatManagePrizeHistoryMeta,
  formatWinHistoryMeta,
  formatWinPrizeDetail,
  myWinsNeedsScroll,
  MY_WINS_EXPLORER_LABEL,
  MANA_TOKEN_ICON_SRC,
  winThumbnailUrl,
  WON_BY_PREFIX,
  wonByMarketplaceUrl,
  wonByWinnerLabel,
  winExplorerUrl,
  MY_WINS_META_FONT,
  MY_WINS_META_FONT_COMPACT,
  MY_WINS_THUMB_SIZE,
  MY_WINS_THUMB_SIZE_COMPACT,
  MY_WINS_TITLE_FONT,
  MY_WINS_TITLE_FONT_COMPACT,
  type WinView,
} from "../shared/wins";
import {
  DISPLAY_ZONE_OPTIONS,
  formatCompactCountdown,
  formatHeroCountdown,
  formatLineupLockCopy,
  formatPartyWhen,
  formatRelativeCountdown,
  localTimeHelper,
  detectLocalTimeZone,
  rescheduleLockMessage,
  sanitizeClock12hInput,
  sanitizeDateMdYInput,
  type DayPeriod,
} from "../shared/partyTime";
import { ItemThumbnailBox } from "../ui/components/ItemThumbnailBox";
import {
  leftoverGroupForParty,
  leftoverGroupHasAssets,
  leftoverManaLabel,
  leftoverNftLine,
  CREATE_PARTY_LEFTOVER_HINT,
  isLeftoverManaSelected,
  type HostLeftoverGroup,
} from "../shared/leftoverInventory";
import { rgbaForRarityLabel } from "../ui/rarityColors";
import { RmButton } from "../ui/components/Button";
import { RmCard } from "../ui/components/Card";
import { RmChip } from "../ui/components/Chip";
import { RmTextField } from "../ui/components/TextField";
import { RmToggle } from "../ui/components/Toggle";
import { chestUiMetrics, partyDashboardListHeight, type ChestUiMetrics } from "../shared/chestUiLayout";

export type PartyUiActions = {
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
  onManageParty?: (partyId: string) => void;
  onContribute?: (partyId: string, title: string) => void;
  onAddPrizes?: () => void;
  onDraftTimeZone?: (value: string) => void;
  onBackToChest?: () => void;
  onManageTab?: (tab: ManagePartyTab) => void;
  onViewPrizes?: (partyId: string) => void;
  onCreateAgain?: () => void;
  onToggleLeftoverPrize?: (prizeId: string) => void;
  onToggleLeftoverMana?: (partyId: string) => void;
  onClosePrizePreview?: () => void;
  onToggleTimezonePicker?: () => void;
  onSelectDisplayTimeZone?: (timeZone: string) => void;
  onPrizePreviewPage?: (section: "community" | "extra", delta: number) => void;
  onOpenCreate?: () => void;
  onOpenMarketplace?: (url: string) => void;
  onOpenExplorer?: (url: string) => void;
};

function heading(open: PartyPanelModel["open"]): string {
  if (open === "create") return CREATE_PARTY_HEADING;
  if (open === "edit") return EDIT_PARTY_HEADING;
  if (open === "manage") return MANAGE_PARTY_HEADING;
  if (open === "mine") return MY_PARTIES_HEADING;
  if (open === "wins") return MY_WINS_TAB_LABEL;
  if (open === "prizes") return PRIZE_PREVIEW_HEADING;
  return UPCOMING_DROP_PARTIES_HEADING;
}

function PartyPanelHeader(args: {
  compact: boolean;
  contentWidth: number;
  title: string;
  onBack: () => void;
  action?: ReactEcs.JSX.Element;
}): ReactEcs.JSX.Element {
  const metrics = partyHeaderMetrics(args.compact, args.contentWidth);
  const rightSlot = args.action;
  const titleWidth = rightSlot ? metrics.title : metrics.title + metrics.action;
  return (
    <UiEntity
      uiTransform={{
        width: s(metrics.back + titleWidth + (rightSlot ? metrics.action : 0)),
        height: s(metrics.rowHeight),
        flexDirection: "row",
        flexWrap: "nowrap",
        alignItems: "center",
        flexShrink: 0,
        overflow: "hidden",
        margin: { bottom: args.compact ? spacing.xs : spacing.sm },
      }}
    >
      <UiEntity
        uiTransform={{
          width: s(metrics.back),
          height: s(metrics.rowHeight),
          flexShrink: 0,
          justifyContent: "center",
          alignItems: "center",
        }}
        uiText={{
          value: PARTY_BACK_ARROW,
          fontSize: font.title,
          color: color.textMuted,
          textAlign: "middle-center",
        }}
        onMouseDown={args.onBack}
      />
      <UiEntity
        uiTransform={{
          width: s(titleWidth),
          height: s(metrics.rowHeight),
          flexShrink: 0,
          overflow: "hidden",
        }}
        uiText={{
          value: args.title,
          fontSize: metrics.titleFont,
          color: color.textPrimary,
          textAlign: PARTY_HEADER_TITLE_ALIGN,
          textWrap: "nowrap",
        }}
      />
      {args.action ? (
        <UiEntity
          uiTransform={{
            width: s(metrics.action),
            height: s(metrics.rowHeight),
            flexShrink: 0,
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          {args.action}
        </UiEntity>
      ) : null}
    </UiEntity>
  );
}

function MyPartiesHeader(args: {
  compact: boolean;
  contentWidth: number;
  onBack: () => void;
  onCreate: () => void;
}): ReactEcs.JSX.Element {
  const metrics = partyHeaderMetrics(args.compact, args.contentWidth);
  return (
    <PartyPanelHeader
      compact={args.compact}
      contentWidth={args.contentWidth}
      title={MY_PARTIES_HEADING}
      onBack={args.onBack}
      action={
        <RmButton
          label={CREATE_PARTY_ACTION_LABEL}
          variant="success"
          size={createPartyActionButtonSize(args.compact)}
          width={s(metrics.action)}
          onClick={args.onCreate}
        />
      }
    />
  );
}

function TypeChip(kind: UpcomingBrowseKind | string, inline = false) {
  return (
    <UiEntity
      uiTransform={{
        width: kind === NEXT_PARTY_CHIP ? s(72) : s(56),
        height: s(16),
        margin: inline ? { left: 2 } : { bottom: spacing.xs },
        flexShrink: 0,
        borderRadius: radius.sm,
        justifyContent: "center",
        alignItems: "center",
      }}
      uiBackground={{ color: kind === "PUBLIC" || kind === NEXT_PARTY_CHIP ? color.accentSoft : color.bgElevated }}
    >
      <UiEntity
        uiText={{
          value: kind,
          fontSize: font.nano,
          color: color.textPrimary,
          textAlign: "middle-center",
        }}
      />
    </UiEntity>
  );
}

function titleChipWidth(title: string, fontSize: number, kind?: UpcomingBrowseKind | string): number {
  const glyphWidth = kind === "HOSTED" ? 0.52 : 0.64;
  return Math.max(48, Math.ceil(title.length * fontSize * glyphWidth));
}

function TitleWithTypeChip(args: {
  title: string;
  fontSize: number;
  height: number;
  color: typeof color.textPrimary;
  textAlign: "middle-left" | "top-left";
  kind?: UpcomingBrowseKind | string;
  wrap?: boolean;
}) {
  const wrap = Boolean(args.wrap);
  const titleWidth =
    args.kind || !wrap
      ? s(titleChipWidth(args.title, args.fontSize, args.kind))
      : "100%";
  return (
    <UiEntity
      uiTransform={{
        width: "100%",
        height: s(args.height),
        flexDirection: "row",
        alignItems: "center",
        flexShrink: 0,
      }}
    >
      <UiEntity
        uiTransform={{
          width: titleWidth,
          flexGrow: 0,
          height: s(args.height),
          flexShrink: 0,
        }}
        uiText={{
          value: wrapTitle(args.title),
          fontSize: args.fontSize,
          color: args.color,
          textAlign: args.textAlign,
          textWrap: wrap ? "wrap" : "nowrap",
        }}
      />
      {args.kind ? TypeChip(args.kind, true) : null}
    </UiEntity>
  );
}

function ViewPrizesChip(onClick?: () => void, compact = false) {
  const width = compact ? s(VIEW_PRIZES_BUTTON_WIDTH_COMPACT) : s(VIEW_PRIZES_BUTTON_WIDTH);
  const height = compact ? s(VIEW_PRIZES_BUTTON_HEIGHT_COMPACT) : s(VIEW_PRIZES_BUTTON_HEIGHT);
  return (
    <UiEntity
      uiTransform={{
        width,
        height,
        flexShrink: 0,
        borderRadius: radius.md,
        justifyContent: "center",
        alignItems: "center",
      }}
      uiBackground={{ color: color.accent }}
      onMouseDown={onClick}
    >
      <UiEntity
        uiText={{
          value: VIEW_PRIZES_LABEL,
          fontSize: compact ? s(VIEW_PRIZES_FONT_COMPACT) : s(VIEW_PRIZES_FONT),
          color: color.textInverted,
          textAlign: "middle-center",
        }}
      />
    </UiEntity>
  );
}

function statusBadgeColor(label: string) {
  if (label === "LIVE" || label === "OPEN") return color.successStrong;
  if (label === "CANCELLED" || label === "LOCKED") return color.dangerSoft;
  if (label === "COMPLETED") return color.info;
  if (label === "HOST ONLY" || label === "LOCKING") return color.accentDeep;
  if (label === "UPCOMING") return color.success;
  return color.bgElevated;
}

function statusBadgeTextColor(label: string) {
  return label === "UPCOMING" || label === "COMPLETED"
    ? color.textInverted
    : color.textPrimary;
}

function StatusBadge(label: "OPEN" | "HOST ONLY" | "LOCKED" | string) {
  const wide = label.length >= 8;
  return (
    <UiEntity
      uiTransform={{
        width: s(wide ? 84 : 72),
        height: s(16),
        borderRadius: radius.sm,
        justifyContent: "center",
        alignItems: "center",
      }}
      uiBackground={{
        color: statusBadgeColor(label),
      }}
    >
      <UiEntity
        uiText={{
          value: label,
          fontSize: font.nano,
          color: statusBadgeTextColor(label),
          textAlign: "middle-center",
        }}
      />
    </UiEntity>
  );
}

function wrapTitle(title: string): string {
  return title;
}

function WinRow(args: {
  win: WinView;
  nowMs: number;
  viewerTimeZone: string;
  compact: boolean;
  showHistory: boolean;
  onOpenExplorer?: (url: string) => void;
}) {
  const detail = formatWinPrizeDetail(args.win);
  const thumb = args.compact ? MY_WINS_THUMB_SIZE_COMPACT : MY_WINS_THUMB_SIZE;
  const titleFont = args.compact ? MY_WINS_TITLE_FONT_COMPACT : MY_WINS_TITLE_FONT;
  const metaFont = args.compact ? MY_WINS_META_FONT_COMPACT : MY_WINS_META_FONT;
  const explorerUrl = args.showHistory ? winExplorerUrl(args.win) : undefined;
  return (
    <UiEntity
      uiTransform={{
        width: "100%",
        minHeight: s(args.showHistory ? Math.max(thumb, args.compact ? 62 : 68) : thumb),
        flexDirection: "row",
        alignItems: "center",
        flexShrink: 0,
        margin: { bottom: args.compact ? spacing.sm : spacing.md },
        padding: { top: spacing.xs, bottom: spacing.xs },
      }}
    >
      <ItemThumbnailBox kind="wearable" thumbnailUrl={winThumbnailUrl(args.win)} size={thumb} />
      <UiEntity
        uiTransform={{
          flexGrow: 1,
          minWidth: 0,
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          margin: { left: spacing.md },
        }}
      >
        <UiEntity
          uiTransform={{ width: "100%", height: s(args.compact ? 22 : 24), flexShrink: 0 }}
          uiText={{
            value: args.win.displayName,
            fontSize: titleFont,
            color: color.textPrimary,
            textAlign: "middle-left",
            textWrap: "nowrap",
          }}
        />
        <UiEntity
          uiTransform={{ width: "100%", height: s(args.compact ? 18 : 20), flexShrink: 0 }}
          uiText={{
            value: args.showHistory
              ? formatWinHistoryMeta(args.win, args.viewerTimeZone, args.nowMs)
              : detail,
            fontSize: metaFont,
            color: color.textMuted,
            textAlign: "middle-left",
            textWrap: "nowrap",
          }}
        />
        {args.showHistory ? (
          <UiEntity
            uiTransform={{ width: "100%", height: s(args.compact ? 18 : 20), flexShrink: 0 }}
            uiText={{
              value: MY_WINS_EXPLORER_LABEL,
              fontSize: metaFont,
              color: explorerUrl ? color.accent : color.textMuted,
              textAlign: "middle-left",
              textWrap: "nowrap",
            }}
            onMouseDown={
              explorerUrl ? () => args.onOpenExplorer?.(explorerUrl) : undefined
            }
          />
        ) : null}
      </UiEntity>
    </UiEntity>
  );
}

function ManagePrizeRow(args: {
  win: WinView;
  compact: boolean;
  onOpenMarketplace?: (url: string) => void;
  onOpenExplorer?: (url: string) => void;
}) {
  const thumb = args.compact ? MY_WINS_THUMB_SIZE_COMPACT : MY_WINS_THUMB_SIZE;
  const titleFont = args.compact ? MY_WINS_TITLE_FONT_COMPACT : MY_WINS_TITLE_FONT;
  const metaFont = args.compact ? MY_WINS_META_FONT_COMPACT : MY_WINS_META_FONT;
  const titleLine = args.compact ? 22 : 24;
  const metaLine = args.compact ? 18 : 20;
  const explorerUrl = winExplorerUrl(args.win);
  const winnerLabel = wonByWinnerLabel(args.win);
  const winnerUrl = wonByMarketplaceUrl(args.win);
  const showWonBy = Boolean(winnerLabel && winnerUrl);
  return (
    <UiEntity
      uiTransform={{
        width: "100%",
        minHeight: s(Math.max(thumb, titleLine + metaLine + (showWonBy ? metaLine : 0))),
        flexDirection: "row",
        alignItems: "center",
        flexShrink: 0,
        margin: { bottom: args.compact ? spacing.sm : spacing.md },
        padding: { top: spacing.xs, bottom: spacing.xs },
      }}
    >
      <ItemThumbnailBox kind="wearable" thumbnailUrl={winThumbnailUrl(args.win)} size={thumb} />
      <UiEntity
        uiTransform={{
          flexGrow: 1,
          minWidth: 0,
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          margin: { left: spacing.md, right: spacing.sm },
        }}
      >
        <UiEntity
          uiTransform={{ width: "100%", height: s(titleLine), flexShrink: 0 }}
          uiText={{
            value: args.win.displayName,
            fontSize: titleFont,
            color: color.textPrimary,
            textAlign: "middle-left",
            textWrap: "nowrap",
          }}
        />
        <UiEntity
          uiTransform={{ width: "100%", height: s(metaLine), flexShrink: 0 }}
          uiText={{
            value: formatManagePrizeHistoryMeta(args.win),
            fontSize: metaFont,
            color: color.textMuted,
            textAlign: "middle-left",
            textWrap: "nowrap",
          }}
        />
        {showWonBy ? (
          <UiEntity
            uiTransform={{
              width: "100%",
              height: s(metaLine),
              flexDirection: "row",
              alignItems: "center",
              flexShrink: 0,
            }}
            onMouseDown={() => args.onOpenMarketplace?.(winnerUrl!)}
          >
            <UiEntity
              uiTransform={{
                width: s(args.compact ? 56 : 64),
                height: "100%",
                flexShrink: 0,
              }}
              uiText={{
                value: `${WON_BY_PREFIX} `,
                fontSize: metaFont,
                color: color.textMuted,
                textAlign: "middle-left",
                textWrap: "nowrap",
              }}
            />
            <UiEntity
              uiTransform={{ flexGrow: 1, minWidth: 0, height: "100%" }}
              uiText={{
                value: winnerLabel!,
                fontSize: metaFont,
                color: color.textSecondary,
                textAlign: "middle-left",
                textWrap: "nowrap",
              }}
            />
          </UiEntity>
        ) : null}
      </UiEntity>
      {explorerUrl ? (
        <UiEntity uiTransform={{ flexShrink: 0, margin: { right: spacing.md } }}>
          <RmButton
            label={EXPLORER_LABEL}
            variant="secondary"
            size={args.compact ? "touch" : "sm"}
            onClick={() => args.onOpenExplorer?.(explorerUrl)}
          />
        </UiEntity>
      ) : null}
    </UiEntity>
  );
}

function TimezoneControls(args: {
  party: PartyPanelModel;
  viewerZone: string;
  compact: boolean;
  onToggle?: () => void;
  onSelect?: (timeZone: string) => void;
}) {
  return (
    <UiEntity uiTransform={{ width: "100%", flexDirection: "column", flexShrink: 0 }}>
      <UiEntity
        uiTransform={{
          width: "100%",
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "wrap",
          margin: { bottom: spacing.xs },
        }}
      >
        <UiEntity
          uiTransform={{
            flexShrink: 1,
            margin: { right: args.compact ? spacing.md : spacing.sm },
          }}
          uiText={{
            value: viewerTimeLabel(args.party.nowMs, args.viewerZone),
            fontSize: font.caption,
            color: color.textMuted,
            textAlign: "middle-left",
          }}
        />
        <UiEntity uiTransform={{ flexShrink: 0, margin: { left: args.compact ? spacing.md : 0 } }}>
          <RmButton
            label={CHANGE_TIMEZONE_LABEL}
            variant="secondary"
            size={args.compact ? "touch" : "sm"}
            onClick={() => args.onToggle?.()}
          />
        </UiEntity>
      </UiEntity>
      {args.party.timezonePickerOpen ? (
        <UiEntity
          uiTransform={{
            width: "100%",
            flexDirection: "row",
            flexWrap: "wrap",
            margin: { bottom: spacing.xs },
          }}
        >
          {DISPLAY_ZONE_OPTIONS.map((zone) => (
            <RmChip
              compact
              dense
              label={zone.label.toUpperCase()}
              active={
                zone.id === "device"
                  ? !args.party.viewerTimeZoneIsOverride
                  : args.party.viewerTimeZoneIsOverride && zone.id === args.viewerZone
              }
              onClick={() => args.onSelect?.(zone.id)}
            />
          ))}
        </UiEntity>
      ) : null}
    </UiEntity>
  );
}

function MineHostedList(args: {
  hosted: ScheduledPartyView[];
  pots: Record<string, PartyPotSummary>;
  leftoverGroups: HostLeftoverGroup[];
  nowMs: number;
  compact: boolean;
  viewerTimeZone: string;
  onManage: (partyId: string) => void;
  onViewPrizes?: (partyId: string) => void;
}) {
  const upcoming = args.hosted.filter((row) => !isPastHostedParty(row.status));
  const past = args.hosted.filter((row) => isPastHostedParty(row.status));
  const card = (row: ScheduledPartyView) => {
    const pot = args.pots[row.partyId];
    return (
      <PartyCard
        row={row}
        nowMs={args.nowMs}
        compact={args.compact}
        viewerTimeZone={args.viewerTimeZone}
        extra={hostedCardExtraMeta(row, pot, leftoverGroupForParty(args.leftoverGroups, row.partyId))}
        actionLabel="MANAGE"
        onAction={() => args.onManage(row.partyId)}
        onViewPrizes={() => args.onViewPrizes?.(row.partyId)}
      />
    );
  };
  return (
    <UiEntity uiTransform={{ width: "100%", flexDirection: "column" }}>
      {upcoming.length > 0 && past.length > 0
        ? PreviewLine({
            value: MY_PARTIES_UPCOMING_HEADING,
            fontSize: font.caption,
            color: color.textMuted,
            height: s(18),
          })
        : null}
      {upcoming.map(card)}
      {past.length > 0
        ? PreviewLine({
            value: MY_PARTIES_COMPLETED_HEADING,
            fontSize: font.caption,
            color: color.textMuted,
            height: s(18),
          })
        : null}
      {past.map(card)}
    </UiEntity>
  );
}

function PartyCard(args: {
  row: ScheduledPartyView;
  nowMs: number;
  extra?: string;
  actionLabel?: string;
  onAction?: () => void;
  showBrowseType?: boolean;
  viewerTimeZone?: string;
  onViewPrizes?: () => void;
  compact?: boolean;
}) {
  const title = upcomingDisplayTitle(args.row);
  const desc = upcomingDisplayDescription(args.row);
  const zone = args.viewerTimeZone || detectLocalTimeZone();
  const when = formatPartyWhen(args.row.scheduledAt, zone, args.nowMs);
  const countdown = formatCompactCountdown(args.row.scheduledAt, args.nowMs, args.row.status);
  const host = hostCardLabel(args.row);
  const browse = Boolean(args.showBrowseType);
  const listChip = browse ? undefined : myPartiesStatusChip(args.row.status);
  const copyWidth = args.compact ? 320 : 360;
  const titleFont = args.compact ? font.body : font.subtitle;
  const titleDesign = args.compact ? 13 : 14;
  const titleH = browse
    ? 20
    : Math.max(args.compact ? 22 : 24, measureWrappedTextHeight(title, titleDesign, copyWidth));
  const descFont = browse ? font.micro : args.compact ? font.caption : font.body;
  const descDesign = args.compact ? 11 : 13;
  const descH = browse ? 14 : measureWrappedTextHeight(desc, descDesign, copyWidth);
  const whenLine = [isAutomaticBrowseParty(args.row) ? undefined : host, when, countdown]
    .filter((part) => part && part.length > 0)
    .join(" · ");
  const extraLine = args.extra?.trim() ?? "";
  const whenH = browse ? 28 : Math.max(18, measureWrappedTextHeight(whenLine, 11, copyWidth));
  const extraH = extraLine.length > 0 ? Math.max(16, measureWrappedTextHeight(extraLine, 10, copyWidth)) : 0;
  const textH = titleH + descH + whenH + extraH;
  return (
    <UiEntity
      uiTransform={{
        width: "100%",
        minHeight: s(browse ? 48 : args.compact ? 72 : 96),
        flexShrink: 0,
        margin: { bottom: spacing.xs },
        padding: { left: spacing.sm, right: spacing.sm, top: spacing.sm, bottom: spacing.sm },
        borderRadius: args.compact ? radius.sm : radius.md,
        flexDirection: "row",
        alignItems: "flex-start",
      }}
      uiBackground={{ color: color.surfaceSoft }}
    >
      <UiEntity uiTransform={{ flexDirection: "column", flexGrow: 1, margin: { right: spacing.xs }, minWidth: 0 }}>
        <TitleWithTypeChip
          title={title}
          fontSize={browse ? font.subtitle : titleFont}
          height={titleH}
          color={color.textPrimary}
          textAlign={browse ? "middle-left" : "top-left"}
          kind={browse ? browseTypeLabel(args.row) : undefined}
          wrap={!browse}
        />
        <UiEntity
          uiTransform={{ width: "100%", height: s(descH), flexShrink: 0 }}
          uiText={{
            value: desc,
            fontSize: descFont,
            color: color.textSecondary,
            textAlign: browse ? "middle-left" : "top-left",
            textWrap: "wrap",
          }}
        />
        <UiEntity
          uiTransform={{ width: "100%", height: s(whenH), flexShrink: 0 }}
          uiText={{
            value: whenLine,
            fontSize: font.caption,
            color: browse ? color.textPrimary : color.textMuted,
            textAlign: "top-left",
            textWrap: "nowrap",
          }}
        />
        {extraLine.length > 0 ? (
          <UiEntity
            uiTransform={{ width: "100%", height: s(extraH), flexShrink: 0 }}
            uiText={{
              value: extraLine,
              fontSize: font.micro,
              color: color.textMuted,
              textAlign: "top-left",
              textWrap: "wrap",
            }}
          />
        ) : null}
      </UiEntity>
      <UiEntity
        uiTransform={{
          flexDirection: "column",
          alignItems: "flex-end",
          justifyContent: browse ? "center" : "flex-start",
          flexShrink: 0,
          height: browse ? s(textH) : undefined,
          margin: listChip ? { top: spacing.sm } : undefined,
        }}
      >
        {listChip ? StatusBadge(listChip) : null}
        {args.onViewPrizes ? (
          <UiEntity uiTransform={{ margin: { top: listChip ? spacing.xs : 0 } }}>
            <RmButton
              label={VIEW_PRIZES_LABEL}
              variant="primary"
              size={args.compact ? "touch" : "sm"}
              width={args.compact ? s(MY_PARTIES_ACTION_BUTTON_WIDTH_COMPACT) : s(MY_PARTIES_ACTION_BUTTON_WIDTH)}
              onClick={args.onViewPrizes}
            />
          </UiEntity>
        ) : null}
        {args.actionLabel && args.onAction ? (
          <UiEntity uiTransform={{ margin: { top: spacing.xs } }}>
            <RmButton
              label={args.actionLabel}
              variant="primary"
              size={args.compact ? "touch" : "sm"}
              width={args.compact ? s(MY_PARTIES_ACTION_BUTTON_WIDTH_COMPACT) : s(MY_PARTIES_ACTION_BUTTON_WIDTH)}
              onClick={args.onAction}
            />
          </UiEntity>
        ) : null}
      </UiEntity>
    </UiEntity>
  );
}

function HeroCard(args: {
  row: ScheduledPartyView;
  nowMs: number;
  viewerTimeZone: string;
  onViewPrizes?: () => void;
  onContribute?: () => void;
  compact?: boolean;
}) {
  const zone = args.viewerTimeZone;
  const title = upcomingDisplayTitle(args.row);
  const desc = upcomingDisplayDescription(args.row);
  const when = formatPartyWhen(args.row.scheduledAt, zone, args.nowMs);
  const host = hostCardLabel(args.row);
  const whenLine = [isAutomaticBrowseParty(args.row) ? undefined : host, when]
    .filter((part) => part && part.length > 0)
    .join(" · ");
  const countdown = formatHeroCountdown(args.row.scheduledAt, args.nowMs, args.row.status);
  const lockCopy = formatLineupLockCopy(args.row.lineupLocksAt, args.nowMs, args.row.isLineupLocked);
  const statusChip = operationalStatusChip(args.row.status);
  const op = statusChip === "COMPLETED" ? undefined : statusChip;
  const heroMin = args.compact ? s(150) : s(168);
  const innerMin = args.compact ? s(146) : s(164);
  return (
    <UiEntity
      uiTransform={{
        width: "100%",
        minHeight: heroMin,
        flexShrink: 0,
        margin: { bottom: args.compact ? spacing.xs : spacing.sm },
        padding: 2,
        borderRadius: radius.md,
      }}
      uiBackground={{ color: color.accent }}
    >
      <UiEntity
        uiTransform={{
          width: "100%",
          minHeight: innerMin,
          padding: {
            left: spacing.sm,
            right: spacing.sm,
            top: args.compact ? spacing.xs : spacing.sm,
            bottom: args.compact ? spacing.xs : spacing.sm,
          },
          borderRadius: radius.md,
          flexDirection: "column",
        }}
        uiBackground={{ color: color.surface }}
      >
        <UiEntity uiTransform={{ width: "100%", flexDirection: "row", justifyContent: "space-between", flexShrink: 0 }}>
          <UiEntity uiTransform={{ flexGrow: 1, flexDirection: "column", margin: { right: spacing.xs }, minWidth: 0 }}>
            {TypeChip(NEXT_PARTY_CHIP)}
            <TitleWithTypeChip
              title={title}
              fontSize={font.subtitle}
              height={args.compact ? 22 : 24}
              color={color.textPrimary}
              textAlign={HERO_TITLE_ALIGN}
              kind={browseTypeLabel(args.row)}
            />
            {args.compact ? null : (
              <UiEntity
                uiTransform={{ width: "100%", height: s(14), flexShrink: 0 }}
                uiText={{
                  value: desc,
                  fontSize: font.micro,
                  color: color.textSecondary,
                  textAlign: "middle-left",
                }}
              />
            )}
            <UiEntity
              uiTransform={{ width: "100%", height: s(16), flexShrink: 0 }}
              uiText={{
                value: whenLine,
                fontSize: font.caption,
                color: color.textPrimary,
                textAlign: HERO_WHEN_ALIGN,
              }}
            />
          </UiEntity>
          <UiEntity uiTransform={{ flexDirection: "column", alignItems: "flex-end", justifyContent: "center", flexShrink: 0 }}>
            {args.onViewPrizes ? ViewPrizesChip(args.onViewPrizes, Boolean(args.compact)) : null}
            {args.onContribute ? (
              <UiEntity uiTransform={{ margin: { top: spacing.xs } }}>
                <RmButton
                  label="CONTRIBUTE"
                  variant="secondary"
                  size={args.compact ? "touch" : "sm"}
                  onClick={args.onContribute}
                />
              </UiEntity>
            ) : null}
            {op ? (
              <UiEntity uiTransform={{ margin: { top: spacing.xs } }}>
                {StatusBadge(op)}
              </UiEntity>
            ) : null}
          </UiEntity>
        </UiEntity>
        <UiEntity
          uiTransform={{
            width: "100%",
            flexDirection: "column",
            alignItems: "center",
            margin: { top: spacing.xs },
            flexShrink: 0,
          }}
        >
          {countdown !== "LIVE" && countdown !== "STARTING NOW" ? (
            <UiEntity
              uiTransform={{ width: "100%", height: s(14), flexShrink: 0 }}
              uiText={{
                value: "STARTS IN",
                fontSize: font.nano,
                color: color.textMuted,
                textAlign: HERO_STACK_ALIGN,
              }}
            />
          ) : null}
          <UiEntity
            uiTransform={{ width: "100%", height: args.compact ? s(28) : s(32), flexShrink: 0 }}
            uiText={{
              value: countdown,
              fontSize: args.compact ? s(22) : font.display,
              color: color.accent,
              textAlign: HERO_STACK_ALIGN,
            }}
          />
          {lockCopy ? (
            <UiEntity
              uiTransform={{ width: "100%", height: s(14), flexShrink: 0 }}
              uiText={{
                value: lockCopy,
                fontSize: font.nano,
                color: color.textMuted,
                textAlign: HERO_STACK_ALIGN,
              }}
            />
          ) : null}
        </UiEntity>
      </UiEntity>
    </UiEntity>
  );
}

function ManaPrizeBanner(args: { label: string; caption?: string; compact?: boolean }) {
  const amount = manaPrizeAmountText(args.label);
  const line = [amount ? `${amount} ${MANA_PRIZE_CHIP}` : args.label, args.caption]
    .filter((part) => part && part.length > 0)
    .join(" · ");
  return PreviewLine({
    value: line,
    fontSize: args.compact ? font.title : font.subtitle,
    color: color.success,
    height: args.compact ? s(28) : s(24),
  });
}

function prizeSourceColor(source: "COMMUNITY" | "EXTRA_POOL" | "HOST") {
  if (source === "EXTRA_POOL") return color.warning;
  if (source === "HOST") return color.accent;
  return color.info;
}

function PrizeTile(card: PrizePreviewCard & { qty?: number }, compact?: boolean) {
  const titleHeight = compact ? s(14) : s(12);
  const metaHeight = s(12);
  const qty = prizePreviewQtyLabel(card.qty ?? 1);
  return (
    <UiEntity
      uiTransform={{
        width: "24%",
        minHeight: compact ? s(82) : s(76),
        margin: { right: "1%", bottom: compact ? 2 : spacing.xs },
        padding: { top: spacing.xs, bottom: spacing.xs, left: 2, right: 2 },
        borderRadius: radius.sm,
        flexDirection: "column",
        alignItems: "center",
        positionType: "relative",
      }}
      uiBackground={{ color: color.bgElevated }}
    >
      {qty ? (
        <UiEntity
          uiTransform={{
            positionType: "absolute",
            position: { top: 1, right: 2 },
            width: s(22),
            height: s(12),
          }}
          uiText={{
            value: qty,
            fontSize: font.nano,
            color: color.textMuted,
            textAlign: "top-right",
            textWrap: "nowrap",
          }}
        />
      ) : null}
      <ItemThumbnailBox
        kind={card.kind === "emote" ? "emote" : "wearable"}
        thumbnailUrl={card.prizeType === "MANA" ? MANA_TOKEN_ICON_SRC : card.imageUrl}
        size={compact ? 48 : 36}
      />
      <UiEntity
        uiTransform={{ width: "100%", height: titleHeight, flexShrink: 0, margin: { top: 1 } }}
        uiText={{
          value: card.displayName,
          fontSize: compact ? font.caption : font.nano,
          color: color.textPrimary,
          textAlign: "middle-center",
          textWrap: "nowrap",
        }}
      />
      <UiEntity
        uiTransform={{ width: "100%", height: metaHeight, flexShrink: 0 }}
        uiText={{
          value: (card.rarity || card.prizeType).toUpperCase(),
          fontSize: font.nano,
          color: rgbaForRarityLabel(card.rarity || "unknown"),
          textAlign: "middle-center",
          textWrap: "nowrap",
        }}
      />
      {card.source ? (
        <UiEntity
          uiTransform={{ width: "100%", height: metaHeight, flexShrink: 0 }}
          uiText={{
            value: prizeSourceChip(card.source),
            fontSize: font.nano,
            color: prizeSourceColor(card.source),
            textAlign: "middle-center",
            textWrap: "nowrap",
          }}
        />
      ) : null}
    </UiEntity>
  );
}

function LeftoverAssetLines(args: {
  group: HostLeftoverGroup;
  selectable?: boolean;
  selectedPrizeIds?: string[];
  manaSelected?: boolean;
  compact: boolean;
  onTogglePrize?: (prizeId: string) => void;
  onToggleMana?: () => void;
}) {
  const mana = leftoverManaLabel(args.group.manaBaseUnits);
  return (
    <UiEntity uiTransform={{ width: "100%", flexDirection: "column" }}>
      {mana ? (
        <UiEntity uiTransform={{ width: "100%" }} onMouseDown={args.selectable ? args.onToggleMana : undefined}>
          {PreviewLine({
            value: args.selectable ? `${args.manaSelected ? "✓ " : ""}${mana}` : mana.replace(" available", ""),
            fontSize: args.compact ? font.caption : font.body,
            color: args.manaSelected || !args.selectable ? color.accent : color.textPrimary,
            height: s(22),
            textAlign: "middle-left",
          })}
        </UiEntity>
      ) : null}
      {args.group.nftPrizes.map((prize) => {
        const selected = args.selectedPrizeIds?.includes(prize.prizeId);
        return (
          <UiEntity
            uiTransform={{ width: "100%" }}
            onMouseDown={args.selectable ? () => args.onTogglePrize?.(prize.prizeId) : undefined}
          >
            {PreviewLine({
              value: args.selectable ? `${selected ? "✓ " : ""}${leftoverNftLine(prize)}` : leftoverNftLine(prize),
              fontSize: args.compact ? font.caption : font.body,
              color: selected || !args.selectable ? color.textPrimary : color.textMuted,
              height: s(22),
              textAlign: "middle-left",
            })}
          </UiEntity>
        );
      })}
    </UiEntity>
  );
}

function PreviewLine(args: {
  value: string;
  fontSize: number;
  color: typeof color.textPrimary;
  height: number;
  textAlign?: "middle-center" | "middle-left";
}) {
  return (
    <UiEntity
      uiTransform={{ width: "100%", height: args.height, flexShrink: 0 }}
      uiText={{
        value: args.value,
        fontSize: args.fontSize,
        color: args.color,
        textAlign: args.textAlign ?? "middle-center",
        textWrap: "wrap",
      }}
    />
  );
}

function PrizeSection(args: {
  title: string;
  empty?: string;
  section?: { total: number; hasMore?: boolean; prizes: PrizePreviewCard[] };
  mana?: string;
  manaCaption?: string;
  onMore?: () => void;
  sublabel?: string;
  sublabelParts?: { text: string; color: typeof color.textPrimary }[];
  compact?: boolean;
  fill?: boolean;
}) {
  const prizes = stackPrizePreviewCards(args.section?.prizes ?? []);
  const mana = args.mana ?? "";
  const needsScroll = prizePreviewNeedsScroll(prizes.length);
  return (
    <UiEntity
      uiTransform={{
        width: "100%",
        flexGrow: args.fill ? 1 : 0,
        minHeight: 0,
        flexDirection: "column",
        alignItems: "center",
        margin: { bottom: spacing.xs },
        flexShrink: args.fill ? 1 : 0,
      }}
    >
      {PreviewLine({ value: args.title, fontSize: font.caption, color: color.textPrimary, height: s(18) })}
      {args.sublabelParts && args.sublabelParts.length > 0 ? (
        <UiEntity
          uiTransform={{
            width: "100%",
            height: s(16),
            flexShrink: 0,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {args.sublabelParts.map((part) => (
            <UiEntity
              uiTransform={{ height: s(16), flexShrink: 0 }}
              uiText={{
                value: part.text,
                fontSize: font.nano,
                color: part.color,
                textAlign: "middle-center",
                textWrap: "nowrap",
              }}
            />
          ))}
        </UiEntity>
      ) : args.sublabel
        ? PreviewLine({ value: args.sublabel, fontSize: font.nano, color: color.textMuted, height: s(16) })
        : null}
      {mana ? ManaPrizeBanner({ label: mana, caption: args.manaCaption, compact: args.compact }) : null}
      <UiEntity
        uiTransform={{
          width: "100%",
          flexGrow: 1,
          minHeight: 0,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          overflow: needsScroll ? "scroll" : undefined,
        }}
      >
        {prizes.length === 0 && !mana ? (
          args.empty
            ? PreviewLine({ value: args.empty, fontSize: font.micro, color: color.textMuted, height: s(16) })
            : null
        ) : prizes.length === 0 ? null : (
          <UiEntity uiTransform={{ width: "100%", flexDirection: "row", flexWrap: "wrap", margin: { top: spacing.xs } }}>
            {prizes.map((card) => PrizeTile(card, args.compact))}
          </UiEntity>
        )}
        {args.section?.hasMore && args.onMore ? (
          <UiEntity uiTransform={{ height: s(28), margin: { top: spacing.xs }, flexShrink: 0 }}>
            <RmButton label="MORE" variant="secondary" size={args.compact ? "touch" : "sm"} onClick={args.onMore} />
          </UiEntity>
        ) : null}
      </UiEntity>
    </UiEntity>
  );
}

function PrizePreviewBody(
  preview: PartyPrizePreview,
  onPage?: (section: "community" | "extra", delta: number) => void,
  compact?: boolean,
  fill = true,
) {
  const possible = preview.possible;
  const confirmedMana = formatManaAmount(preview.confirmed.manaBaseUnits);
  const communityTotal = possible?.community.total ?? 0;
  const extraTotal = possible?.extraPool?.total ?? 0;
  const possibleTotal = communityTotal + extraTotal;
  const possibleEmpty = possibleTotal === 0;
  const mixedSources = communityTotal > 0 && extraTotal > 0;
  return (
    <UiEntity uiTransform={{ width: "100%", flexGrow: fill ? 1 : 0, minHeight: fill ? 0 : undefined, flexDirection: "column" }}>
      {PrizeSection({
        title: confirmedHeading(preview.confirmed.total),
        empty:
          preview.confirmed.total === 0
            ? preview.partyType === "AUTOMATIC"
              ? CONFIRMED_EMPTY_AUTOMATIC
              : CONFIRMED_EMPTY_HOSTED
            : undefined,
        section: preview.confirmed,
        mana: confirmedMana,
        manaCaption: "HOST",
        compact,
        fill,
      })}
      {possible && possible.mode === "possible" ? (
        PrizeSection({
          title: possibleCountHeading(possibleTotal),
          empty: possibleEmpty ? POSSIBLE_EMPTY : undefined,
          section: possibleEmpty
            ? { total: 0, prizes: [] }
            : {
                total: possibleTotal,
                hasMore: possible.community.hasMore || Boolean(possible.extraPool?.hasMore),
                prizes: [...possible.community.prizes, ...(possible.extraPool?.prizes ?? [])],
              },
          mana: formatManaAmount(possible.manaBaseUnits),
          manaCaption: "POSSIBLE",
          sublabelParts: mixedSources
            ? mixedPossibleSourceParts(communityTotal, extraTotal).map((part) => ({
                text: part.text,
                color:
                  part.kind === "community" ? color.info : part.kind === "extra" ? color.warning : color.textMuted,
              }))
            : undefined,
          compact,
          fill: true,
          onMore: possible.community.hasMore
            ? () => onPage?.("community", 1)
            : possible.extraPool?.hasMore
              ? () => onPage?.("extra", 1)
              : undefined,
        })
      ) : null}
      {possible && possible.mode === "other_pool" && !possibleEmpty
        ? PrizeSection({
            title: possiblePrizesHeading("other_pool"),
            section: possible.community,
            mana: formatManaAmount(possible.manaBaseUnits),
            compact,
            fill: true,
            onMore: possible.community.hasMore ? () => onPage?.("community", 1) : undefined,
          })
        : null}
    </UiEntity>
  );
}

export function PartyDashboard(props: {
  party: PartyPanelModel;
  actions: PartyUiActions;
  layout?: ChestUiMetrics;
}) {
  const { party, actions } = props;
  const layoutMetrics = props.layout ?? chestUiMetrics();
  const compact = layoutMetrics.compact;
  const descMax = party.config?.descriptionMaxLength ?? PARTY_DESCRIPTION_MAX_LENGTH;
  const titleMax = PARTY_TITLE_MAX_LENGTH;
  const lockMinutes = party.config?.rescheduleLockMinutes ?? 60;
  const timeLocked = isEditTimeLocked(party);
  const tabs: ManagePartyTab[] = ["details", "prizes", "settings"];

  const board = selectUpcomingEventBoard(party.parties);
  const hero = party.open === "upcoming" ? board[0] : undefined;
  const rest = party.open === "upcoming" ? board.slice(1) : [];
  const viewerZone = party.viewerTimeZone || "America/Los_Angeles";
  const listHeight = partyDashboardListHeight(layoutMetrics);
  const goBack = () => {
    if (party.open === "prizes" && actions.onClosePrizePreview) {
      actions.onClosePrizePreview();
      return;
    }
    if (actions.onBackToChest) actions.onBackToChest();
    else actions.onCloseParties?.();
  };

  const prizePreviewMetrics = partyHeaderMetrics(compact, layoutMetrics.contentWidth);

  return (
    <RmCard
      title={party.open === "mine" || party.open === "prizes" ? undefined : heading(party.open)}
      fill
      plain
      compact={compact}
      onBack={party.open === "mine" || party.open === "prizes" ? undefined : goBack}
    >
      {party.open === "mine" ? (
        <MyPartiesHeader
          compact={compact}
          contentWidth={layoutMetrics.contentWidth}
          onBack={goBack}
          onCreate={() => actions.onOpenCreate?.()}
        />
      ) : null}
      {party.open === "prizes" ? (
        <PartyPanelHeader
          compact={compact}
          contentWidth={layoutMetrics.contentWidth}
          title={PRIZE_PREVIEW_HEADING}
          onBack={goBack}
          action={
            party.selected && canShowDepositPrizesPreview(party.selected) ? (
              <RmButton
                label={DEPOSIT_PRIZES_LABEL}
                variant="primary"
                size={createPartyActionButtonSize(compact)}
                width={s(prizePreviewMetrics.action)}
                onClick={() => actions.onContribute?.(party.selected!.partyId, party.selected!.title)}
              />
            ) : undefined
          }
        />
      ) : null}
      {(PARTY_PANELS_WITH_TIMEZONE_CHROME as readonly string[]).includes(party.open) ? (
        <TimezoneControls
          party={party}
          viewerZone={viewerZone}
          compact={compact}
          onToggle={actions.onToggleTimezonePicker}
          onSelect={actions.onSelectDisplayTimeZone}
        />
      ) : null}
      {party.open === "upcoming" ? (
        <UiEntity
          uiTransform={{
            width: "100%",
            flexGrow: 1,
            minHeight: 0,
            height: compact ? s(listHeight) : undefined,
            flexDirection: "column",
            overflow: compact || upcomingNeedsScroll(board.length, compact) ? "scroll" : undefined,
          }}
        >
          {hero ? (
            <HeroCard
              row={hero}
              nowMs={party.nowMs}
              viewerTimeZone={viewerZone}
              compact={compact}
              onViewPrizes={() => actions.onViewPrizes?.(hero.partyId)}
              onContribute={
                canShowContribute(hero) ? () => actions.onContribute?.(hero.partyId, hero.title) : undefined
              }
            />
          ) : null}
          {rest.map((row) => (
            <PartyCard
              row={row}
              nowMs={party.nowMs}
              showBrowseType
              compact={compact}
              viewerTimeZone={viewerZone}
              onViewPrizes={() => actions.onViewPrizes?.(row.partyId)}
              actionLabel={canShowContribute(row) ? "CONTRIBUTE" : undefined}
              onAction={canShowContribute(row) ? () => actions.onContribute?.(row.partyId, row.title) : undefined}
            />
          ))}
        </UiEntity>
      ) : null}

      {party.open === "wins" ? (
        <UiEntity
          uiTransform={{
            width: "100%",
            flexGrow: 1,
            minHeight: 0,
            height: compact ? s(listHeight) : undefined,
            flexDirection: "column",
            overflow: compact || myWinsNeedsScroll(party.wins.length) ? "scroll" : undefined,
          }}
        >
          {party.winsLoading
            ? PreviewLine({
                value: "Loading wins…",
                fontSize: compact ? MY_WINS_TITLE_FONT_COMPACT : MY_WINS_TITLE_FONT,
                color: color.textMuted,
                height: s(28),
              })
            : party.wins.length === 0
              ? PreviewLine({
                  value: "No wins yet.",
                  fontSize: compact ? MY_WINS_TITLE_FONT_COMPACT : MY_WINS_TITLE_FONT,
                  color: color.textMuted,
                  height: s(28),
                })
              : party.wins.map((win) => (
                  <WinRow
                    win={win}
                    nowMs={party.nowMs}
                    viewerTimeZone={viewerZone}
                    compact={compact}
                    showHistory
                    onOpenExplorer={actions.onOpenExplorer}
                  />
                ))}
        </UiEntity>
      ) : null}

      {party.open === "prizes" ? (
        <UiEntity
          uiTransform={{
            width: "100%",
            flexGrow: 1,
            minHeight: 0,
            flexDirection: "column",
          }}
        >
          {party.selected ? (
            <UiEntity
              uiTransform={{
                width: "100%",
                flexDirection: "column",
                alignItems: "flex-start",
                margin: { bottom: compact ? spacing.xs : spacing.sm },
                flexShrink: 0,
              }}
            >
              {PreviewLine({
                value: upcomingDisplayTitle(party.selected),
                fontSize: compact ? layoutMetrics.bodyFont : font.body,
                color: color.textPrimary,
                height: compact ? s(18) : s(22),
                textAlign: "middle-left",
              })}
              {PreviewLine({
                value: formatPartyWhen(party.selected.scheduledAt, viewerZone, party.nowMs),
                fontSize: compact ? layoutMetrics.captionFont : font.caption,
                color: color.textPrimary,
                height: compact ? s(16) : s(18),
                textAlign: "middle-left",
              })}
              {PreviewLine({
                value: formatCompactCountdown(party.selected.scheduledAt, party.nowMs, party.selected.status),
                fontSize: compact ? layoutMetrics.microFont : font.micro,
                color: color.accent,
                height: compact ? s(14) : s(16),
                textAlign: "middle-left",
              })}
            </UiEntity>
          ) : null}
          {party.prizePreviewLoading
            ? PreviewLine({
                value: "Loading prizes…",
                fontSize: font.caption,
                color: color.textMuted,
                height: s(18),
              })
            : party.prizePreview
              ? PrizePreviewBody(party.prizePreview, actions.onPrizePreviewPage, compact)
              : PreviewLine({
                  value: "Prize preview unavailable.",
                  fontSize: font.caption,
                  color: color.warning,
                  height: s(18),
                })}
          {party.prizePreview?.possible?.mode === "possible" ? (
            <UiEntity
              uiTransform={{
                width: "100%",
                flexDirection: "column",
                margin: { top: spacing.xs },
                flexShrink: 0,
              }}
            >
              {POSSIBLE_FOOTER.split("\n").map((line) =>
                PreviewLine({ value: line, fontSize: font.nano, color: color.textMuted, height: s(14) }),
              )}
            </UiEntity>
          ) : null}
        </UiEntity>
      ) : null}

      {party.open === "mine" ? (
        <UiEntity
          uiTransform={{
            width: "100%",
            flexGrow: 1,
            minHeight: 0,
            height: s(listHeight),
            flexDirection: "column",
            overflow: myPartiesNeedsScroll(party.hosted.length, compact) ? "scroll" : undefined,
          }}
        >
          {party.hosted.length === 0
            ? PreviewLine({
                value: MY_PARTIES_EMPTY,
                fontSize: compact ? font.body : font.subtitle,
                color: color.textMuted,
                height: s(24),
              })
            : MineHostedList({
                hosted: party.hosted,
                pots: party.pots,
                leftoverGroups: party.leftoverGroups,
                nowMs: party.nowMs,
                compact,
                viewerTimeZone: viewerZone,
                onManage: (partyId) => actions.onManageParty?.(partyId),
                onViewPrizes: (partyId) => actions.onViewPrizes?.(partyId),
              })}
        </UiEntity>
      ) : null}

      {party.open === "manage" && party.selected ? (
        <UiEntity uiTransform={{ width: "100%", flexDirection: "column", flexGrow: 1, minHeight: 0 }}>
          <UiEntity
            uiTransform={{
              width: "100%",
              flexDirection: "row",
              flexWrap: "wrap",
              margin: { bottom: spacing.xs },
              flexShrink: 0,
            }}
          >
            {tabs.map((tab) => (
              <RmChip
                size="tab"
                label={tab.toUpperCase()}
                active={party.manageTab === tab}
                onClick={() => actions.onManageTab?.(tab)}
              />
            ))}
          </UiEntity>
          <UiEntity
            uiTransform={{
              width: "100%",
              flexGrow: 1,
              minHeight: 0,
              flexDirection: "column",
              overflow:
                party.manageTab === "prizes" ||
                manageTabNeedsScroll(party.manageTab, party.selected.description)
                  ? "scroll"
                  : undefined,
            }}
          >
            {party.manageTab === "details" ? (
              <UiEntity uiTransform={{ flexDirection: "column", width: "100%" }}>
                <UiEntity
                  uiText={{
                    value: party.selected.title,
                    fontSize: compact ? font.body : font.subtitle,
                    color: color.textPrimary,
                    textAlign: "middle-left",
                  }}
                />
                <UiEntity
                  uiText={{
                    value: party.selected.description || "No description",
                    fontSize: compact ? font.caption : font.body,
                    color: color.textSecondary,
                    textAlign: "middle-left",
                  }}
                />
                <UiEntity
                  uiText={{
                    value: formatPartyWhen(party.selected.scheduledAt, viewerZone, party.nowMs),
                    fontSize: compact ? font.caption : font.body,
                    color: color.textPrimary,
                    textAlign: "middle-left",
                  }}
                />
                <UiEntity
                  uiText={{
                    value: formatRelativeCountdown(party.selected.scheduledAt, party.nowMs, party.selected.status),
                    fontSize: compact ? font.caption : font.body,
                    color: color.accent,
                    textAlign: "middle-left",
                  }}
                />
                <UiEntity
                  uiText={{
                    value: `Status  ${party.selected.status}`,
                    fontSize: font.caption,
                    color: color.textMuted,
                    textAlign: "middle-left",
                  }}
                />
              </UiEntity>
            ) : null}
            {party.manageTab === "prizes" ? (
              <UiEntity uiTransform={{ flexDirection: "column", width: "100%" }}>
                {isPastHostedParty(party.selected.status) ? (
                  leftoverGroupHasAssets(leftoverGroupForParty(party.leftoverGroups, party.selected.partyId)) ? (
                  <UiEntity uiTransform={{ width: "100%", flexDirection: "column", margin: { bottom: spacing.sm } }}>
                    {PreviewLine({
                      value: "LEFTOVERS",
                      fontSize: compact ? font.caption : font.body,
                      color: color.textPrimary,
                      height: s(22),
                      textAlign: "middle-left",
                    })}
                    {LeftoverAssetLines({
                      group: leftoverGroupForParty(party.leftoverGroups, party.selected.partyId)!,
                      compact,
                    })}
                  </UiEntity>
                  ) : null
                ) : (
                  <UiEntity
                    uiTransform={{ width: "100%", minHeight: s(22), margin: { bottom: spacing.sm }, flexShrink: 0 }}
                    uiText={{
                      value: party.pot
                        ? hostedManagePrizeCountsCopy(party.selected, party.pot)
                        : "Prize counts loading…",
                      fontSize: compact ? font.caption : font.body,
                      color: color.textPrimary,
                      textAlign: "middle-left",
                    }}
                  />
                )}
                {!managePrizesShowConfirmedPreview(party.selected.status) && party.manageHistoryLoading
                  ? PreviewLine({
                      value: "Loading prize history…",
                      fontSize: compact ? font.caption : font.body,
                      color: color.textMuted,
                      height: s(22),
                    })
                  : party.manageHistory.length > 0
                    ? party.manageHistory.map((win) => (
                        <ManagePrizeRow
                          win={win}
                          compact={compact}
                          onOpenMarketplace={actions.onOpenMarketplace}
                          onOpenExplorer={actions.onOpenExplorer}
                        />
                      ))
                    : null}
                {managePrizesShowConfirmedPreview(party.selected.status) ? (
                  party.prizePreviewLoading
                    ? PreviewLine({
                        value: "Loading prizes…",
                        fontSize: compact ? font.caption : font.body,
                        color: color.textMuted,
                        height: s(22),
                      })
                    : party.prizePreview
                      ? PrizePreviewBody(party.prizePreview, actions.onPrizePreviewPage, compact, false)
                      : (party.pot?.unclaimedItems?.length ?? 0) > 0
                        ? (
                          <UiEntity uiTransform={{ width: "100%", flexDirection: "column", margin: { top: spacing.sm }, flexShrink: 0 }}>
                            {PreviewLine({
                              value: isHostedPartyLocked(party.selected.status)
                                ? MANAGE_LIVE_PRIZES_HEADING
                                : MANAGE_POT_PRIZES_HEADING,
                              fontSize: font.micro,
                              color: color.textMuted,
                              height: s(16),
                              textAlign: "middle-left",
                            })}
                            {party.pot!.unclaimedItems!.map((line) =>
                              PreviewLine({
                                value: line,
                                fontSize: font.nano,
                                color: color.textMuted,
                                height: s(14),
                                textAlign: "middle-left",
                              }),
                            )}
                          </UiEntity>
                        )
                        : party.manageHistory.length === 0
                          ? PreviewLine({
                              value: MANAGE_NO_POT_PRIZES,
                              fontSize: compact ? font.caption : font.body,
                              color: color.textMuted,
                              height: s(22),
                            })
                          : null
                ) : (party.pot?.unclaimedItems?.length ?? 0) > 0 ? (
                  <UiEntity uiTransform={{ width: "100%", flexDirection: "column", margin: { top: spacing.sm }, flexShrink: 0 }}>
                    {PreviewLine({
                      value: MANAGE_POT_PRIZES_HEADING,
                      fontSize: font.micro,
                      color: color.textMuted,
                      height: s(16),
                      textAlign: "middle-left",
                    })}
                    {party.pot!.unclaimedItems!.map((line) =>
                      PreviewLine({
                        value: line,
                        fontSize: font.nano,
                        color: color.textMuted,
                        height: s(14),
                        textAlign: "middle-left",
                      }),
                    )}
                  </UiEntity>
                ) : party.manageHistory.length === 0 && !party.manageHistoryLoading ? (
                  PreviewLine({
                    value: MANAGE_NO_CLAIMS_YET,
                    fontSize: compact ? font.caption : font.body,
                    color: color.textMuted,
                    height: s(22),
                  })
                ) : null}
              </UiEntity>
            ) : null}
            {party.manageTab === "settings" ? (
              canHostEditParty(party.selected) ? (
                <UiEntity uiTransform={{ flexDirection: "column", width: "100%" }}>
                  <UiEntity
                    uiTransform={{
                      flexDirection: "row",
                      width: "100%",
                      margin: { top: compact ? spacing.sm : spacing.md },
                      flexShrink: 0,
                      alignItems: "flex-start",
                    }}
                  >
                    <RmToggle
                      label={
                        party.selected.allowCommunityContributions
                          ? "COMMUNITY CONTRIBUTIONS ON"
                          : "COMMUNITY CONTRIBUTIONS OFF"
                      }
                      value={party.selected.allowCommunityContributions}
                      compact
                      onChange={() => actions.onToggleDraftCommunity?.()}
                    />
                    <UiEntity uiTransform={{ flexGrow: 1, flexShrink: 1, flexDirection: "column", minWidth: 0 }}>
                      <RmToggle
                        label={
                          party.selected.supplementFromExtraPool
                            ? "ADD PRIZES FROM EXTRA POOL ON"
                            : "ADD ITEMS FROM EXTRA POOL OFF"
                        }
                        value={party.selected.supplementFromExtraPool}
                        compact
                        disabled={!canTurnOnExtraPool(party, party.selected.supplementFromExtraPool)}
                        onChange={() => actions.onToggleDraftExtraPool?.()}
                      />
                      <UiEntity
                        uiTransform={{
                          width: "100%",
                          minHeight: s(28),
                          margin: { top: spacing.xs, right: spacing.xs, bottom: spacing.xs },
                          flexShrink: 0,
                        }}
                        uiText={{
                          value: extraPoolQuotaHelper(party.extraPoolQuota),
                          fontSize: font.micro,
                          color: color.textMuted,
                          textAlign: "top-right",
                          textWrap: "wrap",
                        }}
                      />
                    </UiEntity>
                  </UiEntity>
                  <UiEntity uiTransform={{ flexDirection: "column", width: "100%", margin: { top: spacing.xs } }}>
                    <RmToggle
                      label="CONTRIBUTE UNCLAIMED PRIZES TO EXTRA POOL"
                      value={(party.selected.unclaimedPrizePolicy ?? "HOST_LEFTOVERS") === "EXTRA_POOL"}
                      compact
                      onChange={() => actions.onToggleDraftUnclaimedPolicy?.()}
                    />
                    <UiEntity
                      uiTransform={{
                        width: "100%",
                        minHeight: s(32),
                        margin: { top: spacing.xs, bottom: spacing.sm },
                        flexShrink: 0,
                      }}
                      uiText={{
                        value: unclaimedPrizePolicyHelper(party.selected.unclaimedPrizePolicy ?? "HOST_LEFTOVERS"),
                        fontSize: font.micro,
                        color: color.textMuted,
                        textAlign: "top-left",
                        textWrap: "wrap",
                      }}
                    />
                  </UiEntity>
                </UiEntity>
              ) : (
                <UiEntity uiTransform={{ flexDirection: "column", width: "100%" }}>
                  <UiEntity
                    uiText={{
                      value: communityLabel(party.selected.allowCommunityContributions),
                      fontSize: compact ? font.caption : font.body,
                      color: color.textPrimary,
                      textAlign: "middle-left",
                    }}
                  />
                  <UiEntity
                    uiText={{
                      value: extraPoolLabel(party.selected.supplementFromExtraPool),
                      fontSize: compact ? font.caption : font.body,
                      color: color.textPrimary,
                      textAlign: "middle-left",
                    }}
                  />
                  <UiEntity
                    uiText={{
                      value: unclaimedPrizePolicyLabel(party.selected.unclaimedPrizePolicy ?? "HOST_LEFTOVERS"),
                      fontSize: compact ? font.caption : font.body,
                      color: color.textPrimary,
                      textAlign: "middle-left",
                    }}
                  />
                </UiEntity>
              )
            ) : null}
          </UiEntity>
        </UiEntity>
      ) : null}

      {party.open === "create" || party.open === "edit" ? (
        <UiEntity
          uiTransform={{
            width: "100%",
            flexGrow: 1,
            minHeight: 0,
            height: s(listHeight),
            flexDirection: "column",
            overflow: createPartyFormNeedsScroll(
              compact,
              party.open === "create" ? party.leftoverGroups.length : 0,
            )
              ? "scroll"
              : undefined,
          }}
        >
          <UiEntity uiTransform={{ width: "100%", margin: { top: compact ? spacing.sm : spacing.md } }}>
            <RmTextField
              placeholder={`Party name (${titleMax} max)`}
              value={party.draft.title}
              onChange={(value) => actions.onDraftTitle?.(value)}
              size={createPartyFieldSize(compact)}
              maxLength={titleMax}
            />
          </UiEntity>
          <UiEntity
            uiTransform={{ width: "100%", minHeight: s(16), margin: { bottom: spacing.xs } }}
            uiText={{
              value: descriptionCounter(party.draft.title, titleMax),
              fontSize: font.micro,
              color: color.textMuted,
              textAlign: "middle-right",
            }}
          />
          <RmTextField
            placeholder={`Description (${descMax} max)`}
            value={party.draft.description}
            onChange={(value) => actions.onDraftDescription?.(value)}
            size={createPartyFieldSize(compact)}
            maxLength={descMax}
          />
          <UiEntity
            uiTransform={{ width: "100%", minHeight: s(16), margin: { bottom: spacing.xs } }}
            uiText={{
              value: descriptionCounter(party.draft.description, descMax),
              fontSize: font.micro,
              color: color.textMuted,
              textAlign: "middle-right",
            }}
          />
          {party.open === "edit" && timeLocked ? (
            <UiEntity
              uiTransform={{
                width: "100%",
                minHeight: s(36),
                margin: { bottom: spacing.xs },
                padding: { left: spacing.xs, right: spacing.xs },
                borderRadius: radius.sm,
                justifyContent: "center",
              }}
              uiBackground={{ color: color.bgElevated }}
            >
              <UiEntity
                uiText={{
                  value: rescheduleLockMessage(lockMinutes),
                  fontSize: font.micro,
                  color: color.warning,
                  textAlign: "middle-left",
                }}
              />
            </UiEntity>
          ) : (
            <UiEntity
              uiTransform={{
                flexDirection: "row",
                width: "100%",
                alignItems: "flex-start",
                margin: { top: compact ? spacing.sm : spacing.md },
                flexShrink: 0,
              }}
            >
              <UiEntity
                uiTransform={{
                  width: "50%",
                  flexDirection: "column",
                  padding: { right: spacing.xs },
                }}
              >
                <UiEntity
                  uiTransform={{ width: "100%", minHeight: s(16) }}
                  uiText={{
                    value: "DATE",
                    fontSize: compact ? font.micro : font.caption,
                    color: color.textMuted,
                    textAlign: "middle-center",
                  }}
                />
                <RmTextField
                  placeholder="MM-DD-YYYY"
                  value={party.draft.localDateInput}
                  onChange={(value) => actions.onDraftDate?.(sanitizeDateMdYInput(value))}
                  size={createPartyFieldSize(compact)}
                />
              </UiEntity>
              <UiEntity
                uiTransform={{
                  width: "50%",
                  flexDirection: "column",
                  padding: { left: spacing.xs },
                  alignItems: "center",
                }}
              >
                <UiEntity
                  uiTransform={{
                    flexDirection: "column",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <UiEntity
                    uiTransform={{ width: "100%", minHeight: s(16) }}
                    uiText={{
                      value: "TIME",
                      fontSize: compact ? font.micro : font.caption,
                      color: color.textMuted,
                      textAlign: "middle-center",
                    }}
                  />
                  <UiEntity
                    uiTransform={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      width: "100%",
                      flexShrink: 0,
                    }}
                  >
                    <RmTextField
                      placeholder="5:30"
                      value={party.draft.localTimeClock}
                      onChange={(value) => actions.onDraftTime?.(sanitizeClock12hInput(value))}
                      size={createPartyFieldSize(compact)}
                      width={CREATE_PARTY_TIME_FIELD_WIDTH}
                    />
                    <RmButton
                      label="AM"
                      variant={party.draft.localTimePeriod === "AM" ? "primary" : "secondary"}
                      size={compact ? "touch" : "sm"}
                      width={s(CREATE_PARTY_PERIOD_BUTTON_WIDTH)}
                      onClick={() => actions.onDraftDayPeriod?.("AM")}
                    />
                    <RmButton
                      label="PM"
                      variant={party.draft.localTimePeriod === "PM" ? "primary" : "secondary"}
                      size={compact ? "touch" : "sm"}
                      width={s(CREATE_PARTY_PERIOD_BUTTON_WIDTH)}
                      onClick={() => actions.onDraftDayPeriod?.("PM")}
                    />
                  </UiEntity>
                </UiEntity>
              </UiEntity>
            </UiEntity>
          )}
          <UiEntity
            uiTransform={{
              flexDirection: "row",
              width: "100%",
              alignItems: "flex-start",
              margin: { top: spacing.xs, bottom: spacing.sm },
              flexShrink: 0,
            }}
          >
            <UiEntity
              uiTransform={{
                width: "50%",
                minHeight: s(28),
                padding: { right: spacing.xs },
                flexShrink: 0,
              }}
              uiText={{
                value: localTimeHelper(party.nowMs, party.draft.timeZone),
                fontSize: compact ? font.micro : font.caption,
                color: color.textMuted,
                textAlign: "top-center",
                textWrap: "wrap",
              }}
            />
            <UiEntity
              uiTransform={{
                width: "50%",
                minHeight: s(28),
                padding: { left: spacing.xs },
                flexShrink: 0,
              }}
              uiText={{
                value: formatCompactCountdown(
                  Date.parse(`${party.draft.localDate}T${party.draft.localTime}:00`) || party.nowMs,
                  party.nowMs,
                ),
                fontSize: compact ? font.caption : font.body,
                color: color.accent,
                textAlign: "top-center",
                textWrap: "nowrap",
              }}
            />
          </UiEntity>
          <UiEntity
            uiTransform={{
              flexDirection: "row",
              width: "100%",
              margin: { top: compact ? spacing.sm : spacing.md },
              flexShrink: 0,
              alignItems: "flex-start",
            }}
          >
            <RmToggle
              label={party.draft.allowCommunityContributions ? "COMMUNITY CONTRIBUTIONS ON" : "COMMUNITY CONTRIBUTIONS OFF"}
              value={party.draft.allowCommunityContributions}
              compact
              onChange={() => actions.onToggleDraftCommunity?.()}
            />
            <UiEntity uiTransform={{ flexGrow: 1, flexShrink: 1, flexDirection: "column", minWidth: 0 }}>
              <RmToggle
                label={party.draft.supplementFromExtraPool ? "ADD PRIZES FROM EXTRA POOL ON" : "ADD ITEMS FROM EXTRA POOL OFF"}
                value={party.draft.supplementFromExtraPool}
                compact
                disabled={!canTurnOnExtraPool(party, party.draft.supplementFromExtraPool)}
                onChange={() => actions.onToggleDraftExtraPool?.()}
              />
              <UiEntity
                uiTransform={{
                  width: "100%",
                  minHeight: s(28),
                  margin: { top: spacing.xs, right: spacing.xs, bottom: spacing.xs },
                  flexShrink: 0,
                }}
                uiText={{
                  value: extraPoolQuotaHelper(party.extraPoolQuota),
                  fontSize: font.micro,
                  color: color.textMuted,
                  textAlign: "top-right",
                  textWrap: "wrap",
                }}
              />
            </UiEntity>
          </UiEntity>
          <UiEntity uiTransform={{ flexDirection: "column", width: "100%", margin: { top: spacing.xs } }}>
            <RmToggle
              label="CONTRIBUTE UNCLAIMED PRIZES TO EXTRA POOL"
              value={party.draft.unclaimedPrizePolicy === "EXTRA_POOL"}
              compact
              onChange={() => actions.onToggleDraftUnclaimedPolicy?.()}
            />
            <UiEntity
              uiTransform={{
                width: "100%",
                minHeight: s(32),
                margin: { top: spacing.xs, bottom: spacing.sm },
                flexShrink: 0,
              }}
              uiText={{
                value: unclaimedPrizePolicyHelper(party.draft.unclaimedPrizePolicy),
                fontSize: font.micro,
                color: color.textMuted,
                textAlign: "top-left",
                textWrap: "wrap",
              }}
            />
          </UiEntity>
          {party.open === "create" && party.leftoverGroups.length > 0 ? (
            <UiEntity
              uiTransform={{
                flexDirection: "column",
                width: "100%",
                margin: { top: spacing.xs },
                flexShrink: 0,
              }}
            >
              {PreviewLine({
                value: "AVAILABLE LEFTOVERS",
                fontSize: compact ? font.caption : font.body,
                color: color.textPrimary,
                height: s(20),
                textAlign: "middle-left",
              })}
              {party.leftoverGroups.map((group) => (
                <UiEntity uiTransform={{ width: "100%", flexDirection: "column", margin: { top: spacing.xs } }}>
                  {PreviewLine({
                    value: group.sourcePartyTitle,
                    fontSize: font.caption,
                    color: color.accent,
                    height: s(18),
                    textAlign: "middle-left",
                  })}
                  {LeftoverAssetLines({
                    group,
                    compact,
                    selectable: true,
                    selectedPrizeIds: party.leftoverSelection.prizeIds,
                    manaSelected: isLeftoverManaSelected(party.leftoverSelection, group.sourcePartyId),
                    onTogglePrize: (prizeId) => actions.onToggleLeftoverPrize?.(prizeId),
                    onToggleMana: () => actions.onToggleLeftoverMana?.(group.sourcePartyId),
                  })}
                </UiEntity>
              ))}
              {PreviewLine({
                value: CREATE_PARTY_LEFTOVER_HINT,
                fontSize: font.micro,
                color: color.textMuted,
                height: s(32),
                textAlign: "middle-left",
              })}
            </UiEntity>
          ) : null}
        </UiEntity>
      ) : null}

      {party.message ? (
        <UiEntity
          uiTransform={{ width: "100%", minHeight: s(18) }}
          uiText={{
            value: party.message,
            fontSize: font.caption,
            color: color.warning,
            textAlign: "middle-center",
          }}
        />
      ) : null}

      <UiEntity
        uiTransform={{
          flexDirection: "row",
          width: "100%",
          minHeight: compact ? s(48) : s(32),
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          margin: { top: spacing.xs },
          flexShrink: 0,
        }}
      >
        {party.open === "manage" && party.selected && isPastHostedParty(party.selected.status) ? (
          <RmButton label="CREATE AGAIN" variant="primary" size={compact ? "touch" : "sm"} onClick={() => actions.onCreateAgain?.()} />
        ) : null}
        {party.open === "manage" && party.selected && canHostAddPrizes(party.selected) ? (
          <RmButton label="ADD PRIZES" variant="primary" size={compact ? "touch" : "sm"} onClick={() => actions.onAddPrizes?.()} />
        ) : null}
        {party.open === "manage" && party.selected && canHostEditParty(party.selected) ? (
          <RmButton label="EDIT" variant="secondary" size={compact ? "touch" : "sm"} onClick={() => actions.onEditSelectedParty?.()} />
        ) : null}
        {party.open === "create" || party.open === "edit" ? (
          <RmButton label="SAVE" variant="primary" size={compact ? "touch" : "sm"} onClick={() => actions.onSubmitParty?.()} />
        ) : null}
        <RmButton
          label={PARTY_BACK_LABEL}
          variant="secondary"
          size={compact ? "touch" : "sm"}
          width={s(76)}
          hitSlop={compact ? 8 : 0}
          onClick={goBack}
        />
      </UiEntity>
    </RmCard>
  );
}
