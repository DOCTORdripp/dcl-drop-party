/**
 * Deposit Chest root navigation. Presentation only — Convex decides legality.
 */

export type ChestRootButtonId = "deposit" | "upcoming" | "wins" | "mine";

export type ChestRootButton = {
  id: ChestRootButtonId;
  label: string;
  enabled: boolean;
  hint?: string;
};

export const CHEST_ROOT_DISMISS_ICON = "×";
export const CHEST_ROOT_LAYOUT = "grid-2x2" as const;
export const CHEST_ROOT_TILE_ORDER: readonly ChestRootButtonId[] = [
  "upcoming",
  "deposit",
  "wins",
  "mine",
];

/** Inner card is 516px after RmCard padding; two tiles + gap stay centered. */
export const CHEST_ROOT_TILE_SIZE = 220;
export const CHEST_ROOT_TILE_GAP = 12;
export const CHEST_ROOT_TILE_PAD = 10;
export const CHEST_ROOT_ICON_SIZE = 148;
export const CHEST_ROOT_LABEL_MIN_HEIGHT = 36;

export const CHEST_ROOT_ICON_SRC: Record<ChestRootButtonId, string> = {
  deposit: "assets/images/icon_deposit.png",
  upcoming: "assets/images/icon_upcomingParties.png",
  wins: "assets/images/icon_myWins.png",
  mine: "assets/images/icon_myParties.png",
};

export type DepositPickerTileId = "wearable" | "emote" | "MANA";
export const DEPOSIT_PICKER_ICON_SRC: Record<DepositPickerTileId, string> = {
  wearable: "assets/images/icon_depositWearables.png",
  emote: "assets/images/icon_depositEmotes.png",
  MANA: "assets/images/icon_depositMana.png",
};
export const DEPOSIT_TYPE_TILES: readonly { id: DepositPickerTileId; label: string }[] = [
  { id: "wearable", label: "Wearables" },
  { id: "emote", label: "Emotes" },
  { id: "MANA", label: "Mana" },
];

export function depositPickerTileSrc(id: DepositPickerTileId): string {
  return DEPOSIT_PICKER_ICON_SRC[id];
}

export const DEPOSIT_HEADING = "DEPOSIT";

export function chestRootTitle(): string {
  return "DROP PARTY DEPOSIT CHEST";
}

export function chestScreenShowsBackArrow(open: string): boolean {
  return open !== "none" && open !== "chest";
}

export function chestScreenShowsDismissX(open: string): boolean {
  void open;
  return false;
}

/** Main Deposit Chest no longer summarizes global prize inventory. */
export function chestRootInventorySummary(): string | undefined {
  return undefined;
}

export function chestRootShowsViewPrizes(): boolean {
  return false;
}

export function chestRootShowsCloseButton(): boolean {
  return false;
}

export function chestRootTileSrc(id: ChestRootButtonId): string {
  return CHEST_ROOT_ICON_SRC[id];
}

export function chestRootButtons(): ChestRootButton[] {
  return [
    { id: "upcoming", label: "UPCOMING PARTIES", enabled: true },
    { id: "deposit", label: "DEPOSIT", enabled: true },
    { id: "wins", label: "MY WINS", enabled: true },
    { id: "mine", label: "MY PARTIES", enabled: true },
  ];
}

/** Explicit 2-column rows — do not rely on flex-wrap. */
export function chestRootTileRows<T>(tiles: readonly T[]): [T, T][] {
  const rows: [T, T][] = [];
  for (let i = 0; i + 1 < tiles.length; i += 2) {
    rows.push([tiles[i], tiles[i + 1]]);
  }
  return rows;
}

export function chestInteractionOpensRoot(): boolean {
  return true;
}

export function npcInteractionOpensPartyManagement(): boolean {
  return false;
}
