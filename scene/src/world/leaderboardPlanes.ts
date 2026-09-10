import { engine, Font, Material, MaterialTransparencyMode, MeshRenderer, TextAlignMode, TextShape, Transform } from "@dcl/sdk/ecs";
import { Color3, Color4, Quaternion } from "@dcl/sdk/math";
import { whenSceneShellReady } from "./sceneShellPreload";
import {
  LEADERBOARD_EMISSIVE_INTENSITY,
  LEADERBOARD_PLANE_YAW,
  castleWorldPosition,
  leaderboardBoards,
  leaderboardPlaneScale,
  type LeaderboardKind,
} from "../shared/castleLayout";
import { getPlatform, isMobile } from "@dcl/sdk/platform";
import {
  LEADERBOARD_COLUMN_ORDER,
  LEADERBOARD_FONT_SIZE,
  LEADERBOARD_LINE_SPACING,
  LEADERBOARD_OUTLINE_COLOR,
  LEADERBOARD_OUTLINE_WIDTH,
  LEADERBOARD_ROW_COUNT,
  LEADERBOARD_TEXT_COLOR,
  LEADERBOARD_DESKTOP_TEXT_SHAPES_PER_BOARD,
  LEADERBOARD_TEXT_SHAPES_PER_BOARD,
  LEADERBOARD_TEXT_YAW,
  emptyLeaderboardBlockText,
  emptyLeaderboardColumnText,
  columnTextForRows,
  combinedTextForRows,
  padLeaderboardLiveRows,
  leaderboardBoardLocalColumnPosition,
  leaderboardColumnTextAlign,
  leaderboardTextScaleFor,
  leaderboardTextBoxSize,
  leaderboardUsesColumnTextShapes,
  type LeaderboardColumnId,
} from "../shared/leaderboardLayout";

export type LeaderboardHandles = {
  blowers: ReturnType<typeof engine.addEntity>;
  poppers: ReturnType<typeof engine.addEntity>;
};

const GOLD = Color4.create(
  LEADERBOARD_TEXT_COLOR.r,
  LEADERBOARD_TEXT_COLOR.g,
  LEADERBOARD_TEXT_COLOR.b,
  LEADERBOARD_TEXT_COLOR.a,
);

const GOLD_OUTLINE = Color3.create(
  LEADERBOARD_OUTLINE_COLOR.r,
  LEADERBOARD_OUTLINE_COLOR.g,
  LEADERBOARD_OUTLINE_COLOR.b,
);

const boardColumnEntities: Partial<
  Record<LeaderboardKind, Partial<Record<LeaderboardColumnId, ReturnType<typeof engine.addEntity>>>>
> = {};

const boardBlockEntities: Partial<Record<LeaderboardKind, ReturnType<typeof engine.addEntity>>> = {};

function previewIsMobile(): boolean {
  return isMobile() || getPlatform() === "mobile";
}

function applyLeaderboardMaterial(entity: ReturnType<typeof engine.addEntity>, src: string): void {
  const texture = Material.Texture.Common({ src });
  Material.setPbrMaterial(entity, {
    texture,
    emissiveTexture: texture,
    albedoColor: Color4.create(1, 1, 1, 1),
    emissiveColor: Color3.create(1, 1, 1),
    emissiveIntensity: LEADERBOARD_EMISSIVE_INTENSITY,
    metallic: 0,
    roughness: 1,
    specularIntensity: 0,
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST_AND_ALPHA_BLEND,
    alphaTest: 0.35,
    castShadows: false,
  });
}

function applySharedTextLook(
  entity: ReturnType<typeof engine.addEntity>,
  args: {
    text: string;
    font: Font;
    textAlign: TextAlignMode;
    column?: LeaderboardColumnId;
  },
): void {
  const box = leaderboardTextBoxSize(args.column);
  TextShape.create(entity, {
    text: args.text,
    font: args.font,
    fontSize: LEADERBOARD_FONT_SIZE,
    fontAutoSize: false,
    textAlign: args.textAlign,
    width: box.width,
    height: box.height,
    lineCount: LEADERBOARD_ROW_COUNT,
    lineSpacing: LEADERBOARD_LINE_SPACING,
    paddingTop: 0,
    paddingLeft: 0,
    textWrapping: false,
    textColor: GOLD,
    outlineWidth: LEADERBOARD_OUTLINE_WIDTH,
    outlineColor: GOLD_OUTLINE,
  });
}

