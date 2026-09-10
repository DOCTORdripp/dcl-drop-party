import { balloonBlowingHudSize } from "./balloonHudArt";
import { balloonRewardsPanelSize, BALLOON_REWARDS_ART_ASPECT } from "./balloonRewardsArt";
import { helpWantedHirePanelSize } from "./helpWantedArt";
import { learnMorePanelSize } from "./learnMoreArt";
import { turnInBalloonsPanelSize } from "./turnInBalloonsArt";
import {
  chestPanelRect,
  chestSafeRegion,
  chestUiDensity,
  nativeControlBox,
  COMPACT_HUD_CLIP_TOP,
  COMPACT_LEFT_HUD_PAD,
  type UiEdgeInsets,
} from "./chestUiLayout";
import {
  NEXT_DROP_HUD_GAP,
  NEXT_DROP_TICKER_COMPACT_HEIGHT,
  NEXT_DROP_TICKER_COMPACT_TOP,
  NEXT_DROP_TICKER_HEIGHT,
  NEXT_DROP_TICKER_TOP,
  PARTY_HUD_HEIGHT,
  PARTY_HUD_WIDTH,
  POP_BUTTON_CENTER_RATIO,
  POP_BUTTON_SIZE,
  POP_ELIGIBLE_LABEL_GAP,
  POP_ELIGIBLE_LABEL_HEIGHT,
  POP_UI_MOBILE_VIRTUAL_HEIGHT,
  POP_UI_MOBILE_VIRTUAL_WIDTH,
  POP_UI_VIRTUAL_HEIGHT,
  POP_UI_VIRTUAL_WIDTH,
  TOAST_BELOW_HUD_GAP,
  WIN_TOAST_HEIGHT,
  WIN_TOAST_WIDTH,
  PARTY_WIN_FEED_RIGHT,
  PARTY_WIN_FEED_ROW_HEIGHT,
  PARTY_WIN_FEED_TOP,
  PARTY_WIN_FEED_WIDTH,
  WORLD_TOAST_RIGHT,
  WORLD_TOAST_TOP,
  WORLD_TOAST_WIDTH,
} from "./constants";
import { PARTY_WIN_FEED_MAX_VISIBLE } from "./wins";

export type UiCanvas = {
  virtualWidth: number;
  virtualHeight: number;
};

export const DEFAULT_UI_CANVAS: UiCanvas = {
  virtualWidth: POP_UI_VIRTUAL_WIDTH,
  virtualHeight: POP_UI_VIRTUAL_HEIGHT,
};

export const MOBILE_UI_CANVAS: UiCanvas = {
  virtualWidth: POP_UI_MOBILE_VIRTUAL_WIDTH,
  virtualHeight: POP_UI_MOBILE_VIRTUAL_HEIGHT,
};

/**
 * Desktop always lays out in the registered 1920×1080 canvas.
 * Live UiCanvasInformation on Hub/desktop is window or device pixels (often 4K),
 * which shoves every panel to the right of the 1920 renderer.
 * Mobile remaps a leaked 1920 canvas to 1600×720.
 */
export function canvasForLayout(live: UiCanvas, mobile: boolean): UiCanvas {
  if (!mobile) {
    return DEFAULT_UI_CANVAS;
  }
  if (chestUiDensity(live) === "desktop") {
    return MOBILE_UI_CANVAS;
  }
  return live;
}

/** Future castle/chest surfaces inherit this same centered convention. */
export const CENTERED_UI_KINDS = [
  "partyHud",
  "personalNotify",
  "gameplayControl",
  "modal",
  "treasureChest",
  "deposit",
  "confirmPanel",
  "balloonBlowing",
  "balloonRewards",
  "crafting",
] as const;

export type CenteredUiKind = (typeof CENTERED_UI_KINDS)[number];

export type LayoutRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export const CENTERED_MODAL_WIDTH = 920;
export const CENTERED_MODAL_HEIGHT = 560;
export const WORLD_TOAST_COMPACT_WIDTH = 280;
export const WORLD_TOAST_LANE_GAP = 24;

export function canvasCenterX(canvas: UiCanvas = DEFAULT_UI_CANVAS): number {
  return canvas.virtualWidth / 2;
}

export function centeredLeft(width: number, canvas: UiCanvas = DEFAULT_UI_CANVAS): number {
  return canvasCenterX(canvas) - width / 2;
}

