import { formatViewerClock } from "./partyTime";

export const UPCOMING_DROP_PARTIES_HEADING = "UPCOMING DROP PARTIES";
export const UPCOMING_TAB_LABEL = "UPCOMING";
export const MY_PARTIES_HEADING = "MY PARTIES";
export const MY_WINS_TAB_LABEL = "MY WINS";
export const CREATE_PARTY_HEADING = "CREATE PARTY";
export const EDIT_PARTY_HEADING = "EDIT PARTY";
export const MANAGE_PARTY_HEADING = "MANAGE PARTY";
export const CREATE_PARTY_ACTION_LABEL = "CREATE PARTY";
export const PARTY_HEADER_TITLE_ALIGN = "middle-left" as const;
export const CREATE_PARTY_COMPACT_TAP_HEIGHT = 48;
export const PRIZE_PREVIEW_HEADING = "PRIZE PREVIEW";
export const NEXT_PARTY_CHIP = "NEXT PARTY";
export const CHANGE_TIMEZONE_LABEL = "CHANGE TIMEZONE";
export const PARTY_BACK_LABEL = "BACK";
export const PARTY_BACK_ARROW = "←";
export const CONFIRMED_EMPTY_AUTOMATIC = "No prizes locked yet.";
export const CONFIRMED_EMPTY_HOSTED = "No prizes in this pot yet.";
export const POSSIBLE_EMPTY = "None currently available.";
export const POSSIBLE_FOOTER =
  "Possible prizes are not guaranteed.\nLineup locks 5 minutes before the party.";
export const HERO_STACK_ALIGN = "middle-center" as const;
export const HERO_TITLE_ALIGN = "top-left" as const;
export const HERO_WHEN_ALIGN = "middle-left" as const;
export const VIEW_PRIZES_LABEL = "VIEW PRIZES";
export const DEPOSIT_PRIZES_LABEL = "DEPOSIT PRIZES";
export const VIEW_PRIZES_BUTTON_WIDTH = 148;
export const VIEW_PRIZES_BUTTON_HEIGHT = 40;
export const VIEW_PRIZES_BUTTON_WIDTH_COMPACT = 156;
export const VIEW_PRIZES_BUTTON_HEIGHT_COMPACT = 48;
export const VIEW_PRIZES_FONT = 13;
export const VIEW_PRIZES_FONT_COMPACT = 14;
export const BROWSE_TYPE_CHIP_PLACEMENT = "beside-title" as const;
export const TIMEZONE_ROW_LAYOUT = "inline" as const;
export const PARTY_PANELS_WITH_TIMEZONE_CHROME = [
  "upcoming",
  "prizes",
  "mine",
  "manage",
  "create",
  "edit",
] as const;
export const MAX_AUTOMATIC_EVENT_CARDS = 4;
export const MAX_EVENT_BOARD_CARDS = 8;
export const UPCOMING_VISIBLE_WITHOUT_SCROLL = 4;
/** MY PARTIES cards are taller (status chip + MANAGE / VIEW PRIZES). Four clip the list. */
export const MY_PARTIES_VISIBLE_WITHOUT_SCROLL = 3;
/** Match MANAGE / VIEW PRIZES on MY PARTIES cards (RmButton sm / touch). */
export const MY_PARTIES_ACTION_BUTTON_WIDTH = 112;
export const MY_PARTIES_ACTION_BUTTON_WIDTH_COMPACT = 128;

export function upcomingNeedsScroll(partyCount: number, compact = false): boolean {
  if (compact) {
    return partyCount > 1;
  }
  return partyCount > UPCOMING_VISIBLE_WITHOUT_SCROLL;
}

export function myPartiesNeedsScroll(hostedCount: number, compact = false): boolean {
  if (compact) {
    return hostedCount > 1;
  }
  return hostedCount > MY_PARTIES_VISIBLE_WITHOUT_SCROLL;
}

export function createPartyActionButtonSize(compact: boolean): "touch" | "sm" {
  return compact ? "touch" : "sm";
}

/** Fixed header columns — DCL Yoga cannot size `width: auto` text buttons. */
export const CREATE_PARTY_HEADER_ACTION_WIDTH = 156;
export const CREATE_PARTY_HEADER_ACTION_WIDTH_COMPACT = 168;

export function partyHeaderMetrics(
  compact: boolean,
  contentWidth = compact ? 496 : 516,
): {
  back: number;
  action: number;
  title: number;
  rowHeight: number;
  titleFont: number;
} {
  const back = compact ? 44 : 28;
  const action = compact ? CREATE_PARTY_HEADER_ACTION_WIDTH_COMPACT : CREATE_PARTY_HEADER_ACTION_WIDTH;
  const rowHeight = compact ? 48 : 36;
  const titleFont = compact ? 19 : 18;
  // First canvas read can be 0/1 before DCL reports size. Use a known panel
  // inner width so the title column is already one line on the first paint.
  const usable = contentWidth >= 200 ? contentWidth : compact ? 496 : 516;
  const title = Math.max(160, usable - back - action);
  return { back, action, title, rowHeight, titleFont };
}

