import {
  BALLOON_LAND_MS,
  MAX_POP_CANDIDATES,
  MEANINGFUL_MOVE_EPSILON_METERS,
  SUCCESSFUL_CLAIM_COOLDOWN_MS,
} from "../shared/constants";
import { distanceMeters, horizontalDistanceMeters, isWithinPopProximity } from "./distance";

export type LiveBalloon = {
  balloonId: string;
  partyId: string;
  waveId: string;
  spawnGeneration: string;
  position: { x: number; y: number; z: number };
  spawnedAt: number;
  runtimeStatus: "SPAWNED" | "CLAIMED" | "DESPAWNED" | "EXPIRED";
};

export type AuthorizedCandidate = {
  balloonId: string;
  waveId: string;
  spawnGeneration: string;
};

const MAX_PLAUSIBLE_SPEED_MPS = 16;

export class LiveBalloonRuntime {
  readonly runtimeInstanceId: string;
  private readonly balloons = new Map<string, LiveBalloon>();
  private readonly lastRead = new Map<
    string,
    { position: { x: number; y: number; z: number }; at: number }
  >();
  private readonly lastDistinct = new Map<
    string,
    { position: { x: number; y: number; z: number }; at: number }
  >();
  private readonly lastSuccessfulClaimAt = new Map<string, number>();
  private readonly inFlight = new Set<string>();

  constructor(runtimeInstanceId: string) {
    this.runtimeInstanceId = runtimeInstanceId;
  }

  upsert(balloon: LiveBalloon): void {
    this.balloons.set(balloon.balloonId, balloon);
  }

  markClaimed(balloonId: string): void {
    const current = this.balloons.get(balloonId);
    if (current) {
      this.balloons.set(balloonId, { ...current, runtimeStatus: "CLAIMED" });
    }
  }

  markExpired(balloonId: string): void {
    const current = this.balloons.get(balloonId);
    if (current) {
      this.balloons.set(balloonId, { ...current, runtimeStatus: "EXPIRED" });
    }
  }

  get(balloonId: string): LiveBalloon | undefined {
    return this.balloons.get(balloonId);
  }

  /** Authoritative landing pose. Survives markClaimed so WON presentation can plant. */
  landingPosition(balloonId: string): { x: number; y: number; z: number } | undefined {
    return this.balloons.get(balloonId)?.position;
  }

  listLive(): LiveBalloon[] {
    return [...this.balloons.values()].filter((row) => row.runtimeStatus === "SPAWNED");
  }

  eligibleCount(player: { x: number; y: number; z: number }, now = Date.now()): number {
    return this.listEligible(player, now).length;
  }

  listEligible(
    player: { x: number; y: number; z: number },
    now = Date.now(),
  ): Array<LiveBalloon & { distance: number }> {
    return this.listLive()
      .filter((balloon) => now >= balloon.spawnedAt + BALLOON_LAND_MS)
      .filter((balloon) => isWithinPopProximity(player, balloon.position))
      .map((balloon) => ({ ...balloon, distance: horizontalDistanceMeters(player, balloon.position) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, MAX_POP_CANDIDATES);
  }

  authorizeCandidates(player: { x: number; y: number; z: number }, now = Date.now()): AuthorizedCandidate[] {
    return this.listEligible(player, now).map((row) => ({
      balloonId: row.balloonId,
      waveId: row.waveId,
      spawnGeneration: row.spawnGeneration,
    }));
  }

  observePlayer(wallet: string, position: { x: number; y: number; z: number }, now: number): void {
    const key = wallet.toLowerCase();
    const previousRead = this.lastRead.get(key);
    if (previousRead) {
      const dt = Math.max((now - previousRead.at) / 1000, 0.001);
      const meters = distanceMeters(previousRead.position, position);
      if (meters / dt > MAX_PLAUSIBLE_SPEED_MPS) {
        throw new Error("NOT_ELIGIBLE");
      }
    }
    this.lastRead.set(key, { position, at: now });
    const distinct = this.lastDistinct.get(key);
    if (!distinct || distanceMeters(distinct.position, position) > MEANINGFUL_MOVE_EPSILON_METERS) {
      this.lastDistinct.set(key, { position, at: now });
    }
  }

  lastAuthoritativeReadAt(wallet: string): number | undefined {
    return this.lastRead.get(wallet.toLowerCase())?.at;
  }

  previousDistinctSample(wallet: string): { position: { x: number; y: number; z: number }; at: number } | undefined {
    return this.lastDistinct.get(wallet.toLowerCase());
  }

  tryBeginPop(wallet: string, now: number): "ok" | "in-flight" | "cooldown" {
    if (this.inFlight.has(wallet)) {
      return "in-flight";
    }
    const last = this.lastSuccessfulClaimAt.get(wallet);
    if (last !== undefined && now - last < SUCCESSFUL_CLAIM_COOLDOWN_MS) {
      return "cooldown";
    }
    this.inFlight.add(wallet);
    return "ok";
  }

  finishPop(wallet: string, won: boolean, now: number): void {
    this.inFlight.delete(wallet);
    if (won) {
      this.lastSuccessfulClaimAt.set(wallet, now);
    }
  }

  forgetPlayer(wallet: string): void {
    const key = wallet.toLowerCase();
    this.lastRead.delete(key);
    this.lastDistinct.delete(key);
    this.lastSuccessfulClaimAt.delete(key);
    this.inFlight.delete(key);
  }

  clearBalloons(): void {
    this.balloons.clear();
  }

  removeOtherPartyBalloons(partyId: string): string[] {
    const removed: string[] = [];
    for (const [balloonId, balloon] of this.balloons) {
      if (balloon.partyId !== partyId) {
        this.balloons.delete(balloonId);
        removed.push(balloonId);
      }
    }
    return removed;
  }
}
