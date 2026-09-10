export const XP_TOAST_MS = 2800;
export const XP_TOAST_START_Y = 2.3;
export const XP_TOAST_RISE = 1.15;
export const XP_TOAST_FONT_SIZE = 3.6;
export const PARTY_COMPLETE_TOAST_TEXT = "PARTY COMPLETE";
export const ROUND_COMPLETE_TOAST_TEXT = "ROUND COMPLETE";
export const TURN_IN_BALLOONS_TOAST_TEXT = "TURN IN BALLOONS";
export const LEVEL_UP_TOAST_TEXT = "LEVEL UP";
/** Gap after the XP toast disappears so LEVEL UP does not overlap it. */
export const LEVEL_UP_AFTER_XP_GAP_MS = 1000;
/** Extra wait after PARTY COMPLETE fades before START BLOWING returns. */
export const BLOWING_HUD_AFTER_PARTY_COMPLETE_MS = 3000;

export type CenterToastKind = "xp" | "partyComplete" | "roundComplete" | "levelUp" | "turnInBalloons";

export type CenterToastItem = {
  kind: CenterToastKind;
  awardedXp?: number;
  showAt: number;
};

export type CenterToastPlayback = {
  kind: CenterToastKind;
  text: string;
  startedAt: number;
  hideAt: number;
};

export type CenterToastState = {
  current?: CenterToastPlayback;
  queue: CenterToastItem[];
  lastKind?: CenterToastKind;
  lastHideAt?: number;
};

export function emptyCenterToastState(): CenterToastState {
  return { queue: [] };
}

export function formatXpToast(awardedXp: number): string {
  return `+${Math.max(0, Math.floor(awardedXp))} XP`;
}

export function formatCenterToast(kind: CenterToastKind, awardedXp = 0): string {
  if (kind === "xp") {
    return formatXpToast(awardedXp);
  }
  if (kind === "partyComplete") {
    return PARTY_COMPLETE_TOAST_TEXT;
  }
  if (kind === "roundComplete") {
    return ROUND_COMPLETE_TOAST_TEXT;
  }
  if (kind === "turnInBalloons") {
    return TURN_IN_BALLOONS_TOAST_TEXT;
  }
  return LEVEL_UP_TOAST_TEXT;
}

export function xpToastHeight(startedAt: number, now: number): number {
  const t = Math.min(1, Math.max(0, (now - startedAt) / XP_TOAST_MS));
  return XP_TOAST_START_Y + XP_TOAST_RISE * t;
}

export function xpToastVisible(hideAt: number | undefined, now: number): boolean {
  return hideAt !== undefined && now < hideAt;
}

export function shouldShowPartyCompleteToast(previousStatus: string | null, status: string): boolean {
  return previousStatus === "ACTIVE" && status !== "ACTIVE";
}

export function shouldShowRoundCompleteToast(
  previousPhase: string,
  phase: string,
  liveBalloonCount: number,
): boolean {
  return previousPhase === "WAVE" && phase === "BREAK" && liveBalloonCount === 0;
}

export function blowingHudResumeAt(partyCompleteStartedAt: number): number {
  return partyCompleteStartedAt + XP_TOAST_MS + BLOWING_HUD_AFTER_PARTY_COMPLETE_MS;
}

export function levelUpToastShowAt(xpToastStartedAt: number | undefined, now: number): number {
  if (xpToastStartedAt === undefined) {
    return now;
  }
  return xpToastStartedAt + XP_TOAST_MS + LEVEL_UP_AFTER_XP_GAP_MS;
}

export function enqueueCenterToast(state: CenterToastState, item: CenterToastItem): CenterToastState {
  return { ...state, queue: [...state.queue, item] };
}

export function enqueueXpAndLevelUp(
  state: CenterToastState,
  now: number,
  awardedXp: number,
  leveledUp: boolean,
): CenterToastState {
  let next = state;
  let xpStartedAt: number | undefined;
  if (awardedXp > 0) {
    xpStartedAt = now;
    next = enqueueCenterToast(next, { kind: "xp", awardedXp, showAt: now });
  }
  if (leveledUp) {
    next = enqueueCenterToast(next, {
      kind: "levelUp",
      showAt: levelUpToastShowAt(xpStartedAt, now),
    });
  }
  return next;
}

function playCenterBannerToast(
  state: CenterToastState,
  now: number,
  kind: "partyComplete" | "roundComplete",
): CenterToastState {
  return {
    current: {
      kind,
      text: formatCenterToast(kind),
      startedAt: now,
      hideAt: now + XP_TOAST_MS,
    },
    queue: state.queue.filter((item) => item.kind !== kind),
  };
}

/** Party-end toast replaces whatever is on screen so HUD resume timing stays correct. */
export function playPartyCompleteToast(state: CenterToastState, now: number): CenterToastState {
  return playCenterBannerToast(state, now, "partyComplete");
}

export function playRoundCompleteToast(state: CenterToastState, now: number): CenterToastState {
  return playCenterBannerToast(state, now, "roundComplete");
}

export function turnInBalloonsToastShowAt(xpToastStartedAt: number | undefined, now: number): number {
  return levelUpToastShowAt(xpToastStartedAt, now);
}

/** Full-bag banner waits until the XP toast finishes, then uses the same center toast. */
export function enqueueTurnInAfterXpToast(
  state: CenterToastState,
  now: number,
  awardedXp: number,
): CenterToastState {
  if (state.current?.kind === "turnInBalloons" || state.queue.some((item) => item.kind === "turnInBalloons")) {
    return state;
  }
  const xpStartedAt = awardedXp > 0 ? now : undefined;
  const turnIn: CenterToastItem = {
    kind: "turnInBalloons",
    showAt: turnInBalloonsToastShowAt(xpStartedAt, now),
  };
  const xpIndex = state.queue.findIndex((item) => item.kind === "xp");
  if (xpIndex === -1) {
    return enqueueCenterToast(state, turnIn);
  }
  const queue = [...state.queue];
  queue.splice(xpIndex + 1, 0, turnIn);
  return { ...state, queue };
}

export function tickCenterToastState(state: CenterToastState, now: number): CenterToastState {
  let current = state.current;
  let queue = state.queue;
  let lastKind = state.lastKind;
  let lastHideAt = state.lastHideAt;
  if (current && now >= current.hideAt) {
    lastKind = current.kind;
    lastHideAt = current.hideAt;
    current = undefined;
  }
  if (!current && queue.length > 0) {
    const item = queue[0];
    let readyAt = item.showAt;
    if (
      (item.kind === "levelUp" || item.kind === "turnInBalloons") &&
      lastKind === "xp" &&
      lastHideAt !== undefined
    ) {
      readyAt = Math.max(readyAt, lastHideAt + LEVEL_UP_AFTER_XP_GAP_MS);
    }
    if (now >= readyAt) {
      queue = queue.slice(1);
      current = {
        kind: item.kind,
        text: formatCenterToast(item.kind, item.awardedXp ?? 0),
        startedAt: now,
        hideAt: now + XP_TOAST_MS,
      };
    }
  }
  return { current, queue, lastKind, lastHideAt };
}
