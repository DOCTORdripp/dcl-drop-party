import { MAX_CARRIED_BALLOONS } from "./balloonProfile";
import { centeredPanelLayout, isHorizontallyCentered, type LayoutRect, type UiCanvas } from "./uiLayout";
import { createTurnInCaptcha, type TurnInCaptcha } from "./turnInCaptcha";

export type HelpWantedKind = "none" | "hire" | "turnIn" | "learn" | "alreadyHired";

export type HelpWantedPanel = {
  open: boolean;
  kind: HelpWantedKind;
  nextPartyAt?: number;
  captcha?: TurnInCaptcha;
};

export const HELP_WANTED_PANEL_WIDTH = 720;
export const HELP_WANTED_PANEL_HEIGHT = 400;
export const HELP_WANTED_HOVER_HIRE = "HELP WANTED";
export const HELP_WANTED_HOVER_LEARN = "LEARN MORE";
export const HELP_WANTED_HOVER_TURN_IN = "TURN IN BALLOONS";
export const HELP_WANTED_HIRE_COPY =
  "We're looking to employ and you look perfect for the job -\nno interview required, grab a balloon and start blowing!";
export const HELP_WANTED_TURN_IN_COPY =
  "Those are the finest balloons I've seen yet.\nTurn them in so you can blow up some more.";
export const LEARN_ABOUT_OK_LABEL = "OK THANKS";
export const LEARN_ABOUT_BODY_LEAD =
  "We're dangerously low on balloons, morale, and competent staff.\nBlow up all your balloons, then turn them in here for more.";
export const LEARN_ABOUT_BODY_TRAIL =
  "Drop parties happen downstairs daily.\nHosting your own requires a qualifying wearable.\nThe next drop party starts in:";
export const LEARN_ABOUT_BODY_COPY = `${LEARN_ABOUT_BODY_LEAD}\n${LEARN_ABOUT_BODY_TRAIL}`;
export const HELP_WANTED_ALREADY_HIRED_COPY = "You're already hired.";

/** TEMP: employed players see Turn In instead of Learn About (no 10 balloons required). Turn off after QA. */
export const SHOW_TURN_IN_INSTEAD_OF_LEARN = false;

export function createHelpWantedPanel(): HelpWantedPanel {
  return { open: false, kind: "none" };
}

export function openHelpWantedPanel(
  model: HelpWantedPanel,
  kind: HelpWantedKind = "hire",
  nextPartyAt?: number,
): HelpWantedPanel {
  if (kind === "none") {
    return { ...model, open: false, kind: "none", nextPartyAt: undefined, captcha: undefined };
  }
  return {
    ...model,
    open: true,
    kind,
    nextPartyAt,
    captcha: kind === "turnIn" ? createTurnInCaptcha() : undefined,
  };
}

export function closeHelpWantedPanel(model: HelpWantedPanel): HelpWantedPanel {
  return { ...model, open: false, kind: "none", nextPartyAt: undefined, captcha: undefined };
}

export function helpWantedPanelForPlayer(args: {
  employed: boolean;
  carriedBalloons: number;
  capacity?: number;
  showTurnInInsteadOfLearn?: boolean;
}): HelpWantedKind {
  if (!args.employed) {
    return "hire";
  }
  const capacity = args.capacity ?? MAX_CARRIED_BALLOONS;
  if (args.carriedBalloons >= capacity) {
    return "turnIn";
  }
  if (args.showTurnInInsteadOfLearn ?? SHOW_TURN_IN_INSTEAD_OF_LEARN) {
    return "turnIn";
  }
  return "learn";
}

export function npcHoverText(args: {
  employed: boolean;
  carriedBalloons: number;
  capacity?: number;
  showTurnInInsteadOfLearn?: boolean;
}): string {
  const kind = helpWantedPanelForPlayer(args);
  if (kind === "turnIn") return HELP_WANTED_HOVER_TURN_IN;
  if (kind === "learn") return HELP_WANTED_HOVER_LEARN;
  return HELP_WANTED_HOVER_HIRE;
}

function unitPhrase(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function joinEnglishList(parts: readonly string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

export function formatDaysHoursMinutes(remainingMs: number): string {
  const totalMin = Math.max(0, Math.floor(remainingMs / 60_000));
  if (totalMin <= 0) {
    return "less than a minute";
  }
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const minutes = totalMin % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(unitPhrase(days, "day", "days"));
  if (hours > 0) parts.push(unitPhrase(hours, "hour", "hours"));
  if (minutes > 0) parts.push(unitPhrase(minutes, "minute", "minutes"));
  return joinEnglishList(parts);
}

export function formatPartyStartsIn(nextPartyAt: number | undefined, nowMs: number): string {
  if (nextPartyAt === undefined || !Number.isFinite(nextPartyAt) || nextPartyAt <= 0) {
    return formatDaysHoursMinutes(0);
  }
  return formatDaysHoursMinutes(nextPartyAt - nowMs);
}

export function formatLearnAboutBlowingCopy(nextPartyAt: number | undefined, nowMs: number): string {
  return `${LEARN_ABOUT_BODY_COPY} ${formatPartyStartsIn(nextPartyAt, nowMs)}.`;
}

export function pickNextPartyStartMs(
  scheduledAt: number | undefined,
  nowMs: number,
  upcoming: ReadonlyArray<{ scheduledAt: number }> = [],
): number | undefined {
  if (scheduledAt !== undefined && scheduledAt > nowMs) {
    return scheduledAt;
  }
  const future = upcoming
    .map((row) => row.scheduledAt)
    .filter((at) => Number.isFinite(at) && at > nowMs)
    .sort((a, b) => a - b);
  return future[0] ?? (scheduledAt !== undefined && scheduledAt > 0 ? scheduledAt : undefined);
}

export function helpWantedPanelLayout(canvas?: UiCanvas): LayoutRect {
  return centeredPanelLayout(HELP_WANTED_PANEL_WIDTH, HELP_WANTED_PANEL_HEIGHT, canvas);
}

export function helpWantedPanelIsCentered(): boolean {
  return isHorizontallyCentered(helpWantedPanelLayout());
}

/** Old Pete portrait used by the welcome and first-hire greeting banners. */
export const NPC_GREETING_PORTRAIT_SRC = "assets/images/npc_oldPete.png";
export const NPC_GREETING_SPEAKER = "OLD PETE";

export function npcGreetingText(playerName: string): string {
  const name = playerName.trim() || "friend";
  return `Look everyone!\nOur top employee @${name} has arrived!\nThank goodness you're here - we need more balloons!`;
}

/** First-hire toast. Same banner and duration as the returning-employee greeting. */
export const NPC_HIRE_GIFT_TEXT = "Old Pete gives you a handful of balloons to blow up.";
export type NpcGreetingTone = "welcome" | "hireGift";

export function npcGreetingStillVisible(hideAt: number | undefined, now: number): boolean {
  return hideAt !== undefined && now < hideAt;
}
