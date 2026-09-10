import type { BalloonHudMode } from "./balloonHud";
import type { LayoutRect, UiCanvas } from "./uiLayout";

export const BALLOON_HUD_ART_WIDTH = 1024;
export const BALLOON_HUD_ART_HEIGHT = 1280;
export const BALLOON_HUD_ART_ASPECT = BALLOON_HUD_ART_HEIGHT / BALLOON_HUD_ART_WIDTH;
export const BALLOON_HUD_START_SRC = "assets/images/ui_startBlowing.png";
export const BALLOON_HUD_STOP_SRC = "assets/images/ui_stopBlowing.png";

export type BalloonHudNormRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type BalloonHudArtSlots = {
  action: BalloonHudNormRect;
  rewards: BalloonHudNormRect;
  carried: BalloonHudNormRect;
  next?: BalloonHudNormRect;
  kiteBonus?: BalloonHudNormRect;
  level: BalloonHudNormRect;
  totalXp: BalloonHudNormRect;
  xpToLvl: BalloonHudNormRect;
  turnInPrompt?: BalloonHudNormRect;
};

const ACTION: BalloonHudNormRect = { left: 0.04, top: 0.02, width: 0.92, height: 0.24 };

export const BALLOON_HUD_START_SLOTS: BalloonHudArtSlots = {
  action: ACTION,
  carried: { left: 0.38, top: 0.484, width: 0.36, height: 0.036 },
  kiteBonus: { left: 0.08, top: 0.752, width: 0.84, height: 0.048 },
  level: { left: 0.29, top: 0.698, width: 0.16, height: 0.05 },
  totalXp: { left: 0.47, top: 0.698, width: 0.14, height: 0.05 },
  xpToLvl: { left: 0.67, top: 0.698, width: 0.16, height: 0.05 },
  rewards: { left: 0.11, top: 0.805, width: 0.78, height: 0.085 },
  turnInPrompt: { left: 0.08, top: 0.272, width: 0.84, height: 0.062 },
};

export const BALLOON_HUD_STOP_SLOTS: BalloonHudArtSlots = {
  action: ACTION,
  carried: { left: 0.430, top: 0.422, width: 0.316, height: 0.036 },
  next: { left: 0.4, top: 0.578, width: 0.355, height: 0.036 },
  kiteBonus: { left: 0.08, top: 0.802, width: 0.84, height: 0.032 },
  level: { left: 0.24, top: 0.752, width: 0.16, height: 0.05 },
  totalXp: { left: 0.46, top: 0.752, width: 0.14, height: 0.05 },
  xpToLvl: { left: 0.70, top: 0.752, width: 0.16, height: 0.05 },
  rewards: { left: 0.11, top: 0.838, width: 0.78, height: 0.085 },
};

export function balloonHudArtSrc(mode: BalloonHudMode): string {
  return mode === "blowing" ? BALLOON_HUD_STOP_SRC : BALLOON_HUD_START_SRC;
}

export function balloonHudArtSlots(mode: BalloonHudMode, compact = false): BalloonHudArtSlots {
  const slots = mode === "blowing" ? BALLOON_HUD_STOP_SLOTS : BALLOON_HUD_START_SLOTS;
  if (!compact) {
    return slots;
  }
  return {
    ...slots,
    carried: {
      ...slots.carried,
      top: Math.max(0, slots.carried.top - 0.03),
      height: Math.max(0.028, slots.carried.height - 0.004),
    },
    next: slots.next
      ? {
          ...slots.next,
          top: Math.max(0, slots.next.top - 0.032),
          height: Math.max(0.028, slots.next.height - 0.004),
        }
      : undefined,
  };
}

export function balloonHudSlotRect(panel: LayoutRect, slot: BalloonHudNormRect): LayoutRect {
  return {
    left: slot.left * panel.width,
    top: slot.top * panel.height,
    width: slot.width * panel.width,
    height: slot.height * panel.height,
  };
}

/** Full field box. Never shrink to the string — a tight width wraps "225" onto two glyphs. */
export function balloonHudSlotBox(
  panel: LayoutRect,
  slot: BalloonHudNormRect,
): {
  positionType: "absolute";
  position: { left: number; top: number };
  width: number;
  height: number;
} {
  return {
    positionType: "absolute",
    position: {
      left: slot.left * panel.width,
      top: slot.top * panel.height,
    },
    width: slot.width * panel.width,
    height: slot.height * panel.height,
  };
}

export function balloonHudSlotFits(slot: BalloonHudNormRect): boolean {
  return (
    slot.left >= 0 &&
    slot.top >= 0 &&
    slot.left + slot.width <= 1.001 &&
    slot.top + slot.height <= 1.001
  );
}

/** Compact portrait card: ~24% of the 1920 HUD width, never more than half the screen tall. */
export function balloonBlowingHudSize(canvas: UiCanvas): { width: number; height: number } {
  const targetWidth = Math.round(canvas.virtualWidth * 0.24);
  const minWidth = Math.round(Math.min(300, canvas.virtualWidth * 0.22));
  const maxWidth = Math.round(Math.min(canvas.virtualWidth * 0.28, 460));
  let width = Math.max(minWidth, Math.min(maxWidth, targetWidth));
  let height = Math.round(width * BALLOON_HUD_ART_ASPECT);
  const maxHeight = Math.round(canvas.virtualHeight * 0.52);
  if (height > maxHeight) {
    height = maxHeight;
    width = Math.round(height / BALLOON_HUD_ART_ASPECT);
  }
  return { width, height };
}

export function balloonHudValueFontSize(
  panelWidth: number,
  kind: "count" | "stat" | "timer" | "level" | "prompt" | "bonus",
): number {
  const scale = panelWidth / 420;
  if (kind === "count") {
    return Math.max(26, Math.round(36 * scale));
  }
  if (kind === "timer") {
    return Math.max(26, Math.round(34 * scale));
  }
  if (kind === "level") {
    return Math.max(20, Math.round(20 * scale));
  }
  if (kind === "prompt") {
    return Math.max(12, Math.round(13 * scale));
  }
  if (kind === "bonus") {
    return Math.max(11, Math.round(13 * scale));
  }
  return Math.max(12, Math.round(16 * scale));
}

/** DCL UiText supports `<b>` / `<i>`; Label has no fontWeight. */
export function balloonHudBoldValue(text: string): string {
  return `<b>${text}</b>`;
}
