import { formatManaAmount } from "./partyDisplay";

export type HostLeftoverNft = {
  prizeId: string;
  displayName: string;
  rarity?: string;
  imageUrl?: string;
  kind?: "wearable" | "emote";
};

export type HostLeftoverGroup = {
  sourcePartyId: string;
  sourcePartyTitle: string;
  scheduledAt?: number;
  nftPrizes: HostLeftoverNft[];
  manaBaseUnits: string;
};

export type LeftoverSelection = {
  prizeIds: string[];
  manaPartyIds: string[];
};

export const emptyLeftoverSelection: LeftoverSelection = {
  prizeIds: [],
  manaPartyIds: [],
};

export function leftoverManaLabel(manaBaseUnits: string): string {
  const amount = formatManaAmount(manaBaseUnits);
  return amount ? `${amount} available` : "";
}

export function leftoverItemCountLabel(nftCount: number): string {
  return nftCount === 1 ? "1 item" : `${nftCount} items`;
}

export function leftoverCardCountLabel(nftCount: number, manaBaseUnits?: string): string {
  const mana = formatManaAmount(manaBaseUnits ?? "0");
  if (nftCount <= 0 && !mana) {
    return "0 leftovers";
  }
  if (nftCount <= 0) {
    return `${mana} leftover`;
  }
  const nfts = nftCount === 1 ? "1 leftover" : `${nftCount} leftovers`;
  return mana ? `${nfts} · ${mana}` : nfts;
}

export function leftoverNftCountForCard(
  pot?: { leftoverNftCount?: number; nftCount?: number },
  group?: HostLeftoverGroup,
): number {
  if (group) {
    return group.nftPrizes.length;
  }
  if (pot?.leftoverNftCount !== undefined) {
    return pot.leftoverNftCount;
  }
  return 0;
}

export function hostedLeftoverSummary(pot?: { nftCount?: number; manaBaseUnits?: string }): string {
  const nftCount = pot?.nftCount ?? 0;
  const mana = formatManaAmount(pot?.manaBaseUnits ?? "0");
  if (nftCount <= 0 && !mana) {
    return "";
  }
  if (nftCount <= 0) {
    return `LEFTOVERS: ${mana}`;
  }
  if (!mana) {
    return `LEFTOVERS: ${leftoverItemCountLabel(nftCount)}`;
  }
  return `LEFTOVERS: ${leftoverItemCountLabel(nftCount)} · ${mana}`;
}

export function leftoverNftLine(prize: HostLeftoverNft): string {
  return prize.displayName.trim() || (prize.kind === "emote" ? "Emote" : "Wearable");
}

export function hasLeftoverSelection(selection: LeftoverSelection): boolean {
  return selection.prizeIds.length > 0 || selection.manaPartyIds.length > 0;
}

export function isLeftoverPrizeSelected(selection: LeftoverSelection, prizeId: string): boolean {
  return selection.prizeIds.includes(prizeId);
}

export function isLeftoverManaSelected(selection: LeftoverSelection, partyId: string): boolean {
  return selection.manaPartyIds.includes(partyId);
}

export function toggleLeftoverPrize(selection: LeftoverSelection, prizeId: string): LeftoverSelection {
  if (isLeftoverPrizeSelected(selection, prizeId)) {
    return { ...selection, prizeIds: selection.prizeIds.filter((id) => id !== prizeId) };
  }
  return { ...selection, prizeIds: [...selection.prizeIds, prizeId] };
}

export function toggleLeftoverMana(selection: LeftoverSelection, partyId: string): LeftoverSelection {
  if (isLeftoverManaSelected(selection, partyId)) {
    return { ...selection, manaPartyIds: selection.manaPartyIds.filter((id) => id !== partyId) };
  }
  return { ...selection, manaPartyIds: [...selection.manaPartyIds, partyId] };
}

export function selectAllLeftoversFromGroup(group: HostLeftoverGroup): LeftoverSelection {
  return {
    prizeIds: group.nftPrizes.map((prize) => prize.prizeId),
    manaPartyIds: leftoverManaLabel(group.manaBaseUnits) ? [group.sourcePartyId] : [],
  };
}

export const CREATE_PARTY_LEFTOVER_HINT =
  "Checked leftovers move into the new party. Add more after you save.";
export const DEPOSIT_LEFTOVERS_LABEL = "LEFTOVERS";
export const LEFTOVER_PRIZE_URN_PREFIX = "leftover-prize:";
export const LEFTOVER_MANA_URN_PREFIX = "leftover-mana:";
export const LEFTOVER_MANA_TOKEN_ICON_SRC = "assets/images/icon-manaToken.png";

