/**
 * Shared Deposit Chest panel geometry.
 * Desktop centers in the HUD-safe region. Compact pins to the same left
 * column as Rewards and fills a tall card down toward the bottom of the canvas.
 *
 * Desktop values are pixels in the 1920×1080 UI space.
 */

import { POP_UI_VIRTUAL_HEIGHT, POP_UI_VIRTUAL_WIDTH } from "./constants";
import type { LayoutRect, UiCanvas } from "./uiLayout";

const FALLBACK_CANVAS: UiCanvas = {
  virtualWidth: POP_UI_VIRTUAL_WIDTH,
  virtualHeight: POP_UI_VIRTUAL_HEIGHT,
};

export type ChestUiDensity = "desktop" | "compact";

export type UiEdgeInsets = {
  top: number;
  left: number;
  right: number;
  bottom: number;
};

export type ChestUiMetrics = {
  canvas: UiCanvas;
  density: ChestUiDensity;
  compact: boolean;
  safe: LayoutRect;
  panel: LayoutRect;
  /** Ornate deposit art, larger than `panel` so the gold frame sits outside the content. */
  background: LayoutRect;
  pad: number;
  contentWidth: number;
  contentHeight: number;
  bodyMinHeight: number;
  homeBodyHeight: number;
  tileSize: number;
  tileGap: number;
  tilePad: number;
  iconSize: number;
  labelMinHeight: number;
  heroMinHeight: number;
  rowMinHeight: number;
  prizeTileMinHeight: number;
  prizeThumbSize: number;
  titleFont: number;
  subtitleFont: number;
  bodyFont: number;
  captionFont: number;
  microFont: number;
  displayFont: number;
  buttonFont: number;
  actionButtonHeight: number;
};

export const CHEST_DESKTOP_PANEL_WIDTH = 540;
export const CHEST_DESKTOP_PANEL_HEIGHT = 540;

/** Compact when the virtual canvas is phone-landscape sized. */
export const CHEST_COMPACT_MAX_HEIGHT = 800;
export const CHEST_COMPACT_MAX_WIDTH = 1400;

export const COMPACT_PANEL_MAX_WIDTH = 800;
export const COMPACT_PANEL_MIN_WIDTH = 400;
export const COMPACT_PANEL_MAX_HEIGHT = 720;
export const COMPACT_PANEL_MIN_HEIGHT = 300;
export const COMPACT_PANEL_WIDTH_RATIO = 0.72;
export const COMPACT_PANEL_HEIGHT_RATIO = 0.98;

/** Same left column as compact Rewards (`balloonRewardsStackLayout`). */
export const COMPACT_LEFT_HUD_PAD = 104;
/** Clip above the canvas like Start/Stop and Rewards. */
export const COMPACT_HUD_CLIP_TOP = -40;
export const COMPACT_HUD_BOTTOM_RATIO = 0.92;

export const MOBILE_ACTION_MIN_HEIGHT = 44;
export const MOBILE_ACTION_HEIGHT = 48;
export const MOBILE_TITLE_FONT_MIN = 18;
export const MOBILE_BODY_FONT_MIN = 14;
export const MOBILE_BUTTON_FONT_MIN = 13;
export const MOBILE_COUNTDOWN_FONT_MIN = 20;
export const MOBILE_CAPTION_FONT_MIN = 11;
export const MOBILE_ICON_RATIO = 0.8;

/**
 * Fallback insets as canvas ratios — not screenshot pixels.
 * Right reserve covers DCL landscape action/jump controls.
 */
export const COMPACT_SAFE_INSET_RATIOS = {
  top: 0.08,
  left: 0.04,
  right: 0.3,
  bottom: 0.28,
} as const;

export const DESKTOP_SAFE_INSET_RATIOS = {
  top: 0.02,
  left: 0.02,
  right: 0.02,
  bottom: 0.02,
} as const;

export const CHEST_COMPACT_INNER_PAD = 12;
export const CHEST_DESKTOP_INNER_PAD = 12;