export const CREATE_PARTY_DATETIME_LAYOUT = "row-50-50" as const;
export const CREATE_PARTY_TIMING_LAYOUT = "row-50-50" as const;
export const CREATE_PARTY_TIME_FIELD_WIDTH = 108;
export const CREATE_PARTY_PERIOD_BUTTON_WIDTH = 44;
export const PARTY_DESCRIPTION_MAX_LENGTH = 64;
export const PARTY_TITLE_MAX_LENGTH = 36;

/** Desktop create/edit fits until leftover inventory is listed. Compact always scrolls. */
export function createPartyFormNeedsScroll(compact: boolean, leftoverGroupCount = 0): boolean {
  return compact || leftoverGroupCount > 0;
}

/** Details is a few short lines; description is capped so it does not force a scrollbar. */
export function manageTabNeedsScroll(tab: string, description = ""): boolean {
  if (tab !== "details") return false;
  return description.length > PARTY_DESCRIPTION_MAX_LENGTH;
}

/** Shared Input size for Create Party and Deposit so typed text stays readable. */
export function createPartyFieldSize(compact: boolean): "md" | "lg" {
  return compact ? "md" : "lg";
}

/** 4-column tiles; each preview section fits one row before it scrolls. */
export const PRIZE_PREVIEW_COLS = 4;
export const PRIZE_PREVIEW_SECTION_VISIBLE_WITHOUT_SCROLL = 4;
export const PRIZE_PREVIEW_FOOTER_PLACEMENT = "above-back" as const;

export function prizePreviewNeedsScroll(visiblePrizeCount: number): boolean {
  return visiblePrizeCount > PRIZE_PREVIEW_SECTION_VISIBLE_WITHOUT_SCROLL;
}

export function prizePreviewStackKey(card: {
  source: string;
  kind?: string;
  displayName: string;
  rarity?: string;
  imageUrl?: string;
}): string {
  return [
    card.source,
    card.kind ?? "",
    card.displayName.trim().toLowerCase(),
    (card.rarity ?? "").trim().toLowerCase(),
    card.imageUrl ?? "",
  ].join("|");
}

export function stackPrizePreviewCards<T extends {
  source: string;
  kind?: string;
  displayName: string;
  rarity?: string;
  imageUrl?: string;
}>(cards: T[]): Array<T & { qty: number }> {
  const stacked: Array<T & { qty: number }> = [];
  const indexByKey = new Map<string, number>();
  for (const card of cards) {
    const key = prizePreviewStackKey(card);
    const existing = indexByKey.get(key);
    if (existing === undefined) {
      indexByKey.set(key, stacked.length);
      stacked.push({ ...card, qty: 1 });
      continue;
    }
    stacked[existing]!.qty += 1;
  }
  return stacked;
}

export function prizePreviewQtyLabel(qty: number): string | undefined {
  return qty > 1 ? `x${qty}` : undefined;
}

export type EventBoardParty = {
  partyType?: string;
  title: string;
  description: string;
  localScheduledTime?: string;
  scheduledAt: number;
  status?: string;
};

export function upcomingDisplayTitle(party: EventBoardParty): string {
  if (party.partyType !== "AUTOMATIC") {
    return party.title;
  }
  if (party.localScheduledTime === "05:00") return "SUNRISE DROP PARTY";
  if (party.localScheduledTime === "17:00") return "SUNSET DROP PARTY";
  return "PUBLIC DROP PARTY";
}

export function upcomingDisplayDescription(party: EventBoardParty): string {
  if (party.partyType === "AUTOMATIC") return "Public Drop Party";
  return party.description || "No description";
}

export function operationalStatusChip(status: string): string | undefined {
  if (status === "LOCKING") return "LOCKING";
  if (status === "ACTIVE" || status === "SETTLING") return "LIVE";
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "CANCELLED") return "CANCELLED";
  return undefined;
}

/** MY PARTIES chip: lifecycle, not contribution OPEN/HOST ONLY/LOCKED. */
export function myPartiesStatusChip(status: string): string {
  return operationalStatusChip(status) ?? "UPCOMING";
}

export const MY_PARTIES_UPCOMING_HEADING = "UPCOMING";
export const MY_PARTIES_COMPLETED_HEADING = "COMPLETED";
export const MY_PARTIES_EMPTY = "No parties yet.";

export function selectUpcomingEventBoard<T extends EventBoardParty>(parties: readonly T[]): T[] {
  const sorted = [...parties].sort((a, b) => a.scheduledAt - b.scheduledAt);
  const hosted = sorted.filter((row) => row.partyType !== "AUTOMATIC");
  const automatic = sorted.filter((row) => row.partyType === "AUTOMATIC").slice(0, MAX_AUTOMATIC_EVENT_CARDS);
  const merged = [...hosted, ...automatic].sort((a, b) => a.scheduledAt - b.scheduledAt);
  if (merged.length <= MAX_EVENT_BOARD_CARDS) {
    return merged;
  }
  const next = merged[0];
  const rest = merged.slice(1);
  const out = next ? [next] : [];
  for (const row of rest) {
    if (out.length >= MAX_EVENT_BOARD_CARDS) break;
    out.push(row);
  }
  return out.sort((a, b) => a.scheduledAt - b.scheduledAt);
}

