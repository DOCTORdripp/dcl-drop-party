import { chestPanelRect, chestUiDensity, type UiEdgeInsets } from "./chestUiLayout";
import { DEFAULT_UI_CANVAS, isHorizontallyCentered, type LayoutRect, type UiCanvas } from "./uiLayout";
import {
  emptyDepositReceipt,
  type DepositReceipt,
  type DepositStage,
} from "./depositProgress";
import {
  canConfirmNftDeposit,
  clampDepositQuantity,
  destinationContextLabel,
  isMintLocked,
} from "./inventoryBrowser";
import type { HostRequiredWearable } from "./hostAccess";
import type { ScheduledPartyView } from "./partyPanels";

export type ChestPanelId =
  | "none"
  | "chest"
  | "hostAccess"
  | "depositWarning"
  | "deposit"
  | "depositMana"
  | "depositNft"
  | "depositNftPick"
  | "depositNftMints"
  | "depositStatus";
export type DepositAsset = "NFT" | "MANA";
export type DepositNftKind = "wearable" | "emote" | "leftover";
export type DepositDestination = "PUBLIC_ROLLING" | "SCHEDULED_PARTY";
export type DepositStatus = DepositStage | "confirm" | "pending" | "success" | "failure";

export type DepositChestItem = {
  urn: string;
  name: string;
  kind: "wearable" | "emote";
  rarity: string;
  mints: string[];
  mintLabels?: (string | undefined)[];
  thumbnailUrl?: string;
  slot?: string;
  leftoverPrizeByMint?: Record<string, string>;
};

export type DepositModel = {
  asset: DepositAsset;
  destination: DepositDestination;
  scheduledPartyId?: string;
  scheduledPartyTitle?: string;
  destinationReady: boolean;
  targets: ScheduledPartyView[];
  nextPublicPartyAt?: number;
  manaAmount: number;
  minMana: number;
  manaBalanceLabel: string;
  status: DepositStatus;
  stage: DepositStage;
  message: string;
  receipt: DepositReceipt;
  showDiagnostics: boolean;
  nftKind: DepositNftKind;
  quantity: number;
  autoPick: boolean;
  lowMintLock: boolean;
  inventory: DepositChestItem[];
  inventoryLoading: boolean;
  leftoverAvailable: boolean;
  inventorySearch: string;
  inventoryRarity: string;
  inventoryPage: number;
  maxNftsPerDeposit: number;
  protectedMintNumbers: number[];
  selectedItem: DepositChestItem | null;
  selectedMints: string[];
};

export type ChestPanelModel = {
  open: ChestPanelId;
  deposit: DepositModel;
  hostRequirements: HostRequiredWearable[];
};

/** Raffle Manager `layout.width` / `layout.height` (PANEL_BASE_WIDTH = 540). */
export const CHEST_PANEL_WIDTH = 540;
export const CHEST_PANEL_HEIGHT = 540;

/** Large panels do not lock locomotion. The player stays in the world. */
export const CHEST_PANEL_LOCKS_MOVEMENT = false;

export function createChestPanelModel(): ChestPanelModel {
  return {
    open: "none",
    hostRequirements: [],
    deposit: {
      asset: "MANA",
      destination: "PUBLIC_ROLLING",
      scheduledPartyId: undefined,
      scheduledPartyTitle: undefined,
      destinationReady: false,
      targets: [],
      nextPublicPartyAt: undefined,
      manaAmount: 100,
      minMana: 10,
      manaBalanceLabel: "…",
      status: "idle",
      stage: "idle",
      message: "",
      receipt: emptyDepositReceipt(),
      showDiagnostics: false,
      nftKind: "wearable",
      quantity: 1,
      autoPick: true,
      lowMintLock: true,
      inventory: [],
      inventoryLoading: false,
      leftoverAvailable: false,
      inventorySearch: "",
      inventoryRarity: "all",
      inventoryPage: 0,
      maxNftsPerDeposit: 20,
      protectedMintNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 69],
      selectedItem: null,
      selectedMints: [],
    },
  };
}

