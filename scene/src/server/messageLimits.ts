export type RateLimitResult = { allowed: true } | { allowed: false; reason: "RATE_LIMITED" | "QUEUE_FULL" };

type Bucket = { tokens: number; updatedAt: number };

const MAX_WALLETS = 512;

export class TokenBucketLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly capacity: number,
    private readonly refillPerSec: number,
  ) {}

  take(key: string, now = Date.now()): boolean {
    this.prune();
    const row = this.buckets.get(key);
    if (!row) {
      this.buckets.set(key, { tokens: this.capacity - 1, updatedAt: now });
      return true;
    }
    const elapsed = Math.max(0, (now - row.updatedAt) / 1000);
    row.tokens = Math.min(this.capacity, row.tokens + elapsed * this.refillPerSec);
    row.updatedAt = now;
    if (row.tokens < 1) {
      return false;
    }
    row.tokens -= 1;
    return true;
  }

  forget(key: string): void {
    this.buckets.delete(key);
  }

  size(): number {
    return this.buckets.size;
  }

  private prune(): void {
    if (this.buckets.size <= MAX_WALLETS) {
      return;
    }
    const extra = this.buckets.size - MAX_WALLETS;
    let removed = 0;
    for (const key of this.buckets.keys()) {
      this.buckets.delete(key);
      removed += 1;
      if (removed >= extra) break;
    }
  }
}

export class BoundedCounter {
  private readonly counts = new Map<string, number>();

  constructor(private readonly max: number, private readonly maxKeys = MAX_WALLETS) {}

  tryAcquire(key: string): boolean {
    this.prune();
    const next = (this.counts.get(key) ?? 0) + 1;
    if (next > this.max) {
      return false;
    }
    this.counts.set(key, next);
    return true;
  }

  release(key: string): void {
    const current = this.counts.get(key);
    if (current === undefined) return;
    if (current <= 1) {
      this.counts.delete(key);
      return;
    }
    this.counts.set(key, current - 1);
  }

  forget(key: string): void {
    this.counts.delete(key);
  }

  get(key: string): number {
    return this.counts.get(key) ?? 0;
  }

  size(): number {
    return this.counts.size;
  }

  private prune(): void {
    if (this.counts.size <= this.maxKeys) return;
    const first = this.counts.keys().next().value;
    if (first) this.counts.delete(first);
  }
}

export const MESSAGE_LIMITS: Record<string, { capacity: number; refillPerSec: number }> = {
  admissionRequest: { capacity: 8, refillPerSec: 2 },
  popAttempt: { capacity: 6, refillPerSec: 2 },
  startBlowing: { capacity: 10, refillPerSec: 4 },
  stopBlowing: { capacity: 10, refillPerSec: 4 },
  tableSit: { capacity: 8, refillPerSec: 4 },
  tableStand: { capacity: 8, refillPerSec: 4 },
  tableSurround: { capacity: 12, refillPerSec: 6 },
  balloonSync: { capacity: 6, refillPerSec: 1 },
  blowerLeaderboardRequest: { capacity: 4, refillPerSec: 0.5 },
  upcomingPartiesRequest: { capacity: 6, refillPerSec: 0.5 },
  employmentAccept: { capacity: 4, refillPerSec: 1 },
  turnInBalloons: { capacity: 4, refillPerSec: 1 },
  observerResumed: { capacity: 6, refillPerSec: 1 },
  blowVisualJoin: { capacity: 4, refillPerSec: 0.5 },
  redeemBalloonReward: { capacity: 6, refillPerSec: 2 },
  redeemKiteReward: { capacity: 4, refillPerSec: 1 },
  kiteStockRequest: { capacity: 2, refillPerSec: 0.5 },
};

export const MAX_QUEUE_DEPTH_PER_WALLET = 8;
export const MAX_REQUEST_ID_CHARS = 64;
export const MAX_REWARD_KEY_CHARS = 64;
export const MAX_KITE_ID_CHARS = 16;
export const MAX_ADMISSION_TOKEN_CHARS = 2048;

export class MessageRateLimits {
  private readonly limiters = new Map<string, TokenBucketLimiter>();
  readonly queues = new BoundedCounter(MAX_QUEUE_DEPTH_PER_WALLET);

  constructor() {
    for (const [name, spec] of Object.entries(MESSAGE_LIMITS)) {
      this.limiters.set(name, new TokenBucketLimiter(spec.capacity, spec.refillPerSec));
    }
  }

  allow(message: string, wallet: string, now = Date.now()): RateLimitResult {
    const limiter = this.limiters.get(message);
    if (limiter && !limiter.take(`${message}:${wallet.toLowerCase()}`, now)) {
      return { allowed: false, reason: "RATE_LIMITED" };
    }
    return { allowed: true };
  }

  forget(wallet: string): void {
    const key = wallet.toLowerCase();
    this.queues.forget(key);
    for (const [name, limiter] of this.limiters) {
      limiter.forget(`${name}:${key}`);
    }
  }

  limiterSize(): number {
    let total = 0;
    for (const limiter of this.limiters.values()) {
      total += limiter.size();
    }
    return total;
  }
}