export function upcomingBrowseShowsManage(): boolean {
  return false;
}

export function possiblePrizesHeading(mode: "possible" | "other_pool"): string {
  return mode === "other_pool" ? "OTHER PRIZES IN THE POOL" : "POSSIBLE PRIZES";
}

export function viewerTimeLabel(nowMs: number, timeZone: string): string {
  return `Your time: ${formatViewerClock(nowMs, timeZone)} · ${timeZone}`;
}

export function partyScreenShowsDismissX(open: string): boolean {
  void open;
  return false;
}

export function confirmedHeading(total: number): string {
  return `CONFIRMED PRIZES · ${total}`;
}

export function possibleCountHeading(total: number): string {
  return total > 0 ? `POSSIBLE PRIZES · ${total}` : "POSSIBLE PRIZES";
}

export function possibleSourceSublabel(kind: "community" | "extra", total: number): string {
  return kind === "extra" ? `EXTRA POOL · ${total}` : `COMMUNITY · ${total}`;
}

export const POSSIBLE_SOURCE_PIPE = "|";

export type PossibleSourcePart = { kind: "community" | "extra" | "pipe"; text: string };

export function mixedPossibleSourceParts(communityTotal: number, extraTotal: number): PossibleSourcePart[] {
  return [
    { kind: "community", text: possibleSourceSublabel("community", communityTotal) },
    { kind: "pipe", text: ` ${POSSIBLE_SOURCE_PIPE} ` },
    { kind: "extra", text: possibleSourceSublabel("extra", extraTotal) },
  ];
}

export function prizeSourceChip(source: "COMMUNITY" | "EXTRA_POOL" | "HOST"): string {
  if (source === "EXTRA_POOL") return "EXTRA";
  if (source === "HOST") return "HOST";
  return "COMMUNITY";
}

export type PrizePreviewCopy = {
  heading: string;
  title: string;
  when: string;
  startsIn: string;
  confirmedHeading: string;
  confirmedEmpty: string;
  possibleHeading?: string;
  possibleEmpty?: string;
  possibleFooter?: string;
  align: "middle-center";
};

export function buildPrizePreviewCopy(args: {
  partyType: "AUTOMATIC" | "SCHEDULED";
  title: string;
  when: string;
  startsIn: string;
  confirmedTotal: number;
  possibleMode: "possible" | "other_pool" | null;
  possibleTotal: number;
}): PrizePreviewCopy {
  const confirmedEmpty =
    args.confirmedTotal > 0
      ? ""
      : args.partyType === "AUTOMATIC"
        ? CONFIRMED_EMPTY_AUTOMATIC
        : CONFIRMED_EMPTY_HOSTED;
  const copy: PrizePreviewCopy = {
    heading: PRIZE_PREVIEW_HEADING,
    title: args.title,
    when: args.when,
    startsIn: args.startsIn,
    confirmedHeading: confirmedHeading(args.confirmedTotal),
    confirmedEmpty,
    align: "middle-center",
  };
  if (args.possibleMode === "possible") {
    copy.possibleHeading = possibleCountHeading(args.possibleTotal);
    if (args.possibleTotal === 0) {
      copy.possibleEmpty = POSSIBLE_EMPTY;
    }
    copy.possibleFooter = POSSIBLE_FOOTER;
  } else if (args.possibleMode === "other_pool") {
    copy.possibleHeading = possiblePrizesHeading("other_pool");
    if (args.possibleTotal === 0) {
      copy.possibleEmpty = POSSIBLE_EMPTY;
    }
  }
  return copy;
}

export function prizePreviewLockMentionCount(copy: PrizePreviewCopy): number {
  return [copy.confirmedEmpty, copy.possibleEmpty, copy.possibleFooter]
    .filter(Boolean)
    .join("\n")
    .match(/locks/gi)?.length ?? 0;
}

export function formatManaAmount(baseUnits: string): string {
  try {
    const raw = BigInt(baseUnits);
    if (raw === 0n) return "";
    const step = 10n ** 17n;
    const tenths = raw / step;
    if (tenths === 0n) return "";
    const whole = tenths / 10n;
    const tenth = tenths % 10n;
    return tenth === 0n ? `${whole} MANA` : `${whole}.${tenth} MANA`;
  } catch {
    return "";
  }
}

export const MANA_PRIZE_CHIP = "MANA";

/** Digits shown on the MANA prize tile (drops the trailing unit). */
export function manaPrizeAmountText(formatted: string): string {
  return formatted.replace(/^Possible MANA Pool:\s*/i, "").replace(/\s*MANA\s*$/i, "").trim();
}

export function formatPossibleManaPool(baseUnits: string): string {
  const amount = formatManaAmount(baseUnits);
  return amount ? `Possible MANA Pool: ${amount}` : "";
}
