export const BLOW_VISUAL_JOIN_REFRESH_MS = 10_000;
export const BLOW_VISUAL_OBSERVER_RESUME_DELAY_MS = 4_000;
export const BLOW_VISUAL_REFRESH_DEBOUNCE_MS = 3_000;
export const OBSERVER_RESUME_DEBOUNCE_MS = 3_000;

/** @deprecated Use BLOW_VISUAL_JOIN_REFRESH_MS. Kept as an alias for join-window callers. */
export const BLOW_VISUAL_REFRESH_DELAY_MS = BLOW_VISUAL_JOIN_REFRESH_MS;

export type ObserverResumeReason = "turn-in-return" | "deposit-chest-return";
export type BlowVisualRefreshCause = "join-10s" | "joiner-self" | ObserverResumeReason;

export function parseObserverResumeReason(value: string): ObserverResumeReason | undefined {
  if (value === "turn-in-return" || value === "deposit-chest-return") {
    return value;
  }
  return undefined;
}

export function isObserverResumeBlockedReason(value: string): boolean {
  return value === "blocked";
}

export type ConnectedPlayer = {
  wallet: string;
  peerId: string;
};

export type BlowVisualRefreshIntent = "existing" | "joiner-self";

export type BlowVisualRefreshTarget = {
  wallet: string;
  peerId: string;
};

export type LateJoinBlowVisualPlan = {
  joiners: string[];
  epochId: number;
  /** Existing blowers who should retrigger so the joiner sees them. */
  existing: BlowVisualRefreshTarget[];
  /** Joiners already blowing who should retrigger so others see them. */
  joinerSelf: BlowVisualRefreshTarget[];
};

type JoinEpoch = {
  id: number;
  dueAt: number;
  existingFired: boolean;
  awaitingFirstBlow: boolean;
  joinerSelfScheduled: boolean;
  joinerSelfDueAt?: number;
  joinerSelfDone: boolean;
};

function canonicalWallet(wallet: string): string {
  return wallet.toLowerCase();
}

/** True when the local client should retrigger its current blowing emote visual. */
export function shouldApplyLateJoinBlowingVisualRefresh(
  blowing: boolean,
  partyActive: boolean,
): boolean {
  return blowing && !partyActive;
}

function playerMap(players: readonly ConnectedPlayer[]): BlowVisualRefreshTarget[] {
  return players.map((player) => ({
    wallet: canonicalWallet(player.wallet),
    peerId: player.peerId,
  }));
}

/**
 * Authoritative late-join visual refresh.
 * Does not touch blowing session timestamps, color, XP, or persistence.
 */
export class LateJoinBlowVisualRefresh {
  private readonly seen = new Set<string>();
  private readonly lastExistingSentAt = new Map<string, number>();
  private readonly pendingExisting = new Set<string>();
  private readonly pendingJoinerSelf = new Set<string>();
  private readonly epochs = new Map<string, JoinEpoch>();
  private readonly lastObserverResumeAt = new Map<string, number>();
  private readonly pendingTurnInReturn = new Set<string>();
  private readonly pendingObserverResume = new Map<string, { token: number; reason: ObserverResumeReason }>();
  private epochSeq = 0;
  private observerResumeSeq = 0;