export function leftoverCreateSummaryLines(
  groups: HostLeftoverGroup[],
  selection: LeftoverSelection,
): string[] {
  const lines: string[] = [];
  for (const group of groups) {
    const nfts = group.nftPrizes.filter((prize) => isLeftoverPrizeSelected(selection, prize.prizeId));
    const mana = isLeftoverManaSelected(selection, group.sourcePartyId)
      ? leftoverManaLabel(group.manaBaseUnits).replace(" available", "")
      : "";
    if (nfts.length === 0 && !mana) {
      continue;
    }
    lines.push(`From ${group.sourcePartyTitle}:`);
    for (const prize of nfts) {
      lines.push(`✓ ${leftoverNftLine(prize)}`);
    }
    if (mana) {
      lines.push(`✓ ${mana}`);
    }
  }
  return lines;
}

export function leftoverGroupForParty(
  groups: HostLeftoverGroup[],
  partyId: string,
): HostLeftoverGroup | undefined {
  return groups.find((group) => group.sourcePartyId === partyId);
}

export function leftoverGroupHasAssets(group?: HostLeftoverGroup): boolean {
  if (!group) return false;
  return group.nftPrizes.length > 0 || Boolean(leftoverManaLabel(group.manaBaseUnits));
}

export function managePrizesHasLeftovers(
  group?: HostLeftoverGroup,
  pot?: { nftCount?: number; manaBaseUnits?: string },
): boolean {
  return leftoverGroupHasAssets(group) || Boolean(hostedLeftoverSummary(pot));
}

export function leftoverPrizeIdsForMints(
  leftoverPrizeByMint: Record<string, string> | undefined,
  mints: readonly string[],
): { leftoverPrizeIds: string[]; walletMints: string[] } {
  const leftoverPrizeIds: string[] = [];
  const walletMints: string[] = [];
  for (const mint of mints) {
    const prizeId = leftoverPrizeByMint?.[mint];
    if (prizeId) {
      leftoverPrizeIds.push(prizeId);
    } else {
      walletMints.push(mint);
    }
  }
  return { leftoverPrizeIds, walletMints };
}

export function leftoverPrizeUrn(prizeId: string): string {
  return `${LEFTOVER_PRIZE_URN_PREFIX}${prizeId}`;
}

export function leftoverManaUrn(partyId: string): string {
  return `${LEFTOVER_MANA_URN_PREFIX}${partyId}`;
}

export function isLeftoverManaUrn(urn: string): boolean {
  return urn.startsWith(LEFTOVER_MANA_URN_PREFIX);
}

export function leftoverManaPartyIdFromUrn(urn: string): string | undefined {
  if (!isLeftoverManaUrn(urn)) {
    return undefined;
  }
  const partyId = urn.slice(LEFTOVER_MANA_URN_PREFIX.length).trim();
  return partyId || undefined;
}

export type LeftoverDepositItem = {
  urn: string;
  name: string;
  kind: "wearable" | "emote";
  rarity: string;
  mints: string[];
  thumbnailUrl?: string;
  slot?: string;
  leftoverPrizeByMint?: Record<string, string>;
};

export function leftoverMintCount(leftoverPrizeByMint?: Record<string, string>): number {
  return leftoverPrizeByMint ? Object.keys(leftoverPrizeByMint).length : 0;
}

export function walletMintCount(mints: readonly string[], leftoverPrizeByMint?: Record<string, string>): number {
  return Math.max(0, mints.length - leftoverMintCount(leftoverPrizeByMint));
}

export function depositCardMintCopy(args: {
  mints: readonly string[];
  leftoverPrizeByMint?: Record<string, string>;
}): { walletLabel: string; leftoverLabel: string } {
  const leftover = leftoverMintCount(args.leftoverPrizeByMint);
  const wallet = walletMintCount(args.mints, args.leftoverPrizeByMint);
  if (leftover > 0) {
    return {
      walletLabel: wallet > 0 ? String(wallet) : "",
    leftoverLabel: `+${leftover}`,
    };
  }
  return {
    walletLabel: wallet === 1 ? "1 mint" : `${wallet} mints`,
    leftoverLabel: "",
  };
}

export function leftoverGroupsToDepositItems(groups: readonly HostLeftoverGroup[]): LeftoverDepositItem[] {
  const items: LeftoverDepositItem[] = [];
  for (const group of groups) {
    for (const prize of group.nftPrizes) {
      const kind = prize.kind === "emote" ? "emote" : "wearable";
      items.push({
        urn: leftoverPrizeUrn(prize.prizeId),
        name: leftoverNftLine(prize),
        kind,
        rarity: (prize.rarity ?? "unknown").trim().toLowerCase() || "unknown",
        mints: [prize.prizeId],
        thumbnailUrl: prize.imageUrl,
        slot: group.sourcePartyTitle,
        leftoverPrizeByMint: { [prize.prizeId]: prize.prizeId },
      });
    }
    const mana = leftoverManaLabel(group.manaBaseUnits).replace(" available", "");
    if (mana) {
      items.push({
        urn: leftoverManaUrn(group.sourcePartyId),
        name: mana,
        kind: "wearable",
        rarity: "mana",
        mints: [group.sourcePartyId],
        thumbnailUrl: LEFTOVER_MANA_TOKEN_ICON_SRC,
        slot: group.sourcePartyTitle,
      });
    }
  }
  return items;
}
