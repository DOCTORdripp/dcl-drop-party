import { isAuthoritativeChairOccupant, isTableSitClaimNearChair, tableSeatById } from "../shared/tableSeats";
import { isInsideTableSurroundTrigger } from "../shared/tableSurroundTrigger";
import {
  TABLE_CHAIR_COUNT,
  occupiedChairMaskFromIds,
  playerSocialBonusXp,
  tableSocialSnapshot,
  type SocialParticipationMode,
  type TableSocialSnapshot,
} from "../shared/tableSocialBonus";

export type TableSocialPlayer = {
  wallet: string;
  present: boolean;
  position?: { x: number; y: number; z: number };
};

type Participation = {
  mode: SocialParticipationMode;
  chairId?: number;
  seatedEligible: boolean;
  surroundingEligible: boolean;
};

export type TableSeatClaimResult =
  | { ok: true }
  | {
      ok: false;
      reason: "INVALID_CHAIR" | "POSITION_UNAVAILABLE" | "TOO_FAR" | "CHAIR_OCCUPIED";
    };

function normalizeWallet(wallet: string): string {
  return wallet.toLowerCase();
}

export class TableSocialRuntime {
  readonly chairOccupancy = new Map<number, string>();
  readonly playerChair = new Map<string, number>();
  readonly surroundingPlayers = new Set<string>();
  private readonly participation = new Map<string, Participation>();
  private readonly occupyAt = new Map<string, number>();
  private generation = 0;
  private static readonly OCCUPY_GRACE_MS = 2500;

  get occupiedChairCount(): number {
    return this.chairOccupancy.size;
  }

  snapshot(): TableSocialSnapshot {
    return tableSocialSnapshot(this.occupiedChairCount, occupiedChairMaskFromIds(this.chairOccupancy.keys()));
  }

  bonusFor(wallet: string): number {
    const key = normalizeWallet(wallet);
    const row = this.participation.get(key);
    return playerSocialBonusXp({
      mode: row?.mode,
      occupiedChairCount: this.occupiedChairCount,
      seatedEligible: row?.seatedEligible === true,
      surroundingEligible: row?.surroundingEligible === true,
    });
  }

  participationOf(wallet: string): Participation | undefined {
    return this.participation.get(normalizeWallet(wallet));
  }

  occupyFromSit(wallet: string, chairId: number, position?: { x: number; y: number; z: number }): boolean {
    return this.claimFromSit(wallet, chairId, position).ok;
  }

  claimFromSit(wallet: string, chairId: number, position?: { x: number; y: number; z: number }): TableSeatClaimResult {
    const key = normalizeWallet(wallet);
    const seat = tableSeatById(chairId);
    if (!seat || chairId < 1 || chairId > TABLE_CHAIR_COUNT) {
      return { ok: false, reason: "INVALID_CHAIR" };
    }
    if (!position) {
      return { ok: false, reason: "POSITION_UNAVAILABLE" };
    }
    if (
      !isAuthoritativeChairOccupant(position, seat) &&
      !(isInsideTableSurroundTrigger(position) && isTableSitClaimNearChair(position, seat))
    ) {
      return { ok: false, reason: "TOO_FAR" };
    }
    const currentOwner = this.chairOccupancy.get(chairId);
    if (currentOwner && currentOwner !== key) {
      return { ok: false, reason: "CHAIR_OCCUPIED" };
    }
    const previousChair = this.playerChair.get(key);
    if (previousChair === chairId) {
      return { ok: true };
    }
    if (previousChair !== undefined) {
      this.chairOccupancy.delete(previousChair);
      const live = this.participation.get(key);
      if (live?.mode === "SEATED") {
        live.seatedEligible = false;
      }
    }
    this.chairOccupancy.set(chairId, key);
    this.playerChair.set(key, chairId);
    this.occupyAt.set(key, Date.now());
    if (previousChair === undefined) {
      this.promoteSeatedSession(key, chairId);
    }
    this.bump();
    return { ok: true };
  }

