import {
  detectLocalTimeZone,
  formatClock12hPlain,
  formatCompactCountdown,
  formatPartyWhen,
  intervalsOverlap,
  isPublicDropPartyOverlapMessage,
  nextAvailablePlayableStart,
  playableInterval,
  publicDropPartyOverlapMessage,
  utcMsToZonedLocal,
  clock12hToDraftTime,
  displayDateToDraft,
  draftDateToDisplay,
  draftTimeToClock12h,
  type DayPeriod,
} from "./partyTime";

export type UnclaimedPrizePolicy = "HOST_LEFTOVERS" | "EXTRA_POOL";
import { hostCardLabel } from "./displayName";
import { loadDisplayTimeZone } from "./timezonePreference";
import type { WinView } from "./wins";
import {
  emptyLeftoverSelection,
  leftoverCreateSummaryLines,
  leftoverCardCountLabel,
  leftoverNftCountForCard,
  hostedLeftoverSummary,
  type HostLeftoverGroup,
  type LeftoverSelection,
} from "./leftoverInventory";

export type UpcomingSection = "upcoming" | "wins";

export type PartyPanelId = "none" | "upcoming" | "wins" | "mine" | "manage" | "create" | "edit" | "prizes";
export type ManagePartyTab = "details" | "prizes" | "settings";
export type UpcomingBrowseKind = "PUBLIC" | "HOSTED";

export type ScheduledPartyView = {
  partyId: string;
  partyType?: "AUTOMATIC" | "SCHEDULED";
  title: string;
  description: string;
  hostWallet?: string;
  hostDisplayName?: string;
  scheduledAt: number;
  timeZone?: string;
  localScheduledDate?: string;
  localScheduledTime?: string;
  allowCommunityContributions: boolean;
  supplementFromExtraPool: boolean;
  unclaimedPrizePolicy?: UnclaimedPrizePolicy;
  status: string;
  isContributionLocked: boolean;
  isHostRescheduleLocked: boolean;
  canCurrentUserContribute: boolean;
  canCurrentUserEdit: boolean;
  lineupLocksAt?: number;
  isLineupLocked?: boolean;
};

export type PrizePreviewCard = {
  prizeId: string;
  prizeType: "ERC721" | "MANA";
  displayName: string;
  rarity?: string;
  imageUrl?: string;
  source: "COMMUNITY" | "EXTRA_POOL" | "HOST";
  kind?: "wearable" | "emote";
};

export type PrizePreviewSection = {
  total: number;
  hasMore: boolean;
  prizes: PrizePreviewCard[];
};

export type PartyPrizePreview = {
  partyId: string;
  partyType: "AUTOMATIC" | "SCHEDULED";
  status: string;
  lineupLocksAt: number;
  isLineupLocked: boolean;
  confirmed: PrizePreviewSection & { manaBaseUnits: string };
  possible: {
    mode: "possible" | "other_pool";
    canEnterThisParty: boolean;
    community: PrizePreviewSection;
    extraPool: PrizePreviewSection | null;
    manaBaseUnits: string;
  } | null;
};

export type PartyPotSummary = {
  nftCount: number;
  hostNftCount?: number;
  communityNftCount?: number;
  claimedNftCount?: number;
  sentNftCount?: number;
  preparedPrizeCount?: number;
  manaBaseUnits?: string;
  leftoverNftCount?: number;
  unclaimedManaCount?: number;
  unclaimedItems?: string[];
};

export type ScheduledPartyPublicConfigView = {
  descriptionMaxLength: number;
  rescheduleLockMinutes: number;
  contributionLockMinutes: number;
  minLeadTimeMinutes: number;
  maxHorizonDays: number;
  productionPlayableWindowMinutes?: number;
};

export type PartyDraft = {
  title: string;
  description: string;
  timeZone: string;
  localDate: string;
  localDateInput: string;
  localTime: string;
  localTimeClock: string;
  localTimePeriod: DayPeriod;
  allowCommunityContributions: boolean;
  supplementFromExtraPool: boolean;
  unclaimedPrizePolicy: UnclaimedPrizePolicy;
};

