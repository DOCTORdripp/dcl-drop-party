import {
  BALLOON_INTERVAL_MS,
  MAX_CARRIED_BALLOONS,
  cloneBalloonProfile,
  completeOneBalloon,
  employPlayer,
  emptyBalloonLeaderboard,
  decodeStoredBalloonLeaderboard,
  decodeStoredBalloonProfile,
  rankCurrentBlowers,
  turnInCarriedBalloons,
  upsertLeaderboard,
  type BalloonLeaderboard,
  type BalloonProfile,
} from "../shared/balloonProfile";
import {
  authoritativeKiteView,
  effectiveBalloonCapacity,
  effectiveBalloonIntervalMs,
  effectiveKiteXpBonus,
  resolveActiveKitePerk,
  isKitePerkId,
  getKitePerk,
  KITE_PERKS,
  type AuthoritativeKiteView,
  type KitePerkId,
  type ResolvedKitePerk,
} from "../shared/kitePerks";
import { createAsyncMutex } from "../shared/asyncMutex";
import {
  applyChainRemainingToCounts,
  emptyKiteMintCounts,
  kiteMintRemaining,
  parseKiteMintCounts,
  type KiteMintCounts,
} from "../shared/kiteMintLedger";
import {
  evaluateKiteMintEligibility,
  kiteMintAttemptNeedsNewIntent,
  kiteMintRetrySafe,
  parseKiteRedemptionLedger,
  sanitizeKiteMintClientError,
  type KiteMintTxStatus,
  type KiteRedemptionEntry,
  type KiteRedemptionLedger,
} from "../shared/kiteMintRedemption";
import { parseDepositWarningSkip } from "../shared/depositWarning";
import { inspectBlocksMint, type KiteIssueResult, type KiteMintChain } from "./kiteMintChain";
import {
  BALLOON_REWARDS,
  deductRewardPoints,
  evaluateRewardRedemption,
  type BalloonReward,
} from "../shared/balloonRewards";

export type BalloonStopReason = "stop" | "cap" | "party" | "leave" | "restart";

export type BalloonStartResult =
  | { ok: true; already: boolean; intervalStartedAt: number }
  | { ok: false; result: "NOT_EMPLOYED" | "PARTY_ACTIVE" | "CARRIED_FULL" | "NOT_PRESENT" };

export type BalloonTurnInResult =
  | { ok: true; profile: BalloonProfile }
  | { ok: false; result: "NOT_READY" | "NOT_EMPLOYED" | "NOT_PRESENT" };

export type BalloonRedeemResult =
  | { ok: true; profile: BalloonProfile; reward: BalloonReward; requestId: string }
  | {
      ok: false;
      result: "UNKNOWN_REWARD" | "UNAVAILABLE" | "LEVEL_LOCKED" | "INSUFFICIENT_POINTS" | "NOT_PRESENT" | "NOT_EMPLOYED";
    };

export type KiteRedeemResult =
  | {
      ok: true;
      result: "OK";
      kiteId: KitePerkId;
      status: "CONFIRMED";
      txHash: string;
      retrySafe: false;
      profile: BalloonProfile;
    }
  | {
      ok: false;
      result:
        | "UNKNOWN_KITE"
        | "UNAVAILABLE"
        | "LEVEL_LOCKED"
        | "INSUFFICIENT_POINTS"
        | "ALREADY_CLAIMED"
        | "ALLOWANCE_EXHAUSTED"
        | "SUPPLY_EXHAUSTED"
        | "MINTING_DISABLED"
        | "SUBMITTED"
        | "NOT_CONFIGURED"
        | "NOT_PRESENT"
        | "NOT_EMPLOYED";
      kiteId: string;
      status: KiteMintTxStatus | "";
      txHash: string;
      retrySafe: boolean;
      balloonPoints: number;
      lastError: string;
    };

export type BalloonPersist = {
  loadPlayer(wallet: string): Promise<unknown>;
  savePlayer(wallet: string, profile: BalloonProfile): Promise<boolean>;
  loadLeaderboard(): Promise<unknown>;
  saveLeaderboard(board: BalloonLeaderboard): Promise<boolean>;
  loadKiteMintLedger(): Promise<unknown>;
  saveKiteMintLedger(counts: KiteMintCounts): Promise<boolean>;
  loadKiteRedemptions(wallet: string): Promise<unknown>;
  saveKiteRedemptions(wallet: string, ledger: KiteRedemptionLedger): Promise<boolean>;
  loadDepositWarningSkip(wallet: string): Promise<unknown>;
  saveDepositWarningSkip(wallet: string, skip: boolean): Promise<boolean>;
};

export type BalloonRewardDelivery = {
  redeem(args: {
    wallet: string;
    rewardKey: string;
    itemUrn: string;
    requestId: string;
  }): Promise<boolean>;
};

export type LiveBalloonPlayer = {
  wallet: string;
  peerId: string;
  displayName: string;
  profile: BalloonProfile;
  blowing: boolean;
  intervalStartedAt: number;
  /** Cycle start time already claimed for completion; -1 = unclaimed. */
  claimedCycleStartedAt: number;
  intervalMs: number;
  kiteId: string;
  kiteName: string;
  kiteXpBonus: number;
  capacity: number;
  dirty: boolean;
  persistInFlight: boolean;
  greetingShown: boolean;
  skipDepositWarning: boolean;
  present: boolean;
  kiteRedemptions: KiteRedemptionLedger;
};

