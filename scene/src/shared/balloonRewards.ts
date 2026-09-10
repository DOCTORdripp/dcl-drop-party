import { BALLOON_REWARD_ICON_PLACEHOLDER } from "./balloonRewardsArt";
import type { BalloonProfile } from "./balloonProfile";
import {
  KITE_PERKS,
  getKitePerk,
  isKiteEquipped,
  kiteCatalystThumbnailUrl,
  formatKitePerkDetailLines,
  type KitePerkId,
  type KitePerkDefinition,
} from "./kitePerks";
import {
  emptyKiteMintCounts,
  formatKiteMintCta,
  formatKiteMintStock,
  kiteMintRemaining,
  type KiteMintCounts,
} from "./kiteMintLedger";
import {
  formatKiteMintAction,
  isKiteMintConfirmAction,
  kiteMintCanStartNewAttempt,
  type KiteMintActionLabel,
  type KiteRedemptionEntry,
  type KiteRedemptionLedger,
} from "./kiteMintRedemption";
import { marketplaceItemUrl } from "./hostAccess";

export type BalloonRewardRarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC";

export type BalloonRewardKey =
  | "ROUND"
  | "LONG"
  | "HEART"
  | "DOG"
  | "SWORD"
  | "FLOWER"
  | "CROWN"
  | "DRAGON"
  | "MYSTERY";

export type BalloonReward = {
  key: BalloonRewardKey;
  displayName: string;
  requiredLevel: number;
  balloonPointCost: number;
  rarity: BalloonRewardRarity;
  expectedSupply: number;
  /** Empty until the real wearable identifier is configured. */
  itemUrn: string;
  enabled: boolean;
  /** Per-reward art. Shared placeholder until unique icons exist. */
  iconSrc: string;
};

export const BALLOON_REWARDS: readonly BalloonReward[] = [
  { key: "ROUND", displayName: "Round Balloon", requiredLevel: 10, balloonPointCost: 300, rarity: "COMMON", expectedSupply: 100_000, itemUrn: "", enabled: false, iconSrc: BALLOON_REWARD_ICON_PLACEHOLDER },
  { key: "LONG", displayName: "Long Balloon", requiredLevel: 20, balloonPointCost: 500, rarity: "COMMON", expectedSupply: 100_000, itemUrn: "", enabled: false, iconSrc: BALLOON_REWARD_ICON_PLACEHOLDER },
  { key: "HEART", displayName: "Heart Balloon", requiredLevel: 30, balloonPointCost: 800, rarity: "UNCOMMON", expectedSupply: 10_000, itemUrn: "", enabled: false, iconSrc: BALLOON_REWARD_ICON_PLACEHOLDER },
  { key: "DOG", displayName: "Dog Balloon", requiredLevel: 40, balloonPointCost: 1_300, rarity: "UNCOMMON", expectedSupply: 10_000, itemUrn: "", enabled: false, iconSrc: BALLOON_REWARD_ICON_PLACEHOLDER },
  { key: "SWORD", displayName: "Sword Balloon", requiredLevel: 50, balloonPointCost: 2_000, rarity: "RARE", expectedSupply: 5_000, itemUrn: "", enabled: false, iconSrc: BALLOON_REWARD_ICON_PLACEHOLDER },
  { key: "FLOWER", displayName: "Flower Balloon", requiredLevel: 60, balloonPointCost: 3_000, rarity: "RARE", expectedSupply: 5_000, itemUrn: "", enabled: false, iconSrc: BALLOON_REWARD_ICON_PLACEHOLDER },
  { key: "CROWN", displayName: "Crown Balloon", requiredLevel: 70, balloonPointCost: 5_000, rarity: "EPIC", expectedSupply: 1_000, itemUrn: "", enabled: false, iconSrc: BALLOON_REWARD_ICON_PLACEHOLDER },
  { key: "DRAGON", displayName: "Dragon Balloon", requiredLevel: 80, balloonPointCost: 9_000, rarity: "EPIC", expectedSupply: 1_000, itemUrn: "", enabled: false, iconSrc: BALLOON_REWARD_ICON_PLACEHOLDER },
  { key: "MYSTERY", displayName: "Mystery Balloon", requiredLevel: 99, balloonPointCost: 20_000, rarity: "EPIC", expectedSupply: 100, itemUrn: "", enabled: false, iconSrc: BALLOON_REWARD_ICON_PLACEHOLDER },
];

