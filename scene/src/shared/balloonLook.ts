export type BalloonColor = { r: number; g: number; b: number; a: number };

export const BALLOON_PALETTE: readonly BalloonColor[] = [
  { r: 0.94, g: 0.22, b: 0.32, a: 1 },
  { r: 0.18, g: 0.52, b: 0.96, a: 1 },
  { r: 0.98, g: 0.78, b: 0.16, a: 1 },
];

export function balloonPaletteIndex(balloonId: string, paletteLength = BALLOON_PALETTE.length): number {
  let n = 0;
  for (let i = 0; i < balloonId.length; i++) {
    n = (n * 31 + balloonId.charCodeAt(i)) >>> 0;
  }
  return n % paletteLength;
}

export function balloonColor(balloonId: string): BalloonColor {
  return BALLOON_PALETTE[balloonPaletteIndex(balloonId)]!;
}

export const BALLOON_BODY_SCALE = { x: 0.72, y: 0.98, z: 0.72 };
export const BALLOON_KNOT_SCALE = { x: 0.14, y: 0.11, z: 0.14 };
export const BALLOON_KNOT_OFFSET = { x: 0, y: -0.52, z: 0 };
export const BALLOON_STRING_SCALE = { x: 0.03, y: 0.72, z: 0.03 };
export const BALLOON_STRING_OFFSET = { x: 0, y: -0.96, z: 0 };

/** Gentle self-lighting so live party balloons remain colorful in dark areas. */
export const BALLOON_BODY_EMISSIVE_INTENSITY = 0.25;
export const BALLOON_KNOT_EMISSIVE_INTENSITY = 0.3;
export const BALLOON_FRAGMENT_EMISSIVE_INTENSITY = 0.4;

export const BURST_FRAGMENT_COUNT = 5;
