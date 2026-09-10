/**
 * Scene inventory client. Catalyst paging/parsing lives in private Convex.
 * This module only loads sanitized rows for Deposit Chest rendering.
 */

import { signedConvexPost } from "../signedConvex";

export type InventoryKind = "wearable" | "emote";

export type InventoryItem = {
  urn: string;
  name: string;
  kind: InventoryKind;
  rarity: string;
  mints: string[];
  mintLabels?: (string | undefined)[];
  thumbnailUrl?: string;
  leftoverPrizeByMint?: Record<string, string>;
};

export async function fetchOwnedInventory(
  wallet: string,
  kind: InventoryKind,
): Promise<InventoryItem[]> {
  const json = await signedConvexPost<{ items?: InventoryItem[] }>(
    "/deposit-chest/inventory",
    { wallet, kind },
  );
  return Array.isArray(json.items) ? json.items : [];
}
