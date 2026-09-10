/**
 * Balloon Blowing XP curve.
 *
 * XP per completed balloon uses the player's displayed level BEFORE the award:
 *   xpPerBalloon(level) = level + 10
 *
 * Displayed level is capped at 99. Total XP may keep growing after that.
 *
 * Level thresholds are derived from approved active-time milestones
 * (1 balloon / 2 minutes ⇒ 30 balloons / hour). Per-level balloon costs were
 * sampled from a monotone cubic interpolation of those cumulative milestones,
 * then committed as integers so future edits cannot silently rebalance players.
 */

export const MAX_DISPLAY_LEVEL = 99;
export const MINUTES_PER_BALLOON = 2;
export const BALLOONS_PER_HOUR = 30;

/** Approved lifetime active hours to *reach* each milestone level. */
export const LEVEL_HOUR_MILESTONES = [
  { level: 1, hours: 0 },
  { level: 10, hours: 10 },
  { level: 20, hours: 30 },
  { level: 30, hours: 70 },
  { level: 40, hours: 130 },
  { level: 50, hours: 220 },
  { level: 60, hours: 350 },
  { level: 70, hours: 510 },
  { level: 80, hours: 725 },
  { level: 90, hours: 990 },
  { level: 99, hours: 1_280 },
] as const;

export function xpPerBalloon(level: number): number {
  if (!Number.isInteger(level) || level < 1) {
    throw new Error("level must be a positive integer");
  }
  return Math.min(level, MAX_DISPLAY_LEVEL) + 10;
}

function buildXpToReach(balloonsPerLevel: readonly number[]): number[] {
  const xpToReach = new Array<number>(MAX_DISPLAY_LEVEL + 1).fill(0);
  xpToReach[1] = 0;
  for (let level = 1; level < MAX_DISPLAY_LEVEL; level++) {
    const balloons = balloonsPerLevel[level];
    xpToReach[level + 1] = xpToReach[level] + balloons * xpPerBalloon(level);
  }
  return xpToReach;
}

/**
 * Balloons completed at `level` to reach `level + 1`. Index = level.
 * Generated from the milestone curve described above. Index 0 is unused.
 */
export const BALLOONS_PER_LEVEL: readonly number[] = [
  0,
  22, 26, 29, 32, 34, 36, 39, 40, 42,
  44, 47, 51, 54, 57, 62, 65, 69, 73, 78, 85,
  96, 105, 113, 121, 127, 133, 136, 141, 143, 148,
  154, 162, 170, 176, 184, 190, 198, 206, 212, 222,
  233, 245, 255, 266, 276, 287, 296, 305, 315, 329,
  347, 364, 379, 392, 403, 412, 420, 425, 429, 433,
  441, 449, 458, 469, 481, 494, 509, 525, 541, 562,
  585, 607, 625, 644, 659, 675, 687, 698, 708, 721,
  738, 755, 771, 788, 804, 820, 835, 852, 866, 885,
  908, 929, 950, 969, 989, 1006, 1024, 1040,
];

/** Cumulative XP required to *reach* each displayed level. Index = level. */
export const XP_TO_REACH_LEVEL: readonly number[] = buildXpToReach(BALLOONS_PER_LEVEL);

export function cumulativeBalloonsToReach(level: number): number {
  if (!Number.isInteger(level) || level < 1) {
    throw new Error("level must be a positive integer");
  }
  const capped = Math.min(level, MAX_DISPLAY_LEVEL);
  let total = 0;
  for (let current = 1; current < capped; current++) {
    total += BALLOONS_PER_LEVEL[current];
  }
  return total;
}

export function hoursToReachLevel(level: number): number {
  return cumulativeBalloonsToReach(level) / BALLOONS_PER_HOUR;
}

export function levelFromXp(xp: number): number {
  if (!Number.isFinite(xp) || xp < 0 || !Number.isInteger(xp)) {
    throw new Error("XP must be a non-negative integer");
  }
  let level = 1;
  for (let candidate = MAX_DISPLAY_LEVEL; candidate >= 1; candidate--) {
    if (xp >= XP_TO_REACH_LEVEL[candidate]) {
      level = candidate;
      break;
    }
  }
  return level;
}

export function xpToReachLevel(level: number): number {
  if (!Number.isInteger(level) || level < 1) {
    throw new Error("level must be a positive integer");
  }
  if (level > MAX_DISPLAY_LEVEL) {
    return XP_TO_REACH_LEVEL[MAX_DISPLAY_LEVEL];
  }
  return XP_TO_REACH_LEVEL[level];
}

export function xpForNextLevel(xp: number): number {
  const level = levelFromXp(xp);
  if (level >= MAX_DISPLAY_LEVEL) {
    return XP_TO_REACH_LEVEL[MAX_DISPLAY_LEVEL];
  }
  return XP_TO_REACH_LEVEL[level + 1];
}

/** XP still needed to reach the next displayed level. 0 at the level cap. */
export function xpRemainingToNextLevel(xp: number): number {
  const level = levelFromXp(xp);
  if (level >= MAX_DISPLAY_LEVEL) {
    return 0;
  }
  return Math.max(0, xpForNextLevel(xp) - xp);
}

export function applyBalloonXp(
  currentXp: number,
  currentLevel: number,
  socialBonusXp = 0,
  kiteBonusXp = 0,
): {
  awardedXp: number;
  xp: number;
  level: number;
} {
  if (!Number.isInteger(currentXp) || currentXp < 0) {
    throw new Error("XP must be a non-negative integer");
  }
  const social = Number.isFinite(socialBonusXp) ? Math.max(0, Math.floor(socialBonusXp)) : 0;
  const kite = Number.isFinite(kiteBonusXp) ? Math.max(0, Math.floor(kiteBonusXp)) : 0;
  const awardedXp = xpPerBalloon(currentLevel) + social + kite;
  const xp = currentXp + awardedXp;
  return { awardedXp, xp, level: levelFromXp(xp) };
}
