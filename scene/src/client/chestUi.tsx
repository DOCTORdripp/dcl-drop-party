import { Color4 } from "@dcl/sdk/math";
import ReactEcs, { UiEntity } from "@dcl/sdk/react-ecs";
import {
  canConfirmChestDeposit,
  depositDestinationButtonHeight,
  depositDestinationLabel,
  depositDestinationMetaFont,
  depositDestinationNeedsScroll,
  depositDestinationTitleFont,
  DEPOSIT_DESTINATION_GAP,
  legalDepositTargets,
  NEXT_PUBLIC_PARTY_LABEL,
  NEXT_PUBLIC_PARTY_META,
  orderedDepositDestinations,
  type ChestPanelModel,
} from "../shared/chestPanels";
import { chestRootGridWidth, chestUiMetrics, depositTypeTileLayout, type ChestUiMetrics } from "../shared/chestUiLayout";
import {
  chestRootButtons,
  chestRootTileRows,
  chestRootTileSrc,
  chestRootTitle,
  chestScreenShowsBackArrow,
  depositPickerTileSrc,
  DEPOSIT_TYPE_TILES,
  DEPOSIT_HEADING,
  type ChestRootButton,
  type ChestRootButtonId,
  type DepositPickerTileId,
} from "../shared/chestRoot";
import {
  GET_WEARABLE_LABEL,
  HOST_ACCESS_BODY,
  HOST_ACCESS_HEADING,
  hostWearableMetaLine,
  isSafeMarketplaceUrl,
  marketplaceItemUrl,
} from "../shared/hostAccess";
import { type ChestPresentation } from "../shared/chestPresentation";
import { slotLabel, truncateLabel } from "../shared/chestTheme";
import {
  browseInventory,
  depositStageIndex,
  DEPOSIT_STAGES,
  INVENTORY_GRID_COLS,
  inventoryGridEmptyCopy,
  inventoryPageTokens,
  ownedCountLabel,
  rarityBypassesLowMintLock,
  rarityChipLabel,
  rarityFilterOptions,
} from "../shared/inventoryBrowser";
import {
  canShowRetryVerification,
  formatDepositSummaryLines,
} from "../shared/depositProgress";
import { DEPOSIT_LEFTOVERS_LABEL, depositCardMintCopy } from "../shared/leftoverInventory";
import {
  DEPOSIT_WARNING_BODY_FOOTER,
  DEPOSIT_WARNING_BODY_LEAD,
  depositWarningFooterMarkup,
  depositWarningLeadMarkup,
  DEPOSIT_WARNING_DONT_SHOW_LABEL,
  DEPOSIT_WARNING_EXIT_LABEL,
  DEPOSIT_WARNING_HEADING,
  DEPOSIT_WARNING_UNDERSTAND_LABEL,
} from "../shared/depositWarning";
import { hostCardLabel } from "../shared/displayName";
import { contributionStateLabel } from "../shared/partyPanels";
import { createPartyFieldSize, PARTY_BACK_LABEL } from "../shared/partyDisplay";
import { formatRelativeCountdown } from "../shared/partyTime";
import { MANA_TOKEN_ICON_SRC } from "../shared/wins";
import { RmButton } from "../ui/components/Button";
import { RmCard } from "../ui/components/Card";
import { RmChip } from "../ui/components/Chip";
import { DepositMintsModal } from "../ui/components/DepositMintsModal";
import { RmEmptyState } from "../ui/components/EmptyState";
import { ItemThumbnailBox } from "../ui/components/ItemThumbnailBox";
import { RmTextField } from "../ui/components/TextField";
import { RmToggle } from "../ui/components/Toggle";
import { rgbaForRarityLabel } from "../ui/rarityColors";
import { color, font, measureWrappedTextHeight, radius, s, spacing } from "../ui/theme";

export type ChestUiActions = {
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
  onPickPublicDestination?: () => void;
  onPickScheduledDestination?: (partyId: string, title: string) => void;
  onOpenUpcoming?: () => void;
  onOpenMyParties?: () => void;
  onOpenMyWins?: () => void;
  onInventorySearch?: (value: string) => void;
  onInventoryRarity?: (rarity: string) => void;
  onInventoryPage?: (delta: number) => void;
  onInventoryGoToPage?: (page: number) => void;
  onToggleMint?: (tokenId: string) => void;
  onSetManaAmount?: (value: string) => void;
  onBackDeposit?: () => void;
  onOpenMarketplace?: (url: string) => void;
};

function panelTitle(open: ChestPanelModel["open"]): string {
  if (open === "hostAccess") return HOST_ACCESS_HEADING;
  if (open.startsWith("deposit")) return DEPOSIT_HEADING;
  return chestRootTitle();
}

/**
 * DCL remounts a UiEntity when color or callback identity changes. The
 * official hover sample paints color on the same node as enter/leave, which
 * fires a fake leave and skips re-enter. Paint gold on the card background
 * only (behind icon/label). Keep enter/click as module-stable functions.
 * Ignore leave that arrives right after apply — that is the remount flake.
 */
const TILE_LABEL_BG = Color4.create(0, 0, 0, 1)
const ROOT_TILE_HOVER_GUARD_MS = 180

let applyRootTileHover: (id: ChestRootButtonId | null) => void = () => {}
let rootTileClick: Partial<Record<ChestRootButtonId, () => void>> = {}
let rootTileHoverAppliedAt = 0

function bindRootTileHover(apply: (id: ChestRootButtonId | null) => void): void {
  applyRootTileHover = apply
}

function bindRootTileClicks(clicks: Partial<Record<ChestRootButtonId, () => void>>): void {
  rootTileClick = clicks
}

function setRootTileHover(id: ChestRootButtonId | null): void {
  if (id) {
    rootTileHoverAppliedAt = Date.now()
    applyRootTileHover(id)
    return
  }
  if (Date.now() - rootTileHoverAppliedAt < ROOT_TILE_HOVER_GUARD_MS) {
    return
  }
  applyRootTileHover(null)
}

function enterRootTile(id: ChestRootButtonId): () => void {
  return () => setRootTileHover(id)
}

function clickRootTile(id: ChestRootButtonId): () => void {
  return () => rootTileClick[id]?.()
}

const enterRootDeposit = enterRootTile("deposit")
const enterRootUpcoming = enterRootTile("upcoming")
const enterRootWins = enterRootTile("wins")
const enterRootMine = enterRootTile("mine")
const clickRootDeposit = clickRootTile("deposit")
const clickRootUpcoming = clickRootTile("upcoming")
const clickRootWins = clickRootTile("wins")
const clickRootMine = clickRootTile("mine")

