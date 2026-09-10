/**
 * Host Access Required presentation. Eligibility decisions stay on Convex.
 */

import { looksLikeWallet } from "./displayName";

export type HostRequiredWearable = {
  itemUrn: string;
  chainId: number;
  contractAddress: string;
  itemId: string;
  name: string;
  imageUrl?: string;
  rarity?: string;
  collection?: string;
  marketplaceUrl: string;
};

export const HOST_ACCESS_HEADING = "HOST ACCESS REQUIRED";
export const HOST_ACCESS_BODY =
  "To host a Drop Party, you need one of the approved Host Wearables.";
export const GET_WEARABLE_LABEL = "GET WEARABLE";

export const MARKETPLACE_ITEM_ORIGIN = "https://decentraland.org";

export function marketplaceItemUrl(item: {
  marketplaceUrl?: string;
  contractAddress: string;
  itemId: string;
}): string {
  const provided = item.marketplaceUrl?.trim();
  if (provided && provided.startsWith("https://decentraland.org/marketplace/")) {
    return provided;
  }
  const contract = item.contractAddress.trim().toLowerCase();
  const itemId = item.itemId.trim();
  return `${MARKETPLACE_ITEM_ORIGIN}/marketplace/contracts/${contract}/items/${itemId}`;
}

export function isSafeMarketplaceUrl(url: string): boolean {
  return url.startsWith("https://decentraland.org/marketplace/");
}

export function marketplaceAccountUrl(wallet: string): string | undefined {
  const address = wallet.trim().toLowerCase();
  if (!looksLikeWallet(address)) {
    return undefined;
  }
  return `${MARKETPLACE_ITEM_ORIGIN}/marketplace/accounts/${address}`;
}

export function hostWearableMetaLine(item: HostRequiredWearable): string {
  return [item.rarity, item.collection].filter((part) => part && part.trim().length > 0).join(" · ");
}