export type ExtraPoolHostQuota = {
  used: number;
  remaining: number;
  limit: number;
  windowMs: number;
};

export type PartyPanelModel = {
  open: PartyPanelId;
  parties: ScheduledPartyView[];
  hosted: ScheduledPartyView[];
  selected: ScheduledPartyView | null;
  pot: PartyPotSummary | null;
  pots: Record<string, PartyPotSummary>;
  draft: PartyDraft;
  hostEligible: boolean;
  hostEligibilityReason: string;
  message: string;
  nowMs: number;
  config: ScheduledPartyPublicConfigView | null;
  manageTab: ManagePartyTab;
  viewerTimeZone: string;
  viewerTimeZoneIsOverride: boolean;
  timezonePickerOpen: boolean;
  prizePreview: PartyPrizePreview | null;
  prizePreviewLoading: boolean;
  prizePreviewPossibleOffset: number;
  prizePreviewExtraOffset: number;
  upcomingSection: UpcomingSection;
  wins: WinView[];
  winsLoading: boolean;
  manageHistory: WinView[];
  manageHistoryLoading: boolean;
  leftoverGroups: HostLeftoverGroup[];
  leftoverSelection: LeftoverSelection;
  extraPoolQuota?: ExtraPoolHostQuota;
  leftoverInventoryLoading: boolean;
  prizePreviewReturnOpen: "upcoming" | "mine" | "manage";
};

export function emptyDraft(nowMs = Date.now(), extraPoolOn = true): PartyDraft {
  const zone = detectLocalTimeZone();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(nowMs + 2 * 60 * 60 * 1000));
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const localTime = `${read("hour")}:${read("minute")}`;
  const clock = draftTimeToClock12h(localTime);
  return {
    title: "",
    description: "",
    timeZone: zone,
    localDate: `${read("year")}-${read("month")}-${read("day")}`,
    localDateInput: `${read("month")}-${read("day")}-${read("year")}`,
    localTime,
    localTimeClock: clock.clock,
    localTimePeriod: clock.period,
    allowCommunityContributions: true,
    supplementFromExtraPool: extraPoolOn,
    unclaimedPrizePolicy: "HOST_LEFTOVERS",
  };
}

export function clampPartyDescription(description: string, maxLength = 64): string {
  return description.length <= maxLength ? description : description.slice(0, maxLength);
}

export function clampPartyTitle(title: string, maxLength = 36): string {
  return title.length <= maxLength ? title : title.slice(0, maxLength);
}

export function createPartyPanelModel(nowMs = Date.now()): PartyPanelModel {
  const displayZone = loadDisplayTimeZone();
  return {
    open: "none",
    parties: [],
    hosted: [],
    selected: null,
    pot: null,
    pots: {},
    draft: emptyDraft(nowMs),
    hostEligible: false,
    hostEligibilityReason: "",
    message: "",
    nowMs,
    config: null,
    manageTab: "details",
    viewerTimeZone: displayZone.timeZone,
    viewerTimeZoneIsOverride: displayZone.isOverride,
    timezonePickerOpen: false,
    prizePreview: null,
    prizePreviewLoading: false,
    prizePreviewPossibleOffset: 0,
    prizePreviewExtraOffset: 0,
    upcomingSection: "upcoming",
    wins: [],
    winsLoading: false,
    manageHistory: [],
    manageHistoryLoading: false,
    leftoverGroups: [],
    leftoverSelection: emptyLeftoverSelection,
    leftoverInventoryLoading: false,
    prizePreviewReturnOpen: "upcoming",
  };
}

export function isAutomaticBrowseParty(party: ScheduledPartyView): boolean {
  return party.partyType === "AUTOMATIC";
}

export function browseTypeLabel(party: ScheduledPartyView): UpcomingBrowseKind {
  return isAutomaticBrowseParty(party) ? "PUBLIC" : "HOSTED";
}