export function isHorizontallyCentered(
  rect: Pick<LayoutRect, "left" | "width">,
  canvas: UiCanvas = DEFAULT_UI_CANVAS,
): boolean {
  return Math.abs(rect.left + rect.width / 2 - canvasCenterX(canvas)) < 0.51;
}

export function layoutCenteredRect(
  width: number,
  height: number,
  top: number,
  canvas: UiCanvas = DEFAULT_UI_CANVAS,
): LayoutRect {
  return {
    left: centeredLeft(width, canvas),
    top,
    width,
    height,
  };
}

/** Reusable centered panel for chest / deposit / confirm / crafting. */
export function centeredPanelLayout(
  width: number,
  height: number,
  canvas: UiCanvas = DEFAULT_UI_CANVAS,
  options?: { top?: number },
): LayoutRect {
  const personal = personalNotifyLayout(canvas);
  const top =
    options?.top ??
    Math.max(
      personal.top + personal.height + TOAST_BELOW_HUD_GAP,
      Math.round(canvas.virtualHeight / 2 - height / 2),
    );
  return layoutCenteredRect(width, height, top, canvas);
}

/** Scale a preferred size into `safe` while keeping height/width = aspect. */
export function fitAspectRectInRegion(
  preferred: { width: number; height: number },
  aspect: number,
  safe: LayoutRect,
  pin: "center" | "top" = "center",
): LayoutRect {
  let width = Math.min(preferred.width, Math.max(1, safe.width));
  let height = width * aspect;
  if (height > safe.height) {
    height = Math.max(1, safe.height);
    width = height / aspect;
  }
  if (width > safe.width) {
    width = Math.max(1, safe.width);
    height = width * aspect;
  }
  const top =
    pin === "top"
      ? safe.top
      : Math.round(safe.top + (safe.height - height) / 2);
  return {
    left: Math.round(safe.left + (safe.width - width) / 2),
    top: Math.round(top),
    width: Math.round(width),
    height: Math.round(height),
  };
}

function npcDialogArtLayout(
  size: { width: number; height: number },
  canvas: UiCanvas,
  insets?: UiEdgeInsets,
): LayoutRect {
  const density = chestUiDensity(canvas);
  const safe = chestSafeRegion(canvas, insets, density);
  const aspect = size.height / Math.max(1, size.width);
  if (density === "compact") {
    return fitAspectRectInRegion(size, aspect, safe);
  }
  const desiredTop = safe.top + BALLOON_REWARDS_SAFE_OFFSET[density];
  const top = Math.min(desiredTop, Math.max(8, canvas.virtualHeight - size.height - 8));
  return {
    left: centeredLeft(size.width, canvas),
    top,
    width: size.width,
    height: size.height,
  };
}

function compactLeftHudArtLayout(
  size: { width: number; height: number },
  canvas: UiCanvas,
  insets?: UiEdgeInsets,
): LayoutRect {
  const density = chestUiDensity(canvas);
  const safe = chestSafeRegion(canvas, insets, density);
  const aspect = size.height / Math.max(1, size.width);
  const fitted = fitAspectRectInRegion(size, aspect, safe);
  const box = nativeControlBox(canvas, density);
  const left = COMPACT_LEFT_HUD_PAD;
  const maxRight = Math.min(safe.left + safe.width, box.left - 8);
  let width = fitted.width;
  let height = fitted.height;
  if (left + width > maxRight) {
    width = Math.max(240, maxRight - left);
    height = width * aspect;
  }
  return {
    left,
    top: Math.round(fitted.top),
    width: Math.round(width),
    height: Math.round(height),
  };
}

export function learnMorePanelLayout(
  canvas: UiCanvas = DEFAULT_UI_CANVAS,
  insets?: UiEdgeInsets,
): LayoutRect {
  const density = chestUiDensity(canvas);
  const size = learnMorePanelSize(canvas);
  if (density === "compact") {
    return compactLeftHudArtLayout(size, canvas, insets);
  }
  return npcDialogArtLayout(size, canvas, insets);
}

/** Compact Help Wanted / Start Blowing sit at the top of the interactable canvas, not 8% below it. */
function compactTopPinnedRegion(
  canvas: UiCanvas,
  insets: UiEdgeInsets | undefined,
  density: ReturnType<typeof chestUiDensity>,
): LayoutRect {
  const safe = chestSafeRegion(canvas, insets, density);
  const top = Math.round(canvas.virtualHeight * 0.01);
  return {
    left: safe.left,
    top,
    width: safe.width,
    height: Math.max(1, safe.top + safe.height - top),
  };
}

