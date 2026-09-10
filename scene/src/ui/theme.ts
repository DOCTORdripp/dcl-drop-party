import { Color4 } from "@dcl/sdk/math";

/**
 * Raffle Manager theme, copied as the Deposit Chest baseline.
 * Accent is castle gold instead of RM purple. No uiScale store — scene uses 1×.
 */
export function s(n: number): number {
  return Math.round(n);
}

export function measureWrappedTextHeight(
  text: string,
  fontDesignPx: number,
  containerDesignWidthPx: number,
): number {
  const lineHeightDesignPx = Math.ceil(fontDesignPx * 1.6);
  if (!text) return lineHeightDesignPx;
  const charDesignWidth = Math.max(1, fontDesignPx * 0.6);
  const charsPerLine = Math.max(1, Math.floor(containerDesignWidthPx / charDesignWidth));
  const wrappedLines = text
    .split("\n")
    .reduce((sum, segment) => sum + Math.max(1, Math.ceil(segment.length / charsPerLine)), 0);
  return wrappedLines * lineHeightDesignPx;
}

export const color = {
  bg: Color4.create(0.05, 0.06, 0.09, 0.92),
  bgElevated: Color4.create(0.09, 0.1, 0.14, 0.95),
  surface: Color4.create(0.12, 0.14, 0.19, 0.96),
  surfaceSoft: Color4.create(0.15, 0.17, 0.23, 0.9),
  border: Color4.create(1, 1, 1, 0.08),
  divider: Color4.create(1, 1, 1, 0.05),

  textPrimary: Color4.create(0.96, 0.97, 1, 1),
  textSecondary: Color4.create(0.7, 0.74, 0.82, 1),
  textMuted: Color4.create(0.55, 0.59, 0.68, 1),
  textInverted: Color4.create(0.05, 0.06, 0.09, 1),

  accent: Color4.create(0.86, 0.62, 0.22, 1),
  accentSoft: Color4.create(0.86, 0.62, 0.22, 0.22),
  accentDeep: Color4.create(0.45, 0.3, 0.08, 1),

  success: Color4.create(0.33, 0.82, 0.57, 1),
  successSoft: Color4.create(0.33, 0.82, 0.57, 0.2),
  successStrong: Color4.create(0.16, 0.52, 0.32, 1),

  warning: Color4.create(1, 0.74, 0.32, 1),
  warningSoft: Color4.create(1, 0.74, 0.32, 0.18),
  warningStrong: Color4.create(0.72, 0.48, 0.1, 1),

  danger: Color4.create(1, 0.42, 0.45, 1),
  dangerSoft: Color4.create(1, 0.42, 0.45, 0.18),

  info: Color4.create(0.45, 0.74, 1, 1),
  infoSoft: Color4.create(0.45, 0.74, 1, 0.18),

  chipBg: Color4.create(1, 1, 1, 0.06),
  chipBgActive: Color4.create(0.86, 0.62, 0.22, 0.28),

  toggleTrack: Color4.create(0.07, 0.08, 0.12, 1),

  transparent: Color4.create(0, 0, 0, 0),
};

export const radius = {
  get sm() {
    return s(6);
  },
  get md() {
    return s(10);
  },
  get lg() {
    return s(14);
  },
  get pill() {
    return s(10);
  },
  circle: 999 as const,
};

export const spacing = {
  get xs() {
    return s(4);
  },
  get sm() {
    return s(8);
  },
  get md() {
    return s(12);
  },
  get lg() {
    return s(16);
  },
  get xl() {
    return s(24);
  },
};

export const font = {
  get display() {
    return s(22);
  },
  get title() {
    return s(18);
  },
  get subtitle() {
    return s(14);
  },
  get body() {
    return s(13);
  },
  get caption() {
    return s(11);
  },
  get micro() {
    return s(10);
  },
  get nano() {
    return s(9);
  },
};

export const PANEL_BASE_WIDTH = 540;

export const layout = {
  get width() {
    return s(PANEL_BASE_WIDTH);
  },
  get height() {
    return s(540);
  },
  get heightTall() {
    return s(920);
  },
  get sideMargin() {
    return s(24);
  },
  get topMargin() {
    return s(24);
  },
};
