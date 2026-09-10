import { WIN_TOAST_MS } from "./constants";

export const PRIZE_REVEAL_DURATION_MS = WIN_TOAST_MS;
export const FALLBACK_REVEAL_NAME = "Prize secured";

export type PrizeRevealModel = {
  visible: boolean;
  type: string;
  displayName: string;
  shownAt?: number;
  hideAt?: number;
};

export type WinnerRevealPayload = {
  type: string;
  displayName: string;
  announcementTier?: string;
  dclRarity?: string;
};

export function createPrizeReveal(): PrizeRevealModel {
  return { visible: false, type: "", displayName: "" };
}

export function resolveWinnerReveal(args: {
  type?: string;
  displayName?: string;
  announcementTier?: string;
  dclRarity?: string;
}): WinnerRevealPayload {
  const displayName = args.displayName?.trim() ?? "";
  return {
    type: args.type && args.type.length > 0 ? args.type : "ERC721",
    displayName: displayName.length > 0 ? displayName : FALLBACK_REVEAL_NAME,
    announcementTier: args.announcementTier,
    dclRarity: args.dclRarity,
  };
}

/**
 * Trusted claim JSON may carry a nested `reveal` object and/or flattened
 * `revealType` / `revealName` strings. DCL fetch has dropped the nested
 * object in live play, so both shapes are accepted.
 */
export function parseWonReveal(json: unknown): WinnerRevealPayload | undefined {
  if (!json || typeof json !== "object") {
    return undefined;
  }
  const row = json as Record<string, unknown>;
  const nested =
    row.reveal && typeof row.reveal === "object" ? (row.reveal as Record<string, unknown>) : undefined;
  const type =
    (typeof row.revealType === "string" && row.revealType) ||
    (typeof nested?.type === "string" && nested.type) ||
    "";
  const displayName =
    (typeof row.revealName === "string" && row.revealName) ||
    (typeof nested?.displayName === "string" && nested.displayName) ||
    "";
  const announcementTier =
    (typeof row.announceTier === "string" && row.announceTier) ||
    (typeof nested?.announcementTier === "string" && nested.announcementTier) ||
    "";
  const dclRarity =
    (typeof row.dclRarity === "string" && row.dclRarity) ||
    (typeof nested?.dclRarity === "string" && nested.dclRarity) ||
    "";
  if (!type && !displayName) {
    return undefined;
  }
  return resolveWinnerReveal({
    type,
    displayName,
    announcementTier: announcementTier || undefined,
    dclRarity: dclRarity || undefined,
  });
}

export function revealFromPopResult(data: {
  revealType?: string;
  revealName?: string;
  announceTier?: string;
  dclRarity?: string;
}): WinnerRevealPayload {
  return resolveWinnerReveal({
    type: data.revealType,
    displayName: data.revealName,
    announcementTier: data.announceTier,
    dclRarity: data.dclRarity,
  });
}

export function showPrizeReveal(
  now: number,
  reveal: WinnerRevealPayload,
  durationMs = PRIZE_REVEAL_DURATION_MS,
): PrizeRevealModel {
  const resolved = resolveWinnerReveal(reveal);
  return {
    visible: true,
    type: resolved.type,
    displayName: resolved.displayName,
    shownAt: now,
    hideAt: now + durationMs,
  };
}

export function tickPrizeReveal(model: PrizeRevealModel, now: number): PrizeRevealModel {
  if (!model.visible || model.hideAt === undefined || now < model.hideAt) {
    return model;
  }
  return createPrizeReveal();
}

export function revealHasNoFutureMapping(payload: object): boolean {
  return (
    !("prizeId" in payload) &&
    !("candidates" in payload) &&
    !("balloonIds" in payload) &&
    !("prizeMapping" in payload)
  );
}