export function contributionStateLabel(party: ScheduledPartyView): "OPEN" | "HOST ONLY" | "LOCKED" {
  if (isAutomaticBrowseParty(party)) {
    return "LOCKED";
  }
  if (party.canCurrentUserContribute) {
    if (!party.allowCommunityContributions || party.isContributionLocked) {
      return "HOST ONLY";
    }
    return "OPEN";
  }
  if (party.isContributionLocked) {
    return "LOCKED";
  }
  if (!party.allowCommunityContributions) {
    return "HOST ONLY";
  }
  return "OPEN";
}

export function canShowContribute(party: ScheduledPartyView): boolean {
  return !isAutomaticBrowseParty(party) && party.canCurrentUserContribute;
}

/** Prize preview header — hosted CONTRIBUTE plus community-open public parties. */
export function canShowDepositPrizesPreview(party: ScheduledPartyView): boolean {
  if (canShowContribute(party)) {
    return true;
  }
  return (
    party.allowCommunityContributions &&
    !party.isContributionLocked &&
    party.status !== "COMPLETED" &&
    party.status !== "CANCELLED"
  );
}

export function upcomingCardMeta(
  party: ScheduledPartyView,
  nowMs: number,
  viewerTimeZone?: string,
): string {
  const zone = viewerTimeZone || detectLocalTimeZone();
  const when = formatPartyWhen(party.scheduledAt, zone, nowMs);
  const countdown = formatCompactCountdown(party.scheduledAt, nowMs, party.status);
  if (isAutomaticBrowseParty(party)) {
    return [when, countdown].filter((part) => part.length > 0).join(" · ");
  }
  const host = hostCardLabel(party);
  return [host, when, countdown].filter((part) => part && part.length > 0).join(" · ");
}

export function hostedPrizeHistoryLabel(
  party: Pick<ScheduledPartyView, "status">,
  pot?: PartyPotSummary,
  leftoverGroup?: HostLeftoverGroup,
): string | undefined {
  if (isPastHostedParty(party.status)) {
    const leftoverNfts = leftoverNftCountForCard(pot, leftoverGroup);
    const leftoverMana = leftoverGroup?.manaBaseUnits ?? pot?.manaBaseUnits ?? "0";
    const leftoverLine = leftoverCardCountLabel(leftoverNfts, leftoverMana);
    const claimed = pot?.claimedNftCount ?? 0;
    const sent = pot?.sentNftCount ?? 0;
    const history =
      claimed > 0 || sent > 0
        ? sent > 0
          ? `${claimed} claimed · ${sent} sent`
          : `${claimed} claimed`
        : leftoverNfts === 0 && leftoverCardCountLabel(0, leftoverMana) === "0 leftovers" && (pot?.preparedPrizeCount ?? 0) > 0
          ? `${pot!.preparedPrizeCount} prizes`
          : "";
    return [leftoverLine, history].filter((part) => part.length > 0).join(" · ");
  }
  if (!pot) return undefined;
  return `${pot.nftCount} prizes`;
}

export function hostedManagePrizeCountsCopy(
  party: Pick<ScheduledPartyView, "status">,
  pot: PartyPotSummary,
): string {
  if (isPastHostedParty(party.status)) {
    const leftovers = hostedLeftoverSummary({
      nftCount: pot.leftoverNftCount ?? pot.nftCount,
      manaBaseUnits: pot.manaBaseUnits,
    });
    if (leftovers) {
      return leftovers;
    }
    return `Claimed ${pot.claimedNftCount ?? 0}  ·  Sent ${pot.sentNftCount ?? 0}  ·  In pot ${pot.nftCount}`;
  }
  return `Host ${pot.hostNftCount ?? 0}  ·  Community ${pot.communityNftCount ?? 0}  ·  Total ${(pot.nftCount ?? 0) + (pot.unclaimedManaCount ?? 0)}`;
}

export function hostedCardExtraMeta(
  party: ScheduledPartyView,
  pot?: PartyPotSummary,
  leftoverGroup?: HostLeftoverGroup,
): string {
  return [
    hostedPrizeHistoryLabel(party, pot, leftoverGroup),
    communityLabel(party.allowCommunityContributions),
    extraPoolLabel(party.supplementFromExtraPool),
  ]
    .filter((part): part is string => Boolean(part && part.length > 0))
    .join(" · ");
}

