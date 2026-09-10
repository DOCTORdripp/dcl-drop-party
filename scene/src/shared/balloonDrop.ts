export const BALLOON_DROP_TIMING = {
  fallMs: 1100,
  squashMs: 200,
  settleMs: 100,
  spawnHeight: 4,
} as const;

export const BALLOON_DROP_MS =
  BALLOON_DROP_TIMING.fallMs + BALLOON_DROP_TIMING.squashMs + BALLOON_DROP_TIMING.settleMs;

export type DropPose = {
  yOffset: number;
  scale: { x: number; y: number; z: number };
  landed: boolean;
};

export function balloonHasLanded(spawnedAt: number, now: number, dropMs = BALLOON_DROP_MS): boolean {
  return now >= spawnedAt + dropMs;
}

export function dropPose(elapsedMs: number, timing = BALLOON_DROP_TIMING): DropPose {
  const total = timing.fallMs + timing.squashMs + timing.settleMs;
  if (elapsedMs >= total) {
    return { yOffset: 0, scale: { x: 1, y: 1, z: 1 }, landed: true };
  }
  if (elapsedMs < timing.fallMs) {
    const t = Math.max(0, elapsedMs) / timing.fallMs;
    const eased = t * t;
    return {
      yOffset: timing.spawnHeight * (1 - eased),
      scale: { x: 1, y: 1, z: 1 },
      landed: false,
    };
  }
  if (elapsedMs < timing.fallMs + timing.squashMs) {
    const t = (elapsedMs - timing.fallMs) / timing.squashMs;
    return {
      yOffset: 0,
      scale: { x: 1 + 0.18 * t, y: 1 - 0.28 * t, z: 1 + 0.18 * t },
      landed: true,
    };
  }
  const t = (elapsedMs - timing.fallMs - timing.squashMs) / timing.settleMs;
  return {
    yOffset: 0,
    scale: {
      x: 1.18 - 0.18 * t,
      y: 0.72 + 0.28 * t,
      z: 1.18 - 0.18 * t,
    },
    landed: true,
  };
}
