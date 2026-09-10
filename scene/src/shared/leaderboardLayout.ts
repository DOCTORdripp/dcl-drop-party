import { LEADERBOARD_ART_HEIGHT, LEADERBOARD_ART_WIDTH, LEADERBOARD_PLANE_WIDTH, type LeaderboardKind } from "./castleLayout";

export const LEADERBOARD_ROW_COUNT = 20;

/** UV fractions of the 1024×1536 art. Tune these to land each column in its gold cell. */
export const LEADERBOARD_UV = {
  playerLeft: 0.25,
  col2: 0.5,
  col3: 0.7109,
  tableRight: 0.8828,
  dataTop: 0.286,
  dataBottom: 0.8685,
} as const;

/** Authored world Z that sits on the board without clipping the art. */
export const LEADERBOARD_TEXT_WORLD_Z = 80.35;
/** Mobile: one TextShape per gold data column. Desktop uses a single block (see below). */
export const LEADERBOARD_TEXT_SHAPES_PER_BOARD = 3;
/**
 * Unity frustum-culls each TextShape from its glyph bounds, so three desktop
 * columns vanish independently. One monospace block is a single cull mesh.
 * Godot (mobile) does not do that, so it keeps three sans-serif columns.
 */
export const LEADERBOARD_DESKTOP_TEXT_SHAPES_PER_BOARD = 1;
export const LEADERBOARD_FONT_SIZE = 3;
export const LEADERBOARD_LINE_SPACING = 1;
/** Local Y 180 on the yaw-180 board so glyphs face the court. Do not X-flip. */
export const LEADERBOARD_TEXT_YAW = 180;
export const LEADERBOARD_TEXT_SCALE = { x: 1, y: 1, z: 1 } as const;
/** Godot ignores TextShape lineSpacing; stretch Y so 20 rows fill 20 gold slots. */
export const LEADERBOARD_TEXT_SCALE_Y_MOBILE = 20 / 18;

export function leaderboardLineSpacingFor(_mobile: boolean): number {
  return LEADERBOARD_LINE_SPACING;
}

export function leaderboardTextScaleFor(mobile: boolean): { x: number; y: number; z: number } {
  return {
    x: LEADERBOARD_TEXT_SCALE.x,
    y: mobile ? LEADERBOARD_TEXT_SCALE_Y_MOBILE : LEADERBOARD_TEXT_SCALE.y,
    z: LEADERBOARD_TEXT_SCALE.z,
  };
}
/** Thin gold outline — a dark outline reads as a duller glyph up close. */
export const LEADERBOARD_OUTLINE_WIDTH = 0.1;
export const LEADERBOARD_OUTLINE_COLOR = { r: 1, g: 0.78, b: 0.18 };
/**
 * Unity frustum-culls TextShape from this rect, not from the PNG plane.
 * A 20×10 plaza box sat in the wrong place, so live boards vanished up close.
 * Size it to the gold table so the AABB stays on the board you are looking at.
 */
export const LEADERBOARD_TEXT_BOX_WIDTH = (LEADERBOARD_UV.tableRight - LEADERBOARD_UV.playerLeft) * LEADERBOARD_PLANE_WIDTH;
export const LEADERBOARD_TEXT_BOX_HEIGHT =
  (LEADERBOARD_UV.dataBottom - LEADERBOARD_UV.dataTop) *
  LEADERBOARD_PLANE_WIDTH *
  (LEADERBOARD_ART_HEIGHT / LEADERBOARD_ART_WIDTH);
/** Bright fill so close-up lighting does not read as muddy cream. */
export const LEADERBOARD_TEXT_COLOR = { r: 1, g: 0.84, b: 0.22, a: 1 };
/** Local +Z on the board, toward the court. */

export const LEADERBOARD_TEXT_FRONT = 0.08;
export type LeaderboardColumnId = "player" | "col2" | "col3";
export const LEADERBOARD_COLUMN_ORDER: LeaderboardColumnId[] = ["player", "col2", "col3"];
/** Inset from the PLAYER gold line so names sit in the cell, not on the divider. */
export const LEADERBOARD_NAME_INSET_U = 0.01;
/**
 * Desktop monospace cell widths. Name pad fills PLAYER so LEVEL/PARTIES
 * start at their gold column; col2 is an even width so 2-digit scores center.
 */