export const COMPLETE_SET_BALLOON_POINTS = BALLOON_REWARDS.reduce(
  (sum, reward) => sum + reward.balloonPointCost,
  0,
);

export function getBalloonReward(
  key: string,
  catalog: readonly BalloonReward[] = BALLOON_REWARDS,
): BalloonReward | undefined {
  return catalog.find((reward) => reward.key === key);
}

export function rewardIsConfigured(reward: BalloonReward): boolean {
  return reward.enabled && reward.itemUrn.trim().length > 0;
}

export type RewardEligibility =
  | { ok: true; reward: BalloonReward }
  | { ok: false; result: "UNKNOWN_REWARD" | "UNAVAILABLE" | "LEVEL_LOCKED" | "INSUFFICIENT_POINTS" };

export function evaluateRewardRedemption(
  profile: BalloonProfile,
  key: string,
  catalog: readonly BalloonReward[] = BALLOON_REWARDS,
): RewardEligibility {
  const reward = getBalloonReward(key, catalog);
  if (!reward) {
    return { ok: false, result: "UNKNOWN_REWARD" };
  }
  if (!rewardIsConfigured(reward)) {
    return { ok: false, result: "UNAVAILABLE" };
  }
  if (profile.level < reward.requiredLevel) {
    return { ok: false, result: "LEVEL_LOCKED" };
  }
  if (profile.balloonPoints < reward.balloonPointCost) {
    return { ok: false, result: "INSUFFICIENT_POINTS" };
  }
  return { ok: true, reward };
}

export type RewardsCatalogTab = "BALLOONS" | "KITES";

export type BalloonRewardUi = {
  open: boolean;
  message: string;
  tab: RewardsCatalogTab;
  detailKiteId: KitePerkId | null;
  equippedFingerprint: string;
};

export function createBalloonRewardUi(): BalloonRewardUi {
  return { open: false, message: "", tab: "KITES", detailKiteId: null, equippedFingerprint: "" };
}

export function openBalloonRewardUi(model: BalloonRewardUi): BalloonRewardUi {
  return { ...model, open: true, message: "", tab: "KITES", detailKiteId: null };
}

export function closeBalloonRewardUi(model: BalloonRewardUi): BalloonRewardUi {
  return { ...model, open: false, detailKiteId: null };
}

export function setRewardsEquippedFingerprint(model: BalloonRewardUi, fingerprint: string): BalloonRewardUi {
  if (model.equippedFingerprint === fingerprint) {
    return model;
  }
  return { ...model, equippedFingerprint: fingerprint };
}

export function setRewardsCatalogTab(model: BalloonRewardUi, tab: RewardsCatalogTab): BalloonRewardUi {
  if (!model.open) {
    return model;
  }
  return { ...model, tab, detailKiteId: null, message: "" };
}

export function openKiteRewardDetail(model: BalloonRewardUi, kiteId: KitePerkId): BalloonRewardUi {
  if (!model.open) {
    return model;
  }
  return { ...model, tab: "KITES", detailKiteId: kiteId, message: "" };
}

export function closeKiteRewardDetail(model: BalloonRewardUi): BalloonRewardUi {
  if (!model.open) {
    return model;
  }
  return { ...model, tab: "KITES", detailKiteId: null };
}

/** Rewards and the Deposit Chest overlay cannot share the screen. */
export function exclusiveOverlayState(
  opening: "rewards" | "deposit",
): { rewardsOpen: boolean; depositOpen: boolean } {
  return opening === "rewards"
    ? { rewardsOpen: true, depositOpen: false }
    : { rewardsOpen: false, depositOpen: true };
}

export function setBalloonRewardMessage(model: BalloonRewardUi, message: string): BalloonRewardUi {
  return { ...model, message };
}

export const BALLOON_REWARDS_DISCLAIMER = "REWARDS COMING SOON. CHECK BACK LATER.";
export const BALLOON_REWARDS_BALLOONS_COMING_SOON = "BALLOONS COMING SOON. CHECK BACK LATER.";

export function formatRewardLevel(level: number): string {
  return `Lv ${level}`;
}

