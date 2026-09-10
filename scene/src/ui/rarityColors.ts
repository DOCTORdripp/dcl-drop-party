const MUTED: { r: number; g: number; b: number; a: number } = {
  r: 0.55,
  g: 0.59,
  b: 0.68,
  a: 1,
};

const RARITY_HEX: Record<string, string> = {
  common: "#abc1c1",
  uncommon: "#ed6d4f",
  rare: "#36cf75",
  epic: "#3d85e6",
  legendary: "#842dda",
  exotic: "#caff73",
  mythic: "#ff63e1",
  unique: "#ffb626",
  "super rare": "#36cf75",
  superb: "#36cf75",
  base: "#abc1c1",
  swanky: "#ed6d4f",
  unknown: "#8899aa",
};

function hexToRgba(h: string): { r: number; g: number; b: number; a: number } {
  const raw = h.replace(/^#/, "");
  if (raw.length < 6) {
    return { r: 0.55, g: 0.6, b: 0.68, a: 1 };
  }
  return {
    r: parseInt(raw.slice(0, 2), 16) / 255,
    g: parseInt(raw.slice(2, 4), 16) / 255,
    b: parseInt(raw.slice(4, 6), 16) / 255,
    a: 1,
  };
}

/** Raffle Manager rarity text color. */
export function rgbaForRarityLabel(rarity: string): { r: number; g: number; b: number; a: number } {
  const hex = RARITY_HEX[rarity.trim().toLowerCase()];
  if (hex) return hexToRgba(hex);
  return MUTED;
}