export function chestPanelLayout(
  id: Exclude<ChestPanelId, "none">,
  canvas: UiCanvas = DEFAULT_UI_CANVAS,
  insets?: UiEdgeInsets,
): LayoutRect {
  void id;
  return chestPanelRect(canvas, insets);
}

export function openDepositWarning(model: ChestPanelModel): ChestPanelModel {
  return { ...model, open: "depositWarning" };
}

export function openChestPanel(model: ChestPanelModel, id: ChestPanelId): ChestPanelModel {
  if (id === "deposit") {
    return {
      ...model,
      open: "deposit",
      deposit: { ...model.deposit, destinationReady: false, status: "idle", stage: "idle", message: "" },
    };
  }
  return { ...model, open: id };
}

export function openChestRoot(model: ChestPanelModel): ChestPanelModel {
  return { ...model, open: "chest" };
}

export function setHostRequirements(
  model: ChestPanelModel,
  hostRequirements: HostRequiredWearable[],
): ChestPanelModel {
  return { ...model, hostRequirements };
}

export function openHostAccess(
  model: ChestPanelModel,
  hostRequirements?: HostRequiredWearable[],
): ChestPanelModel {
  return {
    ...model,
    open: "hostAccess",
    hostRequirements: hostRequirements ?? model.hostRequirements,
  };
}

export function beginContributeToParty(
  model: ChestPanelModel,
  scheduled: { partyId: string; title: string },
): ChestPanelModel {
  return {
    ...model,
    open: "deposit",
    deposit: {
      ...model.deposit,
      destination: "SCHEDULED_PARTY",
      scheduledPartyId: scheduled.partyId,
      scheduledPartyTitle: scheduled.title,
      destinationReady: true,
      status: "idle",
      stage: "idle",
      message: "",
      receipt: { ...emptyDepositReceipt(), destinationLabel: scheduled.title, scheduledPartyId: scheduled.partyId },
    },
  };
}

export function closeChestPanel(model: ChestPanelModel): ChestPanelModel {
  return { ...model, open: "none", deposit: { ...model.deposit, status: "idle", message: "" } };
}

/** Close deposit UI once for every client when the round flips to ACTIVE. */
export function shouldCloseDepositUiOnPartyStart(previousStatus: string | null, status: string): boolean {
  return status === "ACTIVE" && previousStatus !== "ACTIVE";
}

export function dismissOpenDepositUi(model: ChestPanelModel): ChestPanelModel {
  return model.open === "none" ? model : closeChestPanel(model);
}

export function chooseDepositAsset(model: ChestPanelModel, asset: DepositAsset): ChestPanelModel {
  return {
    ...model,
    open: asset === "NFT" ? "deposit" : "depositMana",
    deposit: {
      ...model.deposit,
      asset,
      status: "idle",
      message: "",
      manaBalanceLabel: asset === "MANA" ? "…" : model.deposit.manaBalanceLabel,
    },
  };
}

export type DepositTypeChoice = "wearable" | "emote" | "MANA";

export function chooseDepositType(model: ChestPanelModel, choice: DepositTypeChoice): ChestPanelModel {
  if (choice === "MANA") {
    return chooseDepositAsset(model, "MANA");
  }
  return chooseNftKind({
    ...model,
    deposit: { ...model.deposit, asset: "NFT" },
  }, choice);
}

export function setDepositDestination(
  model: ChestPanelModel,
  destination: DepositDestination,
  scheduled?: { partyId?: string; title?: string },
): ChestPanelModel {
  const title = destination === "SCHEDULED_PARTY" ? scheduled?.title : "Next Public Party";
  return {
    ...model,
    deposit: {
      ...model.deposit,
      destination,
      destinationReady: true,
      scheduledPartyId: destination === "SCHEDULED_PARTY" ? scheduled?.partyId : undefined,
      scheduledPartyTitle: destination === "SCHEDULED_PARTY" ? scheduled?.title : undefined,
      receipt: {
        ...model.deposit.receipt,
        destinationLabel: title ?? "scheduled party",
        scheduledPartyId: destination === "SCHEDULED_PARTY" ? scheduled?.partyId : undefined,
        destination,
      },
    },
  };
}

