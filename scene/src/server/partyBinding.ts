import { parsePartySnapshot, type PartySnapshot } from "./partyDirector";

export type TrustedTickInterpretation =
  | { kind: "snapshot"; snapshot: PartySnapshot }
  | { kind: "empty" }
  | { kind: "error" };

export type BoundPartyState = {
  partyId: string;
  lastSnapshot: PartySnapshot | null;
};

export type BoundPartyNext = {
  next: BoundPartyState;
  resetRuntime: boolean;
  writeIdle: boolean;
  applySnapshot: PartySnapshot | null;
};

export function isEmptyPlayableTick(json: unknown): boolean {
  if (!json || typeof json !== "object") {
    return false;
  }
  const row = json as Record<string, unknown>;
  return row.empty === true || row.partyId === null;
}

export function interpretTrustedPartyResponse(
  status: number,
  json: unknown,
): TrustedTickInterpretation {
  if (status === 200 && isEmptyPlayableTick(json)) {
    return { kind: "empty" };
  }
  if (status === 200) {
    const snapshot = parsePartySnapshot(json);
    if (snapshot) {
      return { kind: "snapshot", snapshot };
    }
    return { kind: "error" };
  }
  if (status === 404) {
    return { kind: "empty" };
  }
  return { kind: "error" };
}

export function nextBoundPartyState(
  current: BoundPartyState,
  interpreted: TrustedTickInterpretation,
  pinnedPartyId = "",
): BoundPartyNext {
  if (interpreted.kind === "error") {
    return {
      next: current,
      resetRuntime: false,
      writeIdle: false,
      applySnapshot: null,
    };
  }
  if (interpreted.kind === "empty") {
    const hadParty = Boolean(current.lastSnapshot) || (current.partyId.length > 0 && !pinnedPartyId);
    return {
      next: { partyId: pinnedPartyId, lastSnapshot: null },
      resetRuntime: hadParty || Boolean(current.lastSnapshot),
      writeIdle: true,
      applySnapshot: null,
    };
  }
  const snapshot = interpreted.snapshot;
  const previousId = current.lastSnapshot?.partyId || current.partyId;
  const resetRuntime = Boolean(previousId) && previousId !== snapshot.partyId;
  return {
    next: {
      partyId: pinnedPartyId || snapshot.partyId,
      lastSnapshot: snapshot,
    },
    resetRuntime,
    writeIdle: false,
    applySnapshot: snapshot,
  };
}

export function idlePartyHudPayload(): {
  partyId: string;
  status: string;
  phase: string;
  headline: string;
  scheduledAt: number;
  startedAt: number;
  wavePhaseEndsAt: number;
  nextWaveAt: number;
  finalWaveSpawnedAt: number;
  finalBalloonExpiresAt: number;
  waveNumber: number;
  isFinal: boolean;
  playerCount: number;
  liveCount: number;
} {
  return {
    partyId: "",
    status: "NONE",
    phase: "",
    headline: "",
    scheduledAt: 0,
    startedAt: 0,
    wavePhaseEndsAt: 0,
    nextWaveAt: 0,
    finalWaveSpawnedAt: 0,
    finalBalloonExpiresAt: 0,
    waveNumber: 0,
    isFinal: false,
    playerCount: 0,
    liveCount: 0,
  };
}
