import { BALLOON_INTERVAL_MS, MAX_CARRIED_BALLOONS } from "./balloonProfile";
import { failClosedKiteView, formatKiteBonusHudLineFromView, type AuthoritativeKiteView } from "./kitePerks";

export type BalloonBalloonState = "hidden" | "idle" | "blowing" | "full";

export type BalloonSessionState = {
  employed: boolean;
  isBlowing: boolean;
  partyActive: boolean;
  carriedBalloons: number;
  lifetimeBalloons: number;
  balloonPoints: number;
  xp: number;
  level: number;
  startedAt: number;
  endsAt: number;
  intervalStartedAt: number;
  intervalMs: number;
  kiteId: string;
  kiteName: string;
  kiteXpBonus: number;
  capacity: number;
  sessionId: string;
};

export type BalloonSessionSnapshot = {
  isBlowing: boolean;
  startedAt: number;
  endsAt: number;
  currentProgress: number;
  currentBalloonState: BalloonBalloonState;
  sessionId: string;
  remainingMs: number;
};

export type BalloonSessionFields = Partial<{
  employed: boolean;
  blowing: boolean;
  isBlowing: boolean;
  partyActive: boolean;
  carriedBalloons: number;
  lifetimeBalloons: number;
  balloonPoints: number;
  xp: number;
  level: number;
  intervalStartedAt: number;
  intervalMs: number;
  kiteId: string;
  kiteName: string;
  kiteXpBonus: number;
  capacity: number;
  startedAt: number;
  endsAt: number;
  sessionId: string;
}>;

export function emptyBalloonSession(): BalloonSessionState {
  return {
    employed: false,
    isBlowing: false,
    partyActive: false,
    carriedBalloons: 0,
    lifetimeBalloons: 0,
    balloonPoints: 0,
    xp: 0,
    level: 1,
    startedAt: 0,
    endsAt: 0,
    intervalStartedAt: 0,
    intervalMs: BALLOON_INTERVAL_MS,
    kiteId: "",
    kiteName: "",
    kiteXpBonus: 0,
    capacity: MAX_CARRIED_BALLOONS,
    sessionId: "",
  };
}

export function remainingBalloonMs(session: Pick<BalloonSessionState, "isBlowing" | "endsAt" | "intervalMs">, now: number): number {
  if (!session.isBlowing) {
    return 0;
  }
  if (session.endsAt > 0) {
    return Math.max(0, session.endsAt - now);
  }
  return session.intervalMs;
}

export function balloonCurrentProgress(session: BalloonSessionState, now: number): number {
  if (!session.isBlowing || session.startedAt <= 0 || session.intervalMs <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, (now - session.startedAt) / session.intervalMs));
}

export function balloonCurrentState(session: BalloonSessionState, capacity = MAX_CARRIED_BALLOONS): BalloonBalloonState {
  if (!session.employed || session.partyActive) {
    return "hidden";
  }
  if (session.carriedBalloons >= capacity) {
    return "full";
  }
  return session.isBlowing ? "blowing" : "idle";
}

function timestampsForInterval(startedAt: number, intervalMs: number): { startedAt: number; endsAt: number; intervalStartedAt: number; sessionId: string } {
  if (startedAt <= 0) {
    return { startedAt: 0, endsAt: 0, intervalStartedAt: 0, sessionId: "" };
  }
  return {
    startedAt,
    endsAt: startedAt + intervalMs,
    intervalStartedAt: startedAt,
    sessionId: String(startedAt),
  };
}

