export const WORLD_TOAST_MAX_VISIBLE = 3;
export const WORLD_TOAST_DURATION_MS = 6000;

export type WorldToastItem = {
  id: string;
  title: string;
  body: string;
  tier: string;
  shownAt: number;
  hideAt: number;
};

export type WorldToastQueue = {
  visible: WorldToastItem[];
  pending: WorldToastItem[];
};

export function createWorldToastQueue(): WorldToastQueue {
  return { visible: [], pending: [] };
}

export function enqueueWorldToast(
  queue: WorldToastQueue,
  toast: { id: string; title: string; body: string; tier: string },
  now: number,
  durationMs = WORLD_TOAST_DURATION_MS,
): WorldToastQueue {
  const item: WorldToastItem = {
    ...toast,
    shownAt: now,
    hideAt: now + durationMs,
  };
  if (queue.visible.length < WORLD_TOAST_MAX_VISIBLE) {
    return { visible: [...queue.visible, item], pending: [...queue.pending] };
  }
  return { visible: [...queue.visible], pending: [...queue.pending, item] };
}

export function tickWorldToasts(queue: WorldToastQueue, now: number): WorldToastQueue {
  const stillVisible = queue.visible.filter((row) => row.hideAt > now);
  const pending = [...queue.pending];
  const visible = [...stillVisible];
  while (visible.length < WORLD_TOAST_MAX_VISIBLE && pending.length > 0) {
    const next = pending.shift()!;
    visible.push({ ...next, shownAt: now, hideAt: now + (next.hideAt - next.shownAt) });
  }
  return { visible, pending };
}

export function worldToastBlocksGameplay(): boolean {
  return false;
}

export function worldToastHasNoPreClaimMapping(payload: object): boolean {
  return (
    !("prizeId" in payload) &&
    !("balloonId" in payload) &&
    !("balloonIds" in payload) &&
    !("candidates" in payload) &&
    !("prizeMapping" in payload) &&
    !("tokenId" in payload)
  );
}
