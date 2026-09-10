import { WIN_TOAST_MS } from "./constants";
import {
  createPrizeReveal,
  showPrizeReveal,
  tickPrizeReveal,
  type PrizeRevealModel,
  type WinnerRevealPayload,
} from "./prizeReveal";

export type PersonalWinToast = PrizeRevealModel & {
  announcementTier?: string;
  dclRarity?: string;
};

export function createPersonalWinToast(): PersonalWinToast {
  return createPrizeReveal();
}

export function showPersonalWinToast(
  now: number,
  reveal: WinnerRevealPayload,
  durationMs = WIN_TOAST_MS,
): PersonalWinToast {
  return {
    ...showPrizeReveal(now, reveal, durationMs),
    announcementTier: reveal.announcementTier,
    dclRarity: reveal.dclRarity,
  };
}

export function tickPersonalWinToast(model: PersonalWinToast, now: number): PersonalWinToast {
  const next = tickPrizeReveal(model, now);
  if (!next.visible) {
    return createPersonalWinToast();
  }
  return { ...next, announcementTier: model.announcementTier, dclRarity: model.dclRarity };
}

export function personalWinToastBlocksGameplay(): boolean {
  return false;
}
