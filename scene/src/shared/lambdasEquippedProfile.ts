import {
  authoritativeKiteView,
  equippedKiteFingerprint,
  failClosedKiteView,
  findEquippedKite,
  parseCollectionWearableIdentity,
  resolveActiveKitePerk,
  sameCollectionItem,
  type AuthoritativeKiteView,
  type ResolvedKitePerk,
} from "./kitePerks";

export const LAMBDAS_PROFILES_BASE = "https://peer.decentraland.org/lambdas/profiles";

export type LambdasEquippedSnapshot = {
  version: string;
  wearables: string[];
};

export function parseLambdasEquippedSnapshot(body: unknown): LambdasEquippedSnapshot | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }
  const avatars = (body as { avatars?: unknown[] }).avatars;
  const row = avatars?.[0];
  if (!row || typeof row !== "object") {
    return undefined;
  }
  const record = row as { version?: unknown; avatar?: { wearables?: unknown } };
  const avatar = record.avatar;
  if (!avatar || typeof avatar !== "object") {
    return undefined;
  }
  if (!Array.isArray(avatar.wearables)) {
    return undefined;
  }
  const wearables = avatar.wearables.filter((urn): urn is string => typeof urn === "string");
  return {
    version: record.version == null ? "unknown" : String(record.version),
    wearables,
  };
}

export function kiteUrnFromWearables(wearables: readonly string[]): string {
  const kite = findEquippedKite(wearables);
  if (!kite) {
    return "none";
  }
  for (const urn of wearables) {
    const identity = parseCollectionWearableIdentity(urn);
    if (identity && sameCollectionItem(kite, identity)) {
      return urn;
    }
  }
  return "none";
}

export function kiteIdFromWearables(wearables: readonly string[]): string {
  return equippedKiteFingerprint(wearables) || "none";
}

export function lambdasProfilesUrl(wallet: string): string {
  return `${LAMBDAS_PROFILES_BASE}/${encodeURIComponent(wallet)}`;
}

export type LambdasKiteProfile = {
  version: string;
  wearables: string[];
  kite: ResolvedKitePerk | undefined;
  perk: AuthoritativeKiteView;
};

export function resolveLambdasKiteProfile(body: unknown, level: number): LambdasKiteProfile | undefined {
  const snapshot = parseLambdasEquippedSnapshot(body);
  if (!snapshot) {
    return undefined;
  }
  const kite = resolveActiveKitePerk(snapshot.wearables, level);
  return {
    version: snapshot.version,
    wearables: snapshot.wearables,
    kite,
    perk: authoritativeKiteView(kite),
  };
}

export function failClosedLambdasKiteProfile(): LambdasKiteProfile {
  return {
    version: "",
    wearables: [],
    kite: undefined,
    perk: failClosedKiteView(),
  };
}

export async function fetchLambdasEquippedSnapshot(
  wallet: string,
): Promise<{ status: number; snapshot?: LambdasEquippedSnapshot; error?: string }> {
  const response = await fetch(lambdasProfilesUrl(wallet), {
    method: "GET",
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    const body = await response.text();
    return { status: response.status, error: body.slice(0, 300) };
  }
  const snapshot = parseLambdasEquippedSnapshot(await response.json());
  if (!snapshot) {
    return { status: response.status, error: "empty or unparseable body" };
  }
  return { status: response.status, snapshot };
}
