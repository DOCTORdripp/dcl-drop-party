export type PopUiState = "HIDDEN" | "READY" | "REQUEST_IN_FLIGHT" | "POP_ACTION_LOCK";
export const POP_BUTTON_IMAGE_SRC = "assets/images/button_pop.png";

export type PopUiModel = {
  state: PopUiState;
  eligibleCount: number;
  pendingPop: boolean;
  lockUntil?: number;
};

export function createPopUi(): PopUiModel {
  return { state: "HIDDEN", eligibleCount: 0, pendingPop: false };
}

export function isPopActionLocked(model: PopUiModel, now?: number): boolean {
  if (model.state !== "POP_ACTION_LOCK") {
    return false;
  }
  if (now === undefined || model.lockUntil === undefined) {
    return true;
  }
  return now < model.lockUntil;
}

export function syncEligible(model: PopUiModel, eligibleCount: number, now: number): PopUiModel {
  const next = { ...model, eligibleCount };
  if (next.state === "POP_ACTION_LOCK") {
    if (next.lockUntil !== undefined && now >= next.lockUntil) {
      next.state = eligibleCount > 0 ? "READY" : "HIDDEN";
      next.lockUntil = undefined;
      return next;
    }
    return next;
  }
  if (next.state === "REQUEST_IN_FLIGHT") {
    return next;
  }
  next.state = eligibleCount > 0 ? "READY" : "HIDDEN";
  return next;
}

export type PopIntentSource = "ui" | "primary";

export function devEligibleLabel(eligibleCount: number): string {
  return `Eligible: ${eligibleCount}`;
}

/** Center-screen Eligible: N HUD. Off for play; flip on for pop-range testing. */
export const SHOW_DEV_ELIGIBLE_LABEL = false;

export function onPopTap(model: PopUiModel): { model: PopUiModel; shouldSend: boolean } {
  if (model.state === "POP_ACTION_LOCK" || model.state === "HIDDEN") {
    return { model, shouldSend: false };
  }
  if (model.state === "REQUEST_IN_FLIGHT") {
    return { model: { ...model, pendingPop: true }, shouldSend: false };
  }
  return {
    model: { ...model, state: "REQUEST_IN_FLIGHT", pendingPop: false },
    shouldSend: true,
  };
}

export function shouldShowPop(model: PopUiModel): boolean {
  if (model.state === "POP_ACTION_LOCK" || model.state === "HIDDEN") {
    return false;
  }
  if (model.eligibleCount <= 0) {
    return false;
  }
  return true;
}

/** POP button and E (IA_PRIMARY) enter here. F opens the Deposit Chest and never pops. */
export function handlePopIntent(
  model: PopUiModel,
  _source: PopIntentSource,
): { model: PopUiModel; shouldSend: boolean } {
  if (model.state === "POP_ACTION_LOCK") {
    return { model, shouldSend: false };
  }
  if (model.eligibleCount <= 0) {
    return { model, shouldSend: false };
  }
  return onPopTap(model);
}

export function onPopResult(
  model: PopUiModel,
  result: string,
  args: { now: number; lockMs: number; eligibleCount: number },
): { model: PopUiModel; shouldSend: boolean } {
  if (result === "WON") {
    return {
      model: {
        ...model,
        state: "POP_ACTION_LOCK",
        pendingPop: false,
        lockUntil: args.now + args.lockMs,
        eligibleCount: Math.max(0, args.eligibleCount),
      },
      shouldSend: false,
    };
  }
  if (model.pendingPop && args.eligibleCount > 0 && result === "NO_AVAILABLE_BALLOON") {
    return {
      model: {
        ...model,
        state: "REQUEST_IN_FLIGHT",
        pendingPop: false,
        eligibleCount: args.eligibleCount,
      },
      shouldSend: true,
    };
  }
  return {
    model: {
      ...model,
      pendingPop: false,
      lockUntil: undefined,
      eligibleCount: args.eligibleCount,
      state: args.eligibleCount > 0 ? "READY" : "HIDDEN",
    },
    shouldSend: false,
  };
}

/** Network/timeout recovery. Never applies the pop-action lock. */
export function onPopFailure(model: PopUiModel, eligibleCount = model.eligibleCount): PopUiModel {
  return {
    ...model,
    pendingPop: false,
    lockUntil: undefined,
    eligibleCount,
    state: eligibleCount > 0 ? "READY" : "HIDDEN",
  };
}
