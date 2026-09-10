export type PlayPhaseKind =
  | "COUNTDOWN"
  | "WAVE"
  | "BREAK"
  | "FINAL_WAVE"
  | "FINAL_GRACE"
  | "SETTLING"
  | "COMPLETED"
  | "LOCKED";

export type PlayPhaseInput = {
  status: string;
  now: number;
  scheduledAt: number;
  startedAt?: number;
  wavePhaseEndsAt?: number;
  nextWaveAt?: number;
  finalWaveSpawnedAt?: number;
  finalBalloonExpiresAt?: number;
  waveNumber?: number;
  liveBalloonCount?: number;
};

export type PlayPhaseView = {
  kind: PlayPhaseKind;
  headline: string;
  timerLabel: string;
  timerSuffix?: string;
  endsAt?: number;
  waveNumber?: number;
};

export function formatClock(msRemaining: number): string {
  const total = Math.max(0, Math.ceil(msRemaining / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatSecondsUntilNextWave(msRemaining: number): string {
  const seconds = Math.max(0, Math.ceil(msRemaining / 1000));
  return seconds === 1 ? "1 second until next wave" : `${seconds} seconds until next wave`;
}

export function derivePlayPhase(input: PlayPhaseInput): PlayPhaseView {
  const waveNumber = input.waveNumber && input.waveNumber > 0 ? input.waveNumber : undefined;

  if (input.status === "COMPLETED") {
    return { kind: "COMPLETED", headline: "PARTY COMPLETE", timerLabel: "" };
  }
  if (input.status === "SETTLING") {
    return { kind: "SETTLING", headline: "PARTY COMPLETE", timerLabel: "" };
  }

  if (input.status === "LOCKED" || (input.status === "ACTIVE" && input.startedAt === undefined)) {
    return {
      kind: "COUNTDOWN",
      headline: "DROP PARTY STARTS IN",
      timerLabel: formatClock(input.scheduledAt - input.now),
      endsAt: input.scheduledAt,
    };
  }

  if (input.status === "ACTIVE") {
    if (input.finalBalloonExpiresAt !== undefined) {
      if (input.now >= input.finalBalloonExpiresAt) {
        return { kind: "SETTLING", headline: "PARTY COMPLETE", timerLabel: "" };
      }
      const inGrace =
        input.wavePhaseEndsAt === undefined || input.now >= input.wavePhaseEndsAt;
      if (!inGrace) {
        return {
          kind: "FINAL_WAVE",
          headline: "FINAL WAVE",
          timerLabel: formatClock(input.wavePhaseEndsAt! - input.now),
          endsAt: input.wavePhaseEndsAt,
          waveNumber,
        };
      }
      return {
        kind: "FINAL_GRACE",
        headline: "FINAL WAVE",
        timerLabel: formatClock(input.finalBalloonExpiresAt - input.now),
        timerSuffix: "REMAINING",
        endsAt: input.finalBalloonExpiresAt,
        waveNumber,
      };
    }

    if (
      input.nextWaveAt !== undefined &&
      input.wavePhaseEndsAt !== undefined &&
      input.now >= input.wavePhaseEndsAt &&
      input.now < input.nextWaveAt
    ) {
      const courtCleared = (input.liveBalloonCount ?? 1) === 0;
      return {
        kind: "BREAK",
        headline: courtCleared ? "ROUND COMPLETE" : "NEXT WAVE IN",
        timerLabel: courtCleared
          ? formatSecondsUntilNextWave(input.nextWaveAt - input.now)
          : formatClock(input.nextWaveAt - input.now),
        endsAt: input.nextWaveAt,
        waveNumber,
      };
    }

    return {
      kind: "WAVE",
      headline: `WAVE ${waveNumber ?? 1}`,
      timerLabel: formatClock((input.wavePhaseEndsAt ?? input.now) - input.now),
      endsAt: input.wavePhaseEndsAt,
      waveNumber: waveNumber ?? 1,
    };
  }

  return {
    kind: "LOCKED",
    headline: "DROP PARTY STARTS IN",
    timerLabel: formatClock(input.scheduledAt - input.now),
    endsAt: input.scheduledAt,
  };
}

export function reconstructTimerFromSnapshot(
  snapshot: Omit<PlayPhaseInput, "now">,
  now: number,
): PlayPhaseView {
  return derivePlayPhase({ ...snapshot, now });
}
