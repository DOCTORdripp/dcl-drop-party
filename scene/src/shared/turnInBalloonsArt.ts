import { balloonHudSlotBox, balloonHudSlotFits, type BalloonHudNormRect } from "./balloonHudArt";
import type { LayoutRect, UiCanvas } from "./uiLayout";

export const TURN_IN_ART_WIDTH = 1024;
export const TURN_IN_ART_HEIGHT = 768;
export const TURN_IN_ART_ASPECT = TURN_IN_ART_HEIGHT / TURN_IN_ART_WIDTH;
export const TURN_IN_ART_SRC = "assets/images/ui_turnInBalloons.png";

export const TURN_IN_SLOTS = {
  /** Two-line copy at the top of the inner gold field. */
  body: { left: 0.18, top: 0.368, width: 0.64, height: 0.11 },
  prompt: { left: 0.16, top: 0.492, width: 0.68, height: 0.05 },
  /** Compact baked TURN IN BALLOONS button under the field. */
  turnIn: { left: 0.27, top: 0.748, width: 0.46, height: 0.112 },
  /** Circular X in the top-right of the frame. */
  close: { left: 0.892, top: 0.052, width: 0.078, height: 0.104 },
} as const satisfies Record<string, BalloonHudNormRect>;

/** Square icon size in panel-normalized height (width is derived from art aspect). */
const CAPTCHA_ICON_SIZE_Y = 0.128;
const CAPTCHA_ICON_GAP_X = 0.032;
const CAPTCHA_ICON_GAP_ABOVE = 0.02;

export function turnInCaptchaIconSlots(): BalloonHudNormRect[] {
  const count = 4;
  const height = CAPTCHA_ICON_SIZE_Y;
  const width = height * TURN_IN_ART_ASPECT;
  const gap = CAPTCHA_ICON_GAP_X;
  const rowWidth = count * width + (count - 1) * gap;
  const left = 0.5 - rowWidth / 2;
  const top = TURN_IN_SLOTS.prompt.top + TURN_IN_SLOTS.prompt.height + CAPTCHA_ICON_GAP_ABOVE;
  return Array.from({ length: count }, (_, index) => ({
    left: left + index * (width + gap),
    top,
    width,
    height,
  }));
}

export const turnInSlotBox = balloonHudSlotBox;
export const turnInSlotFits = balloonHudSlotFits;

export function turnInBodyFontSize(panelWidth: number, compact = false): number {
  const base = compact ? 24 : 20;
  const min = compact ? 19 : 16;
  return Math.max(min, Math.round(base * (panelWidth / 860)));
}

/** Centered card that keeps the 1024×768 art ratio. */
export function turnInBalloonsPanelSize(canvas: UiCanvas): { width: number; height: number } {
  const targetWidth = Math.round(canvas.virtualWidth * 0.5);
  const minWidth = Math.round(Math.min(560, canvas.virtualWidth * 0.78));
  const maxWidth = Math.round(Math.min(canvas.virtualWidth * 0.62, 960));
  let width = Math.max(minWidth, Math.min(maxWidth, targetWidth));
  let height = Math.round(width * TURN_IN_ART_ASPECT);
  const heightCap = Math.max(260, Math.round(canvas.virtualHeight * 0.78));
  if (height > heightCap) {
    height = heightCap;
    width = Math.round(height / TURN_IN_ART_ASPECT);
  }
  return { width, height };
}

export function turnInBalloonsSlotRect(panel: LayoutRect, slot: BalloonHudNormRect): LayoutRect {
  return {
    left: slot.left * panel.width,
    top: slot.top * panel.height,
    width: slot.width * panel.width,
    height: slot.height * panel.height,
  };
}