export type BalloonTickEvent =
  | { type: "completed"; wallet: string; peerId: string; profile: BalloonProfile; awardedXp: number; intervalStartedAt: number; intervalMs: number }
  | { type: "stopped"; wallet: string; peerId: string; reason: BalloonStopReason; profile: BalloonProfile }
  | { type: "greeting"; wallet: string; peerId: string; name: string };

function normalizeWallet(wallet: string): string {
  return wallet.toLowerCase();
}

export class BalloonGameRuntime {
  readonly players = new Map<string, LiveBalloonPlayer>();
  leaderboard: BalloonLeaderboard = emptyBalloonLeaderboard();
  kiteMints: KiteMintCounts = emptyKiteMintCounts();
  private readonly chains = new Map<string, Promise<void>>();
  private readonly minterSend = createAsyncMutex();
  private persistAttempts = 0;
  private redeemSeq = 0;
  private leaderboardDirty = false;
  private flushAllInFlight = false;
  private liveLeaderboardReady = false;

  constructor(
    private readonly persist: BalloonPersist,
    private readonly delivery?: BalloonRewardDelivery,
    private readonly catalog: readonly BalloonReward[] = BALLOON_REWARDS,
    private kiteMint?: KiteMintChain,
  ) {}

  setKiteMintChain(chain: KiteMintChain | undefined): void {
    this.kiteMint = chain;
  }

  enqueue<T>(wallet: string, fn: () => Promise<T> | T): Promise<T> {
    const key = normalizeWallet(wallet);
    const previous = this.chains.get(key) ?? Promise.resolve();
    const next = previous.then(fn, fn);
    this.chains.set(
      key,
      next.then(
        () => undefined,
        () => undefined,
      ),
    );
    return next;
  }

  get(wallet: string): LiveBalloonPlayer | undefined {
    return this.players.get(normalizeWallet(wallet));
  }

  skipDepositWarningFor(wallet: string): boolean {
    return this.get(wallet)?.skipDepositWarning === true;
  }

  async setSkipDepositWarning(wallet: string, skip: boolean): Promise<boolean> {
    const live = this.get(wallet);
    if (live) {
      live.skipDepositWarning = skip;
    }
    return await this.persist.saveDepositWarningSkip(normalizeWallet(wallet), skip);
  }

  kiteView(wallet: string): AuthoritativeKiteView {
    const live = this.get(wallet);
    if (!live) {
      return {
        kiteId: "",
        kiteName: "",
        kiteXpBonus: 0,
        capacity: MAX_CARRIED_BALLOONS,
        intervalMs: BALLOON_INTERVAL_MS,
      };
    }
    return {
      kiteId: live.kiteId,
      kiteName: live.kiteName,
      kiteXpBonus: live.kiteXpBonus,
      capacity: live.capacity,
      intervalMs: live.intervalMs > 0 ? live.intervalMs : BALLOON_INTERVAL_MS,
    };
  }

  applyEquippedKite(wallet: string, wearableUrns: readonly string[]): AuthoritativeKiteView {
    const live = this.get(wallet);
    if (!live) {
      return this.kiteView(wallet);
    }
    this.applyKitePerk(live, resolveActiveKitePerk(wearableUrns, live.profile.level));
    return this.kiteView(wallet);
  }

  private applyKitePerk(live: LiveBalloonPlayer, perk: ResolvedKitePerk | undefined): void {
    const view = authoritativeKiteView(perk);
    live.kiteId = view.kiteId;
    live.kiteName = view.kiteName;
    live.kiteXpBonus = view.kiteXpBonus;
    live.capacity = view.capacity;
  }

  isDue(wallet: string, now: number): boolean {
    const live = this.get(wallet);
    if (!live?.blowing) {
      return false;
    }
    const lockedIntervalMs = live.intervalMs > 0 ? live.intervalMs : BALLOON_INTERVAL_MS;
    return now - live.intervalStartedAt >= lockedIntervalMs;
  }

  dueBlowingWallets(now: number): string[] {
    const due: string[] = [];
    for (const live of this.players.values()) {
      if (this.isDue(live.wallet, now)) {
        due.push(live.wallet);
      }
    }
    return due;
  }

  async hydrate(args: { wallet: string; peerId: string; displayName?: string }): Promise<LiveBalloonPlayer> {
    const wallet = normalizeWallet(args.wallet);
    const existing = this.players.get(wallet);
    if (existing) {
      existing.peerId = args.peerId;
      existing.present = true;
      if (args.displayName) {
        existing.displayName = args.displayName;
      }
      return existing;
    }
    const raw = await this.persist.loadPlayer(wallet);
    const live: LiveBalloonPlayer = {
      wallet,
      peerId: args.peerId,
      displayName: args.displayName ?? "",
      profile: decodeStoredBalloonProfile(raw),
      blowing: false,
      intervalStartedAt: 0,
      claimedCycleStartedAt: -1,
      intervalMs: BALLOON_INTERVAL_MS,
      kiteId: "",
      kiteName: "",
      kiteXpBonus: 0,
      capacity: MAX_CARRIED_BALLOONS,
      dirty: false,
      persistInFlight: false,
      greetingShown: false,
      skipDepositWarning: parseDepositWarningSkip(await this.persist.loadDepositWarningSkip(wallet)),
      present: true,
      kiteRedemptions: parseKiteRedemptionLedger(await this.persist.loadKiteRedemptions(wallet)),
    };
    this.players.set(wallet, live);
    return live;
  }

