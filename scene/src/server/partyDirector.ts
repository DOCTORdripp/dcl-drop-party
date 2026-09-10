import { derivePlayPhase, type PlayPhaseKind } from "../shared/playPhase";
import { WaveSpawnLayout } from "../shared/spawnLayout";

export type LiveSceneBalloon = {
  balloonId: string;
  waveId: string;
  spawnGeneration: string;
  spawnedAt: number;
};

export type PartySnapshot = {
  partyId: string;
  status: string;
  phase: PlayPhaseKind | string;
  headline: string;
  timerLabel: string;
  scheduledAt: number;
  startedAt?: number;
  wavePhaseEndsAt?: number;
  nextWaveAt?: number;
  finalWaveSpawnedAt?: number;
  finalBalloonExpiresAt?: number;
  waveNumber?: number;
  isFinal?: boolean;
  liveBalloonCount: number;
  queuedCount?: number;
  liveBalloons: LiveSceneBalloon[];
};

export function parsePartySnapshot(json: unknown): PartySnapshot | null {
  if (!json || typeof json !== "object") {
    return null;
  }
  const row = json as Record<string, unknown>;
  if (typeof row.partyId !== "string" || typeof row.status !== "string") {
    return null;
  }
  const liveBalloons: LiveSceneBalloon[] = [];
  if (Array.isArray(row.liveBalloons)) {
    for (const item of row.liveBalloons) {
      if (!item || typeof item !== "object") {
        continue;
      }
      const balloon = item as Record<string, unknown>;
      if (
        typeof balloon.balloonId !== "string" ||
        typeof balloon.waveId !== "string" ||
        typeof balloon.spawnGeneration !== "string" ||
        typeof balloon.spawnedAt !== "number"
      ) {
        continue;
      }
      liveBalloons.push({
        balloonId: balloon.balloonId,
        waveId: balloon.waveId,
        spawnGeneration: balloon.spawnGeneration,
        spawnedAt: balloon.spawnedAt,
      });
    }
  }
  return {
    partyId: row.partyId,
    status: row.status,
    phase: typeof row.phase === "string" ? row.phase : typeof row.kind === "string" ? row.kind : "",
    headline: typeof row.headline === "string" ? row.headline : "",
    timerLabel: typeof row.timerLabel === "string" ? row.timerLabel : "",
    scheduledAt: typeof row.scheduledAt === "number" ? row.scheduledAt : 0,
    startedAt: typeof row.startedAt === "number" ? row.startedAt : undefined,
    wavePhaseEndsAt: typeof row.wavePhaseEndsAt === "number" ? row.wavePhaseEndsAt : undefined,
    nextWaveAt: typeof row.nextWaveAt === "number" ? row.nextWaveAt : undefined,
    finalWaveSpawnedAt: typeof row.finalWaveSpawnedAt === "number" ? row.finalWaveSpawnedAt : undefined,
    finalBalloonExpiresAt: typeof row.finalBalloonExpiresAt === "number" ? row.finalBalloonExpiresAt : undefined,
    waveNumber: typeof row.waveNumber === "number" ? row.waveNumber : undefined,
    isFinal: row.isFinal === true,
    liveBalloonCount: typeof row.liveBalloonCount === "number" ? row.liveBalloonCount : liveBalloons.length,
    queuedCount: typeof row.queuedCount === "number" ? row.queuedCount : undefined,
    liveBalloons,
  };
}

export function snapshotHasNoPrizeMapping(snapshot: object): boolean {
  const raw = JSON.stringify(snapshot);
  return (
    !raw.includes("prizeId") &&
    !raw.includes("tokenId") &&
    !raw.includes("prizeMapping") &&
    !raw.includes("manaAmount")
  );
}

export type DirectorLog =
  | { kind: "loaded" }
  | { kind: "countdown" }
  | { kind: "wave-spawning"; waveNumber: number; count: number }
  | { kind: "wave-live"; waveNumber: number }
  | { kind: "wave-break" }
  | { kind: "wave-final" }
  | { kind: "settling" }
  | { kind: "complete" };