export function setDepositTargets(
  model: ChestPanelModel,
  targets: ScheduledPartyView[],
  nextPublicPartyAt?: number,
): ChestPanelModel {
  return { ...model, deposit: { ...model.deposit, targets, nextPublicPartyAt } };
}

export function setShowDepositDiagnostics(model: ChestPanelModel, showDiagnostics: boolean): ChestPanelModel {
  return { ...model, deposit: { ...model.deposit, showDiagnostics } };
}

export function legalDepositTargets(targets: ScheduledPartyView[]): ScheduledPartyView[] {
  return targets.filter((row) => row.canCurrentUserContribute);
}

export type DepositDestinationOption =
  | { kind: "PUBLIC_ROLLING"; scheduledAt?: number }
  | { kind: "SCHEDULED_PARTY"; party: ScheduledPartyView; scheduledAt: number };

export function orderedDepositDestinations(
  targets: ScheduledPartyView[],
  nextPublicPartyAt?: number,
): DepositDestinationOption[] {
  return [
    { kind: "PUBLIC_ROLLING" as const, scheduledAt: nextPublicPartyAt },
    ...legalDepositTargets(targets).map((party) => ({
      kind: "SCHEDULED_PARTY" as const,
      party,
      scheduledAt: party.scheduledAt,
    })),
  ].sort((a, b) => {
    const aTime = a.scheduledAt ?? Number.NEGATIVE_INFINITY;
    const bTime = b.scheduledAt ?? Number.NEGATIVE_INFINITY;
    if (aTime !== bTime) return aTime - bTime;
    if (a.kind !== b.kind) return a.kind === "PUBLIC_ROLLING" ? -1 : 1;
    if (a.kind === "SCHEDULED_PARTY" && b.kind === "SCHEDULED_PARTY") {
      return a.party.title.localeCompare(b.party.title);
    }
    return 0;
  });
}

/** Public + scheduled tiles that fit the deposit modal before a scrollbar. */
export const DEPOSIT_DESTINATION_VISIBLE_WITHOUT_SCROLL = 5;
export const DEPOSIT_DESTINATION_GAP = 8;
export const DEPOSIT_DESTINATION_BUTTON_HEIGHT = 76;
export const DEPOSIT_DESTINATION_BUTTON_HEIGHT_COMPACT = 68;
export const DEPOSIT_DESTINATION_TITLE_FONT = 16;
export const DEPOSIT_DESTINATION_TITLE_FONT_COMPACT = 17;
export const DEPOSIT_DESTINATION_META_FONT = 12;
export const DEPOSIT_DESTINATION_META_FONT_COMPACT = 13;
export const NEXT_PUBLIC_PARTY_LABEL = "Next Public Party";
export const NEXT_PUBLIC_PARTY_META = "Public rolling drop";

export function depositDestinationCount(scheduledCount: number): number {
  return 1 + Math.max(0, scheduledCount);
}

export function depositDestinationNeedsScroll(scheduledCount: number): boolean {
  return depositDestinationCount(scheduledCount) > DEPOSIT_DESTINATION_VISIBLE_WITHOUT_SCROLL;
}

export function depositDestinationButtonHeight(compact: boolean): number {
  return compact ? DEPOSIT_DESTINATION_BUTTON_HEIGHT_COMPACT : DEPOSIT_DESTINATION_BUTTON_HEIGHT;
}

export function depositDestinationTitleFont(compact: boolean): number {
  return compact ? DEPOSIT_DESTINATION_TITLE_FONT_COMPACT : DEPOSIT_DESTINATION_TITLE_FONT;
}

export function depositDestinationMetaFont(compact: boolean): number {
  return compact ? DEPOSIT_DESTINATION_META_FONT_COMPACT : DEPOSIT_DESTINATION_META_FONT;
}