const ROOT_TILE_ENTER: Record<ChestRootButtonId, () => void> = {
  deposit: enterRootDeposit,
  upcoming: enterRootUpcoming,
  wins: enterRootWins,
  mine: enterRootMine,
}

const ROOT_TILE_CLICK: Record<ChestRootButtonId, () => void> = {
  deposit: clickRootDeposit,
  upcoming: clickRootUpcoming,
  wins: clickRootWins,
  mine: clickRootMine,
}

function leaveRootTiles(): void {
  setRootTileHover(null)
}

let applyAssetTileHover: (id: DepositPickerTileId | null) => void = () => {}
let assetTileClick: Partial<Record<DepositPickerTileId, () => void>> = {}
let assetTileHoverAppliedAt = 0

function bindAssetTileHover(apply: (id: DepositPickerTileId | null) => void): void {
  applyAssetTileHover = apply
}

function bindAssetTileClicks(clicks: Partial<Record<DepositPickerTileId, () => void>>): void {
  assetTileClick = clicks
}

function setAssetTileHover(id: DepositPickerTileId | null): void {
  if (id) {
    assetTileHoverAppliedAt = Date.now()
    applyAssetTileHover(id)
    return
  }
  if (Date.now() - assetTileHoverAppliedAt < ROOT_TILE_HOVER_GUARD_MS) {
    return
  }
  applyAssetTileHover(null)
}

function enterAssetTile(id: DepositPickerTileId): () => void {
  return () => setAssetTileHover(id)
}

function clickAssetTile(id: DepositPickerTileId): () => void {
  return () => assetTileClick[id]?.()
}

const enterAssetMana = enterAssetTile("MANA")
const enterAssetWearable = enterAssetTile("wearable")
const enterAssetEmote = enterAssetTile("emote")
const clickAssetMana = clickAssetTile("MANA")
const clickAssetWearable = clickAssetTile("wearable")
const clickAssetEmote = clickAssetTile("emote")

const ASSET_TILE_ENTER: Record<DepositPickerTileId, () => void> = {
  MANA: enterAssetMana,
  wearable: enterAssetWearable,
  emote: enterAssetEmote,
}

const ASSET_TILE_CLICK: Record<DepositPickerTileId, () => void> = {
  MANA: clickAssetMana,
  wearable: clickAssetWearable,
  emote: clickAssetEmote,
}

function leaveAssetTiles(): void {
  setAssetTileHover(null)
}

function DepositAssetTile(args: {
  id: DepositPickerTileId;
  label: string;
  hovered: boolean;
  layout: ChestUiMetrics;
  tile: ReturnType<typeof depositTypeTileLayout>;
  endOfRow: boolean;
}) {
  const border = args.hovered ? color.accent : color.border;
  const fill = args.hovered ? color.accentSoft : color.bgElevated;
  return (
    <UiEntity
      uiTransform={{
        width: args.tile.tileSize,
        height: args.tile.tileSize,
        margin: {
          right: args.endOfRow ? 0 : args.tile.tileGap,
        },
        flexShrink: 0,
        positionType: "relative",
      }}
    >
      <UiEntity
        uiTransform={{
          width: "100%",
          height: "100%",
          padding: 2,
          borderRadius: radius.md,
          pointerFilter: "none",
        }}
        uiBackground={{ color: border }}
      >
        <UiEntity
          uiTransform={{
            width: "100%",
            height: "100%",
            padding: args.tile.tilePad,
            borderRadius: radius.md,
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            pointerFilter: "none",
          }}
          uiBackground={{ color: fill }}
        >
          <UiEntity
            uiTransform={{
              width: args.tile.iconSize,
              height: args.tile.iconSize,
              flexShrink: 0,
              margin: { bottom: spacing.xs },
              pointerFilter: "none",
            }}
            uiBackground={{
              texture: { src: depositPickerTileSrc(args.id) },
              textureMode: "stretch",
            }}
          />
          <UiEntity
            uiTransform={{
              width: "100%",
              minHeight: args.tile.labelMinHeight,
              flexGrow: 1,
              justifyContent: "center",
              alignItems: "center",
              pointerFilter: "none",
            }}
          >
            <UiEntity
              uiTransform={{
                width: "94%",
                minHeight: args.tile.labelMinHeight,
                padding: 2,
                borderRadius: radius.sm,
                justifyContent: "center",
                alignItems: "center",
                pointerFilter: "none",
              }}
              uiBackground={{ color: TILE_LABEL_BG }}
            >
              <UiEntity
                uiTransform={{
                  width: "100%",
                  minHeight: Math.max(18, args.tile.labelMinHeight - 6),
                  pointerFilter: "none",
                }}
                uiText={{
                  value: args.label,
                  fontSize: args.layout.compact ? args.layout.bodyFont : args.layout.captionFont,
                  color: color.textPrimary,
                  textAlign: "middle-center",
                  textWrap: "wrap",
                }}
              />
            </UiEntity>
          </UiEntity>
        </UiEntity>
      </UiEntity>
      <UiEntity
        uiTransform={{
          positionType: "absolute",
          position: { top: 0, left: 0 },
          width: "100%",
          height: "100%",
          pointerFilter: "block",
        }}
        onMouseEnter={ASSET_TILE_ENTER[args.id]}
        onMouseDown={ASSET_TILE_CLICK[args.id]}
      />
    </UiEntity>
  );
}

