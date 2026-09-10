import { upcomingDisplayTitle, type EventBoardParty } from "./partyDisplay";
import { formatTickerCountdownHms } from "./partyTime";

export const NEXT_DROP_TICKER_PREFIX = "NEXT DROP PARTY:";
export const NEXT_DROP_TICKER_SRC = "assets/images/ui_header.png";
export const NEXT_DROP_TICKER_SLICES = { top: 0.1, bottom: 0.1, left: 0.09, right: 0.09 };

export type NextDropTickerModel = {
  visible: boolean;
  title: string;
  scheduledAt: number;
  status: string;
};

export function emptyNextDropTicker(): NextDropTickerModel {
  return { visible: false, title: "", scheduledAt: 0, status: "" };
}

/** Hide the slim ticker while the round HUD owns the countdown / live party. */
export function hidesNextDropTicker(status: string): boolean {
  return status === "LOCKING" || status === "LOCKED" || status === "ACTIVE" || status === "SETTLING";
}

export function nextDropTickerIsShown(tickerVisible: boolean, roundHudVisible: boolean, roundHudPhase = ""): boolean {
  if (!tickerVisible) return false;
  if (!roundHudVisible) return true;
  return roundHudPhase === "COMPLETED" || roundHudPhase === "SETTLING";
}

export function pickNextDropParty<T extends EventBoardParty>(parties: readonly T[], nowMs: number): T | undefined {
  const upcoming = parties
    .filter((row) => row.status !== "COMPLETED" && row.status !== "CANCELLED")
    .filter((row) => !hidesNextDropTicker(row.status ?? ""))
    .filter((row) => row.scheduledAt + 60_000 >= nowMs)
    .sort((a, b) => a.scheduledAt - b.scheduledAt);
  return upcoming[0];
}

export function nextDropTickerFromParties(
  parties: readonly EventBoardParty[],
  nowMs: number,
): NextDropTickerModel {
  const next = pickNextDropParty(parties, nowMs);
  if (!next) return emptyNextDropTicker();
  return {
    visible: true,
    title: upcomingDisplayTitle(next),
    scheduledAt: next.scheduledAt,
    status: next.status ?? "",
  };
}

export function formatNextDropTickerLine(model: NextDropTickerModel, nowMs: number): string {
  if (!model.visible || !model.title) return "";
  const countdown = formatTickerCountdownHms(model.scheduledAt, nowMs, model.status);
  return `${NEXT_DROP_TICKER_PREFIX} ${model.title} ${countdown}`;
}
