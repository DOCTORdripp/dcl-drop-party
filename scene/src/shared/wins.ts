import { resolveWinnerLabel, shortenWallet } from "./displayName";
import { transactionExplorerUrl } from "./explorer";
import { marketplaceAccountUrl } from "./hostAccess";
import { formatManaAmount } from "./partyDisplay";
import { formatPartyWhen } from "./partyTime";
import { formatNftMintLabel } from "./mintNumber";

export type WinDeliveryState = "SENDING" | "DELIVERED" | "FAILED";

export type WinView = {
  claimId: string;
  partyId: string;
  partyTitle: string;
  partyScheduledAt: number;
  claimedAt: number;
  type: "NFT" | "MANA";
  displayName: string;
  imageUrl?: string;
  tokenId?: string;
  manaAmountBaseUnits?: string;
  dclRarity?: string;
  announcementTier?: string;
  deliveryState: WinDeliveryState;
  winnerWallet?: string;
  winnerDisplayName?: string;
  txHash?: string;
  chainId?: number;
};

export const UPCOMING_TAB_LABEL = "UPCOMING";
export const MY_WINS_TAB_LABEL = "MY WINS";
export const PARTY_WIN_FEED_MAX_VISIBLE = 10;
export const MY_WINS_VISIBLE_WITHOUT_SCROLL = 4;
export const MY_WINS_THUMB_SIZE = 72;
export const MY_WINS_THUMB_SIZE_COMPACT = 56;
export const MY_WINS_TITLE_FONT = 18;
export const MY_WINS_TITLE_FONT_COMPACT = 16;
export const MY_WINS_META_FONT = 12;
export const MY_WINS_META_FONT_COMPACT = 11;
export const MY_WINS_EXPLORER_LABEL = "Explorer";
export const MANA_TOKEN_ICON_SRC = "assets/images/icon-manaToken.png";
export const MANAGE_PRIZES_VISIBLE_WITHOUT_SCROLL = 3;
export const WON_BY_PREFIX = "Won by";

function canonicalWallet(wallet?: string): string {
  return wallet?.trim().toLowerCase() ?? "";
}

export function isFeaturedPartyWin(
  win: Pick<WinView, "dclRarity" | "announcementTier">,
): boolean {
  const tier = win.announcementTier?.trim().toUpperCase();
  const rarity = win.dclRarity?.trim().toUpperCase();
  return tier === "JACKPOT" || rarity === "MYTHIC" || rarity === "UNIQUE";
}

export function isLocalPartyWin(
  win: Pick<WinView, "winnerWallet">,
  localWallet?: string,
): boolean {
  const local = canonicalWallet(localWallet);
  const winner = canonicalWallet(win.winnerWallet);
  return local.length > 0 && winner === local;
}

/**
 * Live party HUD list: local ordinary wins, plus other-player UNIQUE/MYTHIC/JACKPOT.
 * Local featured wins stay on the personal YOU WON toast so they are not stacked twice.
 */
export function shouldShowInPartyWinFeed(
  win: Pick<WinView, "winnerWallet" | "dclRarity" | "announcementTier">,
  localWallet?: string,
): boolean {
  const local = isLocalPartyWin(win, localWallet);
  const featured = isFeaturedPartyWin(win);
  if (featured) {
    return !local;
  }
  return local;
}

export function partyWinFeedRows(
  wins: readonly WinView[],
  localWallet?: string,
): WinView[] {
  return wins.filter((win) => shouldShowInPartyWinFeed(win, localWallet)).slice(0, PARTY_WIN_FEED_MAX_VISIBLE);
}

/** Live party feed owns featured other-player broadcasts; skip the world-toast lane. */
export function shouldSuppressWorldToastForLiveFeed(args: {
  livePartyHud: boolean;
  phase?: string;
}): boolean {
  if (!args.livePartyHud) {
    return false;
  }
  return args.phase !== "SETTLING" && args.phase !== "COMPLETED";
}

export function myWinsNeedsScroll(winCount: number): boolean {
  return winCount > MY_WINS_VISIBLE_WITHOUT_SCROLL;
}

export function managePrizesNeedsScroll(historyCount: number): boolean {
  return historyCount > MANAGE_PRIZES_VISIBLE_WITHOUT_SCROLL;
}
export {
  WIN_FEED_COMPLETED_GRACE_MS,
  WIN_FEED_POLL_MS,
  WIN_FEED_SAFETY_POLL_MS,
} from "./partyPoll";

export function formatWinPrizeDetail(win: Pick<WinView, "type" | "tokenId" | "manaAmountBaseUnits">): string {
  if (win.type === "NFT") {
    return formatNftMintLabel(win.tokenId);
  }
  return formatManaAmount(win.manaAmountBaseUnits ?? "0");
}

export function winThumbnailUrl(win: Pick<WinView, "type" | "imageUrl">): string | undefined {
  if (win.type === "MANA") {
    return MANA_TOKEN_ICON_SRC;
  }
  return win.imageUrl;
}

const PUBLIC_DROP_PARTY_TITLE = /^Public Drop Party\b/i;

/** Public titles embed host IANA + 24h clock. History rows use a short name plus viewer-local time. */
export function shortWinPartyTitle(title: string): string {
  return PUBLIC_DROP_PARTY_TITLE.test(title.trim()) ? "Public Drop Party" : title;
}

export function formatWinHistoryMeta(
  win: Pick<WinView, "type" | "tokenId" | "manaAmountBaseUnits" | "partyTitle" | "partyScheduledAt" | "deliveryState">,
  viewerTimeZone: string,
  nowMs: number,
): string {
  return [
    formatWinPrizeDetail(win),
    shortWinPartyTitle(win.partyTitle),
    formatPartyWhen(win.partyScheduledAt, viewerTimeZone, nowMs),
    deliveryStateLabel(win.deliveryState),
  ]
    .filter((part) => part.length > 0)
    .join(" · ");
}

export function winExplorerUrl(win: Pick<WinView, "txHash" | "chainId">): string | undefined {
  return win.txHash ? transactionExplorerUrl(win.txHash, win.chainId) : undefined;
}

export function formatManagePrizeHistoryMeta(
  win: Pick<WinView, "type" | "tokenId" | "manaAmountBaseUnits" | "winnerWallet" | "deliveryState">,
): string {
  return [
    formatWinPrizeDetail(win),
    win.winnerWallet ? shortenWallet(win.winnerWallet) : "",
    deliveryStateLabel(win.deliveryState),
  ]
    .filter((part) => part.length > 0)
    .join(" · ");
}

export function wonByWinnerLabel(
  win: Pick<WinView, "winnerWallet" | "winnerDisplayName">,
): string | undefined {
  const wallet = win.winnerWallet?.trim();
  if (!wallet) {
    return undefined;
  }
  return resolveWinnerLabel({
    wallet,
    verifiedDisplayName: win.winnerDisplayName,
  });
}

export function wonByMarketplaceUrl(win: Pick<WinView, "winnerWallet">): string | undefined {
  return win.winnerWallet ? marketplaceAccountUrl(win.winnerWallet) : undefined;
}

export function deliveryStateLabel(state: WinDeliveryState): string {
  return state;
}

export function deliveryStateForPayoutStatus(
  status: "QUEUED" | "SUBMITTING" | "SUBMITTED" | "CONFIRMED" | "FAILED_RETRYABLE" | "FAILED_MANUAL" | string,
): WinDeliveryState {
  if (status === "CONFIRMED") {
    return "DELIVERED";
  }
  if (status === "FAILED_RETRYABLE" || status === "FAILED_MANUAL") {
    return "FAILED";
  }
  return "SENDING";
}
