import {
  AUTHORITATIVE_OBSERVATION_LOSS_TOLERANCE_MS,
  MAX_PLAYER_POSITION_AGE_MS,
  MEANINGFUL_MOVE_EPSILON_METERS,
} from "../shared/constants";
import { distanceMeters, type Vec3 } from "./distance";

const MAX_PLAUSIBLE_SPEED_MPS = 16;

export type PresenceRead = {
  wallet: string;
  peerId: string;
  readSucceeded: boolean;
  position?: Vec3;
};

export type PresenceSnapshot = {
  wallet: string;
  peerId: string;
  position: Vec3;
  lastAuthoritativeReadAt: number;
  previousDistinctPosition?: Vec3;
  previousDistinctPositionAt?: number;
  present: boolean;
  positionFresh: boolean;
  speedMps: number;
};

type PresenceRecord = {
  wallet: string;
  peerId: string;
  lastReadPosition: Vec3;
  lastAuthoritativeReadAt: number;
  previousDistinctPosition: Vec3;
  previousDistinctPositionAt: number;
};

export class AuthoritativePresenceTracker {
  private readonly records = new Map<string, PresenceRecord>();

  get(wallet: string): PresenceSnapshot | undefined {
    const record = this.records.get(wallet.toLowerCase());
    if (!record) {
      return undefined;
    }
    return this.snapshot(record, record.lastAuthoritativeReadAt, 0, true);
  }

  observe(read: PresenceRead, now: number): PresenceSnapshot {
    const wallet = read.wallet.toLowerCase();
    const existing = this.records.get(wallet);

    if (read.readSucceeded && read.position) {
      let speedMps = 0;
      if (existing) {
        const dt = Math.max((now - existing.lastAuthoritativeReadAt) / 1000, 0.001);
        const meters = distanceMeters(existing.lastReadPosition, read.position);
        speedMps = meters / dt;
        if (speedMps > MAX_PLAUSIBLE_SPEED_MPS) {
          throw new Error("NOT_ELIGIBLE");
        }
      }
      const moved =
        !existing ||
        distanceMeters(existing.previousDistinctPosition, read.position) > MEANINGFUL_MOVE_EPSILON_METERS;
      const record: PresenceRecord = {
        wallet,
        peerId: read.peerId,
        lastReadPosition: read.position,
        lastAuthoritativeReadAt: now,
        previousDistinctPosition: moved
          ? read.position
          : existing!.previousDistinctPosition,
        previousDistinctPositionAt: moved
          ? now
          : existing!.previousDistinctPositionAt,
      };
      this.records.set(wallet, record);
      return this.snapshot(record, now, existing ? speedMps : 0, true);
    }

    if (
      existing &&
      now - existing.lastAuthoritativeReadAt <= AUTHORITATIVE_OBSERVATION_LOSS_TOLERANCE_MS
    ) {
      return this.snapshot(existing, now, 0, true);
    }

    if (existing) {
      return this.snapshot(existing, now, 0, false);
    }

    return {
      wallet,
      peerId: read.peerId,
      position: { x: 0, y: 0, z: 0 },
      lastAuthoritativeReadAt: 0,
      present: false,
      positionFresh: false,
      speedMps: 0,
    };
  }

  retain(activeWallets: readonly string[]): PresenceSnapshot[] {
    const active = new Set(activeWallets.map((wallet) => wallet.toLowerCase()));
    const left: PresenceSnapshot[] = [];
    for (const [wallet, record] of [...this.records.entries()]) {
      if (!active.has(wallet)) {
        this.records.delete(wallet);
        left.push(this.snapshot(record, record.lastAuthoritativeReadAt, 0, false));
      }
    }
    return left;
  }

  forget(wallet: string): void {
    this.records.delete(wallet.toLowerCase());
  }

  private snapshot(
    record: PresenceRecord,
    now: number,
    speedMps: number,
    present: boolean,
  ): PresenceSnapshot {
    const age = now - record.lastAuthoritativeReadAt;
    const positionFresh =
      present &&
      age <= AUTHORITATIVE_OBSERVATION_LOSS_TOLERANCE_MS &&
      age <= MAX_PLAYER_POSITION_AGE_MS;
    return {
      wallet: record.wallet,
      peerId: record.peerId,
      position: record.lastReadPosition,
      lastAuthoritativeReadAt: record.lastAuthoritativeReadAt,
      previousDistinctPosition: record.previousDistinctPosition,
      previousDistinctPositionAt: record.previousDistinctPositionAt,
      present,
      positionFresh,
      speedMps,
    };
  }
}