export function applyBalloonSessionFields(
  session: BalloonSessionState,
  fields: BalloonSessionFields,
): BalloonSessionState {
  const isBlowing = fields.isBlowing ?? fields.blowing ?? session.isBlowing;
  const intervalMs = fields.intervalMs ?? session.intervalMs;
  const intervalStartedAtRaw = fields.intervalStartedAt ?? fields.startedAt ?? session.intervalStartedAt;
  const intervalStartedAt = Number.isFinite(intervalStartedAtRaw) ? intervalStartedAtRaw : 0;
  const next: BalloonSessionState = {
    ...session,
    employed: fields.employed ?? session.employed,
    isBlowing,
    partyActive: fields.partyActive ?? session.partyActive,
    carriedBalloons: fields.carriedBalloons ?? session.carriedBalloons,
    lifetimeBalloons: fields.lifetimeBalloons ?? session.lifetimeBalloons,
    balloonPoints: fields.balloonPoints ?? session.balloonPoints,
    xp: fields.xp ?? session.xp,
    level: fields.level ?? session.level,
    intervalMs,
    kiteId: fields.kiteId ?? session.kiteId,
    kiteName: fields.kiteName ?? session.kiteName,
    kiteXpBonus: fields.kiteXpBonus ?? session.kiteXpBonus,
    capacity: fields.capacity ?? session.capacity,
  };
  if (!isBlowing) {
    next.startedAt = 0;
    next.endsAt = 0;
    next.intervalStartedAt = 0;
    next.sessionId = "";
    return next;
  }
  const stamps = timestampsForInterval(intervalStartedAt, intervalMs);
  if (fields.endsAt !== undefined && fields.endsAt > 0 && stamps.startedAt > 0) {
    next.startedAt = stamps.startedAt;
    next.endsAt = fields.endsAt;
    next.intervalStartedAt = stamps.intervalStartedAt;
    next.sessionId = fields.sessionId ?? stamps.sessionId;
    return next;
  }
  next.startedAt = stamps.startedAt;
  next.endsAt = stamps.endsAt;
  next.intervalStartedAt = stamps.intervalStartedAt;
  next.sessionId = fields.sessionId ?? stamps.sessionId;
  return next;
}

export function startBalloonSession(session: BalloonSessionState, now: number, intervalMs = session.intervalMs): BalloonSessionState {
  return applyBalloonSessionFields(session, {
    isBlowing: true,
    intervalStartedAt: now,
    intervalMs,
  });
}

export function balloonSessionSnapshot(session: BalloonSessionState, now: number): BalloonSessionSnapshot {
  return {
    isBlowing: session.isBlowing,
    startedAt: session.startedAt,
    endsAt: session.endsAt,
    currentProgress: balloonCurrentProgress(session, now),
    currentBalloonState: balloonCurrentState(session, session.capacity),
    sessionId: session.sessionId,
    remainingMs: remainingBalloonMs(session, now),
  };
}

export function balloonSessionKiteView(session: Pick<BalloonSessionState, "kiteId" | "kiteName" | "kiteXpBonus" | "capacity" | "intervalMs">): AuthoritativeKiteView {
  if (!session.kiteId) {
    return { ...failClosedKiteView(), intervalMs: session.intervalMs || BALLOON_INTERVAL_MS, capacity: session.capacity || MAX_CARRIED_BALLOONS };
  }
  return {
    kiteId: session.kiteId,
    kiteName: session.kiteName,
    kiteXpBonus: session.kiteXpBonus,
    capacity: session.capacity,
    intervalMs: session.intervalMs,
  };
}

export function balloonHudInput(session: BalloonSessionState): {
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
  capacity: number;
  kiteBonusLine: string;
} {
  const kite = balloonSessionKiteView(session);
  return {
    employed: session.employed,
    blowing: session.isBlowing,
    partyActive: session.partyActive,
    carriedBalloons: session.carriedBalloons,
    lifetimeBalloons: session.lifetimeBalloons,
    balloonPoints: session.balloonPoints,
    xp: session.xp,
    level: session.level,
    intervalStartedAt: session.intervalStartedAt,
    intervalMs: session.intervalMs,
    startedAt: session.startedAt,
    endsAt: session.endsAt,
    capacity: kite.capacity,
    kiteBonusLine: formatKiteBonusHudLineFromView(kite),
  };
}