/**
 * Mobile Start/Stop is allowed to clip the top of the canvas so REWARDS rises
 * above the Explorer F / jump cluster. Desktop is unchanged.
 */
export const COMPACT_BLOWING_HUD_TOP = COMPACT_HUD_CLIP_TOP;
/** Extra space so the painted REWARDS on Start/Stop sits above F / +. */
export const COMPACT_BLOWING_CONTROL_GAP = 64;
export const MUSIC_ICON_COUNT = 4;
export const MUSIC_ICON_SIZE_DESKTOP = 48;
export const MUSIC_ICON_SIZE_COMPACT = 56;
export const MUSIC_ICON_GAP_DESKTOP = 6;
export const MUSIC_ICON_GAP_COMPACT = 8;
export const MUSIC_ICON_BLOWING_GAP = 6;
/** Tuck mobile controls into the transparent right edge of the Start/Stop art. */
export const MUSIC_ICON_BLOWING_GAP_COMPACT = -20;

export function helpWantedHirePanelLayout(
  canvas: UiCanvas = DEFAULT_UI_CANVAS,
  insets?: UiEdgeInsets,
): LayoutRect {
  const density = chestUiDensity(canvas);
  const size = helpWantedHirePanelSize(canvas);
  if (density === "compact") {
    const region = compactTopPinnedRegion(canvas, insets, density);
    const aspect = size.height / Math.max(1, size.width);
    return fitAspectRectInRegion(size, aspect, region, "top");
  }
  return npcDialogArtLayout(size, canvas, insets);
}

export function turnInBalloonsPanelLayout(
  canvas: UiCanvas = DEFAULT_UI_CANVAS,
  insets?: UiEdgeInsets,
): LayoutRect {
  const density = chestUiDensity(canvas);
  const size = turnInBalloonsPanelSize(canvas);
  if (density === "compact") {
    return compactLeftHudArtLayout(size, canvas, insets);
  }
  return npcDialogArtLayout(size, canvas, insets);
}

/** Compact next-drop ticker left pin. */
export const COMPACT_OVERLAY_LEFT = 48;
/** Compact welcome-back greeting sits further left than the ticker. */
export const COMPACT_GREETING_LEFT = 8;

export function nextDropTickerLayout(
  canvas: UiCanvas = DEFAULT_UI_CANVAS,
  density = chestUiDensity(canvas),
): LayoutRect {
  const compact = density === "compact";
  const height = compact ? NEXT_DROP_TICKER_COMPACT_HEIGHT : NEXT_DROP_TICKER_HEIGHT;
  const top = compact ? NEXT_DROP_TICKER_COMPACT_TOP : NEXT_DROP_TICKER_TOP;
  if (compact) {
    const box = nativeControlBox(canvas, density);
    const left = COMPACT_OVERLAY_LEFT;
    const width = Math.min(640, Math.max(280, box.left - left - 24));
    return { left, top, width, height };
  }
  const width = Math.min(900, Math.max(320, canvas.virtualWidth - 80));
  return layoutCenteredRect(width, height, top, canvas);
}

export function partyHudLayout(canvas: UiCanvas = DEFAULT_UI_CANVAS): LayoutRect {
  const ticker = nextDropTickerLayout(canvas);
  const top = ticker.top + ticker.height + NEXT_DROP_HUD_GAP;
  const width = Math.min(PARTY_HUD_WIDTH, Math.max(240, canvas.virtualWidth - 48));
  return layoutCenteredRect(width, PARTY_HUD_HEIGHT, top, canvas);
}

export function personalNotifyLayout(canvas: UiCanvas = DEFAULT_UI_CANVAS): LayoutRect {
  const hud = partyHudLayout(canvas);
  const width = Math.min(WIN_TOAST_WIDTH, Math.max(280, canvas.virtualWidth - 48));
  return layoutCenteredRect(width, WIN_TOAST_HEIGHT, hud.top + hud.height + TOAST_BELOW_HUD_GAP, canvas);
}