export function extraPoolExposedToPlayer(_model: ChestPanelModel): boolean {
  return false;
}

export function setManaAmount(model: ChestPanelModel, amount: number): ChestPanelModel {
  return { ...model, deposit: { ...model.deposit, manaAmount: Math.max(model.deposit.minMana, amount) } };
}

export function setManaBalanceLabel(model: ChestPanelModel, manaBalanceLabel: string): ChestPanelModel {
  return { ...model, deposit: { ...model.deposit, manaBalanceLabel } };
}

export function chooseNftKind(model: ChestPanelModel, nftKind: DepositNftKind): ChestPanelModel {
  return {
    ...model,
    open: "depositNftPick",
    deposit: {
      ...model.deposit,
      asset: "NFT",
      nftKind,
      inventory: [],
      inventoryLoading: true,
      selectedItem: null,
      selectedMints: [],
      inventorySearch: "",
      inventoryRarity: "all",
      inventoryPage: 0,
      status: "idle",
      message: "",
    },
  };
}

export function setDepositInventory(model: ChestPanelModel, inventory: DepositChestItem[]): ChestPanelModel {
  const previous = model.deposit.selectedItem;
  const selectedItem = previous ? inventory.find((row) => row.urn === previous.urn) ?? null : null;
  const selectedMints = selectedItem
    ? model.deposit.selectedMints.filter((id) => selectedItem.mints.includes(id))
    : [];
  const quantity = selectedItem
    ? clampDepositQuantity({
        quantity: model.deposit.quantity,
        ownedCount: selectedItem.mints.length,
        maxNftsPerDeposit: model.deposit.maxNftsPerDeposit,
      })
    : model.deposit.quantity;
  return {
    ...model,
    deposit: {
      ...model.deposit,
      inventory,
      inventoryLoading: false,
      inventoryPage: 0,
      selectedItem,
      selectedMints,
      quantity,
    },
  };
}

export function excludeDepositedMints(model: ChestPanelModel, tokenIds: readonly string[]): ChestPanelModel {
  if (tokenIds.length === 0) {
    return model;
  }
  const drop = new Set(tokenIds);
  const inventory = model.deposit.inventory
    .map((item) => {
      const keep = item.mints.map((mint, index) => ({ mint, index })).filter(({ mint }) => !drop.has(mint));
      if (keep.length === item.mints.length) {
        return item;
      }
      return {
        ...item,
        mints: keep.map(({ mint }) => mint),
        mintLabels: item.mintLabels ? keep.map(({ index }) => item.mintLabels?.[index]) : item.mintLabels,
      };
    })
    .filter((item) => item.mints.length > 0);
  return setDepositInventory(model, inventory);
}

export function setDepositLeftoverAvailable(model: ChestPanelModel, leftoverAvailable: boolean): ChestPanelModel {
  return { ...model, deposit: { ...model.deposit, leftoverAvailable } };
}

export function setInventorySearch(model: ChestPanelModel, inventorySearch: string): ChestPanelModel {
  return { ...model, deposit: { ...model.deposit, inventorySearch, inventoryPage: 0 } };
}

export function setInventoryRarity(model: ChestPanelModel, inventoryRarity: string): ChestPanelModel {
  return { ...model, deposit: { ...model.deposit, inventoryRarity, inventoryPage: 0 } };
}

export function turnInventoryPage(model: ChestPanelModel, delta: number): ChestPanelModel {
  return {
    ...model,
    deposit: { ...model.deposit, inventoryPage: Math.max(0, model.deposit.inventoryPage + delta) },
  };
}

export function goToInventoryPage(model: ChestPanelModel, page: number): ChestPanelModel {
  return {
    ...model,
    deposit: { ...model.deposit, inventoryPage: Math.max(0, Math.floor(page)) },
  };
}

