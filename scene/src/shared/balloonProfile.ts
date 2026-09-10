import { applyBalloonXp, levelFromXp, xpForNextLevel } from "./balloonXpCurve";

export const BALLOON_PROFILE_VERSION = 1;
export const BALLOON_PROFILE_KEY = "balloon";
export const BALLOON_LEADERBOARD_KEY = "balloonLeaderboard";
/** Scene/world storage key so carried balloons survive a reload. Player storage does not. */
export function balloonProfileSceneKey(wallet: string): string {
  return `balloonProfile_${wallet.trim().toLowerCase()}`;
}
export const BALLOON_INTERVAL_MS = 120_000;
/** Default effective carrying capacity with no active kite perk. */
export const MAX_CARRIED_BALLOONS = 10;
/** Highest kite capacity; persisted carried balloons may be 0..this, including over-cap vs current effective cap. */
export const MAX_PERSISTED_CARRIED_BALLOONS = 20;
export const NPC_GREETING_MS = 5_000;
export const LEADERBOARD_SIZE = 25;
export const MEANINGFUL_BLOW_MOVE_EPSILON_METERS = 0.05;

export type BalloonProfile = {
  version: typeof BALLOON_PROFILE_VERSION;
  employed: boolean;
  hiredAt?: number;
  carriedBalloons: number;
  lifetimeBalloons: number;
  balloonPoints: number;
  xp: number;
  level: number;
  onboardingComplete: boolean;
  redeemedCounts: Record<string, number>;
};

export type BalloonLeaderboardEntry = {
  wallet: string;
  name: string;
  xp: number;
  lifetimeBalloons: number;
};

export type BalloonLeaderboard = {
  version: 1;
  updatedAt: number;
  entries: BalloonLeaderboardEntry[];
};

export function emptyBalloonProfile(): BalloonProfile {
  return {
    version: BALLOON_PROFILE_VERSION,
    employed: false,
    carriedBalloons: 0,
    lifetimeBalloons: 0,
    balloonPoints: 0,
    xp: 0,
    level: 1,
    onboardingComplete: false,
    redeemedCounts: {},
  };
}

function readNonNegInt(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return fallback;
  }
  return value;
}

function readRedeemedCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") {
    return {};
  }
  const counts: Record<string, number> = {};
  for (const [key, count] of Object.entries(value as Record<string, unknown>)) {
    if (typeof count === "number" && Number.isInteger(count) && count >= 0) {
      counts[key] = count;
    }
  }
  return counts;
}

/**
 * DCL Storage values are strings. Preview may also return a raw object
 * or an extra `{ value }` wrapper from list/get.
 */
export function unwrapStoredJson(raw: unknown): unknown {
  let current = raw;
  for (let depth = 0; depth < 3; depth++) {
    if (current == null) {
      return null;
    }
    if (typeof current === "string") {
      const text = current.trim();
      if (!text) {
        return null;
      }
      try {
        current = JSON.parse(text);
        continue;
      } catch {
        return null;
      }
    }
    if (
      typeof current === "object" &&
      current !== null &&
      "value" in current &&
      !("employed" in current) &&
      !("entries" in current)
    ) {
      current = (current as { value: unknown }).value;
      continue;
    }
    return current;
  }
  return current;
}

export function encodeBalloonProfile(profile: BalloonProfile): string {
  return JSON.stringify(cloneBalloonProfile(profile));
}

export function decodeStoredBalloonProfile(raw: unknown): BalloonProfile {
  return parseBalloonProfile(unwrapStoredJson(raw));
}

export function encodeBalloonLeaderboard(board: BalloonLeaderboard): string {
  return JSON.stringify(board);
}

export function decodeStoredBalloonLeaderboard(raw: unknown): BalloonLeaderboard {
  return parseBalloonLeaderboard(unwrapStoredJson(raw));
}

export function parseBalloonProfile(raw: unknown): BalloonProfile {
  const fallback = emptyBalloonProfile();
  if (!raw || typeof raw !== "object") {
    return fallback;
  }
  const row = raw as Record<string, unknown>;
  const xp = readNonNegInt(row.xp, 0);
  return {
    version: BALLOON_PROFILE_VERSION,
    employed: row.employed === true,
    hiredAt: typeof row.hiredAt === "number" && Number.isFinite(row.hiredAt) ? row.hiredAt : undefined,
    carriedBalloons: Math.min(MAX_PERSISTED_CARRIED_BALLOONS, readNonNegInt(row.carriedBalloons, 0)),
    lifetimeBalloons: readNonNegInt(row.lifetimeBalloons, 0),
    balloonPoints: readNonNegInt(row.balloonPoints, 0),
    xp,
    level: levelFromXp(xp),
    onboardingComplete: row.onboardingComplete === true,
    redeemedCounts: readRedeemedCounts(row.redeemedCounts),
  };
}