/**
 * Extra pixels after pinning to the safe-region top-left.
 * Desktop: 1920×1080 space. Left/top must clear Explorer's sidebar and scene-name bar
 * after the gold frame pad (72px) grows around the content panel.
 * Compact stays at 60 so the 2x2 home tiles still fill the shorter panel.
 */
export const CHEST_PANEL_SAFE_OFFSET = {
  desktop: { left: 140, top: 132 },
  compact: { left: 0, top: 60 },
} as const;

/** Explorer map/backpack rail and scene-name/reload bar, in 1920×1080 pixels. */
export const DESKTOP_EXPLORER_CHROME = {
  left: 88,
  top: 64,
} as const;

export function chestPanelSafeOffset(density: ChestUiDensity): { left: number; top: number } {
  return CHEST_PANEL_SAFE_OFFSET[density];
}

export const DEPOSIT_BG_SRC = "assets/images/ui_depositBg.png";

/**
 * Extra pixels of art around the unchanged content panel.
 * ~10% of the square desktop art, so the gold frame and swirls sit outside the tiles.
 */
export const DEPOSIT_BG_FRAME_PAD = {
  desktop: 72,
  compact: 48,
} as const;

/** Painted close gem in the top-right of `ui_depositBg.png`, as a fraction of the art. */
export const DEPOSIT_BG_CLOSE_SLOT = {
  left: 0.855,
  top: 0.012,
  width: 0.125,
  height: 0.125,
} as const;

export function depositBgFramePad(density: ChestUiDensity): number {
  return DEPOSIT_BG_FRAME_PAD[density];
}

export function rectContains(outer: LayoutRect, inner: LayoutRect, tolerance = 0.51): boolean {
  return (
    inner.left >= outer.left - tolerance &&
    inner.top >= outer.top - tolerance &&
    inner.left + inner.width <= outer.left + outer.width + tolerance &&
    inner.top + inner.height <= outer.top + outer.height + tolerance
  );
}

/**
 * Grow the art around the content panel without moving or resizing that panel.
 * The frame may clip off the top-left of the canvas; shifting it would slide gold under the tiles.
 */
export function depositBackgroundRect(
  panel: LayoutRect,
  _canvas: UiCanvas,
  pad: number,
): LayoutRect {
  return {
    left: Math.round(panel.left - pad),
    top: Math.round(panel.top - pad),
    width: Math.round(panel.width + pad * 2),
    height: Math.round(panel.height + pad * 2),
  };
}

export function depositBgCloseRect(background: LayoutRect): LayoutRect {
  return {
    left: Math.round(background.left + background.width * DEPOSIT_BG_CLOSE_SLOT.left),
    top: Math.round(background.top + background.height * DEPOSIT_BG_CLOSE_SLOT.top),
    width: Math.max(28, Math.round(background.width * DEPOSIT_BG_CLOSE_SLOT.width)),
    height: Math.max(28, Math.round(background.height * DEPOSIT_BG_CLOSE_SLOT.height)),
  };
}

export function chestUiDensity(canvas: UiCanvas): ChestUiDensity {
  if (canvas.virtualHeight <= CHEST_COMPACT_MAX_HEIGHT || canvas.virtualWidth < CHEST_COMPACT_MAX_WIDTH) {
    return "compact";
  }
  return "desktop";
}

export function liveInsetsAreUsable(canvas: UiCanvas, live: UiEdgeInsets): boolean {
  const width = canvas.virtualWidth - live.left - live.right;
  const height = canvas.virtualHeight - live.top - live.bottom;
  return width >= 300 && height >= 240;
}

/** Bottom-right explorer action cluster (E / F / jump). Interactable still draws these on top. */
export const NATIVE_CONTROL_BOX = 180;

export function nativeControlReserve(
  canvas: UiCanvas,
  density = chestUiDensity(canvas),
): { right: number; bottom: number } {
  if (density === "desktop") {
    return { right: 0, bottom: 0 };
  }
  const rightWanted = Math.max(
    NATIVE_CONTROL_BOX,
    Math.round(canvas.virtualWidth * COMPACT_SAFE_INSET_RATIOS.right),
  );
  const bottomWanted = Math.max(
    NATIVE_CONTROL_BOX,
    Math.round(canvas.virtualHeight * COMPACT_SAFE_INSET_RATIOS.bottom),
  );
  return {
    right: Math.min(rightWanted, Math.max(48, canvas.virtualWidth - 320)),
    bottom: Math.min(bottomWanted, Math.max(48, canvas.virtualHeight - 260)),
  };
}