  onPresence(args: {
    players: readonly ConnectedPlayer[];
    blowingWallets: readonly string[];
    now: number;
    debounceMs?: number;
  }): LateJoinBlowVisualPlan {
    const debounceMs = args.debounceMs ?? BLOW_VISUAL_REFRESH_DEBOUNCE_MS;
    const current = playerMap(args.players);
    const currentSet = new Set(current.map((player) => player.wallet));
    const joiners = current
      .filter((player) => !this.seen.has(player.wallet))
      .map((player) => player.wallet);

    for (const player of current) {
      this.seen.add(player.wallet);
    }
    for (const wallet of [...this.seen]) {
      if (!currentSet.has(wallet)) {
        this.forget(wallet);
      }
    }

    if (joiners.length === 0) {
      return { joiners: [], epochId: 0, existing: [], joinerSelf: [] };
    }

    const epochId = ++this.epochSeq;
    const dueAt = args.now + BLOW_VISUAL_JOIN_REFRESH_MS;
    const blowing = new Set(args.blowingWallets.map(canonicalWallet));
    const byWallet = new Map(current.map((player) => [player.wallet, player]));
    const joinerSelf: BlowVisualRefreshTarget[] = [];

    for (const wallet of joiners) {
      const player = byWallet.get(wallet);
      if (!player) {
        continue;
      }
      const isBlowing = blowing.has(wallet);
      this.epochs.set(wallet, {
        id: epochId,
        dueAt,
        existingFired: false,
        awaitingFirstBlow: !isBlowing,
        joinerSelfScheduled: isBlowing,
        joinerSelfDueAt: isBlowing ? dueAt : undefined,
        joinerSelfDone: false,
      });
      if (!isBlowing) {
        continue;
      }
      this.pendingJoinerSelf.add(wallet);
      joinerSelf.push(player);
    }

    const existing = this.planExistingBlowers({
      players: args.players,
      blowingWallets: args.blowingWallets,
      excludeWallets: joiners,
      now: args.now,
      debounceMs,
    });

    return { joiners, epochId, existing, joinerSelf };
  }

  /**
   * /reload keeps the same wallet in presence. Treat scene-ready as a join
   * unless a 10s wave is already waiting for this wallet.
   */
  onClientReady(args: {
    wallet: string;
    peerId: string;
    players: readonly ConnectedPlayer[];
    blowingWallets: readonly string[];
    now: number;
  }): LateJoinBlowVisualPlan {
    const wallet = canonicalWallet(args.wallet);
    this.seen.add(wallet);
    const pending = this.epochs.get(wallet);
    if (pending && !pending.existingFired && args.now < pending.dueAt) {
      return { joiners: [], epochId: 0, existing: [], joinerSelf: [] };
    }
    const epochId = ++this.epochSeq;
    const dueAt = args.now + BLOW_VISUAL_JOIN_REFRESH_MS;
    const blowing = new Set(args.blowingWallets.map(canonicalWallet));
    const isBlowing = blowing.has(wallet);
    this.epochs.set(wallet, {
      id: epochId,
      dueAt,
      existingFired: false,
      awaitingFirstBlow: !isBlowing,
      joinerSelfScheduled: isBlowing,
      joinerSelfDueAt: isBlowing ? dueAt : undefined,
      joinerSelfDone: false,
    });
    if (isBlowing) {
      this.pendingJoinerSelf.add(wallet);
    }
    const current = playerMap(args.players);
    const self = current.find((player) => player.wallet === wallet) ?? {
      wallet,
      peerId: args.peerId,
    };
    const existing = this.planExistingBlowers({
      players: args.players,
      blowingWallets: args.blowingWallets,
      excludeWallets: [wallet],
      now: args.now,
    });
    return {
      joiners: [wallet],
      epochId,
      existing,
      joinerSelf: isBlowing ? [self] : [],
    };
  }

  joinEpochDueAt(epochId: number): number | undefined {
    for (const epoch of this.epochs.values()) {
      if (epoch.id === epochId) {
        return epoch.dueAt;
      }
    }
    return undefined;
  }

  consumeDueJoinEpochs(now: number): number[] {
    const ids = new Set<number>();
    for (const epoch of this.epochs.values()) {
      if (!epoch.existingFired && now >= epoch.dueAt) {
        ids.add(epoch.id);
      }
    }
    for (const epoch of this.epochs.values()) {
      if (ids.has(epoch.id)) {
        epoch.existingFired = true;
      }
    }
    return [...ids];
  }