export function setChestPolicy(model: ChestPanelModel, policy: {
  maxNftsPerDeposit?: number;
  protectedMintNumbers?: number[];
  minMana?: number;
  autoPick?: boolean;
  lowMintLock?: boolean;
}): ChestPanelModel {
  return {
    ...model,
    deposit: {
      ...model.deposit,
      maxNftsPerDeposit: policy.maxNftsPerDeposit ?? model.deposit.maxNftsPerDeposit,
      protectedMintNumbers: policy.protectedMintNumbers ?? model.deposit.protectedMintNumbers,
      minMana: policy.minMana ?? model.deposit.minMana,
      autoPick: policy.autoPick ?? model.deposit.autoPick,
      lowMintLock: policy.lowMintLock ?? model.deposit.lowMintLock,
    },
  };
}

export function selectDepositItem(model: ChestPanelModel, item: DepositChestItem): ChestPanelModel {
  return {
    ...model,
    open: model.deposit.autoPick ? "depositNftPick" : "depositNftMints",
    deposit: { ...model.deposit, selectedItem: item, selectedMints: [], quantity: 1 },
  };
}

export function setDepositQuantity(model: ChestPanelModel, quantity: number): ChestPanelModel {
  const owned = model.deposit.selectedItem?.mints.length ?? 1;
  return {
    ...model,
    deposit: {
      ...model.deposit,
      quantity: clampDepositQuantity({
        quantity,
        ownedCount: owned,
        maxNftsPerDeposit: model.deposit.maxNftsPerDeposit,
      }),
    },
  };
}

export function setAutoPick(model: ChestPanelModel, autoPick: boolean): ChestPanelModel {
  const open =
    !autoPick && model.deposit.selectedItem && model.open === "depositNftPick"
      ? "depositNftMints"
      : autoPick && model.open === "depositNftMints"
        ? "depositNftPick"
        : model.open;
  return { ...model, open, deposit: { ...model.deposit, autoPick } };
}

export function setLowMintLock(model: ChestPanelModel, lowMintLock: boolean): ChestPanelModel {
  return { ...model, deposit: { ...model.deposit, lowMintLock } };
}

export function toggleSelectedMint(model: ChestPanelModel, tokenId: string): ChestPanelModel {
  if (
    isMintLocked(
      model.deposit.selectedItem,
      tokenId,
      model.deposit.lowMintLock,
      model.deposit.protectedMintNumbers,
    )
  ) {
    return model;
  }
  const has = model.deposit.selectedMints.includes(tokenId);
  const selectedMints = has
    ? model.deposit.selectedMints.filter((id) => id !== tokenId)
    : [...model.deposit.selectedMints, tokenId];
  return { ...model, deposit: { ...model.deposit, selectedMints, quantity: Math.max(1, selectedMints.length) } };
}

export function depositDestinationLabel(model: ChestPanelModel): string {
  return destinationContextLabel({
    destination: model.deposit.destination,
    scheduledPartyTitle: model.deposit.scheduledPartyTitle,
  });
}

export function canConfirmChestDeposit(model: ChestPanelModel): boolean {
  if (model.deposit.asset === "MANA") {
    return model.deposit.manaAmount >= model.deposit.minMana;
  }
  return canConfirmNftDeposit({
    selectedItem: model.deposit.selectedItem,
    autoPick: model.deposit.autoPick,
    selectedMints: model.deposit.selectedMints,
    quantity: model.deposit.quantity,
  });
}

export function backFromDeposit(model: ChestPanelModel): ChestPanelModel {
  if (model.open === "depositWarning") {
    return openChestRoot(model);
  }
  if (model.open === "depositNftMints") {
    return { ...model, open: "depositNftPick" };
  }
  if (model.open === "depositNftPick") {
    return { ...model, open: "deposit" };
  }
  if (model.open === "depositNft" || model.open === "depositMana") {
    return { ...model, open: "deposit" };
  }
  if (model.open === "depositStatus") {
    if (model.deposit.asset === "NFT") {
      return { ...model, open: model.deposit.selectedItem ? "depositNftPick" : "deposit" };
    }
    return { ...model, open: "depositMana" };
  }
  if (model.open === "deposit" && model.deposit.destinationReady) {
    return {
      ...model,
      deposit: {
        ...model.deposit,
        destination: "PUBLIC_ROLLING",
        scheduledPartyId: undefined,
        scheduledPartyTitle: undefined,
        destinationReady: false,
        status: "idle",
        stage: "idle",
        message: "",
        receipt: emptyDepositReceipt(),
      },
    };
  }
  if (model.open === "deposit") {
    return openChestRoot(model);
  }
  if (model.open === "hostAccess") {
    return closeChestPanel(model);
  }
  return model;
}