export function nativeControlBox(canvas: UiCanvas, density = chestUiDensity(canvas)): LayoutRect {
  const reserve = nativeControlReserve(canvas, density);
  return {
    left: canvas.virtualWidth - reserve.right,
    top: canvas.virtualHeight - reserve.bottom,
    width: reserve.right,
    height: reserve.bottom,
  };
}

function mergeNativeControlReserve(
  canvas: UiCanvas,
  insets: UiEdgeInsets,
  density: ChestUiDensity,
): UiEdgeInsets {
  const reserve = nativeControlReserve(canvas, density);
  return {
    top: insets.top,
    left: insets.left,
    right: Math.max(insets.right, reserve.right),
    bottom: Math.max(insets.bottom, reserve.bottom),
  };
}

export function resolveChestInsets(
  canvas: UiCanvas,
  live?: UiEdgeInsets,
  density = chestUiDensity(canvas),
): UiEdgeInsets {
  if (live && live.top + live.left + live.right + live.bottom > 0 && liveInsetsAreUsable(canvas, live)) {
    return mergeNativeControlReserve(canvas, live, density);
  }
  const ratios = density === "compact" ? COMPACT_SAFE_INSET_RATIOS : DESKTOP_SAFE_INSET_RATIOS;
  return mergeNativeControlReserve(
    canvas,
    {
      top: Math.round(canvas.virtualHeight * ratios.top),
      left: Math.round(canvas.virtualWidth * ratios.left),
      right: Math.round(canvas.virtualWidth * ratios.right),
      bottom: Math.round(canvas.virtualHeight * ratios.bottom),
    },
    density,
  );
}

export function ensureMinTapRect(
  slot: LayoutRect,
  parent: { width: number; height: number },
  minSize = MOBILE_ACTION_HEIGHT,
): LayoutRect {
  const width = Math.min(parent.width, Math.max(slot.width, minSize));
  const height = Math.min(parent.height, Math.max(slot.height, minSize));
  let left = slot.left + (slot.width - width) / 2;
  let top = slot.top + (slot.height - height) / 2;
  left = Math.max(0, Math.min(left, parent.width - width));
  top = Math.max(0, Math.min(top, parent.height - height));
  return {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(width),
    height: Math.round(height),
  };
}

export function chestSafeRegion(
  canvas: UiCanvas,
  live?: UiEdgeInsets,
  density = chestUiDensity(canvas),
): LayoutRect {
  const insets = resolveChestInsets(canvas, live, density);
  return {
    left: insets.left,
    top: insets.top,
    width: Math.max(0, canvas.virtualWidth - insets.left - insets.right),
    height: Math.max(0, canvas.virtualHeight - insets.top - insets.bottom),
  };
}

export function panelFitsSafe(panel: LayoutRect, safe: LayoutRect): boolean {
  return (
    panel.left >= safe.left - 0.51 &&
    panel.top >= safe.top - 0.51 &&
    panel.left + panel.width <= safe.left + safe.width + 0.51 &&
    panel.top + panel.height <= safe.top + safe.height + 0.51
  );
}

export function isCenteredInRegion(panel: LayoutRect, region: LayoutRect, tolerance = 8): boolean {
  const panelCx = panel.left + panel.width / 2;
  const panelCy = panel.top + panel.height / 2;
  const regionCx = region.left + region.width / 2;
  const regionCy = region.top + region.height / 2;
  return Math.abs(panelCx - regionCx) <= tolerance && Math.abs(panelCy - regionCy) <= tolerance;
}

export function isHorizontallyCenteredInRegion(
  panel: LayoutRect,
  region: LayoutRect,
  tolerance = 8,
): boolean {
  const panelCx = panel.left + panel.width / 2;
  const regionCx = region.left + region.width / 2;
  return Math.abs(panelCx - regionCx) <= tolerance;
}