  takeGreeting(wallet: string): string | undefined {
    const live = this.get(wallet);
    if (!live || !live.profile.employed || live.greetingShown) {
      return undefined;
    }
    live.greetingShown = true;
    return live.displayName.trim() || "friend";
  }

  startBlowing(
    wallet: string,
    now: number,
    partyActive: boolean,
    wearableUrns: readonly string[] = [],
  ): BalloonStartResult {
    const live = this.get(wallet);
    if (!live || !live.present) {
      return { ok: false, result: "NOT_PRESENT" };
    }
    if (!live.profile.employed) {
      return { ok: false, result: "NOT_EMPLOYED" };
    }
    if (partyActive) {
      return { ok: false, result: "PARTY_ACTIVE" };
    }
    const perk = resolveActiveKitePerk(wearableUrns, live.profile.level);
    this.applyKitePerk(live, perk);
    if (live.profile.carriedBalloons >= effectiveBalloonCapacity(perk)) {
      return { ok: false, result: "CARRIED_FULL" };
    }
    if (live.blowing) {
      return { ok: true, already: true, intervalStartedAt: live.intervalStartedAt };
    }
    live.blowing = true;
    live.intervalStartedAt = now;
    live.claimedCycleStartedAt = -1;
    live.intervalMs = effectiveBalloonIntervalMs(perk);
    return { ok: true, already: false, intervalStartedAt: now };
  }

  stopBlowing(wallet: string, reason: BalloonStopReason = "stop"): BalloonStopReason | undefined {
    const live = this.get(wallet);
    if (!live || !live.blowing) {
      return undefined;
    }
    live.blowing = false;
    live.intervalStartedAt = 0;
    live.claimedCycleStartedAt = -1;
    return reason;
  }

  employ(wallet: string, now: number): { employed: boolean; already: boolean } | { employed: false; result: "NOT_PRESENT" } {
    const live = this.get(wallet);
    if (!live || !live.present) {
      return { employed: false, result: "NOT_PRESENT" };
    }
    if (live.profile.employed) {
      return { employed: true, already: true };
    }
    live.profile = employPlayer(live.profile, now);
    live.dirty = true;
    return { employed: true, already: false };
  }

  turnIn(wallet: string, wearableUrns: readonly string[] = []): BalloonTurnInResult {
    const live = this.get(wallet);
    if (!live || !live.present) {
      return { ok: false, result: "NOT_PRESENT" };
    }
    if (!live.profile.employed) {
      return { ok: false, result: "NOT_EMPLOYED" };
    }
    const perk = resolveActiveKitePerk(wearableUrns, live.profile.level);
    this.applyKitePerk(live, perk);
    try {
      live.profile = turnInCarriedBalloons(live.profile, effectiveBalloonCapacity(perk));
    } catch {
      return { ok: false, result: "NOT_READY" };
    }
    live.dirty = true;
    return { ok: true, profile: cloneBalloonProfile(live.profile) };
  }

  /**
   * Balloon wearable rewards: BP is deducted before delivery.
   * Idempotency is requestId-based but weaker than kite attempt+tx-hash
   * reconciliation, and there is no Collection V2 remaining check.
   * All catalog URNs are currently empty/disabled, so this path is not live.
   */
  async redeem(wallet: string, rewardKey: string): Promise<BalloonRedeemResult> {
    const live = this.get(wallet);
    if (!live || !live.present) {
      return { ok: false, result: "NOT_PRESENT" };
    }
    if (!live.profile.employed) {
      return { ok: false, result: "NOT_EMPLOYED" };
    }
    const gate = evaluateRewardRedemption(live.profile, rewardKey, this.catalog);
    if (!gate.ok) {
      return gate;
    }
    if (!this.delivery) {
      return { ok: false, result: "UNAVAILABLE" };
    }
    const previous = cloneBalloonProfile(live.profile);
    live.profile = deductRewardPoints(live.profile, gate.reward);
    live.dirty = true;
    this.redeemSeq += 1;
    const requestId = `${live.wallet}:${gate.reward.key}:${this.redeemSeq}`;
    const saved = await this.flush(live);
    if (!saved) {
      live.profile = previous;
      live.dirty = true;
      return { ok: false, result: "UNAVAILABLE" };
    }
    const delivered = await this.delivery.redeem({
      wallet: live.wallet,
      rewardKey: gate.reward.key,
      itemUrn: gate.reward.itemUrn,
      requestId,
    });
    if (!delivered) {
      live.profile = previous;
      live.dirty = true;
      await this.flush(live);
      return { ok: false, result: "UNAVAILABLE" };
    }
    return { ok: true, profile: cloneBalloonProfile(live.profile), reward: gate.reward, requestId };
  }