export function setDepositStatus(
  model: ChestPanelModel,
  status: DepositStatus,
  message: string,
): ChestPanelModel {
  const stage = normalizeDepositStage(status);
  return {
    ...model,
    open: "depositStatus",
    deposit: { ...model.deposit, status: stage, stage, message },
  };
}

export function setDepositProgress(
  model: ChestPanelModel,
  stage: DepositStage,
  message: string,
  receipt?: Partial<DepositReceipt>,
): ChestPanelModel {
  const withProgress: ChestPanelModel = {
    ...model,
    open: "depositStatus",
    deposit: {
      ...model.deposit,
      status: stage,
      stage,
      message,
      receipt: { ...model.deposit.receipt, ...receipt },
    },
  };
  if (stage !== "confirmed") {
    return withProgress;
  }
  return excludeDepositedMints(withProgress, withProgress.deposit.receipt.tokenIds ?? []);
}

function normalizeDepositStage(status: DepositStatus): DepositStage {
  if (status === "pending" || status === "confirm") {
    return "preparing";
  }
  if (status === "success") {
    return "confirmed";
  }
  if (status === "failure") {
    return "failed";
  }
  return status;
}

export function confirmDeposit(model: ChestPanelModel): ChestPanelModel {
  if (model.deposit.asset === "NFT") {
    if (!model.deposit.selectedItem) {
      return {
        ...model,
        open: "depositStatus",
        deposit: {
          ...model.deposit,
          status: "failed",
          stage: "failed",
          message: "Select a wearable or emote first.",
        },
      };
    }
    return {
      ...model,
      open: "depositStatus",
      deposit: {
        ...model.deposit,
        status: "preparing",
        stage: "preparing",
        message: "Preparing deposit",
        receipt: {
          ...emptyDepositReceipt(),
          itemName: model.deposit.selectedItem.name,
          quantity: model.deposit.quantity,
          mintLabels: model.deposit.autoPick ? undefined : model.deposit.selectedMints,
          destinationLabel:
            model.deposit.destination === "SCHEDULED_PARTY"
              ? model.deposit.scheduledPartyTitle ?? "scheduled party"
              : "Next Public Party",
          destination: model.deposit.destination,
          scheduledPartyId: model.deposit.scheduledPartyId,
        },
      },
    };
  }
  if (model.deposit.manaAmount < model.deposit.minMana) {
    return {
      ...model,
      open: "depositStatus",
      deposit: { ...model.deposit, status: "failed", stage: "failed", message: "Below current minimum." },
    };
  }
  return {
    ...model,
    open: "depositStatus",
    deposit: {
      ...model.deposit,
      status: "preparing",
      stage: "preparing",
      message: "Preparing deposit",
      receipt: {
        ...emptyDepositReceipt(),
        manaAmount: model.deposit.manaAmount,
        destinationLabel:
          model.deposit.destination === "SCHEDULED_PARTY"
            ? model.deposit.scheduledPartyTitle ?? "scheduled party"
            : "Next Public Party",
        destination: model.deposit.destination,
        scheduledPartyId: model.deposit.scheduledPartyId,
      },
    },
  };
}

export function chestPanelsAreCentered(canvas: UiCanvas = DEFAULT_UI_CANVAS): boolean {
  if (chestUiDensity(canvas) !== "desktop") {
    return false;
  }
  return (["chest", "hostAccess", "deposit"] as const).every((id) =>
    isHorizontallyCentered(chestPanelLayout(id, canvas), canvas),
  );
}