function placeColumnText(
  board: ReturnType<typeof engine.addEntity>,
  kind: LeaderboardKind,
  column: LeaderboardColumnId,
): void {
  const entity = engine.addEntity();
  Transform.create(entity, {
    parent: board,
    position: leaderboardBoardLocalColumnPosition(column),
    rotation: Quaternion.fromEulerDegrees(0, LEADERBOARD_TEXT_YAW, 0),
    scale: leaderboardTextScaleFor(true),
  });
  applySharedTextLook(entity, {
    text: emptyLeaderboardColumnText(column),
    font: Font.F_SANS_SERIF,
    textAlign:
      leaderboardColumnTextAlign(column) === "left" ? TextAlignMode.TAM_TOP_LEFT : TextAlignMode.TAM_TOP_CENTER,
    column,
  });
  const columns = boardColumnEntities[kind] ?? {};
  columns[column] = entity;
  boardColumnEntities[kind] = columns;
}

function placeCombinedText(board: ReturnType<typeof engine.addEntity>, kind: LeaderboardKind): void {
  const entity = engine.addEntity();
  Transform.create(entity, {
    parent: board,
    position: leaderboardBoardLocalColumnPosition("player"),
    rotation: Quaternion.fromEulerDegrees(0, LEADERBOARD_TEXT_YAW, 0),
    scale: leaderboardTextScaleFor(false),
  });
  applySharedTextLook(entity, {
    text: emptyLeaderboardBlockText(kind),
    font: Font.F_MONOSPACE,
    textAlign: TextAlignMode.TAM_TOP_LEFT,
    column: "player",
  });
  boardBlockEntities[kind] = entity;
}

/** Godot ignores lineSpacing; mobile stretches Y from the top so row 20 hits slot 20. */
export function applyLeaderboardLineSpacing(mobile: boolean): void {
  const scale = leaderboardTextScaleFor(mobile);
  for (const kind of ["blowers", "poppers"] as LeaderboardKind[]) {
    const columns = boardColumnEntities[kind];
    if (columns) {
      for (const column of LEADERBOARD_COLUMN_ORDER) {
        const entity = columns[column];
        if (!entity || !Transform.has(entity)) continue;
        Transform.getMutable(entity).scale = { ...scale };
      }
    }
    const block = boardBlockEntities[kind];
    if (block && Transform.has(block)) {
      Transform.getMutable(block).scale = { ...scale };
    }
  }
}

/** Swap in live scores without rebuilding the board. */
export function setLeaderboardRows(
  kind: LeaderboardKind,
  rows: Array<{ name: string; col2: string; col3: string }>,
): void {
  const padded = padLeaderboardLiveRows(rows);
  const block = boardBlockEntities[kind];
  if (block && TextShape.has(block)) {
    TextShape.getMutable(block).text = combinedTextForRows(padded, kind);
    return;
  }
  const columns = boardColumnEntities[kind];
  if (!columns) return;
  for (const column of LEADERBOARD_COLUMN_ORDER) {
    const entity = columns[column];
    if (!entity || !TextShape.has(entity)) continue;
    TextShape.getMutable(entity).text = columnTextForRows(padded, column);
  }
}

function placeLeaderboardBoard(
  root: ReturnType<typeof engine.addEntity>,
  kind: LeaderboardKind,
  src: string,
  position: { x: number; y: number; z: number },
): ReturnType<typeof engine.addEntity> {
  const board = engine.addEntity();
  Transform.create(board, {
    parent: root,
    position: castleWorldPosition(position),
    rotation: Quaternion.fromEulerDegrees(0, LEADERBOARD_PLANE_YAW, 0),
  });
  const plane = engine.addEntity();
  Transform.create(plane, {
    parent: board,
    scale: leaderboardPlaneScale(),
  });
  MeshRenderer.setPlane(plane);
  whenSceneShellReady(() => applyLeaderboardMaterial(plane, src));
  if (leaderboardUsesColumnTextShapes(previewIsMobile())) {
    for (const column of LEADERBOARD_COLUMN_ORDER) {
      placeColumnText(board, kind, column);
    }
  } else {
    placeCombinedText(board, kind);
  }
  return board;
}

export function buildLeaderboardPlanes(root: ReturnType<typeof engine.addEntity>): LeaderboardHandles {
  const handles = {} as LeaderboardHandles;
  const mobile = previewIsMobile();
  for (const board of leaderboardBoards()) {
    handles[board.kind] = placeLeaderboardBoard(root, board.kind, board.src, board.position);
  }
  applyLeaderboardLineSpacing(mobile);
  console.log("[WORLD] leaderboard planes ready", {
    boards: leaderboardBoards().map((board) => ({ kind: board.kind, src: board.src, position: board.position })),
    fontSize: LEADERBOARD_FONT_SIZE,
    textScaleY: leaderboardTextScaleFor(mobile).y,
    textYaw: LEADERBOARD_TEXT_YAW,
    columnTextShapes: leaderboardUsesColumnTextShapes(mobile),
    textShapesPerBoard: mobile ? LEADERBOARD_TEXT_SHAPES_PER_BOARD : LEADERBOARD_DESKTOP_TEXT_SHAPES_PER_BOARD,
  });
  return handles;
}
