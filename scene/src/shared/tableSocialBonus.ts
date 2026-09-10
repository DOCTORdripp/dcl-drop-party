export const TABLE_CHAIR_COUNT = 30;
export const MAX_SOCIAL_BONUS_XP = 15;

export type SocialParticipationMode = "SEATED" | "SURROUNDING" | "NORMAL";

export type TableSocialSnapshot = {
  occupiedChairCount: number;
  occupiedChairMask: number;
  currentSocialBonusXp: number;
  tableFull: boolean;
};

export function occupiedChairMaskFromIds(ids: Iterable<number>): number {
  let mask = 0;
  for (const id of ids) {
    if (id >= 1 && id <= TABLE_CHAIR_COUNT) {
      mask |= 1 << (id - 1);
    }
  }
  return mask >>> 0;
}

export function isChairOccupied(mask: number, chairId: number): boolean {
  if (chairId < 1 || chairId > TABLE_CHAIR_COUNT) {
    return false;
  }
  return (mask & (1 << (chairId - 1))) !== 0;
}

export function socialXpForOccupiedChairs(count: number): number {
  const seated = Math.max(0, Math.min(TABLE_CHAIR_COUNT, Math.floor(count)));
  if (seated === 0) {
    return 0;
  }
  if (seated <= 5) {
    return seated;
  }
  if (seated <= 7) {
    return 6;
  }
  if (seated <= 9) {
    return 7;
  }
  if (seated <= 11) {
    return 8;
  }
  if (seated <= 13) {
    return 9;
  }
  if (seated <= 15) {
    return 10;
  }
  if (seated <= 18) {
    return 11;
  }
  if (seated <= 21) {
    return 12;
  }
  if (seated <= 24) {
    return 13;
  }
  if (seated <= 27) {
    return 14;
  }
  return MAX_SOCIAL_BONUS_XP;
}

export function tableIsFull(occupiedChairCount: number): boolean {
  return occupiedChairCount === TABLE_CHAIR_COUNT;
}

export function tableSocialSnapshot(occupiedChairCount: number, occupiedChairMask = 0): TableSocialSnapshot {
  const count = Math.max(0, Math.min(TABLE_CHAIR_COUNT, Math.floor(occupiedChairCount)));
  return {
    occupiedChairCount: count,
    occupiedChairMask: occupiedChairMask >>> 0,
    currentSocialBonusXp: socialXpForOccupiedChairs(count),
    tableFull: tableIsFull(count),
  };
}

export function playerSocialBonusXp(args: {
  mode: SocialParticipationMode | undefined;
  occupiedChairCount: number;
  seatedEligible: boolean;
  surroundingEligible: boolean;
}): number {
  if (args.mode === "SEATED" && args.seatedEligible) {
    return socialXpForOccupiedChairs(args.occupiedChairCount);
  }
  if (args.mode === "SURROUNDING" && args.surroundingEligible && tableIsFull(args.occupiedChairCount)) {
    return MAX_SOCIAL_BONUS_XP;
  }
  return 0;
}

export function formatSocialBoostLine(socialBonusXp: number): string {
  if (socialBonusXp <= 0) {
    return "";
  }
  return `SOCIAL BOOST +${socialBonusXp} XP`;
}

export function formatSeatedCountLine(occupiedChairCount: number): string {
  return `${Math.max(0, Math.min(TABLE_CHAIR_COUNT, Math.floor(occupiedChairCount)))} / ${TABLE_CHAIR_COUNT} SEATED`;
}
