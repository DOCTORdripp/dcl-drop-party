/**
 * UX-only eligibility signaling. Advertised counts grant no claim authority.
 * POP must recompute candidates from live authoritative state.
 */
export type EligibilityUpdate = {
  peerId: string;
  eligibleCount: number;
  reason: "first-seen" | "changed";
};

export class EligibilitySignal {
  private readonly lastCount = new Map<string, number>();

  note(peerId: string, eligibleCount: number): EligibilityUpdate | null {
    const key = peerId.toLowerCase();
    const previous = this.lastCount.get(key);
    if (previous === undefined) {
      this.lastCount.set(key, eligibleCount);
      return { peerId: key, eligibleCount, reason: "first-seen" };
    }
    if (previous === eligibleCount) {
      return null;
    }
    this.lastCount.set(key, eligibleCount);
    return { peerId: key, eligibleCount, reason: "changed" };
  }

  advertisedCount(peerId: string): number | undefined {
    return this.lastCount.get(peerId.toLowerCase());
  }

  retain(activePeerIds: readonly string[]): string[] {
    const active = new Set(activePeerIds.map((id) => id.toLowerCase()));
    const left: string[] = [];
    for (const key of [...this.lastCount.keys()]) {
      if (!active.has(key)) {
        this.lastCount.delete(key);
        left.push(key);
      }
    }
    return left;
  }

  clear(peerId: string): void {
    this.lastCount.delete(peerId.toLowerCase());
  }
}

export type PopRecomputeInput = {
  authoritativePosition: { x: number; y: number; z: number } | null;
  positionAvailable: boolean;
  advertisedEligibleCount?: number;
  clientPosition?: unknown;
  clientDistance?: unknown;
  clientCandidates?: unknown;
};

export type PopRecomputeResult =
  | { ok: true; candidates: Array<{ balloonId: string; waveId: string; spawnGeneration: string }> }
  | { ok: false; result: "NOT_ELIGIBLE" | "NO_AVAILABLE_BALLOON" };

/**
 * Claim-time candidate generation. Ignores advertised UX counts and any
 * client-supplied position, distance, or candidate list.
 */
export function recomputePopCandidates(
  authorize: (position: { x: number; y: number; z: number }) => Array<{
    balloonId: string;
    waveId: string;
    spawnGeneration: string;
  }>,
  input: PopRecomputeInput,
): PopRecomputeResult {
  void input.advertisedEligibleCount;
  void input.clientPosition;
  void input.clientDistance;
  void input.clientCandidates;
  if (!input.positionAvailable || !input.authoritativePosition) {
    return { ok: false, result: "NOT_ELIGIBLE" };
  }
  const candidates = authorize(input.authoritativePosition);
  if (candidates.length === 0) {
    return { ok: false, result: "NO_AVAILABLE_BALLOON" };
  }
  return { ok: true, candidates };
}