  releaseFromStand(wallet: string): boolean {
    return this.releaseChair(normalizeWallet(wallet));
  }

  setSurrounding(wallet: string, inside: boolean): void {
    const key = normalizeWallet(wallet);
    if (inside) {
      if (!this.surroundingPlayers.has(key)) {
        this.surroundingPlayers.add(key);
        this.bump();
      }
      return;
    }
    if (!this.surroundingPlayers.has(key)) {
      return;
    }
    this.surroundingPlayers.delete(key);
    const live = this.participation.get(key);
    if (live?.mode === "SURROUNDING") {
      live.surroundingEligible = false;
    }
    this.bump();
  }

  beginSession(wallet: string): SocialParticipationMode {
    const key = normalizeWallet(wallet);
    const chairId = this.playerChair.get(key);
    if (chairId !== undefined) {
      this.participation.set(key, {
        mode: "SEATED",
        chairId,
        seatedEligible: true,
        surroundingEligible: false,
      });
      this.bump();
      return "SEATED";
    }
    if (this.surroundingPlayers.has(key)) {
      this.participation.set(key, {
        mode: "SURROUNDING",
        seatedEligible: false,
        surroundingEligible: true,
      });
      this.bump();
      return "SURROUNDING";
    }
    this.participation.set(key, {
      mode: "NORMAL",
      seatedEligible: false,
      surroundingEligible: false,
    });
    this.bump();
    return "NORMAL";
  }

  endSession(wallet: string): void {
    const key = normalizeWallet(wallet);
    if (this.participation.delete(key)) {
      this.bump();
    }
  }

  forget(wallet: string): void {
    const key = normalizeWallet(wallet);
    this.releaseChair(key);
    if (this.surroundingPlayers.delete(key)) {
      this.bump();
    }
    if (this.participation.delete(key)) {
      this.bump();
    }
  }

  reconcile(players: readonly TableSocialPlayer[]): number {
    const present = new Map(players.map((player) => [normalizeWallet(player.wallet), player]));
    for (const [chairId, wallet] of [...this.chairOccupancy.entries()]) {
      const player = present.get(wallet);
      const seat = tableSeatById(chairId);
      if (!player?.present || !player.position || !seat) {
        this.releaseChair(wallet);
        continue;
      }
      const occupiedAgo = Date.now() - (this.occupyAt.get(wallet) ?? 0);
      if (occupiedAgo < TableSocialRuntime.OCCUPY_GRACE_MS) {
        continue;
      }
      if (!isAuthoritativeChairOccupant(player.position, seat)) {
        this.releaseChair(wallet);
      }
    }
    for (const player of players) {
      const key = normalizeWallet(player.wallet);
      if (!player.present || !player.position) {
        this.setSurrounding(key, false);
        continue;
      }
      this.setSurrounding(key, isInsideTableSurroundTrigger(player.position));
    }
    for (const wallet of [...this.surroundingPlayers]) {
      if (!present.has(wallet) || present.get(wallet)?.present === false) {
        this.setSurrounding(wallet, false);
      }
    }
    return this.occupiedChairCount;
  }

  takeChanged(): boolean {
    if (this.generation === 0) {
      return false;
    }
    this.generation = 0;
    return true;
  }

  private promoteSeatedSession(wallet: string, chairId: number): void {
    const live = this.participation.get(wallet);
    if (!live) {
      return;
    }
    live.mode = "SEATED";
    live.chairId = chairId;
    live.seatedEligible = true;
    live.surroundingEligible = false;
  }

  private releaseChair(wallet: string): boolean {
    const chairId = this.playerChair.get(wallet);
    if (chairId === undefined) {
      return false;
    }
    this.playerChair.delete(wallet);
    this.occupyAt.delete(wallet);
    if (this.chairOccupancy.get(chairId) === wallet) {
      this.chairOccupancy.delete(chairId);
    }
    const live = this.participation.get(wallet);
    if (live?.mode === "SEATED") {
      live.seatedEligible = false;
    }
    this.bump();
    return true;
  }

  private bump(): void {
    this.generation += 1;
  }
}