export function canOpenCreateParty(model: Pick<PartyPanelModel, "hostEligible">): boolean {
  return model.hostEligible;
}

export function isEditTimeLocked(model: PartyPanelModel): boolean {
  return model.open === "edit" && Boolean(model.selected?.isHostRescheduleLocked);
}

export function descriptionCounter(description: string, maxLength: number): string {
  return `${description.length}/${maxLength}`;
}

export function extraPoolQuotaHelper(quota?: ExtraPoolHostQuota | null): string {
  if (!quota) {
    return "You can complete 3 parties with Extra Pool items every 24 hours.";
  }
  if (quota.remaining <= 0) {
    return "Extra Pool limit reached: 3 completed parties in 24 hours.";
  }
  return `Extra Pool items: ${quota.remaining} of ${quota.limit} completed-party slots left in 24 hours.`;
}

export function canTurnOnExtraPool(model: Pick<PartyPanelModel, "extraPoolQuota">, currentlyOn: boolean): boolean {
  if (currentlyOn) {
    return true;
  }
  return (model.extraPoolQuota?.remaining ?? 1) > 0;
}

export function extraPoolLabel(on: boolean): string {
  return `Extra Pool Supplementation: ${on ? "ON" : "OFF"}`;
}

export function unclaimedPrizePolicyLabel(policy: UnclaimedPrizePolicy): string {
  return `Contribute unclaimed prizes to Extra Pool: ${policy === "EXTRA_POOL" ? "ON" : "OFF"}`;
}

export function unclaimedPrizePolicyHelper(policy: UnclaimedPrizePolicy): string {
  return policy === "EXTRA_POOL"
    ? "Unclaimed prizes are added to the public Extra Pool after the party."
    : "Unclaimed prizes return to your party inventory.";
}

export function communityLabel(on: boolean): string {
  return `Community contributions: ${on ? "ON" : "OFF"}`;
}

export function openUpcomingParties(
  model: PartyPanelModel,
  parties: ScheduledPartyView[],
  nowMs: number,
): PartyPanelModel {
  return {
    ...model,
    open: "upcoming",
    parties,
    nowMs,
    message: "",
    prizePreview: null,
    timezonePickerOpen: false,
    upcomingSection: "upcoming",
  };
}

export function setUpcomingSection(
  model: PartyPanelModel,
  section: UpcomingSection,
  wins?: WinView[],
): PartyPanelModel {
  return {
    ...model,
    upcomingSection: section,
    wins: wins ?? model.wins,
    winsLoading: false,
    message: "",
  };
}

export function openPrizePreview(
  model: PartyPanelModel,
  party: ScheduledPartyView,
  preview: PartyPrizePreview | null,
  nowMs: number,
  returnOpen: PartyPanelModel["prizePreviewReturnOpen"] = "upcoming",
): PartyPanelModel {
  return {
    ...model,
    open: "prizes",
    selected: party,
    prizePreview: preview,
    prizePreviewLoading: preview === null,
    prizePreviewPossibleOffset: 0,
    prizePreviewExtraOffset: 0,
    prizePreviewReturnOpen: returnOpen,
    nowMs,
    message: "",
  };
}

export function setPrizePreview(model: PartyPanelModel, preview: PartyPrizePreview | null): PartyPanelModel {
  return { ...model, prizePreview: preview, prizePreviewLoading: false };
}

export function setPrizePreviewOffsets(
  model: PartyPanelModel,
  offsets: { possibleOffset?: number; extraOffset?: number },
): PartyPanelModel {
  return {
    ...model,
    prizePreviewPossibleOffset: Math.max(0, offsets.possibleOffset ?? model.prizePreviewPossibleOffset),
    prizePreviewExtraOffset: Math.max(0, offsets.extraOffset ?? model.prizePreviewExtraOffset),
    prizePreviewLoading: true,
  };
}

export function setViewerTimeZone(
  model: PartyPanelModel,
  timeZone: string,
  isOverride = true,
): PartyPanelModel {
  return {
    ...model,
    viewerTimeZone: timeZone,
    viewerTimeZoneIsOverride: isOverride,
    timezonePickerOpen: false,
  };
}

