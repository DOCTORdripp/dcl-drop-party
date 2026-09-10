/**
 * Thin HTTP client for scheduled-party Convex endpoints.
 * Eligibility, validation, and locking stay on the backend.
 */

import { CONVEX_SITE_URL } from "../../shared/constants";
import { signedConvexPost } from "../signedConvex";
import type { HostRequiredWearable } from "../../shared/hostAccess";
import type { PartyPotSummary, PartyPrizePreview, ScheduledPartyView } from "../../shared/partyPanels";
import type { HostLeftoverGroup } from "../../shared/leftoverInventory";
import type { WinView } from "../../shared/wins";

export type ScheduledPartyPublicConfig = {
  enabled: boolean;
  maxHorizonDays: number;
  minLeadTimeMinutes: number;
  contributionLockMinutes: number;
  rescheduleLockMinutes: number;
  maxFuturePartiesPerHost: number;
  descriptionMaxLength: number;
  hostEligibilityEnabled: boolean;
  productionPlayableWindowMinutes?: number;
};

async function postJson<T>(path: string, body: unknown): Promise<T> {
  return await signedConvexPost<T>(path, body);
}

export async function fetchScheduledPartyConfig(): Promise<ScheduledPartyPublicConfig | null> {
  const res = await fetch(`${CONVEX_SITE_URL.replace(/\/$/, "")}/scheduled-parties/config`);
  if (!res.ok) return null;
  return (await res.json()) as ScheduledPartyPublicConfig;
}

export async function fetchHostRequirements(): Promise<{ requiredWearables: HostRequiredWearable[] }> {
  try {
    const res = await fetch(`${CONVEX_SITE_URL.replace(/\/$/, "")}/scheduled-parties/host-requirements`);
    if (!res.ok) return { requiredWearables: [] };
    return (await res.json()) as { requiredWearables: HostRequiredWearable[] };
  } catch {
    return { requiredWearables: [] };
  }
}

export async function fetchUpcomingParties(wallet?: string): Promise<{
  parties: ScheduledPartyView[];
  nowMs: number;
}> {
  return await postJson("/scheduled-parties/upcoming", { wallet, limit: 25 });
}

export async function fetchPartyPrizePreview(
  partyId: string,
  args?: { possibleOffset?: number; extraOffset?: number; limit?: number },
): Promise<PartyPrizePreview | null> {
  return await postJson("/scheduled-parties/prize-preview", {
    partyId,
    possibleOffset: args?.possibleOffset,
    extraOffset: args?.extraOffset,
    limit: args?.limit,
  });
}

export async function fetchContributionTargets(wallet: string): Promise<{
  targets: ScheduledPartyView[];
  nextPublicPartyAt?: number;
  nowMs: number;
}> {
  return await postJson("/scheduled-parties/contribution-targets", { wallet });
}

export async function checkHostEligibility(wallet: string, ownedItemUrns: string[]): Promise<{
  eligible: boolean;
  reason: string;
  requiredWearables?: HostRequiredWearable[];
}> {
  return await postJson("/scheduled-parties/eligibility", { wallet, ownedItemUrns });
}

export async function fetchExtraPoolHostQuota(wallet: string): Promise<{
  used: number;
  remaining: number;
  limit: number;
  windowMs: number;
}> {
  return await postJson("/scheduled-parties/extra-pool-quota", { wallet });
}

export async function createScheduledParty(body: Record<string, unknown>): Promise<{ _id: string }> {
  return await postJson("/scheduled-parties/create", body);
}

export async function editScheduledParty(body: Record<string, unknown>): Promise<{ _id: string }> {
  return await postJson("/scheduled-parties/edit", body);
}

export async function fetchHostedParties(wallet: string): Promise<{
  parties: ScheduledPartyView[];
  pots: Record<string, PartyPotSummary>;
  nowMs: number;
}> {
  return await postJson("/scheduled-parties/hosted", { wallet });
}

export async function fetchHostLeftovers(
  wallet: string,
  scheduledPartyId?: string,
): Promise<{ groups: HostLeftoverGroup[] }> {
  return await postJson("/scheduled-parties/leftovers", { wallet, scheduledPartyId });
}

export async function assignLeftoversToParty(body: {
  wallet: string;
  prizeIds: string[];
  includeManaFromPartyIds?: string[];
  targetPartyId?: string;
  destination: "PUBLIC_ROLLING" | "SCHEDULED_PARTY";
}): Promise<{ moved: number }> {
  return await postJson("/scheduled-parties/assign-leftovers", body);
}

export async function createScheduledPartyFromLeftovers(body: Record<string, unknown>): Promise<{ _id: string }> {
  return await postJson("/scheduled-parties/create-from-leftovers", body);
}

export async function fetchScheduledPartyPot(partyId: string): Promise<PartyPotSummary> {
  return await postJson("/scheduled-parties/pot", { partyId });
}

export type SceneRuntimeConfig = {
  vaultMode: "development" | "production";
  activeVaultAddress: string;
  chainId: number;
};

export async function fetchWins(args?: {
  wallet?: string;
  partyId?: string;
  limit?: number;
}): Promise<{ partyId: string | null; wins: WinView[] }> {
  return await postJson("/wins", {
    wallet: args?.wallet,
    partyId: args?.partyId,
    limit: args?.limit,
  });
}

export async function fetchSceneRuntime(): Promise<SceneRuntimeConfig | null> {
  const res = await fetch(`${CONVEX_SITE_URL.replace(/\/$/, "")}/scene-runtime`);
  if (!res.ok) return null;
  return (await res.json()) as SceneRuntimeConfig;
}
