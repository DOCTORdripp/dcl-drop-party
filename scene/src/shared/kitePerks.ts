import { BALLOON_INTERVAL_MS, MAX_CARRIED_BALLOONS } from "./balloonProfile";

export const CROSS_JOINT_INTERVAL_MS = 115_000;
export const CROSS_JOINT_INTERVAL_REDUCTION_MS = BALLOON_INTERVAL_MS - CROSS_JOINT_INTERVAL_MS;

export type KitePerkId = "GREEN" | "DCL2" | "RED" | "LAVA" | "FROST" | "BLACK" | "CROSS";

export const KITE_PERK_IDS: readonly KitePerkId[] = ["GREEN", "DCL2", "RED", "LAVA", "FROST", "BLACK", "CROSS"];

export type CollectionWearableIdentity = {
  contract: string;
  itemId: string;
  canonicalUrn: string;
};

export type KitePerkDefinition = {
  id: KitePerkId;
  displayName: string;
  /** Gameplay perk gate. Same catalog level as mint for this kite. */
  requiredLevel: number;
  /** Scene mint / redemption gate. Independent of equipped-perk checks. */
  mintRequiredLevel: number;
  balloonPointCost: number;
  xpBonus: number;
  capacity: number;
  intervalMs: number;
  contract: string;
  itemId: string;
  canonicalUrn: string;
  /** Scene Collection V2 mint is enabled. Green-only for the first rollout. */
  sceneMintable: boolean;
};

export type ResolvedKitePerk = {
  kite: KitePerkDefinition;
  active: boolean;
};

const MATIC_COLLECTIONS_PREFIX = "urn:decentraland:matic:collections-v2:";

function normalizeContract(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(value)) {
    return null;
  }
  return value;
}

function normalizeItemId(raw: string): string | null {
  try {
    const id = BigInt(raw.trim());
    if (id < 0n) {
      return null;
    }
    return id.toString();
  } catch {
    return null;
  }
}

export function canonicalCollectionsV2ItemUrn(contract: string, itemId: string): string {
  const normalizedContract = normalizeContract(contract);
  const normalizedItemId = normalizeItemId(itemId);
  if (!normalizedContract || normalizedItemId == null) {
    throw new Error("Invalid collections-v2 identity");
  }
  return `${MATIC_COLLECTIONS_PREFIX}${normalizedContract}:${normalizedItemId}`;
}

export function parseCollectionWearableIdentity(urn: string): CollectionWearableIdentity | null {
  const parts = urn.trim().split(":");
  if (parts.length < 6 || parts[0] !== "urn" || parts[1] !== "decentraland") {
    return null;
  }
  const network = (parts[2] ?? "").toLowerCase();
  if (network !== "matic" && network !== "polygon") {
    return null;
  }
  if ((parts[3] ?? "").toLowerCase() !== "collections-v2") {
    return null;
  }
  const contract = normalizeContract(parts[4] ?? "");
  const itemId = normalizeItemId(parts[5] ?? "");
  if (!contract || itemId == null) {
    return null;
  }
  return {
    contract,
    itemId,
    canonicalUrn: `${MATIC_COLLECTIONS_PREFIX}${contract}:${itemId}`,
  };
}

export function sameCollectionItem(
  a: Pick<CollectionWearableIdentity, "contract" | "itemId">,
  b: Pick<CollectionWearableIdentity, "contract" | "itemId">,
): boolean {
  return a.contract === b.contract && a.itemId === b.itemId;
}

function defineKite(
  id: KitePerkId,
  displayName: string,
  requiredLevel: number,
  balloonPointCost: number,
  xpBonus: number,
  capacity: number,
  intervalMs: number,
  contract: string,
  itemId: string,
  sceneMintable = false,
): KitePerkDefinition {
  const canonicalUrn = canonicalCollectionsV2ItemUrn(contract, itemId);
  const identity = parseCollectionWearableIdentity(canonicalUrn);
  if (!identity) {
    throw new Error(`Invalid kite identity for ${id}`);
  }
  return {
    id,
    displayName,
    requiredLevel,
    mintRequiredLevel: requiredLevel,
    balloonPointCost,
    xpBonus,
    capacity,
    intervalMs,
    contract: identity.contract,
    itemId: identity.itemId,
    canonicalUrn: identity.canonicalUrn,
    sceneMintable,
  };
}