export const LEADERBOARD_NAME_PAD = 15;
export const LEADERBOARD_COL2_PAD = 8;
export const LEADERBOARD_COL3_PAD = 9;
/**
 * Desktop-only: pull TOTAL XP left by eating trailing spaces after LEVEL.
 * 7-digit scores fill col3, so rotating spaces inside col3 cannot move them.
 */
export const LEADERBOARD_DESKTOP_XP_NUDGE_LEFT = 1;
export const LEADERBOARD_ROW_PAD =
  LEADERBOARD_NAME_PAD + LEADERBOARD_COL2_PAD + LEADERBOARD_COL3_PAD;
/**
 * Empty slots keep one ASCII dash so Explorer has a glyph on all 20 gold rows.
 * Do not repeat it across the cell — a full-width missing-glyph fill overflowed
 * the table and culled the board when you walked up.
 */
export const LEADERBOARD_EMPTY_CELL = "-";

export function isLeaderboardEmptyCell(value: string): boolean {
  return value.length === 0 || value === "\u00A0" || value.trim().length === 0;
}

export function leaderboardCellOrDash(value: string): string {
  return isLeaderboardEmptyCell(value) ? LEADERBOARD_EMPTY_CELL : value;
}

export function leaderboardPlaneHeight(width = LEADERBOARD_PLANE_WIDTH): number {
  return width * (LEADERBOARD_ART_HEIGHT / LEADERBOARD_ART_WIDTH);
}

export function uvToFacingTextLocal(
  u: number,
  v: number,
  width = LEADERBOARD_PLANE_WIDTH,
): { x: number; y: number; z: number } {
  const height = leaderboardPlaneHeight(width);
  return {
    x: (u - 0.5) * width,
    y: (0.5 - v) * height,
    z: 0,
  };
}

export function leaderboardColumnBox(column: LeaderboardColumnId): { left: number; right: number } {
  if (column === "player") return { left: LEADERBOARD_UV.playerLeft, right: LEADERBOARD_UV.col2 };
  if (column === "col2") return { left: LEADERBOARD_UV.col2, right: LEADERBOARD_UV.col3 };
  return { left: LEADERBOARD_UV.col3, right: LEADERBOARD_UV.tableRight };
}

export function leaderboardColumnAnchorU(column: LeaderboardColumnId): number {
  if (column === "player") return LEADERBOARD_UV.playerLeft + LEADERBOARD_NAME_INSET_U;
  const box = leaderboardColumnBox(column);
  return (box.left + box.right) / 2;
}

export function leaderboardColumnTextAlign(column: LeaderboardColumnId): "left" | "center" {
  return column === "player" ? "left" : "center";
}

export function leaderboardNameAnchorU(): number {
  return leaderboardColumnAnchorU("player");
}

/** Local position on the yaw-180 board. Low UV is the viewer's left. */
export function leaderboardBoardLocalColumnPosition(
  column: LeaderboardColumnId,
  width = LEADERBOARD_PLANE_WIDTH,
): { x: number; y: number; z: number } {
  const height = leaderboardPlaneHeight(width);
  return {
    x: (0.5 - leaderboardColumnAnchorU(column)) * width,
    y: (0.5 - LEADERBOARD_UV.dataTop) * height,
    z: LEADERBOARD_TEXT_FRONT,
  };
}

export function leaderboardUsesColumnTextShapes(mobile: boolean): boolean {
  return mobile;
}

export function formatLeaderboardRow(
  name: string,
  col2: string,
  col3: string,
  kind: LeaderboardKind = "blowers",
): string {
  const emptyRow = isLeaderboardEmptyCell(name) && isLeaderboardEmptyCell(col2) && isLeaderboardEmptyCell(col3);
  const player = emptyRow ? LEADERBOARD_EMPTY_CELL : name;
  const mid = emptyRow ? LEADERBOARD_EMPTY_CELL : col2;
  const right = emptyRow ? LEADERBOARD_EMPTY_CELL : col3;
  const nameCell = padLeaderboardCell(player, LEADERBOARD_NAME_PAD, "left");
  let col2Cell = padLeaderboardCell(mid, LEADERBOARD_COL2_PAD, "center");
  let col3Cell = padLeaderboardCell(right, LEADERBOARD_COL3_PAD, kind === "blowers" ? "left" : "center");
  if (kind === "blowers") {
    let eaten = 0;
    while (eaten < LEADERBOARD_DESKTOP_XP_NUDGE_LEFT && col2Cell.endsWith("  ")) {
      col2Cell = col2Cell.slice(0, -1);
      eaten += 1;
    }
    col3Cell = `${col3Cell}${" ".repeat(eaten)}`;
  }
  return `${nameCell}${col2Cell}${col3Cell}`;
}