function RootActionTile(args: {
  button: ChestRootButton;
  hovered: boolean;
  layout: ChestUiMetrics;
  endOfRow: boolean;
}) {
  const border = args.hovered ? color.accent : color.border;
  const fill = args.hovered ? color.accentSoft : color.bgElevated;
  return (
    <UiEntity
      uiTransform={{
        width: args.layout.tileSize,
        height: args.layout.tileSize,
        margin: {
          right: args.endOfRow ? 0 : args.layout.tileGap,
        },
        flexShrink: 0,
        positionType: "relative",
      }}
    >
      <UiEntity
        uiTransform={{
          width: "100%",
          height: "100%",
          padding: 2,
          borderRadius: radius.md,
          pointerFilter: "none",
        }}
        uiBackground={{ color: border }}
      >
        <UiEntity
          uiTransform={{
            width: "100%",
            height: "100%",
            padding: args.layout.tilePad,
            borderRadius: radius.md,
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            pointerFilter: "none",
          }}
          uiBackground={{ color: fill }}
        >
          <UiEntity
            uiTransform={{
              width: args.layout.iconSize,
              height: args.layout.iconSize,
              flexShrink: 0,
              margin: { bottom: spacing.xs },
              pointerFilter: "none",
            }}
            uiBackground={{
              texture: { src: chestRootTileSrc(args.button.id) },
              textureMode: "stretch",
            }}
          />
          <UiEntity
            uiTransform={{
              width: "100%",
              minHeight: args.layout.labelMinHeight,
              flexGrow: 1,
              justifyContent: "center",
              alignItems: "center",
              pointerFilter: "none",
            }}
          >
            <UiEntity
              uiTransform={{
                width: "94%",
                minHeight: args.layout.labelMinHeight,
                padding: 2,
                borderRadius: radius.sm,
                justifyContent: "center",
                alignItems: "center",
                pointerFilter: "none",
              }}
              uiBackground={{ color: TILE_LABEL_BG }}
            >
              <UiEntity
                uiTransform={{
                  width: "100%",
                  minHeight: Math.max(18, args.layout.labelMinHeight - 6),
                  pointerFilter: "none",
                }}
                uiText={{
                  value: args.button.label,
                  fontSize: args.layout.compact ? args.layout.bodyFont : args.layout.captionFont,
                  color: color.textPrimary,
                  textAlign: "middle-center",
                  textWrap: "wrap",
                }}
              />
            </UiEntity>
          </UiEntity>
        </UiEntity>
      </UiEntity>
      <UiEntity
        uiTransform={{
          positionType: "absolute",
          position: { top: 0, left: 0 },
          width: "100%",
          height: "100%",
          pointerFilter: "block",
        }}
        onMouseEnter={ROOT_TILE_ENTER[args.button.id]}
        onMouseDown={ROOT_TILE_CLICK[args.button.id]}
      />
    </UiEntity>
  );
}

function sendGridBodyWidthPx(contentWidth: number, compact: boolean): number {
  return contentWidth - (compact ? spacing.sm : spacing.md) * 2;
}

function sendGridCellWidthPx(inner: number): number {
  const g = spacing.xs;
  return Math.max(1, Math.floor((inner - g * INVENTORY_GRID_COLS) / INVENTORY_GRID_COLS));
}

function sendGridThumbDesignSize(cellW: number): number {
  return Math.max(44, Math.min(86, Math.floor(cellW - 2 * spacing.xs - 4)));
}

function DepositDestinationTile(args: {
  title: string;
  meta?: string;
  compact: boolean;
  accent?: boolean;
  onClick: () => void;
}) {
  const height = depositDestinationButtonHeight(args.compact);
  return (
    <UiEntity
      uiTransform={{
        width: "100%",
        height: s(height),
        flexShrink: 0,
        margin: { bottom: DEPOSIT_DESTINATION_GAP },
        padding: { left: spacing.md, right: spacing.md, top: spacing.sm, bottom: spacing.sm },
        borderRadius: radius.md,
        flexDirection: "column",
        justifyContent: "center",
      }}
      uiBackground={{ color: args.accent ? color.accentSoft : color.surfaceSoft }}
      onMouseDown={args.onClick}
    >
      <UiEntity
        uiTransform={{ width: "100%", height: s(args.compact ? 24 : 22), flexShrink: 0 }}
        uiText={{
          value: args.title,
          fontSize: depositDestinationTitleFont(args.compact),
          color: color.textPrimary,
          textAlign: "middle-left",
          textWrap: "nowrap",
        }}
      />
      {args.meta ? (
        <UiEntity
          uiTransform={{ width: "100%", height: s(args.compact ? 18 : 16), flexShrink: 0 }}
          uiText={{
            value: args.meta,
            fontSize: depositDestinationMetaFont(args.compact),
            color: color.textMuted,
            textAlign: "middle-left",
            textWrap: "nowrap",
          }}
        />
      ) : null}
    </UiEntity>
  );
}