export function gameplayControlLayout(
  canvas: UiCanvas = DEFAULT_UI_CANVAS,
  _insets?: UiEdgeInsets,
): LayoutRect & {
  clusterTop: number;
  clusterLeft: number;
  clusterWidth: number;
  clusterHeight: number;
} {
  const preferredTop = Math.round(canvas.virtualHeight * POP_BUTTON_CENTER_RATIO - POP_BUTTON_SIZE / 2);
  const personal = personalNotifyLayout(canvas);
  let buttonTop = Math.max(preferredTop, personal.top + personal.height + TOAST_BELOW_HUD_GAP);
  const density = chestUiDensity(canvas);
  if (density === "compact") {
    const box = nativeControlBox(canvas, density);
    const maxTop = box.height > 0 ? box.top - POP_BUTTON_SIZE - 8 : canvas.virtualHeight - POP_BUTTON_SIZE - 8;
    buttonTop = Math.min(buttonTop, Math.max(8, maxTop));
  }
  const clusterWidth = Math.max(280, POP_BUTTON_SIZE);
  const clusterHeight = POP_ELIGIBLE_LABEL_HEIGHT + POP_ELIGIBLE_LABEL_GAP + POP_BUTTON_SIZE;
  const clusterTop = buttonTop - POP_ELIGIBLE_LABEL_HEIGHT - POP_ELIGIBLE_LABEL_GAP;
  return {
    ...layoutCenteredRect(POP_BUTTON_SIZE, POP_BUTTON_SIZE, buttonTop, canvas),
    clusterTop,
    clusterLeft: centeredLeft(clusterWidth, canvas),
    clusterWidth,
    clusterHeight,
  };
}

export function chestPanelLayout(canvas: UiCanvas = DEFAULT_UI_CANVAS, insets?: UiEdgeInsets): LayoutRect {
  return chestPanelRect(canvas, insets);
}

export function modalLayout(canvas: UiCanvas = DEFAULT_UI_CANVAS): LayoutRect {
  const width = Math.min(CENTERED_MODAL_WIDTH, Math.max(320, canvas.virtualWidth - 80));
  const height = Math.min(CENTERED_MODAL_HEIGHT, Math.max(240, canvas.virtualHeight - 200));
  return centeredPanelLayout(width, height, canvas);
}

export type WorldEventToastLayout = {
  lane: "world-event";
  top: number;
  right: number;
  width: number;
  left: number;
  compact: boolean;
};

export const EMPLOYEE_GREETING_BANNER_WIDTH = 720;
export const EMPLOYEE_GREETING_BANNER_HEIGHT = 108;
export const EMPLOYEE_GREETING_PORTRAIT_SIZE = 84;
export const COMPACT_GREETING_DOWN = 24;
export const COMPACT_HIRE_GIFT_EXTRA_DOWN = 16;
export const COMPACT_WELCOME_EXTRA_HEIGHT = 16;

/** Pin a compact card to the bottom of an already-resolved safe region (centered on desktop, left-pinned on compact). */
export function employeeGreetingBannerInSafe(
  safe: LayoutRect,
  compact = false,
  welcome = false,
): LayoutRect {
  const width = Math.min(EMPLOYEE_GREETING_BANNER_WIDTH, Math.max(280, safe.width - 24));
  const baseHeight = Math.min(
    EMPLOYEE_GREETING_BANNER_HEIGHT,
    Math.max(72, Math.round(safe.height * 0.18)),
  );
  const height = baseHeight + (compact && welcome ? COMPACT_WELCOME_EXTRA_HEIGHT : 0);
  const bottomGap = Math.max(10, Math.round(safe.height * 0.05));
  return {
    left: compact ? COMPACT_GREETING_LEFT : safe.left + (safe.width - width) / 2,
    top:
      safe.top +
      safe.height -
      baseHeight -
      bottomGap +
      (compact
        ? COMPACT_GREETING_DOWN + (welcome ? 0 : COMPACT_HIRE_GIFT_EXTRA_DOWN)
        : 0),
    width,
    height,
  };
}

/** Centered in an already-resolved safe region — used for the full-inventory turn-in alert. */
export function balloonFullAlertInSafe(safe: LayoutRect): LayoutRect {
  const width = Math.min(820, Math.max(300, safe.width - 48));
  const height = Math.min(160, Math.max(96, Math.round(safe.height * 0.18)));
  return {
    left: safe.left + (safe.width - width) / 2,
    top: safe.top + Math.round((safe.height - height) / 2),
    width,
    height,
  };
}