  consumeDueJoinerSelf(
    now: number,
    players: readonly ConnectedPlayer[],
  ): BlowVisualRefreshTarget[] {
    const byWallet = new Map(playerMap(players).map((player) => [player.wallet, player]));
    const due: BlowVisualRefreshTarget[] = [];
    for (const [wallet, epoch] of this.epochs) {
      if (!epoch.joinerSelfScheduled || epoch.joinerSelfDone) {
        continue;
      }
      if (epoch.joinerSelfDueAt === undefined || now < epoch.joinerSelfDueAt) {
        continue;
      }
      epoch.joinerSelfScheduled = false;
      const player = byWallet.get(wallet);
      if (player && this.pendingJoinerSelf.has(wallet)) {
        due.push(player);
      }
    }
    return due;
  }

  isJoinEpochActive(epochId: number): boolean {
    if (epochId <= 0) {
      return false;
    }
    for (const epoch of this.epochs.values()) {
      if (epoch.id === epochId) {
        return true;
      }
    }
    return false;
  }

  joinersForEpoch(epochId: number): string[] {
    const joiners: string[] = [];
    for (const [wallet, epoch] of this.epochs) {
      if (epoch.id === epochId) {
        joiners.push(wallet);
      }
    }
    return joiners;
  }

  planExistingBlowers(args: {
    players: readonly ConnectedPlayer[];
    blowingWallets: readonly string[];
    excludeWallets: readonly string[];
    now: number;
    debounceMs?: number;
  }): BlowVisualRefreshTarget[] {
    const debounceMs = args.debounceMs ?? BLOW_VISUAL_REFRESH_DEBOUNCE_MS;
    const current = playerMap(args.players);
    const blowing = new Set(args.blowingWallets.map(canonicalWallet));
    const exclude = new Set(args.excludeWallets.map(canonicalWallet));
    const existing: BlowVisualRefreshTarget[] = [];
    for (const player of current) {
      if (exclude.has(player.wallet) || !blowing.has(player.wallet)) {
        continue;
      }
      if (this.pendingExisting.has(player.wallet)) {
        continue;
      }
      const last = this.lastExistingSentAt.get(player.wallet);
      if (last !== undefined && args.now - last < debounceMs) {
        continue;
      }
      existing.push(player);
    }
    return existing;
  }

  /** After a successful turn-in, wait until they re-enter the downstairs table zone. */
  armTurnInReturn(wallet: string): void {
    this.pendingTurnInReturn.add(canonicalWallet(wallet));
  }

  consumeTurnInReturn(wallet: string, insideBlowingArea: boolean): boolean {
    const id = canonicalWallet(wallet);
    if (!insideBlowingArea || !this.pendingTurnInReturn.has(id)) {
      return false;
    }
    this.pendingTurnInReturn.delete(id);
    return true;
  }

  /**
   * Returning observer: schedule ONE delayed refresh of OTHER current blowers.
   * Does not start blowing, alter sessions, or schedule joiner-self.
   * Does not freeze the target list; fire with planExistingBlowers at T+4s.
   */
  onObserverResume(args: {
    observerWallet: string;
    reason: ObserverResumeReason;
    players: readonly ConnectedPlayer[];
    blowingWallets: readonly string[];
    now: number;
    observerDebounceMs?: number;
    debounceMs?: number;
  }): { skipped: boolean; token: number; reason?: ObserverResumeReason; existing: BlowVisualRefreshTarget[] } {
    const observer = canonicalWallet(args.observerWallet);
    if (this.pendingObserverResume.has(observer)) {
      return { skipped: true, token: 0, existing: [] };
    }
    const observerDebounce = args.observerDebounceMs ?? OBSERVER_RESUME_DEBOUNCE_MS;
    const lastResume = this.lastObserverResumeAt.get(observer);
    if (lastResume !== undefined && args.now - lastResume < observerDebounce) {
      return { skipped: true, token: 0, existing: [] };
    }
    this.lastObserverResumeAt.set(observer, args.now);
    const token = ++this.observerResumeSeq;
    const existing = this.planExistingBlowers({
      players: args.players,
      blowingWallets: args.blowingWallets,
      excludeWallets: [observer],
      now: args.now,
      debounceMs: args.debounceMs,
    });
    this.pendingObserverResume.set(observer, { token, reason: args.reason });
    return { skipped: false, token, reason: args.reason, existing };
  }

