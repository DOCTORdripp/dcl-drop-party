import { balloonHudSlotBox, balloonHudSlotFits, type BalloonHudNormRect } from "./balloonHudArt";
import type { LayoutRect, UiCanvas } from "./uiLayout";

export const HELP_WANTED_ART_WIDTH = 1024;
export const HELP_WANTED_ART_HEIGHT = 565;
export const HELP_WANTED_ART_ASPECT = HELP_WANTED_ART_HEIGHT / HELP_WANTED_ART_WIDTH;
export const HELP_WANTED_ART_SRC = "assets/images/ui_helpWanted.png";

export const HELP_WANTED_SLOTS = {
  /** White hire copy fills the inner gold-framed field. Title and buttons are baked. */
  body: { left: 0.168, top: 0.378, width: 0.664, height: 0.325 },
  okay: { left: 0.12, top: 0.72, width: 0.38, height: 0.22 },
  decline: { left: 0.50, top: 0.72, width: 0.38, height: 0.22 },
} as const satisfies Record<string, BalloonHudNormRect>;

export const helpWantedSlotBox = balloonHudSlotBox;
export const helpWantedSlotFits = balloonHudSlotFits;

export function helpWantedBodyFontSize(panelWidth: number): number {
  return Math.max(14, Math.round(20 * (panelWidth / 860)));
}

/** Centered landscape card that keeps the 1024×565 art ratio. */
export function helpWantedHirePanelSize(canvas: UiCanvas): { width: number; height: number } {
  const targetWidth = Math.round(canvas.virtualWidth * 0.5);
  const minWidth = Math.round(Math.min(560, canvas.virtualWidth * 0.78));
  const maxWidth = Math.round(Math.min(canvas.virtualWidth * 0.62, 960));
  let width = Math.max(minWidth, Math.min(maxWidth, targetWidth));
  let height = Math.round(width * HELP_WANTED_ART_ASPECT);
  const heightCap = Math.max(260, Math.round(canvas.virtualHeight * 0.78));
  if (height > heightCap) {
    height = heightCap;
    width = Math.round(height / HELP_WANTED_ART_ASPECT);
  }
  return { width, height };
}

export function helpWantedHireSlotRect(panel: LayoutRect, slot: BalloonHudNormRect): LayoutRect {
  return {
    left: slot.left * panel.width,
    top: slot.top * panel.height,
    width: slot.width * panel.width,
    height: slot.height * panel.height,
  };
}
