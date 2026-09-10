import { KITE_PERK_IDS, type KitePerkId } from "./kitePerks";

export const KITE_MINT_LEDGER_KEY = "kiteMintLedger";
export const KITE_MINT_LEDGER_VERSION = 1;

/**
 * Marketplace collection max supply (remaining / max on the item page).
 * Not a live on-chain query. Scene mints increment from the snapshot below.
 */
export const KITE_SCENE_MINT_MAX: Record<KitePerkId, number> = {
  GREEN: 5000,
  DCL2: 1000,
  RED: 1000,
  LAVA: 1000,
  FROST: 1000,
  BLACK: 1000,
  CROSS: 1000,
};

/**
 * Marketplace remaining at seed time. Display cache only.
 * Collection V2 remaining/allowance is authoritative for minting.
 */
export const KITE_MARKETPLACE_REMAINING_SEED: Record<KitePerkId, number> = {
  GREEN: 4022,
  DCL2: 516,
  RED: 630,
  LAVA: 0,
  FROST: 0,
  BLACK: 0,
  CROSS: 0,
};

export type KiteMintCounts = Record<KitePerkId, number>;

function seededMinted(id: KitePerkId): number {
  return Math.max(0, KITE_SCENE_MINT_MAX[id] - KITE_MARKETPLACE_REMAINING_SEED[id]);
}

/** Default ledger before DCL Storage / server sync: Marketplace already-minted snapshot. */
export function emptyKiteMintCounts(): KiteMintCounts {
  return {
    GREEN: seededMinted("GREEN"),
    DCL2: seededMinted("DCL2"),
    RED: seededMinted("RED"),
    LAVA: seededMinted("LAVA"),
    FROST: seededMinted("FROST"),
    BLACK: seededMinted("BLACK"),
    CROSS: seededMinted("CROSS"),
  };
}

function readMintCount(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 0) {
    return undefined;
  }
  return n;
}

export function parseKiteMintCounts(raw: unknown): KiteMintCounts {
  const counts = emptyKiteMintCounts();
  if (!raw || typeof raw !== "object") {
    return counts;
  }
  const row = raw as Record<string, unknown>;
  const minted = row.minted && typeof row.minted === "object" ? (row.minted as Record<string, unknown>) : row;
  for (const id of KITE_PERK_IDS) {
    if (!Object.prototype.hasOwnProperty.call(minted, id)) {
      continue;
    }
    const next = readMintCount(minted[id]);
    if (next !== undefined) {
      counts[id] = next;
    }
  }
  return counts;
}

export function encodeKiteMintCounts(counts: KiteMintCounts): {
  version: typeof KITE_MINT_LEDGER_VERSION;
  minted: KiteMintCounts;
} {
  return {
    version: KITE_MINT_LEDGER_VERSION,
    minted: { ...counts },
  };
}

export function kiteSceneMintMax(id: KitePerkId): number {
  return KITE_SCENE_MINT_MAX[id];
}

export function kiteMintRemaining(id: KitePerkId, minted: number): number {
  return Math.max(0, kiteSceneMintMax(id) - Math.max(0, minted));
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.floor(value)));
}

/** Scene display minted count from Collection V2 remaining. Caps at the catalog max. */
export function mintedCountFromChainRemaining(id: KitePerkId, remaining: bigint): number {
  const max = kiteSceneMintMax(id);
  if (remaining <= 0n) {
    return max;
  }
  const remainingNumber = remaining > BigInt(max) ? max : Number(remaining);
  return max - clampInt(remainingNumber, 0, max);
}

export function applyChainRemainingToCounts(
  counts: KiteMintCounts,
  id: KitePerkId,
  remaining: bigint,
): KiteMintCounts {
  return {
    ...counts,
    [id]: mintedCountFromChainRemaining(id, remaining),
  };
}

export function formatKiteMintCta(id: KitePerkId, minted: number): "MINT NOW" | "SOLD OUT" {
  return kiteMintRemaining(id, minted) > 0 ? "MINT NOW" : "SOLD OUT";
}

export function formatKiteMintStock(id: KitePerkId, minted: number): string {
  const remaining = kiteMintRemaining(id, minted);
  return `${remaining} / ${kiteSceneMintMax(id)} left`;
}
