import type { BalloonHudNormRect } from "./balloonHudArt";
import { balloonHudSlotBox, balloonHudSlotFits, balloonHudSlotRect } from "./balloonHudArt";
import type { UiCanvas } from "./uiLayout";

export const BALLOON_REWARDS_ART_WIDTH = 819;
export const BALLOON_REWARDS_ART_HEIGHT = 1024;
export const BALLOON_REWARDS_ART_ASPECT = BALLOON_REWARDS_ART_HEIGHT / BALLOON_REWARDS_ART_WIDTH;
export const BALLOON_REWARDS_ART_SRC = "assets/images/ui_rewards.png";
export const BALLOON_REWARDS_DETAIL_ART_SRC = "assets/images/ui_rewardsDetail.png";
export const BALLOON_REWARD_ICON_PLACEHOLDER = "assets/images/icon_prizeMystery.png";

export type BalloonRewardRowSlots = {
  hit: BalloonHudNormRect;
  icon: BalloonHudNormRect;
  name: BalloonHudNormRect;
  level: BalloonHudNormRect;
  cost: BalloonHudNormRect;
  status: BalloonHudNormRect;
};

/** First gold row top and step, measured on the 819×1024 9-row catalog art. */
const ROW_TOPS = [0.3047, 0.3623, 0.4199, 0.4775, 0.5352, 0.5938, 0.6514, 0.71, 0.7686] as const;
const ROW_HEIGHT = 0.0576;

export const BALLOON_REWARDS_SLOTS = {
  stats: { left: 0.18, top: 0.168, width: 0.64, height: 0.038 },
  /** Between the title banner and the baked REWARD | LEVEL | COST | STATUS headers. */
  balloonsComingSoon: { left: 0.08, top: 0.212, width: 0.84, height: 0.048 },
  closeX: { left: 0.875, top: 0.055, width: 0.105, height: 0.075 },
  tabBalloons: { left: 0.53, top: 0.834, width: 0.348, height: 0.088 },
  tabKites: { left: 0.118, top: 0.834, width: 0.35, height: 0.088 },
} as const satisfies Record<string, BalloonHudNormRect>;

/** Normalized height that draws as a pixel square on the 819×1024 rewards art. */
function squareArtHeight(width: number): number {
  return width / BALLOON_REWARDS_ART_ASPECT;
}

const DETAIL_PREVIEW_WIDTH = 0.28;

export const BALLOON_REWARDS_DETAIL_SLOTS = {
  closeX: { left: 0.86, top: 0.055, width: 0.12, height: 0.085 },
  backArrow: { left: 0.12, top: 0.108, width: 0.1, height: 0.08 },
  preview: {
    left: (1 - DETAIL_PREVIEW_WIDTH) / 2,
    top: 0.132,
    width: DETAIL_PREVIEW_WIDTH,
    height: squareArtHeight(DETAIL_PREVIEW_WIDTH),
  },
  marketplace: { left: 0.705, top: 0.344, width: 0.2, height: 0.038 },
  name: { left: 0.16, top: 0.382, width: 0.68, height: 0.072 },
  description: { left: 0.16, top: 0.48, width: 0.68, height: 0.108 },
  requirements: { left: 0.175, top: 0.652, width: 0.29, height: 0.078 },
  perks: { left: 0.52, top: 0.655, width: 0.36, height: 0.078 },
  ownership: { left: 0.14, top: 0.816, width: 0.72, height: 0.1 },
  ownershipSoldOut: { left: 0.14, top: 0.824, width: 0.72, height: 0.078 },
  back: { left: 0.36, top: 0.905, width: 0.28, height: 0.08 },
} as const satisfies Record<string, BalloonHudNormRect>;

/** Width as a panel fraction. Height is shorter so the drawn box is pixel-square. */
const ICON_WIDTH = 0.0635;
const ICON_HEIGHT = ICON_WIDTH / BALLOON_REWARDS_ART_ASPECT;

/** Drop tab labels so DCL text sits between the baked stars. Hit boxes stay on the full tab slot. */
export function balloonRewardsTabLabelSlot(slot: BalloonHudNormRect): BalloonHudNormRect {
  const nudge = 0.016;
  return { ...slot, top: slot.top + nudge, height: Math.max(0.04, slot.height - nudge) };
}

export function kiteDetailOwnershipSlot(soldOut: boolean): BalloonHudNormRect {
  return soldOut ? BALLOON_REWARDS_DETAIL_SLOTS.ownershipSoldOut : BALLOON_REWARDS_DETAIL_SLOTS.ownership;
}

export function balloonRewardRowSlots(index: number): BalloonRewardRowSlots {
  const top = ROW_TOPS[Math.max(0, Math.min(ROW_TOPS.length - 1, index))];
  return {
    hit: { left: 0.08, top, width: 0.84, height: ROW_HEIGHT },
    icon: { left: 0.081, top: top + (ROW_HEIGHT - ICON_HEIGHT) / 2, width: ICON_WIDTH, height: ICON_HEIGHT },
    name: { left: 0.155, top, width: 0.25, height: ROW_HEIGHT },
    level: { left: 0.415, top, width: 0.135, height: ROW_HEIGHT },
    cost: { left: 0.56, top, width: 0.135, height: ROW_HEIGHT },
    status: { left: 0.735, top, width: 0.185, height: ROW_HEIGHT },
  };
}

export function balloonRewardRowCount(): number {
  return ROW_TOPS.length;
}

export const balloonRewardsSlotBox = balloonHudSlotBox;
export const balloonRewardsSlotFits = balloonHudSlotFits;
export const balloonRewardsSlotRect = balloonHudSlotRect;

/** Centered portrait card: wide enough for the catalog, never taller than the live canvas. */
export function balloonRewardsPanelSize(
  canvas: UiCanvas,
  maxHeight = Math.round(canvas.virtualHeight * 0.82),
): { width: number; height: number } {
  const targetWidth = Math.round(canvas.virtualWidth * 0.36);
  const minWidth = Math.round(Math.min(340, canvas.virtualWidth * 0.72));
  const maxWidth = Math.round(Math.min(canvas.virtualWidth * 0.46, 560));
  let width = Math.max(minWidth, Math.min(maxWidth, targetWidth));
  let height = Math.round(width * BALLOON_REWARDS_ART_ASPECT);
  const heightCap = Math.max(220, maxHeight);
  if (height > heightCap) {
    height = heightCap;
    width = Math.round(height / BALLOON_REWARDS_ART_ASPECT);
  }
  return { width, height };
}