/** Desktop: centered in HUD-safe, pinned low. Compact: left-pinned, further left than the next-drop ticker. */
export function employeeGreetingBannerLayout(
  canvas: UiCanvas = DEFAULT_UI_CANVAS,
  insets?: UiEdgeInsets,
  welcome = false,
): LayoutRect {
  const density = chestUiDensity(canvas);
  return employeeGreetingBannerInSafe(
    chestSafeRegion(canvas, insets, density),
    density === "compact",
    welcome,
  );
}

/** Bottom-center of the HUD-safe region. Compact pins above the native jump cluster. */
export function tableSeatedCountLayout(
  canvas: UiCanvas = DEFAULT_UI_CANVAS,
  insets?: UiEdgeInsets,
): LayoutRect {
  const density = chestUiDensity(canvas);
  const compact = density === "compact";
  const safe = chestSafeRegion(canvas, insets, density);
  const width = Math.min(compact ? 360 : 380, Math.max(200, Math.round(safe.width * (compact ? 0.5 : 0.24))));
  const height = compact ? 56 : 52;
  const bottomGap = compact ? 10 : Math.max(14, Math.round(safe.height * 0.03));
  let top = safe.top + safe.height - height - bottomGap;
  let leftBound = safe.left;
  let rightBound = safe.left + safe.width;
  if (compact) {
    const box = nativeControlBox(canvas, density);
    if (box.height > 0) {
      top = box.top - height - 10;
    } else {
      top = canvas.virtualHeight - height - 16;
    }
    const blowing = balloonBlowingHudLayout(canvas, insets);
    rightBound = Math.min(rightBound, blowing.left - 12);
  }
  const maxWidth = Math.max(160, rightBound - leftBound);
  const fittedWidth = Math.min(width, maxWidth);
  return {
    left: Math.round(leftBound + (maxWidth - fittedWidth) / 2),
    top: Math.max(8, top),
    width: fittedWidth,
    height,
  };
}

export const BALLOON_REWARDS_DISCLAIMER_HEIGHT = 34;
export const BALLOON_REWARDS_DISCLAIMER_GAP = 8;
export const BALLOON_REWARDS_DISCLAIMER_COMPACT_WIDEN = 32;
export const BALLOON_REWARDS_DISCLAIMER_COMPACT_DOWN = 6;

/** Extra pixels below the HUD-safe top. Smaller than the deposit panel's 60/40 drop. */
export const BALLOON_REWARDS_SAFE_OFFSET = {
  desktop: 24,
  compact: 12,
} as const;

export function balloonRewardsPanelLayout(
  canvas: UiCanvas = DEFAULT_UI_CANVAS,
  insets?: UiEdgeInsets,
): LayoutRect {
  return balloonRewardsStackLayout(canvas, insets).panel;
}

