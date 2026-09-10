import { BALLOON_INTERVAL_MS, MAX_CARRIED_BALLOONS } from "./balloonProfile";
import { xpRemainingToNextLevel } from "./balloonXpCurve";
import { formatSeatedCountLine, formatSocialBoostLine } from "./tableSocialBonus";

export type BalloonHudMode = "hidden" | "idle" | "blowing" | "full";

export type BalloonHudModel = {
  visible: boolean;
  mode: BalloonHudMode;
  employed: boolean;
  blowing: boolean;
  partyActive: boolean;
  carriedBalloons: number;
  lifetimeBalloons: number;
  balloonPoints: number;
  xp: number;
  level: number;
  intervalStartedAt: number;
  intervalMs: number;
  startedAt: number;
  endsAt: number;
  buttonLabel: string;
  statusLine: string;
  nextLine: string;
  xpLine: string;
  socialBoostLine: string;
  seatedCountLine: string;
  kiteBonusLine: string;
  capacity: number;
  actionClickable: boolean;
};

export function emptyBalloonHud(): BalloonHudModel {
  return {
    visible: false,
    mode: "hidden",
    employed: false,
    blowing: false,
    partyActive: false,
    carriedBalloons: 0,
    lifetimeBalloons: 0,
    balloonPoints: 0,
    xp: 0,
    level: 1,
    intervalStartedAt: 0,
    intervalMs: BALLOON_INTERVAL_MS,
    startedAt: 0,
    endsAt: 0,
    buttonLabel: "",
    statusLine: "",
    nextLine: "",
    xpLine: "",
    socialBoostLine: "",
    seatedCountLine: "",
    kiteBonusLine: "",
    capacity: MAX_CARRIED_BALLOONS,
    actionClickable: true,
  };
}

export const STOP_BLOWING_CLICK_DELAY_MS = 3_000;

/** STOP BLOWING is inert until this time so a START spam cannot immediately toggle off. */
export function canClickStopBlowing(stopClickAvailableAt: number, now: number): boolean {
  return now >= stopClickAvailableAt;
}

export function formatCarriedLine(carriedBalloons: number, capacity = MAX_CARRIED_BALLOONS): string {
  return `Balloons Held: ${carriedBalloons} / ${capacity}`;
}

export function formatCarriedCount(carriedBalloons: number, capacity = MAX_CARRIED_BALLOONS): string {
  return `${carriedBalloons} / ${capacity}`;
}

export function formatXpLine(xp: number, level = 1): string {
  return `LEVEL ${level} - TOTAL XP: ${xp} = XP TO LVL: ${xpRemainingToNextLevel(xp)}`;
}

export const BALLOON_FULL_TURN_IN_PROMPT = "TURN IN BALLOONS TO OLD PETE";
export const BALLOON_FULL_ALERT_LINE_1 = "TURN YOUR BALLOONS IN UPSTAIRS";
export const BALLOON_FULL_ALERT_LINE_2 = "OLD PETE WILL GIVE YOU MORE TO BLOW";
export const BALLOON_FULL_ALERT_MS = 5_000;

export function balloonFullAlertVisible(hideAt: number | undefined, now: number): boolean {
  return hideAt !== undefined && now < hideAt;
}

/** After START, show the Pete alert only if the server kite check still leaves the bag over cap. */
export function balloonStartStillOverCap(args: {
  pendingStart: boolean;
  blowing: boolean;
  carriedBalloons: number;
  capacity: number;
}): boolean {
  return args.pendingStart && !args.blowing && args.carriedBalloons >= args.capacity;
}

/** Seat count belongs on the table HUD whenever the local player is sitting or in the surround. */
export function shouldShowSeatedCount(input: { seatedAtTable: boolean; aroundTable: boolean }): boolean {
  return Boolean(input.seatedAtTable || input.aroundTable);
}