export const KITE_PERKS: readonly KitePerkDefinition[] = [
  defineKite("GREEN", "Green Dragon Kite", 5, 100, 2, 10, BALLOON_INTERVAL_MS, "0xc717713847161131034deb6b7b907e35f2452dd1", "1", true),
  defineKite("DCL2", "Decentraland 2.0 Kite", 10, 250, 5, 10, BALLOON_INTERVAL_MS, "0x575d45501ef293066f772e2ec3093c6ab79ec462", "0", true),
  defineKite("RED", "Red Dragon Kite", 15, 400, 5, 12, BALLOON_INTERVAL_MS, "0xc717713847161131034deb6b7b907e35f2452dd1", "0", true),
  defineKite("LAVA", "Lava Kite", 20, 0, 5, 15, BALLOON_INTERVAL_MS, "0xa121712666ca7537951318e26d2a88b82bc8e1c2", "1"),
  defineKite("FROST", "Frost Dragon Kite", 25, 0, 7, 18, BALLOON_INTERVAL_MS, "0xa121712666ca7537951318e26d2a88b82bc8e1c2", "0"),
  defineKite("BLACK", "Black Dragon Kite", 30, 0, 9, 20, BALLOON_INTERVAL_MS, "0xc717713847161131034deb6b7b907e35f2452dd1", "2"),
  defineKite("CROSS", "Cross Joint Kite", 40, 0, 10, 20, CROSS_JOINT_INTERVAL_MS, "0xabea91a63ba4fae8998672e3efb6430f5ad13e0d", "0"),
];

export function getKitePerk(id: KitePerkId): KitePerkDefinition {
  const kite = KITE_PERKS.find((row) => row.id === id);
  if (!kite) {
    throw new Error(`Unknown kite ${id}`);
  }
  return kite;
}

export function isKitePerkId(value: string): value is KitePerkId {
  return (KITE_PERK_IDS as readonly string[]).includes(value);
}

/** Canonical URN for a server kite id. Empty when no kite is active. */
export function wearableUrnsForKiteId(kiteId: string): string[] {
  if (!isKitePerkId(kiteId)) {
    return [];
  }
  return [getKitePerk(kiteId).canonicalUrn];
}

/** Compact catalog label. Detail UI keeps the full Marketplace display name. */
export function kiteListName(kite: Pick<KitePerkDefinition, "id" | "displayName">): string {
  return kite.id === "DCL2" ? "DCL 2.0 Kite" : kite.displayName;
}

/** Stable equipped-kite id for UI refresh. Empty when no catalog kite is worn. */
export function equippedKiteFingerprint(wearableUrns: readonly string[] | undefined | null): string {
  if (!wearableUrns || wearableUrns.length === 0) {
    return "";
  }
  return findEquippedKite(wearableUrns)?.id ?? "";
}

/** Copy URNs from an AvatarEquippedData payload. Missing/removed component means nothing equipped. */
export function wearablesFromAvatarEquippedData(
  equipped: { wearableUrns?: readonly string[] } | undefined | null,
): string[] {
  return equipped?.wearableUrns ? [...equipped.wearableUrns] : [];
}

export function equippedWearablesSignature(urns: readonly string[]): string {
  return urns.map((urn) => urn.trim().toLowerCase()).sort().join("|");
}

export function isKiteEquipped(
  kite: Pick<KitePerkDefinition, "contract" | "itemId">,
  wearableUrns: readonly string[] | undefined | null,
): boolean {
  if (!wearableUrns || wearableUrns.length === 0) {
    return false;
  }
  for (const urn of wearableUrns) {
    const identity = parseCollectionWearableIdentity(urn);
    if (identity && sameCollectionItem(kite, identity)) {
      return true;
    }
  }
  return false;
}

export function findEquippedKite(wearableUrns: readonly string[]): KitePerkDefinition | undefined {
  let matched: KitePerkDefinition | undefined;
  for (const urn of wearableUrns) {
    const identity = parseCollectionWearableIdentity(urn);
    if (!identity) {
      continue;
    }
    for (const kite of KITE_PERKS) {
      if (!sameCollectionItem(kite, identity)) {
        continue;
      }
      if (!matched || kite.requiredLevel > matched.requiredLevel) {
        matched = kite;
      }
    }
  }
  return matched;
}

export function resolveActiveKitePerk(
  wearableUrns: readonly string[] | undefined | null,
  level: number,
): ResolvedKitePerk | undefined {
  if (!wearableUrns || wearableUrns.length === 0) {
    return undefined;
  }
  const kite = findEquippedKite(wearableUrns);
  if (!kite) {
    return undefined;
  }
  const playerLevel = Number.isInteger(level) ? level : 0;
  return {
    kite,
    active: playerLevel >= kite.requiredLevel,
  };
}

