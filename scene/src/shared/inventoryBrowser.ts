/**
 * Deposit Chest inventory presentation. Search, paging, thumbnails, and
 * human mint labels stay in the scene. Convex still owns deposit policy.
 */

/** Raffle Manager SEND grid: 4 columns × 5 rows. */
export const INVENTORY_PAGE_SIZE = 20;
export const INVENTORY_GRID_COLS = 4;

export const RARITY_ORDER = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "exotic",
  "mythic",
  "unique",
] as const;

export type InventoryRarityFilter = "all" | string;

export type BrowsableItem = {
  urn: string;
  name: string;
  kind: "wearable" | "emote";
  rarity: string;
  mints: string[];
  mintLabels?: (string | undefined)[];
  thumbnailUrl?: string;
  slot?: string;
};

const DCL_V2_MASK_128 = (1n << 128n) - 1n;

export function filterInventoryItems<T extends BrowsableItem>(
  items: readonly T[],
  search: string,
  kind?: "wearable" | "emote",
  rarity?: InventoryRarityFilter,
): T[] {
  const q = search.trim().toLowerCase();
  const rarityKey = rarity && rarity !== "all" ? rarity.trim().toLowerCase() : "";
  return items.filter((item) => {
    if (kind && item.kind !== kind) return false;
    if (rarityKey && item.rarity.trim().toLowerCase() !== rarityKey) return false;
    if (!q) return true;
    return item.name.toLowerCase().includes(q) || item.urn.toLowerCase().includes(q);
  });
}

export function rarityFilterOptions<T extends BrowsableItem>(items: readonly T[]): string[] {
  const present = new Set(items.map((item) => item.rarity.trim().toLowerCase()).filter(Boolean));
  const ordered = RARITY_ORDER.filter((rarity) => present.has(rarity));
  const extra = [...present].filter((rarity) => !RARITY_ORDER.includes(rarity as (typeof RARITY_ORDER)[number]) && rarity !== "unknown");
  extra.sort();
  return ["all", ...ordered, ...extra];
}

export function rarityChipLabel(rarity: string): string {
  if (rarity === "all") return "all";
  if (rarity === "common") return "com";
  if (rarity === "uncommon") return "uncom";
  if (rarity === "legendary") return "legend";
  return rarity;
}

/** Higher is rarer so unique/mythic list before common. Unknown ranks last. */
export function raritySortRank(rarity: string): number {
  const key = rarity.trim().toLowerCase();
  const idx = (RARITY_ORDER as readonly string[]).indexOf(key);
  return idx >= 0 ? idx : -1;
}

/** When a rarity chip is on: rarity, then copies, then name. When All: copies, then rarity, then name. */
export function sortInventoryItems<T extends BrowsableItem>(
  items: readonly T[],
  rarityFilter?: InventoryRarityFilter,
): T[] {
  const prioritizeRarity = Boolean(rarityFilter && rarityFilter !== "all");
  return [...items].sort((a, b) => {
    const rarity = raritySortRank(b.rarity) - raritySortRank(a.rarity);
    const held = b.mints.length - a.mints.length;
    const name = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    if (prioritizeRarity) {
      if (rarity !== 0) return rarity;
      if (held !== 0) return held;
      return name;
    }
    if (held !== 0) return held;
    if (rarity !== 0) return rarity;
    return name;
  });
}

/**
 * Full inventory → type → search → rarity → paginate.
 * Never search only the currently visible page.
 */
export function browseInventory<T extends BrowsableItem>(
  items: readonly T[],
  args: {
    search: string;
    kind?: "wearable" | "emote";
    rarity?: InventoryRarityFilter;
    page: number;
    pageSize?: number;
  },
): { filtered: T[]; visible: T[]; page: number; pageCount: number } {
  const filtered = sortInventoryItems(
    filterInventoryItems(items, args.search, args.kind, args.rarity),
    args.rarity,
  );
  const pageSize = args.pageSize ?? INVENTORY_PAGE_SIZE;
  const pageCount = inventoryPageCount(filtered.length, pageSize);
  const page = Math.min(pageCount - 1, Math.max(0, args.page));
  return {
    filtered,
    visible: inventoryPage(filtered, page, pageSize),
    page,
    pageCount,
  };
}

export function inventoryPageCount(itemCount: number, pageSize = INVENTORY_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(itemCount / pageSize));
}

export function inventoryPage<T>(
  items: readonly T[],
  page: number,
  pageSize = INVENTORY_PAGE_SIZE,
): T[] {
  const last = inventoryPageCount(items.length, pageSize) - 1;
  const safe = Math.min(last, Math.max(0, page));
  const start = safe * pageSize;
  return items.slice(start, start + pageSize);
}

export type InventoryPageToken = { kind: "page"; page: number } | { kind: "gap" };

/** Numbered pager tokens for skip-to-page. Hidden when there is only one page. */
export function inventoryPageTokens(page: number, pageCount: number): InventoryPageToken[] {
  const count = Math.max(0, Math.floor(pageCount));
  if (count <= 1) return [];
  const last = count - 1;
  const current = Math.min(last, Math.max(0, Math.floor(page)));
  const keep = new Set<number>([0, last, current]);
  if (current - 1 > 0) keep.add(current - 1);
  if (current + 1 < last) keep.add(current + 1);
  if (current <= 2) {
    keep.add(1);
    keep.add(2);
  }
  if (current >= last - 2) {
    keep.add(last - 1);
    keep.add(last - 2);
  }
  const sorted = [...keep].filter((n) => n >= 0 && n <= last).sort((a, b) => a - b);
  const tokens: InventoryPageToken[] = [];
  for (const n of sorted) {
    const prev = tokens[tokens.length - 1];
    if (prev?.kind === "page" && n - prev.page > 1) {
      tokens.push({ kind: "gap" });
    }
    tokens.push({ kind: "page", page: n });
  }
  return tokens;
}