/** Disclaimer sits above the art — the revised 9-row graphic has no room inside. */
export function balloonRewardsStackLayout(
  canvas: UiCanvas = DEFAULT_UI_CANVAS,
  insets?: UiEdgeInsets,
): {
  panel: LayoutRect;
  disclaimer: LayoutRect;
} {
  const density = chestUiDensity(canvas);
  const safe = chestSafeRegion(canvas, insets, density);
  const desiredTop = safe.top + BALLOON_REWARDS_SAFE_OFFSET[density];
  const chrome = BALLOON_REWARDS_DISCLAIMER_HEIGHT + BALLOON_REWARDS_DISCLAIMER_GAP;
  const available = Math.max(
    120,
    (density === "compact" ? safe.top + safe.height : canvas.virtualHeight) - desiredTop - 8,
  );
  const { width, height } = balloonRewardsPanelSize(canvas, available - chrome);
  if (density === "compact") {
    const chrome = BALLOON_REWARDS_DISCLAIMER_HEIGHT + BALLOON_REWARDS_DISCLAIMER_GAP;
    const stackTop = COMPACT_BLOWING_HUD_TOP;
    const blowing = balloonBlowingHudLayout(canvas, insets);
    const leftPad = COMPACT_LEFT_HUD_PAD;
    const rightLimit = Math.max(leftPad + 240, blowing.left - 16);
    const maxW = Math.max(240, rightLimit - leftPad);
    const bottom = Math.round(canvas.virtualHeight * 0.92);
    let panelHeight = Math.max(120, bottom - stackTop - chrome);
    let panelWidth = panelHeight / BALLOON_REWARDS_ART_ASPECT;
    if (panelWidth > maxW) {
      panelWidth = maxW;
      panelHeight = panelWidth * BALLOON_REWARDS_ART_ASPECT;
    }
    const left = leftPad;
    const disclaimerWidth = Math.round(panelWidth) + BALLOON_REWARDS_DISCLAIMER_COMPACT_WIDEN;
    return {
      disclaimer: {
        left: left - BALLOON_REWARDS_DISCLAIMER_COMPACT_WIDEN / 2,
        top: stackTop + BALLOON_REWARDS_DISCLAIMER_COMPACT_DOWN,
        width: disclaimerWidth,
        height: BALLOON_REWARDS_DISCLAIMER_HEIGHT,
      },
      panel: {
        left,
        top: stackTop + chrome,
        width: Math.round(panelWidth),
        height: Math.round(panelHeight),
      },
    };
  }
  const stackHeight = chrome + height;
  const top = Math.min(desiredTop, Math.max(8, canvas.virtualHeight - stackHeight));
  const left = centeredLeft(width, canvas);
  return {
    disclaimer: {
      left,
      top,
      width,
      height: BALLOON_REWARDS_DISCLAIMER_HEIGHT,
    },
    panel: {
      left,
      top: top + BALLOON_REWARDS_DISCLAIMER_HEIGHT + BALLOON_REWARDS_DISCLAIMER_GAP,
      width,
      height,
    },
  };
}

export function balloonBlowingHudLayout(
  canvas: UiCanvas = DEFAULT_UI_CANVAS,
  insets?: UiEdgeInsets,
): LayoutRect {
  const preferred = balloonBlowingHudSize(canvas);
  const density = chestUiDensity(canvas);
  const aspect = preferred.height / Math.max(1, preferred.width);
  if (density === "desktop") {
    const musicReserve = MUSIC_ICON_SIZE_DESKTOP + MUSIC_ICON_BLOWING_GAP;
    const right = Math.max(12, Math.round(canvas.virtualWidth * 0.015)) + musicReserve;
    return {
      left: canvas.virtualWidth - right - preferred.width,
      top: Math.max(8, Math.round(canvas.virtualHeight * 0.02)),
      width: preferred.width,
      height: preferred.height,
    };
  }
  const region = compactTopPinnedRegion(canvas, insets, density);
  const box = nativeControlBox(canvas, density);
  const top = COMPACT_BLOWING_HUD_TOP;
  const bottom = box.top - COMPACT_BLOWING_CONTROL_GAP;
  let height = Math.max(preferred.height, bottom - top);
  let width = Math.round(height / aspect);
  if (width > region.width) {
    width = region.width;
    height = Math.round(width * aspect);
  }
  const desiredLeft = Math.max(region.left, region.left + region.width - width - 8);
  return {
    left: Math.round(desiredLeft),
    top,
    width,
    height,
  };
}

export function musicIconSize(canvas: UiCanvas = DEFAULT_UI_CANVAS): number {
  return chestUiDensity(canvas) === "compact" ? MUSIC_ICON_SIZE_COMPACT : MUSIC_ICON_SIZE_DESKTOP;
}

export function musicIconGap(canvas: UiCanvas = DEFAULT_UI_CANVAS): number {
  return chestUiDensity(canvas) === "compact" ? MUSIC_ICON_GAP_COMPACT : MUSIC_ICON_GAP_DESKTOP;
}

export function musicControlsLayout(
  canvas: UiCanvas = DEFAULT_UI_CANVAS,
  insets?: UiEdgeInsets,
  _blowingVisible = true,
): LayoutRect {
  const size = musicIconSize(canvas);
  const gap = musicIconGap(canvas);
  const width = size;
  const height = size * MUSIC_ICON_COUNT + gap * (MUSIC_ICON_COUNT - 1);
  const blowing = balloonBlowingHudLayout(canvas, insets);
  const blowingGap =
    chestUiDensity(canvas) === "compact"
      ? MUSIC_ICON_BLOWING_GAP_COMPACT
      : MUSIC_ICON_BLOWING_GAP;
  const left = blowing.left + blowing.width + blowingGap;
  const top = blowing.top < 0 ? 8 : blowing.top;
  return { left, top, width, height };
}

