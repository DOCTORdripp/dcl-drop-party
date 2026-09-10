import { POP_ACTION_LOCK_MS, POP_EMOTE_NAME, POP_IMPACT_TIME_MS, POP_STOMP_EMOTE } from "./constants";

export type ImpactPosition = { x: number; y: number; z: number };

export type MovementLockModel = {
  locked: boolean;
  unlockAt?: number;
  emoteRequested: boolean;
  planted: boolean;
  impactPosition?: ImpactPosition;
};

export function createMovementLock(): MovementLockModel {
  return { locked: false, emoteRequested: false, planted: false };
}

export function beginMovementLock(
  now: number,
  durationMs = POP_ACTION_LOCK_MS,
  impactPosition?: ImpactPosition,
): MovementLockModel {
  return {
    locked: true,
    unlockAt: now + durationMs,
    emoteRequested: true,
    planted: impactPosition !== undefined,
    impactPosition,
  };
}

export function tickMovementLock(
  model: MovementLockModel,
  now: number,
): { model: MovementLockModel; justUnlocked: boolean } {
  if (!model.locked || model.unlockAt === undefined || now < model.unlockAt) {
    return { model, justUnlocked: false };
  }
  return {
    model: {
      locked: false,
      unlockAt: undefined,
      emoteRequested: model.emoteRequested,
      planted: false,
      impactPosition: undefined,
    },
    justUnlocked: true,
  };
}

/** Input disable plus a one-shot plant; does not keep walking from prior momentum. */
export function lockStopsExistingLocomotion(model: MovementLockModel): boolean {
  return model.locked && model.planted && model.impactPosition !== undefined;
}

export function popStompEmoteName(): string {
  return POP_EMOTE_NAME || POP_STOMP_EMOTE;
}

export function popImpactTimeMs(): number {
  return POP_IMPACT_TIME_MS;
}

export function popEmoteName(): string {
  return popStompEmoteName();
}
