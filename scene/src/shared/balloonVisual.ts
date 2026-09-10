export type BalloonVisualState = "DROPPING" | "LIVE" | "POP_ACTION" | "BURST" | "HIDDEN";

export const CLAIM_ANIMATION_TIMING = {
  stompEndMs: 1200,
  wobbleEndMs: 2200,
  burstAtMs: 2200,
  visualHideMs: 2800,
  totalMs: 3000,
} as const;

export type Vec3 = { x: number; y: number; z: number };

export type BalloonVisual = {
  balloonId: string;
  state: BalloonVisualState;
  startedAt?: number;
  burstLogged?: boolean;
};

export type PresentationPose = {
  scale: Vec3;
  yOffset: number;
};

export function createLiveVisual(balloonId: string): BalloonVisual {
  return { balloonId, state: "LIVE" };
}

export function visualStateAt(
  elapsedMs: number,
  timing = CLAIM_ANIMATION_TIMING,
): BalloonVisualState {
  if (elapsedMs < 0) {
    return "LIVE";
  }
  if (elapsedMs < timing.burstAtMs) {
    return "POP_ACTION";
  }
  if (elapsedMs < timing.totalMs) {
    return "BURST";
  }
  return "HIDDEN";
}

export function isVisuallyPresent(state: BalloonVisualState): boolean {
  return state !== "HIDDEN";
}

export function beginClaimAnimation(visual: BalloonVisual, now: number): BalloonVisual {
  if (visual.state !== "LIVE") {
    return visual;
  }
  return { balloonId: visual.balloonId, state: "POP_ACTION", startedAt: now };
}

export function beginDrop(balloonId: string, spawnedAt: number): BalloonVisual {
  return { balloonId, state: "DROPPING", startedAt: spawnedAt };
}

export function tickBalloonVisual(
  visual: BalloonVisual,
  now: number,
  timing = CLAIM_ANIMATION_TIMING,
  dropMs = 1400,
): BalloonVisual {
  if (visual.state === "DROPPING" && visual.startedAt !== undefined) {
    if (now >= visual.startedAt + dropMs) {
      return { balloonId: visual.balloonId, state: "LIVE" };
    }
    return visual;
  }
  if (visual.state === "LIVE" || visual.state === "HIDDEN" || visual.startedAt === undefined) {
    return visual;
  }
  const nextState = visualStateAt(now - visual.startedAt, timing);
  if (nextState === visual.state) {
    return visual;
  }
  return { ...visual, state: nextState };
}

export function presentationPose(
  elapsedMs: number,
  timing = CLAIM_ANIMATION_TIMING,
): PresentationPose {
  if (elapsedMs >= timing.totalMs) {
    return { scale: { x: 0, y: 0, z: 0 }, yOffset: 0 };
  }
  if (elapsedMs < timing.stompEndMs) {
    const t = elapsedMs / timing.stompEndMs;
    return {
      scale: {
        x: 0.88 + 0.34 * t,
        y: 1.12 - 0.52 * t,
        z: 0.88 + 0.34 * t,
      },
      yOffset: -0.16 * t,
    };
  }
  if (elapsedMs < timing.wobbleEndMs) {
    const t = (elapsedMs - timing.stompEndMs) / (timing.wobbleEndMs - timing.stompEndMs);
    const wobble = Math.sin(t * Math.PI * 4) * (1 - t) * 0.14;
    return {
      scale: {
        x: 1.16 + wobble,
        y: 0.68 - wobble,
        z: 1.16 + wobble,
      },
      yOffset: -0.16 + Math.sin(t * Math.PI * 2) * 0.05,
    };
  }
  const shrinkWindow = Math.max(1, timing.visualHideMs - timing.burstAtMs);
  const t = Math.min(1, (elapsedMs - timing.burstAtMs) / shrinkWindow);
  const shrink = Math.max(0, (1 - t) * (1 - t) * 1.15);
  return {
    scale: { x: shrink, y: shrink, z: shrink },
    yOffset: 0.12 * t,
  };
}

export function fragmentOffset(
  index: number,
  elapsedMs: number,
  timing = CLAIM_ANIMATION_TIMING,
): Vec3 {
  const burstElapsed = Math.max(0, elapsedMs - timing.burstAtMs);
  const t = Math.min(1, burstElapsed / Math.max(1, timing.totalMs - timing.burstAtMs));
  const angle = (index / 5) * Math.PI * 2;
  const radius = 0.15 + t * 0.85;
  return {
    x: Math.cos(angle) * radius,
    y: 0.2 + t * 0.55,
    z: Math.sin(angle) * radius,
  };
}

export function fragmentScale(elapsedMs: number, timing = CLAIM_ANIMATION_TIMING): Vec3 {
  if (elapsedMs < timing.burstAtMs) {
    return { x: 0, y: 0, z: 0 };
  }
  const t = Math.min(1, (elapsedMs - timing.burstAtMs) / Math.max(1, timing.totalMs - timing.burstAtMs));
  const s = Math.max(0, 0.16 * (1 - t));
  return { x: s, y: s, z: s };
}

/**
 * Client presentation pile. Independent of Convex assignment status.
 * A balloon can be CLAIMED authoritatively while still LIVE/POP_ACTION here.
 */
export class BalloonVisualPile {
  private readonly balloons = new Map<string, BalloonVisual>();

  get(balloonId: string): BalloonVisual | undefined {
    return this.balloons.get(balloonId);
  }

  list(): BalloonVisual[] {
    return [...this.balloons.values()];
  }

  visibleIds(): string[] {
    return this.list().filter((row) => isVisuallyPresent(row.state)).map((row) => row.balloonId);
  }

  observeLive(balloonId: string): void {
    const current = this.balloons.get(balloonId);
    if (!current) {
      this.balloons.set(balloonId, createLiveVisual(balloonId));
    }
  }

  observeSpawned(balloonId: string, spawnedAt: number, now: number, dropMs = 1400): void {
    const current = this.balloons.get(balloonId);
    if (current && current.state !== "DROPPING") {
      return;
    }
    if (now >= spawnedAt + dropMs) {
      this.balloons.set(balloonId, createLiveVisual(balloonId));
      return;
    }
    this.balloons.set(balloonId, beginDrop(balloonId, spawnedAt));
  }

  /** Late joiners who first see a claimed balloon skip the animation. */
  observeClaimed(balloonId: string, now: number): void {
    const current = this.balloons.get(balloonId);
    if (!current) {
      this.balloons.set(balloonId, { balloonId, state: "HIDDEN" });
      return;
    }
    if (current.state === "LIVE") {
      this.balloons.set(balloonId, beginClaimAnimation(current, now));
    }
  }

  beginWinnerAnimation(balloonId: string, now: number): BalloonVisual {
    const current = this.balloons.get(balloonId) ?? createLiveVisual(balloonId);
    if (current.state === "LIVE" || current.state === "HIDDEN") {
      const started: BalloonVisual = { balloonId, state: "POP_ACTION", startedAt: now };
      this.balloons.set(balloonId, started);
      return started;
    }
    this.balloons.set(balloonId, current);
    return current;
  }

  tick(now: number): { bursted: string[]; completed: string[] } {
    const bursted: string[] = [];
    const completed: string[] = [];
    for (const [id, visual] of this.balloons) {
      const next = tickBalloonVisual(visual, now);
      if (visual.state !== "BURST" && next.state === "BURST") {
        bursted.push(id);
      }
      if (visual.state !== "HIDDEN" && next.state === "HIDDEN") {
        completed.push(id);
      }
      this.balloons.set(id, next);
    }
    return { bursted, completed };
  }
}