export function effectiveBalloonCapacity(resolved: ResolvedKitePerk | undefined): number {
  if (resolved?.active) {
    return resolved.kite.capacity;
  }
  return MAX_CARRIED_BALLOONS;
}

export function effectiveBalloonIntervalMs(resolved: ResolvedKitePerk | undefined): number {
  if (resolved?.active) {
    return resolved.kite.intervalMs;
  }
  return BALLOON_INTERVAL_MS;
}

export function effectiveKiteXpBonus(resolved: ResolvedKitePerk | undefined): number {
  return resolved?.active ? resolved.kite.xpBonus : 0;
}

/** Server-authoritative kite fields for gameplay HUD. Empty kiteId means no perk. */
export type AuthoritativeKiteView = {
  kiteId: string;
  kiteName: string;
  kiteXpBonus: number;
  capacity: number;
  intervalMs: number;
};

export function failClosedKiteView(): AuthoritativeKiteView {
  return {
    kiteId: "",
    kiteName: "",
    kiteXpBonus: 0,
    capacity: MAX_CARRIED_BALLOONS,
    intervalMs: BALLOON_INTERVAL_MS,
  };
}

export function authoritativeKiteView(resolved: ResolvedKitePerk | undefined): AuthoritativeKiteView {
  if (!resolved?.active) {
    return failClosedKiteView();
  }
  return {
    kiteId: resolved.kite.id,
    kiteName: kiteListName(resolved.kite),
    kiteXpBonus: resolved.kite.xpBonus,
    capacity: resolved.kite.capacity,
    intervalMs: resolved.kite.intervalMs,
  };
}

/** HUD line from server kite fields. Uses kiteId for Cross timing, not the locked balloon interval. */
export function formatKiteBonusHudLineFromView(view: AuthoritativeKiteView): string {
  if (!view.kiteId) {
    return "";
  }
  const catalog = KITE_PERKS.find((row) => row.id === view.kiteId);
  const parts = [`+${view.kiteXpBonus} XP`];
  if (view.capacity !== MAX_CARRIED_BALLOONS) {
    parts.push(`CAP ${view.capacity}`);
  }
  const perkInterval = catalog?.intervalMs ?? view.intervalMs;
  if (perkInterval < BALLOON_INTERVAL_MS) {
    parts.push(`-${Math.round(CROSS_JOINT_INTERVAL_REDUCTION_MS / 1000)} SEC`);
  }
  return `KITE BONUS  ${parts.join(" • ")}`;
}

/** Gameplay HUD always uses server kite fields, even if ECS wearables disagree. */
export function gameplayKiteViewFromServer(
  server: AuthoritativeKiteView,
  _ecsWearableUrns?: readonly string[],
): AuthoritativeKiteView {
  return server;
}

const CATALYST_COLLECTION_THUMB_BASE = "https://peer.decentraland.org/lambdas/collections/contents";

/** Catalyst wearable thumbnail for a collections-v2 item URN. */
export function kiteCatalystThumbnailUrl(canonicalUrn: string): string {
  return `${CATALYST_COLLECTION_THUMB_BASE}/${encodeURIComponent(canonicalUrn.trim())}/thumbnail`;
}

export function formatKitePerkDetailLines(kite: KitePerkDefinition): string {
  const parts = [`+${kite.xpBonus} XP per balloon`];
  if (kite.capacity !== MAX_CARRIED_BALLOONS) {
    parts.push(`Capacity ${kite.capacity}`);
  }
  if (kite.intervalMs < BALLOON_INTERVAL_MS) {
    parts.push(`-${Math.round(CROSS_JOINT_INTERVAL_REDUCTION_MS / 1000)}s per balloon`);
  }
  return parts.join("\n");
}

/** Compact live HUD line. Empty when the perk is inactive or no kite is equipped. */
export function formatKiteBonusHudLine(resolved: ResolvedKitePerk | undefined): string {
  return formatKiteBonusHudLineFromView(authoritativeKiteView(resolved));
}

export function canStartBlowingBalloons(carriedBalloons: number, capacity: number): boolean {
  return carriedBalloons < capacity;
}

export function canTurnInBalloons(carriedBalloons: number, capacity: number): boolean {
  return carriedBalloons >= capacity && carriedBalloons > 0;
}