export function combinedTextForRows(
  rows: Array<{ name: string; col2: string; col3: string }>,
  kind: LeaderboardKind,
): string {
  return rows.map((row) => formatLeaderboardRow(row.name, row.col2, row.col3, kind)).join("\n");
}

export function leaderboardBoardLocalTextPosition(width = LEADERBOARD_PLANE_WIDTH): { x: number; y: number; z: number } {
  return leaderboardBoardLocalColumnPosition("player", width);
}

export function leaderboardTableWidth(width = LEADERBOARD_PLANE_WIDTH): number {
  return (LEADERBOARD_UV.tableRight - LEADERBOARD_UV.playerLeft) * width;
}

export function leaderboardTableHeight(width = LEADERBOARD_PLANE_WIDTH): number {
  return (LEADERBOARD_UV.dataBottom - LEADERBOARD_UV.dataTop) * leaderboardPlaneHeight(width);
}

export function leaderboardTextBoxSize(column?: LeaderboardColumnId): { width: number; height: number } {
  const height = leaderboardTableHeight();
  if (!column || column === "player") {
    return {
      width: (LEADERBOARD_UV.tableRight - leaderboardColumnAnchorU("player")) * LEADERBOARD_PLANE_WIDTH,
      height,
    };
  }
  const box = leaderboardColumnBox(column);
  return {
    width: Math.max(0.2, (box.right - box.left) * LEADERBOARD_PLANE_WIDTH),
    height,
  };
}

export function leaderboardRowHeight(width = LEADERBOARD_PLANE_WIDTH): number {
  return ((LEADERBOARD_UV.dataBottom - LEADERBOARD_UV.dataTop) / LEADERBOARD_ROW_COUNT) * leaderboardPlaneHeight(width);
}

export function padLeaderboardCell(value: string, size: number, align: "left" | "right" | "center"): string {
  const width = Math.max(0, Math.round(size));
  const clipped = value.length > width ? value.slice(0, width) : value;
  const gap = width - clipped.length;
  if (align === "left") return `${clipped}${" ".repeat(gap)}`;
  if (align === "right") return `${" ".repeat(gap)}${clipped}`;
  const left = Math.floor(gap / 2);
  return `${" ".repeat(left)}${clipped}${" ".repeat(gap - left)}`;
}

export function columnTextForRows(
  rows: Array<{ name: string; col2: string; col3: string }>,
  column: LeaderboardColumnId,
): string {
  return rows
    .map((row) => {
      const value = column === "player" ? row.name : column === "col2" ? row.col2 : row.col3;
      return leaderboardCellOrDash(value);
    })
    .join("\n");
}

export function padLeaderboardLiveRows(
  rows: Array<{ name: string; col2: string; col3: string }>,
  count = LEADERBOARD_ROW_COUNT,
): Array<{ name: string; col2: string; col3: string }> {
  const next = rows.slice(0, count).map((row) => ({
    name: row.name.slice(0, LEADERBOARD_NAME_PAD),
    col2: row.col2,
    col3: row.col3,
  }));
  while (next.length < count) {
    next.push({ name: LEADERBOARD_EMPTY_CELL, col2: LEADERBOARD_EMPTY_CELL, col3: LEADERBOARD_EMPTY_CELL });
  }
  return next;
}

export function emptyLeaderboardRows(count = LEADERBOARD_ROW_COUNT): Array<{ name: string; col2: string; col3: string }> {
  return padLeaderboardLiveRows([], count);
}

export function emptyLeaderboardBlockText(kind: LeaderboardKind): string {
  return combinedTextForRows(emptyLeaderboardRows(), kind);
}

export function emptyLeaderboardColumnText(column: LeaderboardColumnId): string {
  return columnTextForRows(emptyLeaderboardRows(), column);
}

/** World position of the single facing-court text block (yaw 0). Pinned to the PLAYER cell left. */
export function leaderboardWorldTextPosition(
  board: { x: number; y: number; z: number },
  width = LEADERBOARD_PLANE_WIDTH,
): { x: number; y: number; z: number } {
  const local = uvToFacingTextLocal(leaderboardNameAnchorU(), LEADERBOARD_UV.dataTop, width);
  return {
    x: board.x + local.x,
    y: board.y + local.y,
    z: LEADERBOARD_TEXT_WORLD_Z,
  };
}