function DepositTypePicker(args: {
  prompt: string;
  hovered: DepositPickerTileId | null;
  layout: ChestUiMetrics;
}) {
  const tile = depositTypeTileLayout(args.layout.contentWidth, args.layout.compact);
  return (
    <UiEntity
      uiTransform={{
        width: "100%",
        flexGrow: 1,
        minHeight: 0,
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <UiEntity
        uiTransform={{ width: "100%", height: s(28), margin: { bottom: spacing.md }, flexShrink: 0 }}
        uiText={{
          value: args.prompt,
          fontSize: font.title,
          color: color.textSecondary,
          textAlign: "middle-center",
        }}
      />
      <UiEntity
        uiTransform={{
          width: tile.rowWidth,
          height: tile.tileSize,
          flexDirection: "row",
          flexWrap: "nowrap",
          alignItems: "center",
          flexShrink: 0,
          pointerFilter: "block",
        }}
        onMouseLeave={leaveAssetTiles}
      >
        {DEPOSIT_TYPE_TILES.map((entry, index) => (
          <DepositAssetTile
            id={entry.id}
            label={entry.label}
            hovered={args.hovered === entry.id}
            layout={args.layout}
            tile={tile}
            endOfRow={index === DEPOSIT_TYPE_TILES.length - 1}
          />
        ))}
      </UiEntity>
    </UiEntity>
  );
}

function DestinationBanner(label: string) {
  return (
    <UiEntity
      uiTransform={{
        width: "100%",
        height: s(28),
        margin: { bottom: spacing.sm },
        flexShrink: 0,
      }}
      uiText={{
        value: `DEPOSIT TO  ${truncateLabel(label, 36)}`,
        fontSize: font.display,
        color: color.accent,
        textAlign: "middle-center",
      }}
    />
  );
}

function FooterBar(args: {
  backLabel: string;
  primaryLabel?: string;
  primaryEnabled?: boolean;
  onBack: () => void;
  onPrimary?: () => void;
  compact?: boolean;
}) {
  const size = args.compact ? "touch" : "sm";
  return (
    <UiEntity
      uiTransform={{
        width: "100%",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "wrap",
        flexShrink: 0,
        margin: { top: spacing.xs },
        minHeight: args.compact ? s(48) : s(32),
      }}
    >
      {args.onPrimary ? (
        <UiEntity uiTransform={{ margin: { right: spacing.xs } }}>
          <RmButton
            label={args.primaryLabel ?? ""}
            variant="primary"
            size={size}
            disabled={!args.primaryEnabled}
            onClick={args.onPrimary}
          />
        </UiEntity>
      ) : null}
      <RmButton
        label={args.backLabel}
        variant="secondary"
        size={size}
        width={s(76)}
        hitSlop={args.compact ? 8 : 0}
        onClick={args.onBack}
      />
    </UiEntity>
  );
}

function InventoryPageBar(args: {
  page: number;
  pageCount: number;
  compact?: boolean;
  onGoToPage?: (page: number) => void;
}) {
  const tokens = inventoryPageTokens(args.page, args.pageCount);
  if (tokens.length === 0) {
    return <UiEntity uiTransform={{ width: "100%", height: 0, flexShrink: 0 }} />;
  }
  return (
    <UiEntity
      uiTransform={{
        width: "100%",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
        minHeight: args.compact ? s(28) : s(24),
        padding: { top: spacing.xs, bottom: spacing.xs },
      }}
    >
      {tokens.map((token) =>
        token.kind === "gap" ? (
          <UiEntity
            uiTransform={{ width: s(16), height: args.compact ? s(20) : s(18), flexShrink: 0 }}
            uiText={{
              value: "…",
              fontSize: args.compact ? font.micro : font.nano,
              color: color.textMuted,
              textAlign: "middle-center",
            }}
          />
        ) : (
          <RmChip
            compact
            dense={!args.compact}
            label={String(token.page + 1)}
            active={token.page === args.page}
            onClick={() => args.onGoToPage?.(token.page)}
          />
        ),
      )}
    </UiEntity>
  );
}

export function ChestDashboard(props: {
  panels: ChestPanelModel;
  chest?: ChestPresentation;
  walletConnected?: boolean;
  hostEligible?: boolean;
  nowMs: number;
  actions: ChestUiActions;
  layout?: ChestUiMetrics;
}) {
  const { panels, actions } = props;
  const layoutMetrics = props.layout ?? chestUiMetrics();
  const actionSize = layoutMetrics.compact ? "touch" : "sm";
  const warningBodyFont = layoutMetrics.compact ? s(22) : s(20);
  const warningActionSize = "xl" as const;
  const warningTextWidth = layoutMetrics.contentWidth;
  const warningLeadHeight = s(measureWrappedTextHeight(DEPOSIT_WARNING_BODY_LEAD, warningBodyFont, warningTextWidth));
  const warningFooterHeight = s(
    measureWrappedTextHeight(DEPOSIT_WARNING_BODY_FOOTER, warningBodyFont, warningTextWidth),
  );
  const warningFooterGap = spacing.xs;
  const [hoveredTile, setHoveredTile] = ReactEcs.useState<ChestRootButtonId | null>(null);
  const [hoveredAsset, setHoveredAsset] = ReactEcs.useState<DepositPickerTileId | null>(null);
  const [dontShowDepositWarning, setDontShowDepositWarning] = ReactEcs.useState(false);
  bindRootTileHover(setHoveredTile);
  bindRootTileClicks({
    deposit: () => actions.onOpenDeposit?.(),
    upcoming: () => actions.onOpenUpcoming?.(),
    wins: () => actions.onOpenMyWins?.(),
    mine: () => actions.onOpenMyParties?.(),
  });
  bindAssetTileHover(setHoveredAsset);
  bindAssetTileClicks({
    MANA: () => actions.onDepositAsset?.("MANA"),
    wearable: () => actions.onNftKind?.("wearable"),
    emote: () => actions.onNftKind?.("emote"),
  });
  const deposit = panels.deposit;
  const rootButtons = chestRootButtons();
  const browsed = browseInventory(deposit.inventory, {
    search: deposit.inventorySearch,
    kind: deposit.nftKind === "leftover" ? undefined : deposit.nftKind,
    rarity: deposit.inventoryRarity,
    page: deposit.inventoryPage,
  });
  const selected = deposit.selectedItem;
  const confirmReady = canConfirmChestDeposit(panels);
  const gridCellW = sendGridCellWidthPx(sendGridBodyWidthPx(layoutMetrics.contentWidth, layoutMetrics.compact));
  const gridThumb = sendGridThumbDesignSize(gridCellW);
  const destLabel = deposit.destinationReady ? depositDestinationLabel(panels) : "";

  return (
    <RmCard
      title={panels.open === "depositWarning" ? undefined : panelTitle(panels.open)}
      fill
      plain
      compact={layoutMetrics.compact}
      onBack={
        chestScreenShowsBackArrow(panels.open) ? () => actions.onBackDeposit?.() : undefined
      }
    >
      {panels.open !== "chest" && panels.open !== "depositWarning" && destLabel
        ? DestinationBanner(destLabel)
        : null}

      {panels.open === "chest" ? (
        <UiEntity
          uiTransform={{
            width: "100%",
            flexGrow: 1,
            minHeight: 0,
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <UiEntity
            uiTransform={{
              width: chestRootGridWidth(layoutMetrics),
              flexDirection: "column",
              alignItems: "flex-start",
              flexShrink: 0,
              pointerFilter: "block",
            }}
            onMouseLeave={leaveRootTiles}
          >
            {chestRootTileRows(rootButtons).map((row, rowIndex, rows) => (
              <UiEntity
                uiTransform={{
                  width: chestRootGridWidth(layoutMetrics),
                  height: layoutMetrics.tileSize,
                  flexDirection: "row",
                  flexWrap: "nowrap",
                  alignItems: "center",
                  flexShrink: 0,
                  margin: { bottom: rowIndex === rows.length - 1 ? 0 : layoutMetrics.tileGap },
                }}
              >
                {row.map((button, colIndex) => (
                  <RootActionTile
                    button={button}
                    layout={layoutMetrics}
                    endOfRow={colIndex === row.length - 1}
                    hovered={hoveredTile === button.id}
                  />
                ))}
              </UiEntity>
            ))}
          </UiEntity>
        </UiEntity>
      ) : null}

      {panels.open === "depositWarning" ? (
        <UiEntity uiTransform={{ width: "100%", flexDirection: "column", flexGrow: 1, minHeight: 0 }}>
          <UiEntity
            uiTransform={{
              width: "100%",
              flexShrink: 0,
              justifyContent: "center",
              alignItems: "center",
              margin: { bottom: layoutMetrics.compact ? spacing.md : spacing.lg },
            }}
          >
            <UiEntity
              uiTransform={{
                width: "100%",
                minHeight: layoutMetrics.compact ? s(52) : s(64),
                justifyContent: "center",
                alignItems: "center",
              }}
              uiText={{
                value: DEPOSIT_WARNING_HEADING,
                fontSize: layoutMetrics.compact ? s(36) : s(42),
                color: color.warning,
                textAlign: "middle-center",
              }}
            />
          </UiEntity>
          <UiEntity
            uiTransform={{
              width: "100%",
              flexDirection: "column",
              flexShrink: 0,
              margin: { bottom: spacing.sm },
            }}
          >
            <UiEntity
              uiTransform={{ width: "100%", height: warningLeadHeight, flexShrink: 0 }}
              uiText={{
                value: depositWarningLeadMarkup(),
                fontSize: warningBodyFont,
                color: color.textPrimary,
                textAlign: "top-center",
                textWrap: "wrap",
              }}
            />
            <UiEntity
              uiTransform={{
                width: "100%",
                height: warningFooterHeight,
                flexShrink: 0,
                margin: { top: warningFooterGap },
              }}
              uiText={{
                value: depositWarningFooterMarkup(),
                fontSize: warningBodyFont,
                color: Color4.create(0.95, 0.18, 0.18, 1),
                textAlign: "top-center",
                textWrap: "wrap",
              }}
            />
          </UiEntity>
          <UiEntity uiTransform={{ width: "100%", flexGrow: 1, minHeight: spacing.sm }} />
          <UiEntity uiTransform={{ width: "100%", flexShrink: 0, margin: { bottom: spacing.sm } }}>
            <RmToggle
              label={DEPOSIT_WARNING_DONT_SHOW_LABEL}
              value={dontShowDepositWarning}
              onChange={setDontShowDepositWarning}
              compact={layoutMetrics.compact}
            />
          </UiEntity>
          <UiEntity
            uiTransform={{
              width: "100%",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              flexWrap: "wrap",
              flexShrink: 0,
            }}
          >
            <UiEntity uiTransform={{ margin: { right: spacing.sm } }}>
              <RmButton
                label={DEPOSIT_WARNING_UNDERSTAND_LABEL}
                variant="primary"
                size={warningActionSize}
                onClick={() => actions.onAcceptDepositWarning?.(dontShowDepositWarning)}
              />
            </UiEntity>
            <RmButton
              label={DEPOSIT_WARNING_EXIT_LABEL}
              variant="secondary"
              size={warningActionSize}
              onClick={() => actions.onExitDepositWarning?.()}
            />
          </UiEntity>
        </UiEntity>
      ) : null}

      {panels.open === "hostAccess" ? (
        <UiEntity uiTransform={{ width: "100%", flexDirection: "column", flexGrow: 1, minHeight: 0 }}>
          <UiEntity
            uiTransform={{ width: "100%", minHeight: s(40), margin: { bottom: spacing.sm }, flexShrink: 0 }}
            uiText={{
              value: HOST_ACCESS_BODY,
              fontSize: font.caption,
              color: color.textSecondary,
              textAlign: "top-center",
              textWrap: "wrap",
            }}
          />
          <UiEntity
            uiTransform={{
              width: "100%",
              flexGrow: 1,
              minHeight: 0,
              flexDirection: "column",
              overflow: panels.hostRequirements.length > 2 ? "scroll" : undefined,
            }}
          >
            {panels.hostRequirements.map((item) => {
              const url = marketplaceItemUrl(item);
              const meta = hostWearableMetaLine(item);
              return (
                <UiEntity
                  uiTransform={{
                    width: "100%",
                    minHeight: s(84),
                    margin: { bottom: spacing.sm },
                    padding: spacing.sm,
                    borderRadius: radius.md,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                  uiBackground={{ color: color.bgElevated }}
                  onMouseDown={() => {
                    if (isSafeMarketplaceUrl(url)) actions.onOpenMarketplace?.(url);
                  }}
                >
                  <ItemThumbnailBox kind="wearable" thumbnailUrl={item.imageUrl} size={56} />
                  <UiEntity uiTransform={{ flexGrow: 1, margin: { left: spacing.sm, right: spacing.sm } }}>
                    <UiEntity
                      uiText={{
                        value: item.name,
                        fontSize: font.body,
                        color: color.textPrimary,
                        textAlign: "middle-left",
                        textWrap: "wrap",
                      }}
                    />
                    {meta ? (
                      <UiEntity
                        uiText={{
                          value: meta,
                          fontSize: font.micro,
                          color: color.textMuted,
                          textAlign: "middle-left",
                        }}
                      />
                    ) : null}
                  </UiEntity>
                  <RmButton
                    label={GET_WEARABLE_LABEL}
                    variant="primary"
                    size={actionSize}
                    onClick={() => {
                      if (isSafeMarketplaceUrl(url)) actions.onOpenMarketplace?.(url);
                    }}
                  />
                </UiEntity>
              );
            })}
          </UiEntity>
          <FooterBar
            compact={layoutMetrics.compact}
            backLabel={PARTY_BACK_LABEL}
            onBack={() => actions.onBackDeposit?.()}
          />
        </UiEntity>
      ) : null}

      {panels.open === "deposit" && !deposit.destinationReady ? (
        <UiEntity uiTransform={{ width: "100%", flexDirection: "column", flexGrow: 1, minHeight: 0 }}>
          <UiEntity
            uiTransform={{ width: "100%", height: s(24), margin: { bottom: spacing.sm }, flexShrink: 0 }}
            uiText={{
              value: "Choose a destination",
              fontSize: layoutMetrics.compact ? layoutMetrics.subtitleFont : font.subtitle,
              color: color.textSecondary,
              textAlign: "middle-left",
            }}
          />
          <UiEntity
            uiTransform={{
              width: "100%",
              flexGrow: 1,
              minHeight: 0,
              flexDirection: "column",
              overflow: depositDestinationNeedsScroll(legalDepositTargets(deposit.targets).length)
                ? "scroll"
                : undefined,
            }}
          >
            {orderedDepositDestinations(
              deposit.targets,
              deposit.nextPublicPartyAt,
            ).map((option) =>
              option.kind === "PUBLIC_ROLLING" ? (
                <DepositDestinationTile
                  title={NEXT_PUBLIC_PARTY_LABEL}
                  meta={[
                    NEXT_PUBLIC_PARTY_META,
                    option.scheduledAt
                      ? formatRelativeCountdown(option.scheduledAt, props.nowMs, "OPEN")
                      : "",
                  ]
                    .filter((part) => part.length > 0)
                    .join(" · ")}
                  compact={layoutMetrics.compact}
                  accent
                  onClick={() => actions.onPickPublicDestination?.()}
                />
              ) : (
                <DepositDestinationTile
                  title={truncateLabel(option.party.title, 36)}
                  meta={`${[
                    hostCardLabel(option.party),
                    formatRelativeCountdown(
                      option.party.scheduledAt,
                      props.nowMs,
                      option.party.status,
                    ),
                    contributionStateLabel(option.party),
                  ]
                    .filter((part) => part && part.length > 0)
                    .join(" · ")}`}
                  compact={layoutMetrics.compact}
                  onClick={() =>
                    actions.onPickScheduledDestination?.(
                      option.party.partyId,
                      option.party.title,
                    )
                  }
                />
              ),
            )}
          </UiEntity>
          <FooterBar
            compact={layoutMetrics.compact} backLabel="BACK" onBack={() => actions.onBackDeposit?.()} />
        </UiEntity>
      ) : null}

      {(panels.open === "deposit" && deposit.destinationReady) || panels.open === "depositNft" ? (
        <UiEntity uiTransform={{ width: "100%", flexDirection: "column", flexGrow: 1, minHeight: 0 }}>
          <DepositTypePicker
            prompt="What would you like to deposit?"
            hovered={hoveredAsset}
            layout={layoutMetrics}
          />
          <FooterBar
            compact={layoutMetrics.compact} backLabel="BACK" onBack={() => actions.onBackDeposit?.()} />
        </UiEntity>
      ) : null}

      {panels.open === "depositNftPick" || panels.open === "depositNftMints" ? (
        <UiEntity uiTransform={{ width: "100%", flexDirection: "column", flexGrow: 1, minHeight: 0 }}>
          <UiEntity
            uiTransform={{
              width: "100%",
              flexDirection: "row",
              flexWrap: "nowrap",
              alignItems: "center",
              margin: { bottom: s(2) },
              flexShrink: 0,
            }}
          >
            <UiEntity
              uiTransform={{ height: s(20), margin: { right: spacing.xs }, flexShrink: 0 }}
              uiText={{
                value: "Type",
                fontSize: font.caption,
                color: color.textMuted,
                textAlign: "middle-left",
              }}
            />
            <RmChip
              size="filter"
              label="Wearables"
              active={deposit.nftKind === "wearable"}
              onClick={() => actions.onNftKind?.("wearable")}
            />
            <RmChip
              size="filter"
              label="Emotes"
              active={deposit.nftKind === "emote"}
              onClick={() => actions.onNftKind?.("emote")}
            />
            {deposit.leftoverAvailable || deposit.nftKind === "leftover" ? (
              <UiEntity uiTransform={{ flexGrow: 1, minWidth: 0, flexDirection: "row", justifyContent: "flex-end", alignItems: "center" }}>
                <RmChip
                  size="filter"
                  tone="success"
                  label={DEPOSIT_LEFTOVERS_LABEL}
                  active={deposit.nftKind === "leftover"}
                  onClick={() => actions.onNftKind?.("leftover")}
                />
              </UiEntity>
            ) : null}
          </UiEntity>
          <UiEntity
            uiTransform={{
              width: "100%",
              flexDirection: "row",
              flexWrap: "nowrap",
              alignItems: "center",
              margin: { bottom: s(2) },
              flexShrink: 0,
            }}
          >
            {rarityFilterOptions(deposit.inventory).map((rarity) => (
              <RmChip
                size="filter"
                label={rarity === "all" ? "all" : rarityChipLabel(rarity)}
                active={deposit.inventoryRarity === rarity}
                onClick={() => actions.onInventoryRarity?.(rarity)}
              />
            ))}
          </UiEntity>
          <UiEntity
            uiTransform={{
              width: "100%",
              flexDirection: "row",
              alignItems: "center",
              margin: { bottom: spacing.xs },
              flexShrink: 0,
            }}
          >
            <UiEntity uiTransform={{ flexGrow: 1, minWidth: 0 }}>
              <RmTextField
                placeholder="Search name or URN"
                value={deposit.inventorySearch}
                onChange={(value) => actions.onInventorySearch?.(value)}
                size={createPartyFieldSize(layoutMetrics.compact)}
                clearable
              />
            </UiEntity>
          </UiEntity>
          <UiEntity
            uiTransform={{
              width: "100%",
              flexDirection: "row",
              alignItems: "center",
              margin: { bottom: spacing.xs },
              flexShrink: 0,
            }}
          >
            <RmToggle
              label={deposit.autoPick ? "AUTO-PICK ON" : "AUTO-PICK OFF"}
              value={deposit.autoPick}
              compact
              onChange={() => actions.onToggleAutoPick?.()}
            />
            {!rarityBypassesLowMintLock(selected?.rarity) &&
            !rarityBypassesLowMintLock(deposit.inventoryRarity) &&
            deposit.nftKind !== "leftover" ? (
              <RmToggle
                label={deposit.lowMintLock ? "LOW MINT LOCK ON" : "LOW MINT LOCK OFF"}
                value={deposit.lowMintLock}
                compact
                onChange={() => actions.onToggleLowMintLock?.()}
              />
            ) : null}
          </UiEntity>
          {browsed.filtered.length > 0 ? (
            <UiEntity
              uiTransform={{
                width: "100%",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
                minHeight: s(26),
                margin: { bottom: spacing.xs },
              }}
            >
              <UiEntity
                uiText={{
                  value:
                    browsed.filtered.length === 1
                      ? `1 item · ${browsed.page + 1}/${browsed.pageCount}`
                      : `${browsed.filtered.length} items · ${browsed.page + 1}/${browsed.pageCount}`,
                  fontSize: font.micro,
                  color: color.textMuted,
                  textAlign: "middle-left",
                }}
              />
              <UiEntity uiTransform={{ flexDirection: "row", flexShrink: 0 }}>
                <RmButton
                  label="Prev"
                  variant="secondary"
                  size={actionSize}
                  disabled={browsed.page <= 0}
                  onClick={() => actions.onInventoryPage?.(-1)}
                />
                <RmButton
                  label="Next"
                  variant="secondary"
                  size={actionSize}
                  disabled={browsed.page + 1 >= browsed.pageCount}
                  onClick={() => actions.onInventoryPage?.(1)}
                />
              </UiEntity>
            </UiEntity>
          ) : null}
          {selected ? (
            <UiEntity
              uiTransform={{
                width: "100%",
                flexDirection: "row",
                alignItems: "center",
                padding: { top: s(4), bottom: s(4), left: spacing.xs, right: spacing.xs },
                margin: { bottom: spacing.xs },
                borderRadius: radius.md,
                flexShrink: 0,
              }}
              uiBackground={{ color: color.accentSoft }}
            >
              <ItemThumbnailBox kind={selected.kind} thumbnailUrl={selected.thumbnailUrl} size={36} />
              <UiEntity uiTransform={{ flexGrow: 1, margin: { left: spacing.xs }, flexShrink: 1 }}>
                <UiEntity
                  uiText={{
                    value: truncateLabel(selected.name, 22),
                    fontSize: font.micro,
                    color: color.textPrimary,
                    textAlign: "middle-left",
                  }}
                />
                <UiEntity
                  uiText={{
                    value: `${selected.rarity} · ${ownedCountLabel(selected.mints.length)}`,
                    fontSize: font.nano,
                    color: rgbaForRarityLabel(selected.rarity),
                    textAlign: "middle-left",
                  }}
                />
              </UiEntity>
              <UiEntity uiTransform={{ flexDirection: "row", alignItems: "center", flexShrink: 0 }}>
                <RmButton label="-" variant="secondary" size={actionSize} onClick={() => actions.onAdjustQuantity?.(-1)} />
                <UiEntity
                  uiTransform={{ width: s(22), minHeight: s(18) }}
                  uiText={{
                    value: String(deposit.quantity),
                    fontSize: font.caption,
                    color: color.textPrimary,
                    textAlign: "middle-center",
                  }}
                />
                <RmButton label="+" variant="secondary" size={actionSize} onClick={() => actions.onAdjustQuantity?.(1)} />
              </UiEntity>
            </UiEntity>
          ) : null}
          <UiEntity
            uiTransform={{
              width: "100%",
              flexGrow: 1,
              flexShrink: 1,
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: 0,
              overflow: browsed.visible.length > 0 ? "scroll" : undefined,
              borderRadius: radius.md,
            }}
            uiBackground={{ color: color.bgElevated }}
          >
            {browsed.visible.length === 0 ? (
              <RmEmptyState
                {...inventoryGridEmptyCopy({
                  loading: deposit.inventoryLoading,
                  inventoryCount: deposit.inventory.length,
                  nftKind: deposit.nftKind,
                })}
              />
            ) : (
              <UiEntity
                uiTransform={{
                  width: "100%",
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  alignContent: "flex-start",
                  flexShrink: 0,
                }}
              >
                {browsed.visible.map((item) => {
                  const selectedCard = selected?.urn === item.urn;
                  const rcol = rgbaForRarityLabel(item.rarity);
                  const leftoverTab = deposit.nftKind === "leftover";
                  const mintCopy = leftoverTab
                    ? { walletLabel: "", leftoverLabel: "" }
                    : depositCardMintCopy(item);
                  const leftoverKindLabel =
                    item.rarity === "mana" ? "MANA leftover" : "Leftover";
                  const slot = leftoverTab
                    ? truncateLabel(item.slot ?? "", 8)
                    : slotLabel(item.slot);
                  const selectItem = () => actions.onSelectItem?.(item.urn);
                  return (
                    <UiEntity
                      uiTransform={{
                        width: gridCellW,
                        margin: { right: spacing.xs, bottom: spacing.xs },
                        padding: {
                          top: spacing.xs,
                          bottom: spacing.xs,
                          left: spacing.xs,
                          right: spacing.xs,
                        },
                        borderRadius: radius.md,
                        flexDirection: "column",
                        alignItems: "stretch",
                      }}
                      uiBackground={{ color: selectedCard ? color.accentSoft : color.surfaceSoft }}
                    >
                      <UiEntity
                        uiTransform={{
                          width: "100%",
                          flexDirection: "row",
                          justifyContent: "center",
                        }}
                        onMouseDown={selectItem}
                      >
                        <ItemThumbnailBox kind={item.kind} thumbnailUrl={item.thumbnailUrl} size={gridThumb} />
                      </UiEntity>
                      <UiEntity
                        uiTransform={{ width: "100%", height: s(24), margin: { top: s(2) } }}
                        uiText={{
                          value: truncateLabel(item.name, 22),
                          fontSize: font.micro,
                          color: color.textPrimary,
                          textAlign: "middle-center",
                        }}
                        onMouseDown={selectItem}
                      />
                      <UiEntity
                        uiTransform={{
                          width: "100%",
                          height: s(14),
                          margin: { top: 0, bottom: 0 },
                        }}
                        uiText={{
                          value: item.rarity === "mana" ? "MANA" : item.rarity,
                          fontSize: font.micro,
                          color: rcol,
                          textAlign: "middle-center",
                        }}
                        onMouseDown={selectItem}
                      />
                      <UiEntity
                        uiTransform={{
                          width: "100%",
                          height: s(14),
                          flexDirection: "row",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        {leftoverTab ? (
                          <UiEntity
                            uiTransform={{ width: "100%", height: s(14), overflow: "hidden" }}
                            uiText={{
                              value: [leftoverKindLabel, slot].filter(Boolean).join(" · "),
                              fontSize: font.micro,
                              color: color.textMuted,
                              textAlign: "middle-center",
                              textWrap: "nowrap",
                            }}
                            onMouseDown={selectItem}
                          />
                        ) : (
                          <UiEntity
                            uiTransform={{
                              flexDirection: "row",
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            {mintCopy.walletLabel ? (
                              <UiEntity
                                uiTransform={{ height: s(14), flexShrink: 0 }}
                                uiText={{
                                  value: mintCopy.walletLabel,
                                  fontSize: font.micro,
                                  color: color.textMuted,
                                  textAlign: "middle-center",
                                }}
                                onMouseDown={selectItem}
                              />
                            ) : null}
                            {mintCopy.leftoverLabel ? (
                              <UiEntity
                                uiTransform={{ height: s(14), padding: { left: s(3), right: s(3) }, flexShrink: 0 }}
                                uiText={{
                                  value: mintCopy.leftoverLabel,
                                  fontSize: font.micro,
                                  color: color.success,
                                  textAlign: "middle-center",
                                }}
                                onMouseDown={() => actions.onNftKind?.("leftover")}
                              />
                            ) : null}
                            {slot ? (
                              <UiEntity
                                uiTransform={{ height: s(14), flexShrink: 0 }}
                                uiText={{
                                  value: `${mintCopy.walletLabel || mintCopy.leftoverLabel ? " · " : ""}${slot}`,
                                  fontSize: font.micro,
                                  color: color.textMuted,
                                  textAlign: "middle-center",
                                }}
                                onMouseDown={selectItem}
                              />
                            ) : null}
                          </UiEntity>
                        )}
                      </UiEntity>
                    </UiEntity>
                  );
                })}
              </UiEntity>
            )}
            <InventoryPageBar
              page={browsed.page}
              pageCount={browsed.pageCount}
              compact={layoutMetrics.compact}
              onGoToPage={actions.onInventoryGoToPage}
            />
          </UiEntity>
          <FooterBar
            compact={layoutMetrics.compact}
            backLabel="BACK"
            primaryLabel={selected ? `DEPOSIT ${deposit.quantity}` : "DEPOSIT"}
            primaryEnabled={confirmReady}
            onBack={() => actions.onBackDeposit?.()}
            onPrimary={() => actions.onConfirmDeposit?.()}
          />
        </UiEntity>
      ) : null}

      {panels.open === "depositMana" ? (
        <UiEntity uiTransform={{ width: "100%", flexDirection: "column", flexGrow: 1, minHeight: 0 }}>
          <UiEntity uiTransform={{ width: "100%", flexGrow: 1, minHeight: 0, flexDirection: "column" }}>
          <UiEntity
            uiTransform={{
              width: "100%",
              height: s(56),
              margin: { bottom: spacing.sm },
              padding: { left: spacing.sm, right: spacing.sm },
              borderRadius: radius.md,
              flexDirection: "row",
              alignItems: "center",
            }}
            uiBackground={{ color: color.surfaceSoft }}
          >
            <UiEntity uiTransform={{ margin: { right: spacing.sm } }}>
              <ItemThumbnailBox kind="wearable" thumbnailUrl={MANA_TOKEN_ICON_SRC} size={36} />
            </UiEntity>
            <UiEntity uiTransform={{ flexDirection: "column", flexGrow: 1, minWidth: 0 }}>
              <UiEntity
                uiText={{ value: "MANA", fontSize: font.body, color: color.textPrimary, textAlign: "middle-left" }}
              />
              <UiEntity
                uiText={{
                  value: `Minimum ${deposit.minMana}`,
                  fontSize: font.micro,
                  color: color.textMuted,
                  textAlign: "middle-left",
                }}
              />
            </UiEntity>
            <UiEntity
              uiTransform={{ flexShrink: 0, minWidth: 0, padding: { left: spacing.sm } }}
              uiText={{
                value: `BALANCE: ${deposit.manaBalanceLabel}`,
                fontSize: font.micro,
                color: color.textPrimary,
                textAlign: "middle-right",
              }}
            />
          </UiEntity>
          <UiEntity uiTransform={{ flexDirection: "row", width: "100%", alignItems: "center", margin: { bottom: spacing.sm } }}>
            <RmButton label="-" variant="secondary" size={actionSize} onClick={() => actions.onAdjustQuantity?.(-1)} />
            <UiEntity uiTransform={{ flexGrow: 1, minWidth: 0, margin: { left: spacing.xs, right: spacing.xs } }}>
              <RmTextField
                placeholder={String(deposit.minMana)}
                value={String(deposit.manaAmount)}
                onChange={(value) => actions.onSetManaAmount?.(value)}
                size={createPartyFieldSize(layoutMetrics.compact)}
              />
            </UiEntity>
            <RmButton label="+" variant="secondary" size={actionSize} onClick={() => actions.onAdjustQuantity?.(1)} />
          </UiEntity>
          <UiEntity
            uiTransform={{ width: "100%", minHeight: s(20), margin: { bottom: spacing.sm } }}
            uiText={{
              value: props.walletConnected ? "Wallet connected — confirm to sign." : "Connect a Web3 wallet to sign.",
              fontSize: font.micro,
              color: color.textMuted,
              textAlign: "middle-center",
            }}
          />
          </UiEntity>
          <FooterBar
            compact={layoutMetrics.compact}
            backLabel="BACK"
            primaryLabel={`DEPOSIT ${deposit.manaAmount} MANA`}
            primaryEnabled={confirmReady && Boolean(props.walletConnected)}
            onBack={() => actions.onBackDeposit?.()}
            onPrimary={() => actions.onConfirmDeposit?.()}
          />
        </UiEntity>
      ) : null}

      {panels.open === "depositStatus" ? (
        <UiEntity uiTransform={{ width: "100%", flexDirection: "column", flexGrow: 1, minHeight: 0 }}>
          <UiEntity uiTransform={{ width: "100%", flexGrow: 1, minHeight: 0, flexDirection: "column" }}>
          <UiEntity uiTransform={{ flexDirection: "row", width: "100%", height: s(14), margin: { bottom: spacing.sm } }}>
            {DEPOSIT_STAGES.filter((stage) => stage !== "failed" && stage !== "idle").map((stage, index) => (
              <UiEntity
                uiTransform={{
                  width: s(10),
                  height: s(10),
                  borderRadius: 5,
                  margin: { right: spacing.xs },
                }}
                uiBackground={{
                  color:
                    deposit.stage === "failed"
                      ? color.danger
                      : index <= depositStageIndex(deposit.stage)
                        ? color.success
                        : color.toggleTrack,
                }}
              />
            ))}
          </UiEntity>
          {deposit.asset === "MANA" ? (
            <UiEntity uiTransform={{ width: "100%", flexDirection: "row", justifyContent: "center", margin: { bottom: spacing.sm } }}>
              <ItemThumbnailBox kind="wearable" thumbnailUrl={MANA_TOKEN_ICON_SRC} size={44} />
            </UiEntity>
          ) : null}
          {formatDepositSummaryLines({
            asset: deposit.asset,
            stage: deposit.stage,
            message: deposit.message,
            receipt: deposit.receipt,
          }).map((line) => {
            const lineH = Math.max(20, measureWrappedTextHeight(line, 11, 480));
            return (
              <UiEntity
                uiTransform={{ width: "100%", height: s(lineH), margin: { bottom: spacing.xs }, flexShrink: 0 }}
                uiText={{
                  value: line,
                  fontSize: font.caption,
                  color: deposit.stage === "failed" ? color.danger : color.textPrimary,
                  textAlign: "top-center",
                  textWrap: "wrap",
                }}
              />
            );
          })}
          </UiEntity>
          <FooterBar
            compact={layoutMetrics.compact}
            backLabel={deposit.stage === "failed" ? "BACK" : "CLOSE"}
            primaryLabel={
              canShowRetryVerification({ stage: deposit.stage, receipt: deposit.receipt })
                ? "RETRY VERIFICATION"
                : deposit.stage === "failed"
                  ? "RETRY"
                  : undefined
            }
            primaryEnabled={
              deposit.stage === "failed" ||
              canShowRetryVerification({ stage: deposit.stage, receipt: deposit.receipt })
            }
            onBack={() => (deposit.stage === "failed" ? actions.onBackDeposit?.() : actions.onClosePanel?.())}
            onPrimary={
              deposit.stage === "failed" ||
              canShowRetryVerification({ stage: deposit.stage, receipt: deposit.receipt })
                ? () => actions.onConfirmDeposit?.()
                : undefined
            }
          />
        </UiEntity>
      ) : null}

      {panels.open === "depositNftMints" && selected && !deposit.autoPick ? (
        <DepositMintsModal
          item={selected}
          selectedMints={deposit.selectedMints}
          quantity={deposit.quantity}
          lowMintLock={deposit.lowMintLock}
          protectedMintNumbers={deposit.protectedMintNumbers}
          compact={layoutMetrics.compact}
          onClose={() => actions.onBackDeposit?.()}
          onToggleMint={(mint) => actions.onToggleMint?.(mint)}
          onConfirm={() => actions.onConfirmDeposit?.()}
        />
      ) : null}
    </RmCard>
  );
}
