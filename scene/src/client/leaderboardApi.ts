import { CONVEX_SITE_URL } from "../shared/constants";

export type LeaderboardWallRow = {
  wallet?: string;
  name: string;
  col2: string;
  col3: string;
};

export async function fetchPopperLeaderboard(): Promise<LeaderboardWallRow[] | null> {
  try {
    const res = await fetch(`${CONVEX_SITE_URL.replace(/\/$/, "")}/leaderboards`);
    if (!res.ok) {
      return null;
    }
    const wall = (await res.json()) as { poppers?: { rows?: LeaderboardWallRow[] } };
    return wall.poppers?.rows ?? [];
  } catch {
    return null;
  }
}
