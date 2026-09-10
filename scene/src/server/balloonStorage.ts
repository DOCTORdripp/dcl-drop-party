import {
  BALLOON_LEADERBOARD_KEY,
  BALLOON_PROFILE_KEY,
  balloonProfileSceneKey,
  encodeBalloonLeaderboard,
  encodeBalloonProfile,
  unwrapStoredJson,
  type BalloonLeaderboard,
  type BalloonProfile,
} from "../shared/balloonProfile";
import { encodeKiteMintCounts, KITE_MINT_LEDGER_KEY, type KiteMintCounts } from "../shared/kiteMintLedger";
import {
  encodeKiteRedemptionLedger,
  kiteRedemptionSceneKey,
  type KiteRedemptionLedger,
} from "../shared/kiteMintRedemption";
import {
  depositWarningSceneKey,
  encodeDepositWarningSkip,
  parseDepositWarningSkip,
} from "../shared/depositWarning";
import type { BalloonPersist } from "./balloonGame";

type StorageListResult = {
  data: Array<{ key: string; value: unknown }>;
};

type StorageApi = {
  get<T = unknown>(key: string, options?: { fresh?: boolean }): Promise<T | null>;
  set<T = unknown>(key: string, value: T): Promise<boolean>;
  getValues?(options?: { prefix?: string; limit?: number }): Promise<StorageListResult>;
  player: {
    get<T = unknown>(address: string, key: string, options?: { fresh?: boolean }): Promise<T | null>;
    set<T = unknown>(address: string, key: string, value: T): Promise<boolean>;
    getValues?(address: string, options?: { prefix?: string; limit?: number }): Promise<StorageListResult>;
  };
};

export function isMissingStorageKeyError(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error);
  return /storage key ['"][^'"]+['"] not found/i.test(text) || (/\b404\b/.test(text) && /not found/i.test(text));
}

/** Preview writes one JSON file; overlapping player+world sets concatenate it on Windows. */
export function createStorageWriteQueue(): <T>(work: () => Promise<T>) => Promise<T> {
  let chain: Promise<void> = Promise.resolve();
  return <T>(work: () => Promise<T>): Promise<T> => {
    const run = chain.then(work, work);
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };
}

/**
 * A missing scene key is an empty leaderboard, not a failure.
 * List first so a fresh scene never GET-404s `balloonLeaderboard`.
 */
export async function readSceneLeaderboard(storage: StorageApi): Promise<unknown> {
  try {
    const direct = await storage.get(BALLOON_LEADERBOARD_KEY, { fresh: true });
    if (direct != null) {
      return unwrapStoredJson(direct);
    }
  } catch (error) {
    if (!isMissingStorageKeyError(error)) {
      throw error;
    }
  }
  try {
    if (storage.getValues) {
      const listed = await storage.getValues({ prefix: BALLOON_LEADERBOARD_KEY, limit: 8 });
      const found = listed.data.find((row) => row.key === BALLOON_LEADERBOARD_KEY);
      return found ? unwrapStoredJson(found.value) : null;
    }
  } catch (error) {
    if (isMissingStorageKeyError(error)) {
      return null;
    }
    throw error;
  }
  return null;
}

/**
 * A missing player key is a first-run profile, not a failure.
 * Read the exact key first. A failed/empty list is not proof the profile is gone.
 */
export async function readPlayerBalloonProfile(
  storage: StorageApi,
  wallet: string,
): Promise<unknown> {
  try {
    const direct = await storage.player.get(wallet, BALLOON_PROFILE_KEY, { fresh: true });
    if (direct != null) {
      return unwrapStoredJson(direct);
    }
  } catch (error) {
    if (!isMissingStorageKeyError(error)) {
      throw error;
    }
  }
  try {
    if (storage.player.getValues) {
      const listed = await storage.player.getValues(wallet, { prefix: BALLOON_PROFILE_KEY, limit: 8 });
      const found = listed.data.find((row) => row.key === BALLOON_PROFILE_KEY);
      return found ? unwrapStoredJson(found.value) : null;
    }
  } catch (error) {
    if (isMissingStorageKeyError(error)) {
      return null;
    }
    throw error;
  }
  return null;
}

/**
 * Hosted Worlds keep scene keys with the multiplayer scene. Player keys can
 * vanish on reload, which let people drop carried balloons without turning in.
 */
export async function readSceneBalloonProfile(
  storage: StorageApi,
  wallet: string,
): Promise<unknown> {
  const key = balloonProfileSceneKey(wallet);
  try {
    const direct = await storage.get(key, { fresh: true });
    if (direct != null) {
      return unwrapStoredJson(direct);
    }
  } catch (error) {
    if (!isMissingStorageKeyError(error)) {
      throw error;
    }
  }
  try {
    if (storage.getValues) {
      const listed = await storage.getValues({ prefix: key, limit: 8 });
      const found = listed.data.find((row) => row.key === key);
      return found ? unwrapStoredJson(found.value) : null;
    }
  } catch (error) {
    if (isMissingStorageKeyError(error)) {
      return null;
    }
    throw error;
  }
  return null;
}