export function formatClockMs(msRemaining: number): string {
  const total = Math.max(0, Math.ceil(msRemaining / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function remainingIntervalMs(
  model: Pick<BalloonHudModel, "intervalStartedAt" | "intervalMs" | "startedAt" | "endsAt">,
  now: number,
): number {
  if (model.endsAt > 0) {
    return Math.max(0, model.endsAt - now);
  }
  if (model.intervalStartedAt <= 0 && model.startedAt <= 0) {
    return model.intervalMs;
  }
  const startedAt = model.startedAt > 0 ? model.startedAt : model.intervalStartedAt;
  return Math.max(0, model.intervalMs - (now - startedAt));
}

export function blowingHudSuppressed(
  input: { partyActive: boolean; suppressHudUntil?: number },
  now: number,
): boolean {
  return input.partyActive || (input.suppressHudUntil !== undefined && now < input.suppressHudUntil);
}

export function formatBalloonHud(
  input: {
    employed: boolean;
    blowing: boolean;
    partyActive: boolean;
    suppressHudUntil?: number;
    carriedBalloons: number;
    lifetimeBalloons?: number;
    balloonPoints?: number;
    xp?: number;
    level?: number;
    intervalStartedAt?: number;
    intervalMs?: number;
    startedAt?: number;
    endsAt?: number;
    socialBonusXp?: number;
    occupiedChairCount?: number;
    showSeatedCount?: boolean;
    stopClickAvailableAt?: number;
    capacity?: number;
    kiteBonusLine?: string;
  },
  now: number,
): BalloonHudModel {
  const intervalMs = input.intervalMs ?? BALLOON_INTERVAL_MS;
  const intervalStartedAt = input.intervalStartedAt ?? input.startedAt ?? 0;
  const startedAt = input.startedAt ?? intervalStartedAt;
  const endsAt = input.endsAt && input.endsAt > 0 ? input.endsAt : startedAt > 0 ? startedAt + intervalMs : 0;
  const stopClickable = !input.blowing || canClickStopBlowing(input.stopClickAvailableAt ?? 0, now);
  const capacity = input.capacity ?? MAX_CARRIED_BALLOONS;
  const kiteBonusLine = input.kiteBonusLine ?? "";
  const model: BalloonHudModel = {
    ...emptyBalloonHud(),
    employed: input.employed,
    blowing: input.blowing,
    partyActive: input.partyActive,
    carriedBalloons: input.carriedBalloons,
    lifetimeBalloons: input.lifetimeBalloons ?? 0,
    balloonPoints: input.balloonPoints ?? 0,
    xp: input.xp ?? 0,
    level: input.level ?? 1,
    intervalStartedAt,
    intervalMs,
    startedAt,
    endsAt,
    kiteBonusLine,
    capacity,
    actionClickable: stopClickable,
  };
  if (!input.employed || blowingHudSuppressed(input, now)) {
    return model;
  }
  const seatedCountLine = input.showSeatedCount ? formatSeatedCountLine(input.occupiedChairCount ?? 0) : "";
  const socialBoostLine = input.blowing ? formatSocialBoostLine(input.socialBonusXp ?? 0) : "";
  if (input.carriedBalloons >= capacity) {
    return {
      ...model,
      visible: true,
      mode: "full",
      buttonLabel: "START BLOWING",
      statusLine: formatCarriedLine(input.carriedBalloons, capacity),
      nextLine: BALLOON_FULL_TURN_IN_PROMPT,
      xpLine: formatXpLine(model.xp, model.level),
      socialBoostLine: "",
      seatedCountLine,
      kiteBonusLine,
    };
  }
  if (input.blowing) {
    return {
      ...model,
      visible: true,
      mode: "blowing",
      buttonLabel: "STOP BLOWING",
      statusLine: formatCarriedLine(input.carriedBalloons, capacity),
      nextLine: `Next Balloon: ${formatClockMs(remainingIntervalMs(model, now))}`,
      xpLine: formatXpLine(model.xp, model.level),
      socialBoostLine,
      seatedCountLine,
      kiteBonusLine,
    };
  }
  return {
    ...model,
    visible: true,
    mode: "idle",
    buttonLabel: "START BLOWING",
    statusLine: formatCarriedLine(input.carriedBalloons, capacity),
    nextLine: "",
    xpLine: formatXpLine(model.xp, model.level),
    socialBoostLine: "",
    seatedCountLine,
    kiteBonusLine,
  };
}