  consumeObserverResume(observerWallet: string, token: number): ObserverResumeReason | undefined {
    const id = canonicalWallet(observerWallet);
    const pending = this.pendingObserverResume.get(id);
    if (!pending || pending.token !== token) {
      return undefined;
    }
    this.pendingObserverResume.delete(id);
    return pending.reason;
  }

  isObserverResumePending(observerWallet: string, token?: number): boolean {
    const pending = this.pendingObserverResume.get(canonicalWallet(observerWallet));
    if (!pending) {
      return false;
    }
    return token === undefined || pending.token === token;
  }

  cancelObserverResume(observerWallet: string): boolean {
    const id = canonicalWallet(observerWallet);
    if (!this.pendingObserverResume.has(id)) {
      return false;
    }
    this.pendingObserverResume.delete(id);
    this.lastObserverResumeAt.delete(id);
    return true;
  }

  onStartBlowing(
    wallet: string,
    peerId: string,
    now = 0,
  ): BlowVisualRefreshTarget | undefined {
    const id = canonicalWallet(wallet);
    const epoch = this.epochs.get(id);
    if (!epoch || !epoch.awaitingFirstBlow || epoch.joinerSelfScheduled || epoch.joinerSelfDone) {
      return undefined;
    }
    epoch.awaitingFirstBlow = false;
    epoch.joinerSelfScheduled = true;
    epoch.joinerSelfDueAt = now + BLOW_VISUAL_JOIN_REFRESH_MS;
    this.pendingJoinerSelf.add(id);
    return { wallet: id, peerId };
  }

  /** A later natural emote (new balloon interval) already emitted a fresh command. */
  noteFreshEmote(wallet: string): boolean {
    const id = canonicalWallet(wallet);
    const epoch = this.epochs.get(id);
    if (!epoch || epoch.joinerSelfDone || !this.pendingJoinerSelf.has(id)) {
      return false;
    }
    this.pendingJoinerSelf.delete(id);
    epoch.joinerSelfScheduled = false;
    epoch.joinerSelfDone = true;
    return true;
  }

  markExistingSent(wallet: string, now: number): void {
    const id = canonicalWallet(wallet);
    this.pendingExisting.delete(id);
    this.lastExistingSentAt.set(id, now);
  }

  isJoinerSelfPending(wallet: string): boolean {
    return this.pendingJoinerSelf.has(canonicalWallet(wallet));
  }

  markJoinerSelfSent(wallet: string): void {
    const id = canonicalWallet(wallet);
    this.pendingJoinerSelf.delete(id);
    const epoch = this.epochs.get(id);
    if (epoch) {
      epoch.joinerSelfDone = true;
      epoch.joinerSelfScheduled = false;
    }
  }

  cancelExistingPending(wallet: string): void {
    this.pendingExisting.delete(canonicalWallet(wallet));
  }

  cancelJoinerSelfPending(wallet: string): void {
    const id = canonicalWallet(wallet);
    this.pendingJoinerSelf.delete(id);
    const epoch = this.epochs.get(id);
    if (epoch) {
      epoch.joinerSelfScheduled = false;
    }
  }

  private forget(wallet: string): void {
    this.seen.delete(wallet);
    this.pendingExisting.delete(wallet);
    this.pendingJoinerSelf.delete(wallet);
    this.lastExistingSentAt.delete(wallet);
    this.epochs.delete(wallet);
    this.lastObserverResumeAt.delete(wallet);
    this.pendingTurnInReturn.delete(wallet);
    this.pendingObserverResume.delete(wallet);
  }
}