export function thumbnailDisplaySrc(thumbnailUrl?: string): string | undefined {
  const trimmed = thumbnailUrl?.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("assets/")) return trimmed;
  return undefined;
}

export function thumbnailPlaceholder(kind: "wearable" | "emote"): string {
  return kind === "emote" ? "E" : "W";
}

export function ownedCountLabel(count: number): string {
  return count === 1 ? "1 owned" : `${count} owned`;
}

export function humanMintNumber(item: BrowsableItem | null | undefined, tokenId: string): number | null {
  if (item) {
    const idx = item.mints.indexOf(tokenId);
    if (idx >= 0) {
      const label = item.mintLabels?.[idx];
      if (label != null && String(label).length > 0) {
        const n = parseInt(String(label), 10);
        if (!Number.isNaN(n) && n > 0) return n;
      }
    }
  }
  try {
    const bi = BigInt(tokenId.trim());
    if (bi <= 0n) return null;
    if (bi <= 999999n) return Number(bi);
    const issued = bi & DCL_V2_MASK_128;
    if (issued > 0n && issued <= 999999n) return Number(issued);
  } catch {
    /* ignore */
  }
  return null;
}

export function humanMintLabel(item: BrowsableItem | null | undefined, tokenId: string): string {
  const n = humanMintNumber(item, tokenId);
  return n != null ? `Mint #${n}` : "Mint";
}

export function isProtectedMint(
  item: BrowsableItem | null | undefined,
  tokenId: string,
  protectedNumbers: readonly number[],
): boolean {
  const n = humanMintNumber(item, tokenId);
  return n != null && protectedNumbers.includes(n);
}

export function rarityBypassesLowMintLock(rarity?: string): boolean {
  const key = (rarity ?? "").trim().toLowerCase();
  return key === "unique" || key === "mythic";
}

export function effectiveLowMintLock(enabled: boolean, rarity?: string): boolean {
  return enabled && !rarityBypassesLowMintLock(rarity);
}

export function isMintLocked(
  item: BrowsableItem | null | undefined,
  tokenId: string,
  lowMintLock: boolean,
  protectedNumbers: readonly number[],
): boolean {
  return (
    effectiveLowMintLock(lowMintLock, item?.rarity) &&
    isProtectedMint(item, tokenId, protectedNumbers)
  );
}

export function sortMintsForPicker(item: BrowsableItem): string[] {
  return [...item.mints].sort((a, b) => {
    const na = humanMintNumber(item, a) ?? -1;
    const nb = humanMintNumber(item, b) ?? -1;
    if (nb !== na) return nb - na;
    return a.localeCompare(b);
  });
}

export function destinationContextLabel(args: {
  destination: "PUBLIC_ROLLING" | "SCHEDULED_PARTY";
  scheduledPartyTitle?: string;
}): string {
  if (args.destination === "SCHEDULED_PARTY") {
    return args.scheduledPartyTitle?.trim() || "Scheduled party";
  }
  return "Next Public Party";
}

export const LOADING_YOUR_NFTS_LABEL = "LOADING YOUR NFTs";

export function inventoryGridEmptyCopy(args: {
  loading: boolean;
  inventoryCount: number;
  nftKind: "wearable" | "emote" | "leftover";
}): { title: string; subtitle?: string } {
  if (args.loading) {
    return { title: args.nftKind === "leftover" ? "LOADING LEFTOVERS" : LOADING_YOUR_NFTS_LABEL };
  }
  if (args.inventoryCount === 0) {
    if (args.nftKind === "leftover") {
      return {
        title: "No leftover prizes",
        subtitle: "Leftovers appear here after a hosted party ends.",
      };
    }
    return {
      title: `No owned ${args.nftKind}s`,
      subtitle: "Try another search or rarity.",
    };
  }
  return {
    title: "Nothing matches",
    subtitle: "Try another search or rarity.",
  };
}

export function canConfirmNftDeposit(args: {
  selectedItem: BrowsableItem | null;
  autoPick: boolean;
  selectedMints: readonly string[];
  quantity: number;
}): boolean {
  if (!args.selectedItem) return false;
  if (args.quantity < 1) return false;
  if (!args.autoPick && args.selectedMints.length < 1) return false;
  return true;
}

export function clampDepositQuantity(args: {
  quantity: number;
  ownedCount: number;
  maxNftsPerDeposit: number;
}): number {
  const cap = Math.max(1, Math.min(args.ownedCount, args.maxNftsPerDeposit));
  return Math.min(cap, Math.max(1, Math.floor(args.quantity)));
}

export const DEPOSIT_STAGES: readonly string[] = [
  "preparing",
  "waiting_wallet",
  "submitted",
  "waiting_confirmation",
  "confirmed",
  "failed",
];

export function depositStageIndex(stage: string): number {
  const idx = DEPOSIT_STAGES.indexOf(stage);
  return idx < 0 ? 0 : idx;
}
