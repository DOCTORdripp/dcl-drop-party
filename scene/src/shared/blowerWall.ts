import { levelFromXp } from "./balloonXpCurve";
import { sanitizeProfileName, shortenWallet } from "./displayName";
import { LEADERBOARD_NAME_PAD, LEADERBOARD_ROW_COUNT } from "./leaderboardLayout";

export type BlowerSceneEntry = {
  wallet: string;
  name: string;
  xp: number;
};

export type BlowerWallRow = {
  name: string;
  col2: string;
  col3: string;
};

export function blowerWallRowsFromEntries(
  entries: readonly BlowerSceneEntry[],
  limit = LEADERBOARD_ROW_COUNT,
): BlowerWallRow[] {
  return [...entries]
    .filter((row) => row.xp > 0)
    .sort((a, b) => b.xp - a.xp)
    .slice(0, limit)
    .map((row) => {
      const verified = sanitizeProfileName(row.name);
      const name = (verified ?? shortenWallet(row.wallet)).slice(0, LEADERBOARD_NAME_PAD);
      return {
        name,
        col2: String(levelFromXp(row.xp)),
        col3: String(row.xp),
      };
    });
}

export function parseBlowerLeaderboardPayload(raw: string): BlowerSceneEntry[] {
  try {
    const parsed = JSON.parse(raw) as { entries?: unknown };
    if (!Array.isArray(parsed.entries)) {
      return [];
    }
    const entries: BlowerSceneEntry[] = [];
    for (const item of parsed.entries) {
      if (!item || typeof item !== "object") {
        continue;
      }
      const row = item as Record<string, unknown>;
      if (typeof row.wallet !== "string" || row.wallet.length === 0) {
        continue;
      }
      if (typeof row.xp !== "number" || !Number.isFinite(row.xp) || row.xp <= 0) {
        continue;
      }
      entries.push({
        wallet: row.wallet,
        name: typeof row.name === "string" ? row.name : "",
        xp: row.xp,
      });
    }
    return entries;
  } catch {
    return [];
  }
}

export function encodeBlowerLeaderboardPayload(
  entries: readonly BlowerSceneEntry[],
  generatedAt = 0,
): string {
  return JSON.stringify({
    generatedAt,
    entries: entries.map((row) => ({
      wallet: row.wallet,
      name: row.name,
      xp: row.xp,
    })),
  });
}

export function parseLeaderboardUpdateMessage(data: { generatedAt?: number; payload?: string }): {
  generatedAt: number;
  entries: BlowerSceneEntry[];
} {
  const entries = parseBlowerLeaderboardPayload(data.payload ?? "");
  const fromPayload = (() => {
    try {
      const parsed = JSON.parse(data.payload ?? "") as { generatedAt?: unknown };
      return typeof parsed.generatedAt === "number" && Number.isFinite(parsed.generatedAt) ? parsed.generatedAt : 0;
    } catch {
      return 0;
    }
  })();
  const generatedAt = Number(data.generatedAt);
  return {
    generatedAt: Number.isFinite(generatedAt) && generatedAt > 0 ? generatedAt : fromPayload,
    entries,
  };
}