  private kiteFail(
    live: LiveBalloonPlayer | undefined,
    kiteId: string,
    result: Extract<KiteRedeemResult, { ok: false }>["result"],
    entry?: KiteRedemptionEntry,
    lastError?: string,
  ): KiteRedeemResult {
    return {
      ok: false,
      result,
      kiteId,
      status: entry?.status ?? "",
      txHash: entry?.txHash ?? "",
      retrySafe: kiteMintRetrySafe(entry),
      balloonPoints: live?.profile.balloonPoints ?? 0,
      lastError: sanitizeKiteMintClientError(lastError || entry?.lastError || ""),
    };
  }

  private async writeKiteRedemption(live: LiveBalloonPlayer, entry: KiteRedemptionEntry): Promise<boolean> {
    live.kiteRedemptions = { ...live.kiteRedemptions, [entry.kiteId]: entry };
    return await this.persist.saveKiteRedemptions(live.wallet, live.kiteRedemptions);
  }

  private async restoreReservedBp(
    live: LiveBalloonPlayer,
    entry: KiteRedemptionEntry,
    now: number,
    error: string,
  ): Promise<KiteRedemptionEntry> {
    if (entry.bpReserved) {
      live.profile = {
        ...live.profile,
        balloonPoints: live.profile.balloonPoints + entry.cost,
      };
      live.dirty = true;
      await this.flush(live);
    }
    const failed: KiteRedemptionEntry = {
      ...entry,
      status: "FAILED",
      bpReserved: false,
      lastError: error,
      updatedAt: now,
    };
    await this.writeKiteRedemption(live, failed);
    return failed;
  }

  private async reconcileKiteStockFromRemaining(id: KitePerkId, remaining: bigint): Promise<void> {
    this.kiteMints = applyChainRemainingToCounts(this.kiteMints, id, remaining);
    await this.persist.saveKiteMintLedger(this.kiteMints);
  }

  private nextKiteAttemptId(wallet: string, kiteId: string, now = Date.now()): string {
    this.redeemSeq += 1;
    return `${normalizeWallet(wallet)}:${kiteId}:${now}:${this.redeemSeq}`;
  }

  private async applyIssueStock(kiteId: string, issued: KiteIssueResult): Promise<void> {
    if (issued.remaining === undefined || !isKitePerkId(kiteId)) {
      return;
    }
    await this.reconcileKiteStockFromRemaining(kiteId, issued.remaining);
  }

  private async confirmKiteMint(
    live: LiveBalloonPlayer,
    entry: KiteRedemptionEntry,
    now: number,
  ): Promise<KiteRedeemResult> {
    const confirmed: KiteRedemptionEntry = {
      ...entry,
      status: "CONFIRMED",
      bpReserved: false,
      lastError: "",
      updatedAt: now,
    };
    await this.writeKiteRedemption(live, confirmed);
    if (this.kiteMint && isKitePerkId(entry.kiteId)) {
      const kite = getKitePerk(entry.kiteId);
      try {
        const inspect = await this.kiteMint.inspect(kite.contract, BigInt(kite.itemId));
        await this.reconcileKiteStockFromRemaining(entry.kiteId, inspect.remaining);
      } catch {
        if (kiteMintRemaining(entry.kiteId, this.kiteMints[entry.kiteId]) > 0) {
          await this.recordSceneKiteMint(entry.kiteId);
        }
      }
    }
    return {
      ok: true,
      result: "OK",
      kiteId: entry.kiteId,
      status: "CONFIRMED",
      txHash: confirmed.txHash,
      retrySafe: false,
      profile: cloneBalloonProfile(live.profile),
    };
  }

