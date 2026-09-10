import { balloonHudSlotBox, balloonHudSlotFits, type BalloonHudNormRect } from "./balloonHudArt";
import type { LayoutRect, UiCanvas } from "./uiLayout";

export const LEARN_MORE_ART_WIDTH = 1024;
export const LEARN_MORE_ART_HEIGHT = 576;
export const LEARN_MORE_ART_ASPECT = LEARN_MORE_ART_HEIGHT / LEARN_MORE_ART_WIDTH;
export const LEARN_MORE_ART_SRC = "assets/images/ui_learnMore.png";

export const LEARN_MORE_SLOTS = {
  /** Instruction copy sits in the open field above the gold timer pill. */
  body: { left: 0.13, top: 0.34, width: 0.74, height: 0.27 },
  /** First two instruction lines (red). */
  bodyLead: { left: 0.13, top: 0.34, width: 0.74, height: 0.13 },
  /** Last three instruction lines (white), above the timer pill. */
  bodyTrail: { left: 0.13, top: 0.46, width: 0.74, height: 0.145 },
  /** Countdown only — the pill chrome is in the PNG. */
  pill: { left: 0.19, top: 0.617, width: 0.62, height: 0.10 },
  /** Baked OK THANKS button. */
  close: { left: 0.30, top: 0.735, width: 0.40, height: 0.16 },
} as const satisfies Record<string, BalloonHudNormRect>;

export const learnMoreSlotBox = balloonHudSlotBox;
export const learnMoreSlotFits = balloonHudSlotFits;

/** Centered landscape card that keeps the 1024×576 art ratio. */
export function learnMorePanelSize(canvas: UiCanvas): { width: number; height: number } {
  const targetWidth = Math.round(canvas.virtualWidth * 0.5);
  const minWidth = Math.round(Math.min(560, canvas.virtualWidth * 0.78));
  const maxWidth = Math.round(Math.min(canvas.virtualWidth * 0.62, 960));
  let width = Math.max(minWidth, Math.min(maxWidth, targetWidth));
  let height = Math.round(width * LEARN_MORE_ART_ASPECT);
  const heightCap = Math.max(260, Math.round(canvas.virtualHeight * 0.78));
  if (height > heightCap) {
    height = heightCap;
    width = Math.round(height / LEARN_MORE_ART_ASPECT);
  }
  return { width, height };
}