export function toggleTimezonePicker(model: PartyPanelModel): PartyPanelModel {
  return { ...model, timezonePickerOpen: !model.timezonePickerOpen };
}

/** @deprecated Use openUpcomingParties. */
export function openPartyList(
  model: PartyPanelModel,
  parties: ScheduledPartyView[],
  nowMs: number,
): PartyPanelModel {
  return openUpcomingParties(model, parties, nowMs);
}

export function openMyWins(
  model: PartyPanelModel,
  wins: WinView[],
  nowMs: number,
): PartyPanelModel {
  return {
    ...model,
    open: "wins",
    wins,
    winsLoading: false,
    nowMs,
    message: "",
  };
}

export function backToMyParties(model: PartyPanelModel): PartyPanelModel {
  return { ...model, open: "mine", message: "" };
}

export const MANAGE_POT_PRIZES_HEADING = "IN THE POT";
export const MANAGE_LIVE_PRIZES_HEADING = "STILL IN PLAY";
export const MANAGE_NO_POT_PRIZES = "No prizes in this pot yet.";
export const MANAGE_NO_CLAIMS_YET = "No prizes claimed yet.";

export function isPastHostedParty(status: string): boolean {
  return status === "COMPLETED" || status === "CANCELLED";
}

export function isHostedPartyLocked(status: string): boolean {
  return (
    status === "LOCKING" ||
    status === "LOCKED" ||
    status === "ACTIVE" ||
    status === "SETTLING" ||
    isPastHostedParty(status)
  );
}

export function canHostEditParty(party: Pick<ScheduledPartyView, "canCurrentUserEdit" | "status">): boolean {
  return party.canCurrentUserEdit && !isHostedPartyLocked(party.status);
}

export function canHostAddPrizes(
  party: Pick<ScheduledPartyView, "canCurrentUserContribute" | "canCurrentUserEdit" | "status">,
): boolean {
  if (isHostedPartyLocked(party.status)) {
    return false;
  }
  return party.canCurrentUserContribute || party.canCurrentUserEdit;
}

export function sortMyHostedParties<T extends { scheduledAt: number; status: string }>(rows: readonly T[]): T[] {
  const upcoming = rows.filter((row) => !isPastHostedParty(row.status)).sort((a, b) => a.scheduledAt - b.scheduledAt);
  const past = rows.filter((row) => isPastHostedParty(row.status)).sort((a, b) => b.scheduledAt - a.scheduledAt);
  return [...upcoming, ...past];
}

export function hostedPartyStatusLabel(status: string): "COMPLETED" | "CANCELLED" | undefined {
  if (status === "CANCELLED") return "CANCELLED";
  if (status === "COMPLETED") return "COMPLETED";
  return undefined;
}

export function openMyParties(
  model: PartyPanelModel,
  hosted: ScheduledPartyView[],
  nowMs: number,
  pots?: Record<string, PartyPotSummary>,
): PartyPanelModel {
  const sorted = sortMyHostedParties(hosted);
  return {
    ...model,
    open: "mine",
    hosted: sorted,
    parties: sorted,
    pots: pots ?? model.pots,
    nowMs,
    message: "",
  };
}

export function openManageParty(
  model: PartyPanelModel,
  party: ScheduledPartyView,
  nowMs: number,
  pot?: PartyPotSummary | null,
): PartyPanelModel {
  return {
    ...model,
    open: "manage",
    selected: party,
    pot: pot ?? model.pots[party.partyId] ?? null,
    nowMs,
    message: "",
    manageTab: "details",
    manageHistory: [],
    manageHistoryLoading: false,
    prizePreview: null,
    prizePreviewLoading: false,
  };
}

export function applyManagePartyPot(model: PartyPanelModel, partyId: string, pot: PartyPotSummary): PartyPanelModel {
  return {
    ...model,
    pot: model.selected?.partyId === partyId ? pot : model.pot,
    pots: { ...model.pots, [partyId]: pot },
  };
}