export function cloneBalloonProfile(profile: BalloonProfile): BalloonProfile {
  return {
    ...profile,
    redeemedCounts: { ...profile.redeemedCounts },
  };
}

export function completeOneBalloon(
  profile: BalloonProfile,
  socialBonusXp = 0,
  kiteBonusXp = 0,
  capacity = MAX_CARRIED_BALLOONS,
): {
  profile: BalloonProfile;
  awardedXp: number;
} {
  if (profile.carriedBalloons >= capacity) {
    throw new Error("CARRIED_FULL");
  }
  const award = applyBalloonXp(profile.xp, profile.level, socialBonusXp, kiteBonusXp);
  return {
    awardedXp: award.awardedXp,
    profile: {
      ...profile,
      carriedBalloons: profile.carriedBalloons + 1,
      lifetimeBalloons: profile.lifetimeBalloons + 1,
      balloonPoints: profile.balloonPoints + 1,
      xp: award.xp,
      level: award.level,
    },
  };
}

export function turnInCarriedBalloons(
  profile: BalloonProfile,
  capacity = MAX_CARRIED_BALLOONS,
): BalloonProfile {
  if (profile.carriedBalloons < capacity || profile.carriedBalloons <= 0) {
    throw new Error("NOT_READY");
  }
  return {
    ...profile,
    carriedBalloons: 0,
    onboardingComplete: true,
  };
}

export function employPlayer(profile: BalloonProfile, now: number): BalloonProfile {
  if (profile.employed) {
    return profile;
  }
  return {
    ...profile,
    employed: true,
    hiredAt: now,
  };
}

export function profilePublicView(profile: BalloonProfile): {
  employed: boolean;
  carriedBalloons: number;
  lifetimeBalloons: number;
  balloonPoints: number;
  xp: number;
  level: number;
  onboardingComplete: boolean;
  xpForNextLevel: number;
} {
  return {
    employed: profile.employed,
    carriedBalloons: profile.carriedBalloons,
    lifetimeBalloons: profile.lifetimeBalloons,
    balloonPoints: profile.balloonPoints,
    xp: profile.xp,
    level: profile.level,
    onboardingComplete: profile.onboardingComplete,
    xpForNextLevel: xpForNextLevel(profile.xp),
  };
}

export function emptyBalloonLeaderboard(): BalloonLeaderboard {
  return { version: 1, updatedAt: 0, entries: [] };
}

export function parseBalloonLeaderboard(raw: unknown): BalloonLeaderboard {
  if (!raw || typeof raw !== "object") {
    return emptyBalloonLeaderboard();
  }
  const row = raw as Record<string, unknown>;
  const entries: BalloonLeaderboardEntry[] = [];
  if (Array.isArray(row.entries)) {
    for (const item of row.entries) {
      if (!item || typeof item !== "object") {
        continue;
      }
      const entry = item as Record<string, unknown>;
      if (typeof entry.wallet !== "string" || entry.wallet.length === 0) {
        continue;
      }
      entries.push({
        wallet: entry.wallet.toLowerCase(),
        name: typeof entry.name === "string" ? entry.name.slice(0, 40) : "",
        xp: readNonNegInt(entry.xp, 0),
        lifetimeBalloons: readNonNegInt(entry.lifetimeBalloons, 0),
      });
    }
  }
  return {
    version: 1,
    updatedAt: typeof row.updatedAt === "number" ? row.updatedAt : 0,
    entries: entries.slice(0, LEADERBOARD_SIZE),
  };
}

/** Rank the live Blowers board from the in-memory wall plus present player XP. */
export function rankCurrentBlowers(
  board: BalloonLeaderboard,
  livePlayers: ReadonlyArray<{ wallet: string; name: string; xp: number; lifetimeBalloons: number }>,
  now: number,
): BalloonLeaderboard {
  let next = board;
  for (const player of livePlayers) {
    if (player.xp <= 0) {
      continue;
    }
    next = upsertLeaderboard(next, player, now);
  }
  return next;
}

export function upsertLeaderboard(
  board: BalloonLeaderboard,
  entry: BalloonLeaderboardEntry,
  now: number,
): BalloonLeaderboard {
  const next = board.entries.filter((row) => row.wallet !== entry.wallet);
  next.push({ ...entry, wallet: entry.wallet.toLowerCase() });
  next.sort((a, b) => b.xp - a.xp || b.lifetimeBalloons - a.lifetimeBalloons);
  return {
    version: 1,
    updatedAt: now,
    entries: next.slice(0, LEADERBOARD_SIZE),
  };
}