export function isPinnedTopLeftInRegion(
  panel: LayoutRect,
  region: LayoutRect,
  tolerance = 8,
  density?: ChestUiDensity,
): boolean {
  const densities: ChestUiDensity[] = density ? [density] : ["desktop", "compact"];
  return densities.some((entry) => {
    const expected = pinChestPanelTopLeft(region, panel.width, panel.height, chestPanelSafeOffset(entry));
    return Math.abs(panel.left - expected.left) <= tolerance && Math.abs(panel.top - expected.top) <= tolerance;
  });
}

/** Safe region is the max usable box. The panel must stay smaller than that box. */
export function panelDoesNotFillSafe(panel: LayoutRect, safe: LayoutRect): boolean {
  if (safe.width <= 0 || safe.height <= 0) return false;
  const widthFill = panel.width / safe.width;
  const areaFill = (panel.width * panel.height) / (safe.width * safe.height);
  if (safe.width >= 900) {
    return widthFill <= 0.82 && areaFill <= 0.78;
  }
  return widthFill <= 0.92 && panel.width <= safe.width - 8;
}

export function compactPanelSize(safe: LayoutRect): { width: number; height: number } {
  const maxW = Math.max(240, safe.width - 16);
  const maxH = Math.max(220, safe.height - 16);
  const minW = Math.min(COMPACT_PANEL_MIN_WIDTH, maxW);
  const minH = Math.min(COMPACT_PANEL_MIN_HEIGHT, maxH);
  const width = Math.round(
    Math.min(COMPACT_PANEL_MAX_WIDTH, maxW, Math.max(minW, safe.width * COMPACT_PANEL_WIDTH_RATIO)),
  );
  const height = Math.round(
    Math.min(COMPACT_PANEL_MAX_HEIGHT, maxH, Math.max(minH, safe.height * COMPACT_PANEL_HEIGHT_RATIO)),
  );
  return { width, height };
}

export function chestPanelRect(
  canvas: UiCanvas = FALLBACK_CANVAS,
  live?: UiEdgeInsets,
  density = chestUiDensity(canvas),
): LayoutRect {
  const safe = chestSafeRegion(canvas, live, density);
  const inner = CHEST_DESKTOP_INNER_PAD;
  let width: number;
  let height: number;
  if (density === "desktop") {
    const maxW = Math.max(240, safe.width - inner * 2);
    const maxH = Math.max(220, safe.height - inner * 2);
    width = Math.min(CHEST_DESKTOP_PANEL_WIDTH, maxW);
    height = Math.min(CHEST_DESKTOP_PANEL_HEIGHT, maxH);
  } else {
    const framePad = depositBgFramePad(density);
    const box = nativeControlBox(canvas, density);
    const leftPad = Math.max(COMPACT_LEFT_HUD_PAD, safe.left);
    const stackTop = COMPACT_HUD_CLIP_TOP;
    const bottom = Math.round(canvas.virtualHeight * COMPACT_HUD_BOTTOM_RATIO);
    const maxBgRight = Math.min(box.left - 16, canvas.virtualWidth - 8);
    const maxBgW = Math.max(240, maxBgRight - leftPad);
    const maxBgH = Math.max(120, bottom - stackTop);
    const bgSide = Math.min(maxBgW, maxBgH);
    width = Math.max(240, bgSide - framePad * 2);
    height = Math.max(120, bgSide - framePad * 2);
    return {
      left: Math.round(leftPad + framePad),
      top: Math.round(stackTop + framePad),
      width,
      height,
    };
  }
  return {
    left: Math.round(safe.left + (safe.width - width) / 2),
    top: Math.round(safe.top + (safe.height - height) / 2),
    width,
    height,
  };
}