export function managePrizesShowConfirmedPreview(status: string): boolean {
  return (
    status !== "ACTIVE" &&
    status !== "SETTLING" &&
    status !== "COMPLETED" &&
    status !== "CANCELLED"
  );
}

export function openPartyCreate(
  model: PartyPanelModel,
  nowMs: number,
  leftovers?: { groups?: HostLeftoverGroup[]; selection?: LeftoverSelection },
): PartyPanelModel {
  return {
    ...model,
    open: "create",
    draft: emptyDraft(nowMs, (model.extraPoolQuota?.remaining ?? 1) > 0),
    nowMs,
    message: "",
    leftoverGroups: leftovers?.groups ?? model.leftoverGroups,
    leftoverSelection: leftovers?.selection ?? emptyLeftoverSelection,
  };
}

export function openPartyEdit(model: PartyPanelModel, party: ScheduledPartyView, nowMs: number): PartyPanelModel {
  const zone = detectLocalTimeZone();
  const local = utcMsToZonedLocal(party.scheduledAt, zone);
  const clock = draftTimeToClock12h(local.time);
  return {
    ...model,
    open: "edit",
    selected: party,
    nowMs,
    message: "",
    draft: {
      title: party.title,
      description: party.description,
      timeZone: zone,
      localDate: local.date,
      localDateInput: draftDateToDisplay(local.date),
      localTime: local.time,
      localTimeClock: clock.clock,
      localTimePeriod: clock.period,
      allowCommunityContributions: party.allowCommunityContributions,
      supplementFromExtraPool: party.supplementFromExtraPool,
      unclaimedPrizePolicy: party.unclaimedPrizePolicy ?? "HOST_LEFTOVERS",
    },
  };
}

export function closePartyPanel(model: PartyPanelModel): PartyPanelModel {
  return { ...model, open: "none", message: "", prizePreview: null, timezonePickerOpen: false };
}

export function dismissOpenPartyUi(model: PartyPanelModel): PartyPanelModel {
  return model.open === "none" ? model : closePartyPanel(model);
}

export function closePrizePreview(model: PartyPanelModel): PartyPanelModel {
  const open = model.prizePreviewReturnOpen === "upcoming" ? "upcoming" : model.prizePreviewReturnOpen;
  return {
    ...model,
    open,
    prizePreview: null,
    prizePreviewLoading: false,
    message: "",
  };
}

export function publicOverlapMessageForDraft(model: PartyPanelModel): string {
  if (model.open !== "create" && model.open !== "edit") {
    return "";
  }
  if (model.open === "edit" && model.selected?.isHostRescheduleLocked) {
    return "";
  }
  const windowMinutes = model.config?.productionPlayableWindowMinutes;
  if (!windowMinutes || !model.draft.localDate || !model.draft.localTime) {
    return "";
  }
  const hostedStart = Date.parse(`${model.draft.localDate}T${model.draft.localTime}:00`);
  if (!Number.isFinite(hostedStart)) {
    return "";
  }
  const windowMs = windowMinutes * 60_000;
  const hosted = playableInterval(hostedStart, windowMs);
  const reserved = [];
  for (const party of model.parties) {
    if (model.open === "edit" && model.selected?.partyId === party.partyId) {
      continue;
    }
    if (party.status === "COMPLETED" || party.status === "CANCELLED") {
      continue;
    }
    reserved.push(playableInterval(party.scheduledAt, windowMs));
  }
  if (!reserved.some((interval) => intervalsOverlap(hosted, interval))) {
    return "";
  }
  const nextAt = nextAvailablePlayableStart(hostedStart, windowMs, reserved);
  return publicDropPartyOverlapMessage(
    nextAt !== undefined ? formatClock12hPlain(nextAt, model.viewerTimeZone) : undefined,
  );
}

export function applyPublicOverlapMessage(model: PartyPanelModel): PartyPanelModel {
  const overlap = publicOverlapMessageForDraft(model);
  if (overlap) {
    return { ...model, message: overlap };
  }
  if (isPublicDropPartyOverlapMessage(model.message)) {
    return { ...model, message: "" };
  }
  return model;
}