  private async reconcileSubmitted(
    live: LiveBalloonPlayer,
    entry: KiteRedemptionEntry,
    now: number,
  ): Promise<KiteRedeemResult> {
    if (!this.kiteMint || !entry.txHash) {
      return this.kiteFail(live, entry.kiteId, "SUBMITTED", entry);
    }
    const attempts = Math.max(1, this.kiteMint.receiptAttempts);
    for (let i = 0; i < attempts; i++) {
      const receipt = await this.kiteMint.getReceipt(entry.txHash);
      if (receipt === "success") {
        return await this.confirmKiteMint(live, entry, now);
      }
      if (receipt === "reverted") {
        const failed = await this.restoreReservedBp(live, entry, now, "reverted");
        return this.kiteFail(live, entry.kiteId, "UNAVAILABLE", failed);
      }
      if (this.kiteMint.pollMs > 0 && i < attempts - 1) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, this.kiteMint!.pollMs);
        });
      }
    }
    return this.kiteFail(live, entry.kiteId, "SUBMITTED", entry);
  }

  async redeemKite(wallet: string, kiteId: string, now = Date.now()): Promise<KiteRedeemResult> {
    const live = this.get(wallet);
    if (!live || !live.present) {
      return this.kiteFail(undefined, kiteId, "NOT_PRESENT");
    }
    if (!live.profile.employed) {
      return this.kiteFail(live, kiteId, "NOT_EMPLOYED");
    }
    const existing = isKitePerkId(kiteId) ? live.kiteRedemptions[kiteId] : undefined;
    if (existing?.status === "SUBMITTED") {
      if (existing.attemptId && this.kiteMint && isKitePerkId(kiteId)) {
        const kite = getKitePerk(kiteId);
        const issued = await this.kiteMint.issueOne({
          contract: kite.contract,
          beneficiary: live.wallet,
          itemId: BigInt(kite.itemId),
          attemptId: existing.attemptId,
          kiteId,
        });
        await this.applyIssueStock(kiteId, issued);
        if (!issued.ok) {
          if (issued.result === "REVERTED" || issued.error.toLowerCase().includes("reverted")) {
            const failed = await this.restoreReservedBp(live, existing, now, issued.error);
            return this.kiteFail(live, kiteId, "UNAVAILABLE", failed);
          }
          return this.kiteFail(live, kiteId, "SUBMITTED", existing);
        }
        const next: KiteRedemptionEntry = {
          ...existing,
          status: "SUBMITTED",
          txHash: issued.txHash || existing.txHash,
          updatedAt: now,
        };
        await this.writeKiteRedemption(live, next);
        return await this.reconcileSubmitted(live, next, now);
      }
      return await this.reconcileSubmitted(live, existing, now);
    }
    const gate = evaluateKiteMintEligibility(live.profile, kiteId, existing);
    if (!gate.ok) {
      return this.kiteFail(live, kiteId, gate.result, existing);
    }
    if (!this.kiteMint) {
      return this.kiteFail(live, kiteId, "NOT_CONFIGURED", existing);
    }
    if (existing?.status === "PENDING" && existing.txHash) {
      return await this.reconcileSubmitted(live, { ...existing, status: "SUBMITTED" }, now);
    }

    const submitted = await this.minterSend.run(async () => {
      const current = live.kiteRedemptions[gate.kite.id];
      if (current?.status === "SUBMITTED" && current.txHash) {
        return current;
      }
      if (current?.status === "PENDING" && current.txHash) {
        return { ...current, status: "SUBMITTED" as const };
      }
      let inspect;
      try {
        inspect = await this.kiteMint!.inspect(gate.kite.contract, BigInt(gate.kite.itemId));
        console.log(
          `[KITE MINT] inspect ${JSON.stringify({
            kiteId: gate.kite.id,
            wallet: live.wallet,
            exists: inspect.exists,
            mintingAllowed: inspect.mintingAllowed,
            mintingAllowedSource: inspect.mintingAllowedSource,
            globalMinter: inspect.globalMinter,
            allowance: inspect.allowance.toString(),
            maxSupply: inspect.maxSupply.toString(),
            totalSupply: inspect.totalSupply.toString(),
            remaining: inspect.remaining.toString(),
          })}`,
        );
      } catch (error) {
        console.log(
          `[KITE MINT] inspect failed ${JSON.stringify({
            kiteId,
            wallet: live.wallet,
            error: error instanceof Error ? error.message : String(error),
          })}`,
        );
        return this.kiteFail(
          live,
          kiteId,
          "UNAVAILABLE",
          current,
          error instanceof Error ? error.message : String(error),
        );
      }
      await this.reconcileKiteStockFromRemaining(gate.kite.id, inspect.remaining);
      const blocked = inspectBlocksMint(inspect);
      if (blocked) {
        console.log(
          `[KITE MINT] inspect blocked ${JSON.stringify({ kiteId: gate.kite.id, wallet: live.wallet, blocked })}`,
        );
        return this.kiteFail(live, kiteId, blocked, current);
      }

      let entry = current;
      if (kiteMintAttemptNeedsNewIntent(entry)) {
        const cost = gate.kite.balloonPointCost;
        live.profile = {
          ...live.profile,
          balloonPoints: live.profile.balloonPoints - cost,
        };
        live.dirty = true;
        const savedProfile = await this.flush(live);
        entry = {
          kiteId: gate.kite.id,
          attemptId: this.nextKiteAttemptId(live.wallet, gate.kite.id, now),
          status: "PENDING",
          txHash: "",
          cost,
          bpReserved: true,
          lastError: "",
          updatedAt: now,
        };
        const savedLedger = await this.writeKiteRedemption(live, entry);
        if (!savedProfile || !savedLedger) {
          const failed = await this.restoreReservedBp(live, entry, now, "persist failed");
          return this.kiteFail(live, kiteId, "UNAVAILABLE", failed);
        }
      }
      if (!entry) {
        return this.kiteFail(live, kiteId, "UNAVAILABLE", current);
      }
      if (!entry.attemptId) {
        entry = { ...entry, attemptId: this.nextKiteAttemptId(live.wallet, gate.kite.id, now) };
        await this.writeKiteRedemption(live, entry);
      }

      const issued = await this.kiteMint!.issueOne({
        contract: gate.kite.contract,
        beneficiary: live.wallet,
        itemId: BigInt(gate.kite.itemId),
        attemptId: entry.attemptId,
        kiteId: gate.kite.id,
      });
      await this.applyIssueStock(gate.kite.id, issued);
      if (!issued.ok) {
        console.log(
          `[KITE MINT] submit failed ${JSON.stringify({
            kiteId: gate.kite.id,
            wallet: live.wallet,
            error: issued.error,
          })}`,
        );
        const failed = await this.restoreReservedBp(live, entry, now, issued.error);
        const result =
          issued.result === "SUPPLY_EXHAUSTED" || issued.result === "ALLOWANCE_EXHAUSTED" || issued.result === "MINTING_DISABLED"
            ? issued.result
            : issued.error.toLowerCase().includes("supply")
              ? "SUPPLY_EXHAUSTED"
              : issued.error.toLowerCase().includes("allowance")
                ? "ALLOWANCE_EXHAUSTED"
                : issued.error.toLowerCase().includes("minting disabled")
                  ? "MINTING_DISABLED"
                  : "UNAVAILABLE";
        return this.kiteFail(live, kiteId, result, failed);
      }
      entry = {
        ...entry,
        status: "SUBMITTED",
        txHash: issued.txHash,
        updatedAt: now,
      };
      await this.writeKiteRedemption(live, entry);
      return entry;
    });

    if ("ok" in submitted) {
      return submitted;
    }
    return await this.reconcileSubmitted(live, submitted, now);
  }

  /** True when the live session still matches a captured cycle and the interval elapsed. */
  canCompleteCycle(wallet: string, cycleStartedAt: number, now: number): boolean {
    const live = this.get(wallet);
    if (!live?.blowing || cycleStartedAt <= 0) {
      return false;
    }
    if (live.intervalStartedAt !== cycleStartedAt) {
      return false;
    }
    return this.isDue(wallet, now);
  }

  completeIfDue(
    wallet: string,
    now: number,
    partyActive: boolean,
    socialBonusXp = 0,
    wearableUrns: readonly string[] = [],
    expectedCycleStartedAt?: number,
  ): { completed?: { awardedXp: number }; stopped?: BalloonStopReason; intervalStartedAt: number; intervalMs: number } {
    const live = this.get(wallet);
    if (!live || !live.blowing) {
      return { intervalStartedAt: 0, intervalMs: live?.intervalMs ?? BALLOON_INTERVAL_MS };
    }
    const lockedIntervalMs = live.intervalMs > 0 ? live.intervalMs : BALLOON_INTERVAL_MS;
    if (expectedCycleStartedAt != null && live.intervalStartedAt !== expectedCycleStartedAt) {
      return { intervalStartedAt: live.intervalStartedAt, intervalMs: lockedIntervalMs };
    }
    if (partyActive || !live.present) {
      const reason = this.stopBlowing(wallet, partyActive ? "party" : "leave");
      return { stopped: reason, intervalStartedAt: 0, intervalMs: live.intervalMs };
    }
    if (now - live.intervalStartedAt < lockedIntervalMs) {
      return { intervalStartedAt: live.intervalStartedAt, intervalMs: lockedIntervalMs };
    }
    if (live.claimedCycleStartedAt === live.intervalStartedAt) {
      return { intervalStartedAt: live.intervalStartedAt, intervalMs: lockedIntervalMs };
    }
    live.claimedCycleStartedAt = live.intervalStartedAt;
    const perk = resolveActiveKitePerk(wearableUrns, live.profile.level);
    this.applyKitePerk(live, perk);
    const capacity = effectiveBalloonCapacity(perk);
    const kiteBonusXp = effectiveKiteXpBonus(perk);
    try {
      const result = completeOneBalloon(live.profile, socialBonusXp, kiteBonusXp, capacity);
      live.profile = result.profile;
      live.dirty = true;
      if (live.profile.carriedBalloons >= capacity) {
        this.stopBlowing(wallet, "cap");
        return {
          completed: { awardedXp: result.awardedXp },
          stopped: "cap",
          intervalStartedAt: 0,
          intervalMs: lockedIntervalMs,
        };
      }
      const nextPerk = resolveActiveKitePerk(wearableUrns, live.profile.level);
      this.applyKitePerk(live, nextPerk);
      live.intervalStartedAt = now;
      live.intervalMs = effectiveBalloonIntervalMs(nextPerk);
      return {
        completed: { awardedXp: result.awardedXp },
        intervalStartedAt: now,
        intervalMs: live.intervalMs,
      };
    } catch {
      this.stopBlowing(wallet, "cap");
      return { stopped: "cap", intervalStartedAt: 0, intervalMs: lockedIntervalMs };
    }
  }

  cancelAllForParty(): Array<{ wallet: string; peerId: string; profile: BalloonProfile }> {
    const stopped: Array<{ wallet: string; peerId: string; profile: BalloonProfile }> = [];
    for (const live of this.players.values()) {
      if (this.stopBlowing(live.wallet, "party")) {
        stopped.push({
          wallet: live.wallet,
          peerId: live.peerId,
          profile: cloneBalloonProfile(live.profile),
        });
      }
    }
    return stopped;
  }

  async leave(wallet: string): Promise<LiveBalloonPlayer | undefined> {
    const live = this.get(wallet);
    if (!live) {
      return undefined;
    }
    this.stopBlowing(wallet, "leave");
    live.present = false;
    await this.flush(live);
    if (live.dirty) {
      await this.flush(live);
    }
    if (live.dirty) {
      console.log("[BALLOON] leave kept unsaved profile in memory", { wallet: live.wallet });
      return live;
    }
    this.players.delete(live.wallet);
    this.chains.delete(live.wallet);
    return live;
  }

  retain(activeWallets: readonly string[]): string[] {
    const active = new Set(activeWallets.map(normalizeWallet));
    const left: string[] = [];
    for (const wallet of [...this.players.keys()]) {
      if (!active.has(wallet)) {
        left.push(wallet);
      }
    }
    return left;
  }

  recordCompletedBalloon(wallet: string, now: number): void {
    const live = this.get(wallet);
    if (live) {
      this.noteCompletedBalloon(live, now);
    }
  }

  private noteCompletedBalloon(live: LiveBalloonPlayer, now: number): void {
    this.leaderboard = upsertLeaderboard(
      this.leaderboard,
      {
        wallet: live.wallet,
        name: live.displayName,
        xp: live.profile.xp,
        lifetimeBalloons: live.profile.lifetimeBalloons,
      },
      now,
    );
    this.leaderboardDirty = true;
  }

  tick(
    now: number,
    present: ReadonlyArray<{ wallet: string; peerId: string }>,
    partyActive: boolean,
    socialBonusFor: (wallet: string) => number = () => 0,
    rewardAdmittedFor: (wallet: string) => boolean = () => true,
    wearablesFor: (wallet: string) => readonly string[] = () => [],
    options: { completeDue?: boolean } = {},
  ): BalloonTickEvent[] {
    const completeDue = options.completeDue !== false;
    const events: BalloonTickEvent[] = [];
    const presentSet = new Set(present.map((row) => normalizeWallet(row.wallet)));
    for (const live of this.players.values()) {
      live.present = presentSet.has(live.wallet);
      if (!rewardAdmittedFor(live.wallet)) {
        const stopped = this.stopBlowing(live.wallet, "stop");
        if (stopped) {
          events.push({
            type: "stopped",
            wallet: live.wallet,
            peerId: live.peerId,
            reason: stopped,
            profile: cloneBalloonProfile(live.profile),
          });
        }
        continue;
      }
      if (!completeDue) {
        if (partyActive || !live.present) {
          const reason = this.stopBlowing(live.wallet, partyActive ? "party" : "leave");
          if (reason) {
            events.push({
              type: "stopped",
              wallet: live.wallet,
              peerId: live.peerId,
              reason,
              profile: cloneBalloonProfile(live.profile),
            });
          }
        }
        continue;
      }
      const result = this.completeIfDue(
        live.wallet,
        now,
        partyActive,
        socialBonusFor(live.wallet),
        wearablesFor(live.wallet),
      );
      if (result.completed) {
        events.push({
          type: "completed",
          wallet: live.wallet,
          peerId: live.peerId,
          profile: cloneBalloonProfile(live.profile),
          awardedXp: result.completed.awardedXp,
          intervalStartedAt: result.intervalStartedAt,
          intervalMs: result.intervalMs,
        });
        this.noteCompletedBalloon(live, now);
      }
      if (result.stopped && result.stopped !== "cap") {
        events.push({
          type: "stopped",
          wallet: live.wallet,
          peerId: live.peerId,
          reason: result.stopped,
          profile: cloneBalloonProfile(live.profile),
        });
      } else if (result.stopped === "cap") {
        events.push({
          type: "stopped",
          wallet: live.wallet,
          peerId: live.peerId,
          reason: "cap",
          profile: cloneBalloonProfile(live.profile),
        });
      }
    }
    return events;
  }

  async flush(live: LiveBalloonPlayer): Promise<boolean> {
    if (!live.dirty || live.persistInFlight) {
      return !live.dirty;
    }
    live.persistInFlight = true;
    const snapshot = cloneBalloonProfile(live.profile);
    this.persistAttempts += 1;
    const ok = await this.persist.savePlayer(live.wallet, snapshot);
    live.persistInFlight = false;
    if (!ok) {
      live.dirty = true;
      return false;
    }
    if (
      live.profile.xp !== snapshot.xp ||
      live.profile.carriedBalloons !== snapshot.carriedBalloons ||
      live.profile.balloonPoints !== snapshot.balloonPoints ||
      live.profile.employed !== snapshot.employed ||
      live.profile.onboardingComplete !== snapshot.onboardingComplete
    ) {
      live.dirty = true;
      return true;
    }
    live.dirty = false;
    return true;
  }

  async flushDirty(): Promise<void> {
    if (this.flushAllInFlight) {
      return;
    }
    this.flushAllInFlight = true;
    try {
      for (const live of this.players.values()) {
        if (live.dirty) {
          await this.flush(live);
        }
      }
      if (this.leaderboardDirty) {
        const ok = await this.persist.saveLeaderboard(this.leaderboard);
        if (ok) {
          this.leaderboardDirty = false;
        }
      }
    } finally {
      this.flushAllInFlight = false;
    }
  }

  async loadLeaderboard(): Promise<void> {
    this.leaderboard = decodeStoredBalloonLeaderboard(await this.persist.loadLeaderboard());
    this.leaderboardDirty = false;
    this.liveLeaderboardReady = true;
  }

  async loadKiteMintLedger(): Promise<void> {
    this.kiteMints = parseKiteMintCounts(await this.persist.loadKiteMintLedger());
  }

  getKiteMintCounts(): KiteMintCounts {
    return { ...this.kiteMints };
  }

  /** Inspect mintable kites and overwrite the display ledger from Collection V2 remaining. */
  async refreshMintableKiteStock(): Promise<KiteMintCounts> {
    if (!this.kiteMint) {
      return this.getKiteMintCounts();
    }
    for (const kite of KITE_PERKS) {
      if (!kite.sceneMintable) {
        continue;
      }
      try {
        const inspect = await this.kiteMint.inspect(kite.contract, BigInt(kite.itemId));
        this.kiteMints = applyChainRemainingToCounts(this.kiteMints, kite.id, inspect.remaining);
      } catch (error) {
        console.log(
          `[KITE MINT] stock refresh failed ${JSON.stringify({
            kiteId: kite.id,
            error: error instanceof Error ? error.message : String(error),
          })}`,
        );
      }
    }
    await this.persist.saveKiteMintLedger(this.kiteMints);
    return this.getKiteMintCounts();
  }

  getKiteRedemptions(wallet: string): KiteRedemptionLedger {
    return { ...this.get(wallet)?.kiteRedemptions };
  }

  /**
   * Records one successful scene kite mint. Does not mint on-chain.
   * Call this only after delivery succeeds.
   */
  async recordSceneKiteMint(id: KitePerkId): Promise<{ ok: true; minted: number; remaining: number } | { ok: false; result: "SOLD_OUT" }> {
    if (kiteMintRemaining(id, this.kiteMints[id]) <= 0) {
      return { ok: false, result: "SOLD_OUT" };
    }
    this.kiteMints = {
      ...this.kiteMints,
      [id]: this.kiteMints[id] + 1,
    };
    await this.persist.saveKiteMintLedger(this.kiteMints);
    return {
      ok: true,
      minted: this.kiteMints[id],
      remaining: kiteMintRemaining(id, this.kiteMints[id]),
    };
  }

  /** Load persist into live memory once, then rank from current server gameplay state. */
  async currentLeaderboard(now: number): Promise<BalloonLeaderboard["entries"]> {
    if (!this.liveLeaderboardReady) {
      await this.loadLeaderboard();
    }
    this.leaderboard = rankCurrentBlowers(
      this.leaderboard,
      [...this.players.values()].map((live) => ({
        wallet: live.wallet,
        name: live.displayName,
        xp: live.profile.xp,
        lifetimeBalloons: live.profile.lifetimeBalloons,
      })),
      now,
    );
    return this.leaderboard.entries;
  }

  getLeaderboardEntries(): BalloonLeaderboard["entries"] {
    return this.leaderboard.entries;
  }

  get persistAttemptCount(): number {
    return this.persistAttempts;
  }
}