export function formatRewardCost(cost: number): string {
  return `${cost} BP`;
}

export type RewardStatusLabel = "LOCKED" | "UNLOCKED";

export function formatRewardStatus(args: {
  requiredLevel: number;
  playerLevel: number;
  balloonPointCost?: number;
  balloonPoints?: number;
}): RewardStatusLabel {
  if (args.playerLevel < args.requiredLevel) {
    return "LOCKED";
  }
  return "UNLOCKED";
}

export function formatRewardStats(level: number, balloonPoints: number): string {
  return `Lv ${level}  \u2726  ${balloonPoints} BP`;
}

export type BalloonRewardRow = BalloonReward & {
  locked: boolean;
  unaffordable: boolean;
  configured: boolean;
  ownedCount: number;
};

export function balloonRewardRows(
  profile: Pick<BalloonProfile, "level" | "balloonPoints" | "redeemedCounts">,
  catalog: readonly BalloonReward[] = BALLOON_REWARDS,
): BalloonRewardRow[] {
  return catalog.map((reward) => ({
    ...reward,
    locked: profile.level < reward.requiredLevel,
    unaffordable: profile.balloonPoints < reward.balloonPointCost,
    configured: rewardIsConfigured(reward),
    ownedCount: profile.redeemedCounts[reward.key] ?? 0,
  }));
}

export function deductRewardPoints(profile: BalloonProfile, reward: BalloonReward): BalloonProfile {
  return {
    ...profile,
    balloonPoints: profile.balloonPoints - reward.balloonPointCost,
    redeemedCounts: {
      ...profile.redeemedCounts,
      [reward.key]: (profile.redeemedCounts[reward.key] ?? 0) + 1,
    },
  };
}

export type KiteRewardStatusLabel =
  | "LOCKED"
  | "UNLOCKED"
  | "CLAIMABLE"
  | "EQUIPPED"
  | "SOLD OUT"
  | "MINTED"
  | "MINTING";

export type KiteRewardRow = KitePerkDefinition & {
  status: KiteRewardStatusLabel;
  equipped: boolean;
};

export function formatKiteRewardStatus(args: {
  requiredLevel: number;
  playerLevel: number;
  equipped: boolean;
  soldOut?: boolean;
  minted?: boolean;
  minting?: boolean;
  notEnoughBp?: boolean;
}): KiteRewardStatusLabel {
  if (args.equipped) {
    return "EQUIPPED";
  }
  if (args.soldOut) {
    return "SOLD OUT";
  }
  if (args.playerLevel < args.requiredLevel) {
    return "LOCKED";
  }
  if (args.minting) {
    return "MINTING";
  }
  if (args.notEnoughBp) {
    return "UNLOCKED";
  }
  return "CLAIMABLE";
}

export function kiteRewardRows(
  playerLevel: number,
  wearableUrns: readonly string[] = [],
  mintCounts: KiteMintCounts = emptyKiteMintCounts(),
  catalog: readonly KitePerkDefinition[] = KITE_PERKS,
    extras: {
      balloonPoints?: number;
      ledger?: KiteRedemptionLedger;
      busyKiteId?: KitePerkId | null;
      justMintedKiteId?: KitePerkId | null;
    } = {},
): KiteRewardRow[] {
  return catalog.map((kite) => {
    const equipped = isKiteEquipped(kite, wearableUrns);
    const soldOut = kiteMintRemaining(kite.id, mintCounts[kite.id] ?? 0) <= 0;
    const entry = extras.ledger?.[kite.id];
    const mintLevel = kite.sceneMintable ? kite.mintRequiredLevel : kite.requiredLevel;
    return {
      ...kite,
      equipped,
      status: formatKiteRewardStatus({
        requiredLevel: mintLevel,
        playerLevel,
        equipped,
        soldOut,
        minting: extras.busyKiteId === kite.id || entry?.status === "SUBMITTED",
        notEnoughBp:
          kite.balloonPointCost > 0 &&
          (extras.balloonPoints ?? 0) < kite.balloonPointCost &&
          entry?.status !== "SUBMITTED",
      }),
    };
  });
}