export function setPartyDraft(model: PartyPanelModel, patch: Partial<PartyDraft>): PartyPanelModel {
  if (patch.supplementFromExtraPool === true && !canTurnOnExtraPool(model, model.draft.supplementFromExtraPool)) {
    return { ...model, message: extraPoolQuotaHelper(model.extraPoolQuota) };
  }
  const draft: PartyDraft = { ...model.draft, ...patch };
  if (patch.title !== undefined) {
    draft.title = clampPartyTitle(patch.title);
  }
  if (patch.description !== undefined) {
    draft.description = clampPartyDescription(
      patch.description,
      model.config?.descriptionMaxLength ?? 64,
    );
  }
  if (patch.localDate !== undefined && patch.localDateInput === undefined) {
    draft.localDateInput = draftDateToDisplay(draft.localDate);
  } else if (patch.localDateInput !== undefined) {
    const converted = displayDateToDraft(draft.localDateInput);
    if (converted) {
      draft.localDate = converted;
    }
  }
  if (
    patch.localTime !== undefined &&
    patch.localTimeClock === undefined &&
    patch.localTimePeriod === undefined
  ) {
    const parsed = draftTimeToClock12h(draft.localTime);
    draft.localTimeClock = parsed.clock;
    draft.localTimePeriod = parsed.period;
  } else if (patch.localTimeClock !== undefined || patch.localTimePeriod !== undefined) {
    const converted = clock12hToDraftTime(draft.localTimeClock, draft.localTimePeriod);
    if (converted) {
      draft.localTime = converted;
    }
  }
  return applyPublicOverlapMessage({ ...model, draft });
}

export function setPartyNow(model: PartyPanelModel, nowMs: number): PartyPanelModel {
  return { ...model, nowMs };
}

export function setPartyConfig(
  model: PartyPanelModel,
  config: ScheduledPartyPublicConfigView,
): PartyPanelModel {
  return { ...model, config };
}

export function setManageTab(model: PartyPanelModel, manageTab: ManagePartyTab): PartyPanelModel {
  return { ...model, manageTab };
}

export function setManageHistory(model: PartyPanelModel, manageHistory: WinView[]): PartyPanelModel {
  return { ...model, manageHistory, manageHistoryLoading: false };
}

export function setLeftoverInventory(
  model: PartyPanelModel,
  groups: HostLeftoverGroup[],
  selection?: LeftoverSelection,
): PartyPanelModel {
  return {
    ...model,
    leftoverGroups: groups,
    leftoverSelection: selection ?? model.leftoverSelection,
    leftoverInventoryLoading: false,
  };
}

export function setLeftoverSelection(model: PartyPanelModel, leftoverSelection: LeftoverSelection): PartyPanelModel {
  return { ...model, leftoverSelection };
}

export function leftoverCreatePreviewCopy(model: PartyPanelModel): string[] {
  return leftoverCreateSummaryLines(model.leftoverGroups, model.leftoverSelection);
}

export function setHostEligible(
  model: PartyPanelModel,
  eligible: boolean,
  reason = "",
): PartyPanelModel {
  return { ...model, hostEligible: eligible, hostEligibilityReason: reason };
}

export function setExtraPoolQuota(model: PartyPanelModel, extraPoolQuota: ExtraPoolHostQuota): PartyPanelModel {
  return { ...model, extraPoolQuota };
}

export function hostCardLines(
  party: ScheduledPartyView,
  nowMs: number,
  pot: PartyPotSummary | undefined,
  formatCountdown: (scheduledAt: number, now: number, status?: string) => string,
): string[] {
  const lines = [
    party.title,
    party.description || "",
    formatPartyWhen(party.scheduledAt, detectLocalTimeZone(), nowMs),
    formatCountdown(party.scheduledAt, nowMs, party.status),
    party.status,
    communityLabel(party.allowCommunityContributions),
    extraPoolLabel(party.supplementFromExtraPool),
  ];
  if (pot) {
    lines.push(hostedManagePrizeCountsCopy(party, pot));
  }
  return lines.filter((line) => line.length > 0);
}