function pinChestPanelTopLeft(
  safe: LayoutRect,
  width: number,
  height: number,
  offset: { left: number; top: number },
): LayoutRect {
  const maxLeft = safe.left + Math.max(0, safe.width - width);
  const maxTop = safe.top + Math.max(0, safe.height - height);
  return {
    left: Math.round(Math.min(maxLeft, safe.left + offset.left)),
    top: Math.round(Math.min(maxTop, safe.top + offset.top)),
    width,
    height,
  };
}

/** Three equal deposit-type tiles (Wearables / Emotes / Mana) in the card inner width. */
export function depositTypeTileLayout(
  contentWidth: number,
  compact: boolean,
): {
  tileSize: number;
  tileGap: number;
  tilePad: number;
  iconSize: number;
  labelMinHeight: number;
  rowWidth: number;
} {
  const tileGap = compact ? 12 : 12;
  const tilePad = compact ? 8 : 8;
  const labelMinHeight = compact ? 26 : 28;
  const tileSize = Math.max(80, Math.floor((contentWidth - tileGap * 2) / 3));
  const iconBudget = tileSize - tilePad * 2 - labelMinHeight - 4;
  const iconSize = Math.max(36, Math.min(iconBudget, Math.round(tileSize * 0.58)));
  return {
    tileSize,
    tileGap,
    tilePad,
    iconSize,
    labelMinHeight,
    rowWidth: tileSize * 3 + tileGap * 2,
  };
}

export function chestRootTileLayout(
  contentWidth: number,
  compact: boolean,
  bodyHeight = 400,
): {
  tileSize: number;
  tileGap: number;
  tilePad: number;
  iconSize: number;
  labelMinHeight: number;
} {
  const tileGap = compact ? 16 : 12;
  const tilePad = compact ? 8 : 10;
  const labelMinHeight = compact ? 28 : 36;
  const cap = compact ? 360 : 220;
  const maxByWidth = Math.floor((contentWidth - tileGap) / 2);
  const maxByHeight = Math.floor((bodyHeight - tileGap) / 2);
  let tileSize = Math.max(1, Math.min(cap, maxByWidth, Math.max(1, maxByHeight)));
  if (tileSize * 2 + tileGap > bodyHeight) {
    tileSize = Math.max(1, Math.floor((bodyHeight - tileGap) / 2));
  }
  const iconBudget = tileSize - tilePad * 2 - labelMinHeight - 4;
  const iconSize = compact
    ? Math.max(72, Math.min(iconBudget, Math.round(tileSize * MOBILE_ICON_RATIO)))
    : Math.max(40, Math.min(148, iconBudget));
  return { tileSize, tileGap, tilePad, iconSize, labelMinHeight };
}

export function chestRootGridWidth(metrics: Pick<ChestUiMetrics, "tileSize" | "tileGap">): number {
  return metrics.tileSize * 2 + metrics.tileGap;
}

export function chestRootGridHeight(metrics: Pick<ChestUiMetrics, "tileSize" | "tileGap">): number {
  return metrics.tileSize * 2 + metrics.tileGap;
}

export function chestRootGridFits(metrics: ChestUiMetrics): boolean {
  return (
    chestRootGridWidth(metrics) <= metrics.contentWidth + 0.51 &&
    chestRootGridHeight(metrics) <= metrics.homeBodyHeight + 0.51
  );
}

export function homeTilesFillBody(metrics: ChestUiMetrics): boolean {
  const grid = chestRootGridWidth(metrics) * chestRootGridHeight(metrics);
  const body = metrics.contentWidth * metrics.homeBodyHeight;
  return body > 0 && grid / body >= 0.55;
}

export function scaleInsetsToCanvas(source: UiCanvas, insets: UiEdgeInsets, target: UiCanvas): UiEdgeInsets {
  const sx = source.virtualWidth > 0 ? target.virtualWidth / source.virtualWidth : 1;
  const sy = source.virtualHeight > 0 ? target.virtualHeight / source.virtualHeight : 1;
  return {
    top: insets.top * sy,
    left: insets.left * sx,
    right: insets.right * sx,
    bottom: insets.bottom * sy,
  };
}

/**
 * Place the chest in the active renderer canvas (live virtual size).
 * Desktop stays 1920×1080; mobile uses the explorer canvas after interactable inset.
 */