export type KiteRewardDetail = {
  kite: KitePerkDefinition;
  name: string;
  description: string;
  requirements: string;
  requirementLevelMet: boolean;
  requirementCostMet: boolean;
  perks: string;
  ownership: string;
  ownershipCost: string;
  mintAction: KiteMintActionLabel;
  canMint: boolean;
  mintStock: string;
  status: KiteRewardStatusLabel;
  equipped: boolean;
  perkActive: boolean;
  iconSrc: string;
  marketplaceUrl: string;
};

function formatKiteOwnershipPrimary(mintAction: KiteMintActionLabel, mintLevel: number): string {
  if (mintAction === "LOCKED" || mintAction === "NOT ENOUGH BP") {
    return `LEVEL ${mintLevel}`;
  }
  if (mintAction === "MINT") {
    return "MINT NOW";
  }
  if (mintAction === "TRY AGAIN") {
    return "TRY AGAIN";
  }
  return mintAction;
}

export function kiteRewardDetail(
  kiteId: KitePerkId,
  playerLevel: number,
  wearableUrns: readonly string[] = [],
  mintCounts: KiteMintCounts = emptyKiteMintCounts(),
  extras: {
    balloonPoints?: number;
    entry?: KiteRedemptionEntry;
    busy?: boolean;
    justMinted?: boolean;
    justFailed?: boolean;
    confirmPending?: boolean;
    mobile?: boolean;
    lastResult?: string;
  } = {},
): KiteRewardDetail {
  const kite = getKitePerk(kiteId);
  const equipped = isKiteEquipped(kite, wearableUrns);
  const perkActive = equipped && playerLevel >= kite.requiredLevel;
  const minted = mintCounts[kiteId] ?? 0;
  const soldOut = kiteMintRemaining(kiteId, minted) <= 0;
  const mintLevel = kite.sceneMintable ? kite.mintRequiredLevel : kite.requiredLevel;
  const mintAction = formatKiteMintAction({
    kite,
    playerLevel,
    balloonPoints: extras.balloonPoints ?? 0,
    soldOut,
    entry: extras.entry,
    busy: extras.busy,
    justMinted: extras.justMinted,
    justFailed: extras.justFailed,
    confirmPending: extras.confirmPending,
    mobile: extras.mobile,
    lastResult: extras.lastResult,
  });
  const status = formatKiteRewardStatus({
    requiredLevel: mintLevel,
    playerLevel,
    equipped,
    soldOut,
    minting: mintAction === "MINTING...",
    notEnoughBp: mintAction === "NOT ENOUGH BP",
  });
  const mintStock = formatKiteMintStock(kiteId, minted);
  const balloonPoints = extras.balloonPoints ?? 0;
  const requirementLevelMet = playerLevel >= mintLevel;
  const requirementCostMet =
    kite.balloonPointCost <= 0 ||
    balloonPoints >= kite.balloonPointCost ||
    Boolean(extras.entry?.bpReserved && extras.entry.status !== "CONFIRMED");
  const ownership = kite.sceneMintable
    ? formatKiteOwnershipPrimary(mintAction, mintLevel)
    : formatKiteMintCta(kiteId, minted);
  const showCost =
    !soldOut &&
    kite.balloonPointCost > 0 &&
    mintAction !== "MINTED" &&
    !isKiteMintConfirmAction(mintAction) &&
    mintAction !== "SOLD OUT" &&
    (mintAction === "MINT" ||
      mintAction === "TRY AGAIN" ||
      mintAction === "LOCKED" ||
      mintAction === "NOT ENOUGH BP");
  return {
    kite,
    name: kite.displayName,
    description: `Equipped kite perks apply when your balloon level meets the requirement.\n${mintStock}`,
    requirements: `LEVEL ${mintLevel}`,
    requirementLevelMet,
    requirementCostMet,
    perks: formatKitePerkDetailLines(kite),
    ownership,
    ownershipCost: showCost ? formatRewardCost(kite.balloonPointCost) : "",
    mintAction,
    canMint: kiteMintCanStartNewAttempt(mintAction),
    mintStock,
    status,
    equipped,
    perkActive,
    iconSrc: kiteCatalystThumbnailUrl(kite.canonicalUrn),
    marketplaceUrl: marketplaceItemUrl({ contractAddress: kite.contract, itemId: kite.itemId }),
  };
}