export function musicControlButtonRects(bar: LayoutRect): LayoutRect[] {
  const size = bar.width;
  const gap = MUSIC_ICON_COUNT > 1 ? (bar.height - size * MUSIC_ICON_COUNT) / (MUSIC_ICON_COUNT - 1) : 0;
  return Array.from({ length: MUSIC_ICON_COUNT }, (_, index) => ({
    left: 0,
    top: Math.round(index * (size + gap)),
    width: size,
    height: size,
  }));
}

export function worldEventToastLayout(
  canvas: UiCanvas = DEFAULT_UI_CANVAS,
  insets?: UiEdgeInsets,
): WorldEventToastLayout {
  const personal = personalNotifyLayout(canvas);
  const density = chestUiDensity(canvas);
  const safe = chestSafeRegion(canvas, insets, density);
  const edgeRight =
    density === "compact"
      ? Math.max(8, canvas.virtualWidth - (safe.left + safe.width))
      : WORLD_TOAST_RIGHT;
  const fullLeft = canvas.virtualWidth - edgeRight - WORLD_TOAST_WIDTH;
  const overlapsCenterLane = fullLeft < personal.left + personal.width + WORLD_TOAST_LANE_GAP;
  const tooNarrow = canvas.virtualWidth < WORLD_TOAST_WIDTH + edgeRight + personal.width * 0.5;
  const compact = overlapsCenterLane || tooNarrow || density === "compact";
  const width = compact ? WORLD_TOAST_COMPACT_WIDTH : WORLD_TOAST_WIDTH;
  const left =
    density === "compact"
      ? Math.round(safe.left + safe.width - width)
      : canvas.virtualWidth - edgeRight - width;
  return {
    lane: "world-event",
    top: density === "compact" ? Math.max(safe.top, WORLD_TOAST_TOP) : WORLD_TOAST_TOP,
    right: canvas.virtualWidth - left - width,
    width,
    left,
    compact,
  };
}

export function partyWinFeedLayout(
  canvas: UiCanvas = DEFAULT_UI_CANVAS,
  insets?: UiEdgeInsets,
  _avoid?: LayoutRect,
): LayoutRect {
  const density = chestUiDensity(canvas);
  const safe = chestSafeRegion(canvas, insets, density);
  const stackedHeight =
    PARTY_WIN_FEED_ROW_HEIGHT * PARTY_WIN_FEED_MAX_VISIBLE + 4 * (PARTY_WIN_FEED_MAX_VISIBLE - 1);
  if (density === "compact") {
    const box = nativeControlBox(canvas, density);
    const width = Math.min(PARTY_WIN_FEED_WIDTH, Math.max(200, Math.round(safe.width * 0.42)));
    const left = Math.round(safe.left + safe.width - width);
    const top = Math.max(safe.top, PARTY_WIN_FEED_TOP);
    const maxBottom = box.top > 0 ? box.top - 8 : safe.top + safe.height;
    const height = Math.max(PARTY_WIN_FEED_ROW_HEIGHT, Math.min(stackedHeight, maxBottom - top));
    return { left, top, width, height };
  }
  return {
    left: canvas.virtualWidth - PARTY_WIN_FEED_RIGHT - PARTY_WIN_FEED_WIDTH,
    top: PARTY_WIN_FEED_TOP,
    width: PARTY_WIN_FEED_WIDTH,
    height: stackedHeight,
  };
}

export function centeredLaneLayout(canvas: UiCanvas = DEFAULT_UI_CANVAS): {
  partyHud: LayoutRect;
  personalNotify: LayoutRect;
  gameplayControl: ReturnType<typeof gameplayControlLayout>;
  modal: LayoutRect;
} {
  return {
    partyHud: partyHudLayout(canvas),
    personalNotify: personalNotifyLayout(canvas),
    gameplayControl: gameplayControlLayout(canvas),
    modal: modalLayout(canvas),
  };
}

export function rectsOverlap(a: LayoutRect, b: LayoutRect): boolean {
  return (
    a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top
  );
}

export function centeredAbsoluteTransform(rect: LayoutRect): {
  positionType: "absolute";
  position: { top: number; left: number };
  width: number;
  height: number;
} {
  return {
    positionType: "absolute",
    position: { top: rect.top, left: rect.left },
    width: rect.width,
    height: rect.height,
  };
}