export function chestLayoutForRenderer(
  renderer: UiCanvas,
  live?: { canvas: UiCanvas; insets?: UiEdgeInsets },
  densityOverride?: ChestUiDensity,
): ChestUiMetrics {
  const density = densityOverride ?? chestUiDensity(renderer);
  return chestUiMetrics(renderer, live?.insets, density);
}

export function chestUiMetrics(
  canvas: UiCanvas = FALLBACK_CANVAS,
  live?: UiEdgeInsets,
  density = chestUiDensity(canvas),
): ChestUiMetrics {
  const compact = density === "compact";
  const safe = chestSafeRegion(canvas, live, density);
  const panel = chestPanelRect(canvas, live, density);
  const background = depositBackgroundRect(panel, canvas, depositBgFramePad(density));
  const pad = compact ? CHEST_COMPACT_INNER_PAD : CHEST_DESKTOP_INNER_PAD;
  const contentWidth = Math.max(1, panel.width - pad * 2);
  const contentHeight = Math.max(1, panel.height - pad * 2);
  const headerReserve = compact ? 52 : 48;
  const homeBodyHeight = Math.max(80, contentHeight - headerReserve);
  const bodyMinHeight = Math.max(80, contentHeight - headerReserve - 8);
  const tiles = chestRootTileLayout(contentWidth, compact, homeBodyHeight);
  const heroRoom = Math.floor(bodyMinHeight * 0.4);
  return {
    canvas,
    density,
    compact,
    safe,
    panel,
    background,
    pad,
    contentWidth,
    contentHeight,
    bodyMinHeight,
    homeBodyHeight,
    tileSize: tiles.tileSize,
    tileGap: tiles.tileGap,
    tilePad: tiles.tilePad,
    iconSize: tiles.iconSize,
    labelMinHeight: tiles.labelMinHeight,
    heroMinHeight: compact ? Math.min(170, Math.max(140, heroRoom)) : 168,
    rowMinHeight: compact ? 66 : 66,
    prizeTileMinHeight: compact ? 88 : 86,
    prizeThumbSize: compact ? 48 : 36,
    titleFont: compact ? 19 : 18,
    subtitleFont: compact ? 15 : 14,
    bodyFont: compact ? 14 : 13,
    captionFont: compact ? 12 : 11,
    microFont: compact ? 11 : 10,
    displayFont: compact ? 22 : 22,
    buttonFont: compact ? 14 : 13,
    actionButtonHeight: compact ? MOBILE_ACTION_HEIGHT : 32,
  };
}

export function reservedRightEdge(canvas: UiCanvas, live?: UiEdgeInsets): number {
  return canvas.virtualWidth - resolveChestInsets(canvas, live).right;
}

export function upcomingStackFits(metrics: ChestUiMetrics, extraRows: number): boolean {
  return metrics.heroMinHeight + extraRows * metrics.rowMinHeight <= metrics.bodyMinHeight + 0.51;
}

export function chestFooterHeight(metrics: Pick<ChestUiMetrics, "actionButtonHeight" | "compact">): number {
  return metrics.compact ? metrics.actionButtonHeight : 32;
}

/** Pixel height of the scrolling party list inside the deposit card (header + timezone + BACK). */
export function partyDashboardListHeight(metrics: ChestUiMetrics): number {
  const header = metrics.compact ? 52 : 48;
  const timezone = metrics.compact ? 88 : 32;
  const footer = chestFooterHeight(metrics) + (metrics.compact ? 16 : 8);
  return Math.max(metrics.compact ? 140 : 160, metrics.contentHeight - header - timezone - footer);
}

/** Nested BACK/footer sits on the inner bottom edge of the panel. */
export const CHEST_FOOTER_HEIGHT = 32;

export function chestFooterRect(metrics: ChestUiMetrics): LayoutRect {
  const height = chestFooterHeight(metrics);
  return {
    left: metrics.panel.left + metrics.pad,
    top: metrics.panel.top + metrics.panel.height - metrics.pad - height,
    width: metrics.contentWidth,
    height,
  };
}