export function directorTransition(
  previous: PartySnapshot | null,
  next: PartySnapshot,
  now: number,
): DirectorLog[] {
  const logs: DirectorLog[] = [];
  if (!previous) {
    logs.push({ kind: "loaded" });
  }
  const prevPhase = previous
    ? derivePlayPhase({
        status: previous.status,
        now,
        scheduledAt: previous.scheduledAt,
        startedAt: previous.startedAt,
        wavePhaseEndsAt: previous.wavePhaseEndsAt,
        nextWaveAt: previous.nextWaveAt,
        finalWaveSpawnedAt: previous.finalWaveSpawnedAt,
        finalBalloonExpiresAt: previous.finalBalloonExpiresAt,
        waveNumber: previous.waveNumber,
      }).kind
    : "";
  const phase = derivePlayPhase({
    status: next.status,
    now,
    scheduledAt: next.scheduledAt,
    startedAt: next.startedAt,
    wavePhaseEndsAt: next.wavePhaseEndsAt,
    nextWaveAt: next.nextWaveAt,
    finalWaveSpawnedAt: next.finalWaveSpawnedAt,
    finalBalloonExpiresAt: next.finalBalloonExpiresAt,
    waveNumber: next.waveNumber,
  }).kind;

  if (phase === "COUNTDOWN" && prevPhase !== "COUNTDOWN") {
    logs.push({ kind: "countdown" });
  }
  const prevIds = new Set(previous?.liveBalloons.map((row) => row.balloonId) ?? []);
  const spawnedNow = next.liveBalloons.filter((row) => !prevIds.has(row.balloonId));
  if (spawnedNow.length > 0) {
    logs.push({
      kind: "wave-spawning",
      waveNumber: next.waveNumber ?? 1,
      count: spawnedNow.length,
    });
    logs.push({ kind: next.isFinal ? "wave-final" : "wave-live", waveNumber: next.waveNumber ?? 1 });
  } else if (phase === "WAVE" && prevPhase !== "WAVE") {
    logs.push({ kind: "wave-live", waveNumber: next.waveNumber ?? 1 });
  }
  if (phase === "BREAK" && prevPhase !== "BREAK") {
    logs.push({ kind: "wave-break" });
  }
  if (phase === "FINAL_WAVE" && prevPhase !== "FINAL_WAVE" && spawnedNow.length === 0) {
    logs.push({ kind: "wave-final" });
  }
  if (phase === "SETTLING" && prevPhase !== "SETTLING") {
    logs.push({ kind: "settling" });
  }
  if (phase === "COMPLETED" && prevPhase !== "COMPLETED") {
    logs.push({ kind: "complete" });
  }
  return logs;
}

export function emitDirectorLogs(logs: DirectorLog[]): void {
  for (const log of logs) {
    if (log.kind === "loaded") {
      console.log("[PARTY] loaded");
    } else if (log.kind === "countdown") {
      console.log("[PARTY] countdown");
    } else if (log.kind === "wave-spawning") {
      console.log("[WAVE] spawning", { waveNumber: log.waveNumber, count: log.count });
    } else if (log.kind === "wave-live") {
      console.log("[WAVE] live", { waveNumber: log.waveNumber });
    } else if (log.kind === "wave-break") {
      console.log("[WAVE] break");
    } else if (log.kind === "wave-final") {
      console.log("[WAVE] final");
    } else if (log.kind === "settling") {
      console.log("[PARTY] settling");
    } else if (log.kind === "complete") {
      console.log("[PARTY] complete");
    }
  }
}

export function landingFor(
  balloon: LiveSceneBalloon,
  waveNumber: number,
  layout: WaveSpawnLayout,
  partyId: string,
  waveBalloonIds: string[],
  avoid: Array<{ x: number; y: number; z: number }> = [],
) {
  const map = layout.landings({
    waveKey: balloon.waveId,
    balloonIds: waveBalloonIds,
    waveNumber: waveNumber || 1,
    partyId,
    avoid,
  });
  return map.get(balloon.balloonId) ?? layout.landings({
    waveKey: `${balloon.waveId}:${balloon.balloonId}`,
    balloonIds: [balloon.balloonId],
    waveNumber: waveNumber || 1,
    partyId,
    avoid,
  }).get(balloon.balloonId)!;
}