export function memoryBalloonPersist(): BalloonPersist & {
  players: Map<string, BalloonProfile>;
  failNext: boolean;
  board: BalloonLeaderboard;
  kiteMints: KiteMintCounts;
  kiteRedemptions: Map<string, KiteRedemptionLedger>;
  depositWarningSkip: Map<string, boolean>;
} {
  const players = new Map<string, BalloonProfile>();
  const kiteRedemptions = new Map<string, KiteRedemptionLedger>();
  const depositWarningSkip = new Map<string, boolean>();
  const store = {
    players,
    failNext: false,
    board: emptyBalloonLeaderboard(),
    kiteMints: emptyKiteMintCounts(),
    kiteRedemptions,
    async loadPlayer(wallet: string): Promise<unknown> {
      return players.get(normalizeWallet(wallet)) ?? null;
    },
    async savePlayer(wallet: string, profile: BalloonProfile): Promise<boolean> {
      if (store.failNext) {
        store.failNext = false;
        return false;
      }
      players.set(normalizeWallet(wallet), cloneBalloonProfile(profile));
      return true;
    },
    async loadLeaderboard(): Promise<unknown> {
      return store.board;
    },
    async saveLeaderboard(board: BalloonLeaderboard): Promise<boolean> {
      store.board = board;
      return true;
    },
    async loadKiteMintLedger(): Promise<unknown> {
      return { minted: store.kiteMints };
    },
    async saveKiteMintLedger(counts: KiteMintCounts): Promise<boolean> {
      store.kiteMints = { ...counts };
      return true;
    },
    async loadKiteRedemptions(wallet: string): Promise<unknown> {
      return kiteRedemptions.get(normalizeWallet(wallet)) ?? null;
    },
    async saveKiteRedemptions(wallet: string, ledger: KiteRedemptionLedger): Promise<boolean> {
      kiteRedemptions.set(normalizeWallet(wallet), { ...ledger });
      return true;
    },
    depositWarningSkip,
    async loadDepositWarningSkip(wallet: string): Promise<unknown> {
      return depositWarningSkip.get(normalizeWallet(wallet)) === true;
    },
    async saveDepositWarningSkip(wallet: string, skip: boolean): Promise<boolean> {
      depositWarningSkip.set(normalizeWallet(wallet), skip);
      return true;
    },
  };
  return store;
}