export async function readSceneKiteMintLedger(storage: StorageApi): Promise<unknown> {
  try {
    const direct = await storage.get(KITE_MINT_LEDGER_KEY, { fresh: true });
    if (direct != null) {
      return unwrapStoredJson(direct);
    }
  } catch (error) {
    if (!isMissingStorageKeyError(error)) {
      throw error;
    }
  }
  try {
    if (storage.getValues) {
      const listed = await storage.getValues({ prefix: KITE_MINT_LEDGER_KEY, limit: 8 });
      const found = listed.data.find((row) => row.key === KITE_MINT_LEDGER_KEY);
      return found ? unwrapStoredJson(found.value) : null;
    }
  } catch (error) {
    if (isMissingStorageKeyError(error)) {
      return null;
    }
    throw error;
  }
  return null;
}

export function createDclBalloonPersist(storage: StorageApi): BalloonPersist {
  const enqueue = createStorageWriteQueue();
  return {
    async loadPlayer(wallet: string): Promise<unknown> {
      return await enqueue(async () => {
        const scene = await readSceneBalloonProfile(storage, wallet);
        if (scene != null) {
          return scene;
        }
        return await readPlayerBalloonProfile(storage, wallet);
      });
    },
    async savePlayer(wallet: string, profile: BalloonProfile): Promise<boolean> {
      return await enqueue(async () => {
        const encoded = encodeBalloonProfile(profile);
        let sceneOk = false;
        try {
          sceneOk = await storage.set(balloonProfileSceneKey(wallet), encoded);
          if (!sceneOk) {
            console.log("[BALLOON] persist scene profile failed", { wallet });
          }
        } catch (error) {
          console.log("[BALLOON] persist scene profile threw", {
            wallet,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        try {
          const playerOk = await storage.player.set(wallet, BALLOON_PROFILE_KEY, encoded);
          if (!playerOk) {
            console.log("[BALLOON] persist player failed", { wallet });
          }
          return sceneOk || playerOk;
        } catch (error) {
          console.log("[BALLOON] persist player threw", {
            wallet,
            error: error instanceof Error ? error.message : String(error),
          });
          return sceneOk;
        }
      });
    },
    async loadLeaderboard(): Promise<unknown> {
      return await enqueue(() => readSceneLeaderboard(storage));
    },
    async saveLeaderboard(board: BalloonLeaderboard): Promise<boolean> {
      if (board.updatedAt === 0 && board.entries.length === 0) {
        return true;
      }
      return await enqueue(async () => {
        try {
          const ok = await storage.set(BALLOON_LEADERBOARD_KEY, encodeBalloonLeaderboard(board));
          if (!ok) {
            console.log("[BALLOON] persist leaderboard failed");
          }
          return ok;
        } catch (error) {
          console.log("[BALLOON] persist leaderboard threw", {
            error: error instanceof Error ? error.message : String(error),
          });
          return false;
        }
      });
    },
    async loadKiteMintLedger(): Promise<unknown> {
      return await enqueue(() => readSceneKiteMintLedger(storage));
    },
    async saveKiteMintLedger(counts: KiteMintCounts): Promise<boolean> {
      return await enqueue(async () => {
        try {
          const ok = await storage.set(KITE_MINT_LEDGER_KEY, encodeKiteMintCounts(counts));
          if (!ok) {
            console.log("[BALLOON] persist kite mint ledger failed");
          }
          return ok;
        } catch (error) {
          console.log("[BALLOON] persist kite mint ledger threw", {
            error: error instanceof Error ? error.message : String(error),
          });
          return false;
        }
      });
    },
    async loadKiteRedemptions(wallet: string): Promise<unknown> {
      const key = kiteRedemptionSceneKey(wallet);
      return await enqueue(async () => {
        try {
          const direct = await storage.get(key, { fresh: true });
          if (direct != null) {
            return unwrapStoredJson(direct);
          }
        } catch (error) {
          if (!isMissingStorageKeyError(error)) {
            throw error;
          }
        }
        return null;
      });
    },
    async saveKiteRedemptions(wallet: string, ledger: KiteRedemptionLedger): Promise<boolean> {
      const key = kiteRedemptionSceneKey(wallet);
      return await enqueue(async () => {
        try {
          const ok = await storage.set(key, encodeKiteRedemptionLedger(ledger));
          if (!ok) {
            console.log("[BALLOON] persist kite redemption failed", { wallet });
          }
          return ok;
        } catch (error) {
          console.log("[BALLOON] persist kite redemption threw", {
            wallet,
            error: error instanceof Error ? error.message : String(error),
          });
          return false;
        }
      });
    },
    async loadDepositWarningSkip(wallet: string): Promise<unknown> {
      const key = depositWarningSceneKey(wallet);
      return await enqueue(async () => {
        try {
          const direct = await storage.get(key, { fresh: true });
          if (direct != null) {
            return parseDepositWarningSkip(unwrapStoredJson(direct));
          }
        } catch (error) {
          if (!isMissingStorageKeyError(error)) {
            throw error;
          }
        }
        return false;
      });
    },
    async saveDepositWarningSkip(wallet: string, skip: boolean): Promise<boolean> {
      const key = depositWarningSceneKey(wallet);
      return await enqueue(async () => {
        try {
          const ok = await storage.set(key, encodeDepositWarningSkip(skip));
          if (!ok) {
            console.log("[BALLOON] persist deposit warning skip failed", { wallet });
          }
          return ok;
        } catch (error) {
          console.log("[BALLOON] persist deposit warning skip threw", {
            wallet,
            error: error instanceof Error ? error.message : String(error),
          });
          return false;
        }
      });
    },
  };
}
