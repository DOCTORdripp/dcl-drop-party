/**
 * Stable POP interactionRequestId across transport-ambiguous retries.
 * A new ID is issued only after the previous logical attempt is finished
 * (success, conclusive failure, or abandon timeout).
 */
export type PendingPopAttempt = {
  interactionRequestId: string;
  createdAt: number;
  candidatesFingerprint: string;
};

const MAX_PENDING = 256;
const ABANDON_MS = 30_000;

export function fingerprintCandidates(
  candidates: ReadonlyArray<{ balloonId: string; waveId: string; spawnGeneration: string }>,
): string {
  return candidates.map((row) => `${row.balloonId}:${row.waveId}:${row.spawnGeneration}`).join("|");
}

export class PopRetryLedger {
  private readonly pending = new Map<string, PendingPopAttempt>();

  bind(
    wallet: string,
    candidates: ReadonlyArray<{ balloonId: string; waveId: string; spawnGeneration: string }>,
    now: number,
    createId: () => string,
  ): string {
    this.prune(now);
    const key = wallet.toLowerCase();
    const fingerprint = fingerprintCandidates(candidates);
    const existing = this.pending.get(key);
    if (existing && now - existing.createdAt < ABANDON_MS) {
      return existing.interactionRequestId;
    }
    while (this.pending.size >= MAX_PENDING) {
      const oldest = this.pending.keys().next().value;
      if (!oldest) break;
      this.pending.delete(oldest);
    }
    const interactionRequestId = createId();
    this.pending.set(key, { interactionRequestId, createdAt: now, candidatesFingerprint: fingerprint });
    return interactionRequestId;
  }

  resolve(wallet: string): void {
    this.pending.delete(wallet.toLowerCase());
  }

  forget(wallet: string): void {
    this.pending.delete(wallet.toLowerCase());
  }

  size(): number {
    return this.pending.size;
  }

  private prune(now: number): void {
    for (const [wallet, row] of this.pending) {
      if (now - row.createdAt >= ABANDON_MS) {
        this.pending.delete(wallet);
      }
    }
  }
}
