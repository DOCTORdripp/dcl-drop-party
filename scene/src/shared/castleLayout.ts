/** Shared 6×6 castle coordinate system. All world geometry derives from this. */
export const SCENE_SCALE = 2;

export const CASTLE_PARCEL = {
  minX: 0,
  maxX: 48 * SCENE_SCALE,
  minZ: 0,
  maxZ: 48 * SCENE_SCALE,
} as const;

/**
 * Scene-space origin is the SW corner of the base parcel (0,0).
 * The grouping root stays at this origin so child positions are world meters.
 * Do not parent the castle at parcel center — that double-offsets the build.
 */
export const CASTLE_ROOT = { x: 0, y: 0, z: 0 } as const;

export const CASTLE_CENTER_X = (CASTLE_PARCEL.minX + CASTLE_PARCEL.maxX) / 2;
export const CASTLE_CENTER_Z = (CASTLE_PARCEL.minZ + CASTLE_PARCEL.maxZ) / 2;
export const CASTLE_SIZE_METERS = CASTLE_PARCEL.maxX - CASTLE_PARCEL.minX;
export const CASTLE_FLOOR_Y = 0;
export const CASTLE_PLATFORM_Y = CASTLE_FLOOR_Y;
export const GRASS_GROUND_SRC = "assets/images/grass.jpg";
/** Hover just above terrain so the texture does not z-fight the landscape. */
export const GRASS_GROUND_Y = 0.02;
/** DCL planes face +Z; pitch -90 aims the face straight up. */
export const GRASS_GROUND_PITCH = -90;
export const WALKWAY_SRC = "assets/images/walkway.png";
/** Authored 247×1860. Long axis of the PNG runs spawn → castle. */
export const WALKWAY_ART_WIDTH = 247;
export const WALKWAY_ART_HEIGHT = 1860;
export const WALKWAY_Y = GRASS_GROUND_Y + 0.02;
export const WALKWAY_START_Z = CASTLE_PARCEL.minZ;
export const WALKWAY_END_Z = 19.8;
/** Fat relative to the original art-native width of the first 24m walkway. */
export const WALKWAY_WIDTH_SCALE = 3.4;
export const WALKWAY_WIDTH_REFERENCE_LENGTH = CASTLE_CENTER_Z * 0.5;
/** Map the PNG 30% longer than the mesh so length is cropped, not scrunched. */
export const WALKWAY_TEXTURE_OVERFLOW = 1.3;
/** Front NPC/chest deck. Raised so they sit on the scaled castle, not under it. */
export const FRONT_UTILITY_Y = 5 * SCENE_SCALE;
export const CASTLE_ARCH_MARGIN = 2.5 * SCENE_SCALE;
export const FRONT_PARCEL_MAX_Z = 16 * SCENE_SCALE;

export const CASTLE_MODEL_SRC = "assets/Models/CASTLE-BLENDER/CASTLE-BLENDER.glb";
export const CASTLE_INTERIOR_SRC = "assets/Models/CASTLE-BLENDER/CASTLE-INTERIOR.glb";
export const HELP_DESK_SRC = "assets/Models/CASTLE-BLENDER/helpDesk.glb";
export const DEPOSIT_CHEST_SRC = "assets/Models/CASTLE-BLENDER/depositChest.glb";
export const WALL_POSTERS_SRC = "assets/Models/CASTLE-BLENDER/wallPosters.glb";
/**
 * The GLB's `emissionEdges` carries its brightness in KHR_materials_emissive_strength
 * (20x), which the DCL client drops — the frames read flat there while Bevy renders
 * them lit. Overriding the node moves the brightness onto `emissiveIntensity`, which
 * every client honours. GltfNodeModifiers targets a whole mesh node, so the edge faces
 * must be separated out of the poster meshes in Blender and exported under this name.
 */
export const WALL_POSTER_EDGE_NODES = ["posterEdges"] as const;
/** Single knob for the glow. Blender used 20; DCL's own default is 2. */
export const WALL_POSTER_EDGE_INTENSITY = 8;
export const WALL_POSTER_EDGE_EMISSIVE = { r: 1, g: 0.72, b: 0.2 } as const;
/** Unlit base stays a dim version of the same gold so the trim never reads black. */
export const WALL_POSTER_EDGE_ALBEDO_SCALE = 0.35;

export function wallPosterEdgeAlbedo(): { r: number; g: number; b: number } {
  return {
    r: WALL_POSTER_EDGE_EMISSIVE.r * WALL_POSTER_EDGE_ALBEDO_SCALE,
    g: WALL_POSTER_EDGE_EMISSIVE.g * WALL_POSTER_EDGE_ALBEDO_SCALE,
    b: WALL_POSTER_EDGE_EMISSIVE.b * WALL_POSTER_EDGE_ALBEDO_SCALE,
  };
}
export const BANNER_MAIN_SRC = "assets/Models/CASTLE-BLENDER/bannerMain.glb";
export const SCROLLER_SRC = "assets/Models/CASTLE-BLENDER/scroller.glb";
export const HALL_TABLE_SRC = "assets/Models/CASTLE-BLENDER/hallTable.glb";
/** Dressing on the hall tabletop; authored against the same castle origin as the table. */
export const HALL_TABLE_SUPPLIES_SRC = "assets/Models/CASTLE-BLENDER/hallTableSupplies.glb";
export const ENTRY_BLOCKER_SRC = "assets/Models/CASTLE-BLENDER/entryBlocker.glb";
export const INDICATOR_PORTAL_SRC = "assets/Models/CASTLE-BLENDER/indicatorPortal.glb";
export const INDICATOR_PORTAL_GOLD_SRC = "assets/Models/CASTLE-BLENDER/indicatorPortalGold.glb";
/** Clip baked into `indicatorPortal.glb` (`IndicatorArmatureAction.001`). */
export const INDICATOR_PORTAL_CLIP = "IndicatorArmatureAction.001";
export const INDICATOR_PORTAL_POSITION = { x: 48, y: 1.3, z: 78.3 } as const;
export const INDICATOR_PORTAL_SCALE = { x: 3.5, y: 2.5, z: 3.5 } as const;
export const HIRE_PORTAL_SCALE = { x: 1, y: 1, z: 1 } as const;
/** Unemployed players see and collide with the entry blocker; employed players do not. */
export function entryBlockerVisible(employed: boolean): boolean {
  return !employed;
}

/**
 * Load `entryBlocker.glb` only after the scene shell, and only while unemployed.
 * Attaching the GLB after a hide pass would bake physics with no rope mesh.
 */
export function shouldLoadEntryBlocker(employed: boolean, sceneShellReady: boolean): boolean {
  return sceneShellReady && entryBlockerVisible(employed);
}
/** Hire glow uses `indicatorPortal.glb` at Old Pete. Also shown when the bag is full. */
export function hirePortalVisible(employed: boolean, needsTurnIn = false): boolean {
  return !employed || needsTurnIn;
}
export function chestGoldPortalVisible(partyActive: boolean): boolean {
  return !partyActive;
}
export const CASTLE_HEDGES_SRC = "assets/Models/CASTLE-BLENDER/castleHedges.glb";
/** Same GLB, mirrored across X so the one-sided export covers both lawns. */
export const CASTLE_HEDGES_MIRROR_SCALE = { x: -1, y: 1, z: 1 } as const;
export const NPC_MODEL_SRC = "assets/Models/CASTLE-BLENDER/oldPeteIdle.glb";
/** Mixamo clip name baked into `oldPeteIdle.glb`. */
export const NPC_IDLE_CLIP = "mixamo.com";
/**
 * `oldPeteIdle.glb` Armature is authored at 0.01 (cm export).
 * 100× brings him to meter scale; extra 1.3× for presence at the desk.
 */
export const NPC_MODEL_SCALE = { x: 150, y: 150, z: 150 } as const;
export const CASTLE_MODEL_SCALE = { x: 1, y: 1, z: 1 } as const;
export const CASTLE_INTERIOR_SCALE = { x: 1, y: 1, z: 1 } as const;
export const CASTLE_MODEL_POSITION = {
  x: CASTLE_CENTER_X,
  y: CASTLE_FLOOR_Y,
  z: CASTLE_CENTER_Z - 6 * SCENE_SCALE,
} as const;

export const CASTLE_SHELL = {
  minX: CASTLE_PARCEL.minX + CASTLE_ARCH_MARGIN,
  maxX: CASTLE_PARCEL.maxX - CASTLE_ARCH_MARGIN,
  minZ: CASTLE_PARCEL.minZ + CASTLE_ARCH_MARGIN,
  maxZ: CASTLE_PARCEL.maxZ - CASTLE_ARCH_MARGIN,
} as const;

export const FRONT_DECK_Z = 18.8 * SCENE_SCALE;
export const FRONT_UTILITY_MAX_Z = FRONT_PARCEL_MAX_Z;

const UTILITY_OFFSET_X = 13 * SCENE_SCALE;

export const HELP_WANTED_PLAZA = {
  x: 47.3,
  y: 11.5,
  z: 52.4,
};

export const CHEST_PLAZA = {
  x: CASTLE_CENTER_X + UTILITY_OFFSET_X,
  z: FRONT_DECK_Z,
  y: FRONT_UTILITY_Y,
};
export const CHEST_GOLD_LIGHT_POSITION = {
  x: 47.9,
  y: 4.5,
  z: 76.5,
} as const;
export const CHEST_GOLD_LIGHT_COLOR = { r: 1, g: 0.72, b: 0.2 } as const;
export const CHEST_GOLD_LIGHT_INTENSITY = 200_000;

export const NPC_PLACEHOLDER = {
  x: HELP_WANTED_PLAZA.x,
  z: HELP_WANTED_PLAZA.z,
  y: HELP_WANTED_PLAZA.y,
  label: "PARTY HOST",
};
export const NPC_WHITE_LIGHT_POSITION = {
  x: NPC_PLACEHOLDER.x,
  y: NPC_PLACEHOLDER.y + 3.5,
  z: NPC_PLACEHOLDER.z - 0.6,
} as const;
export const NPC_WHITE_LIGHT_COLOR = { r: 1, g: 1, b: 1 } as const;
export const NPC_WHITE_LIGHT_INTENSITY = 25_000;

/** Arrival on the walkway. cameraTarget in scene.json must match SCENE_SPAWN_CAMERA_TARGET. */
export const SCENE_SPAWN = { x: 48, y: 0, z: 3.2 } as const;
/**
 * Aim above the front-deck landing so spawn camera pitches up the stairs.
 * A far look-at at NPC height reads as level in third-person.
 */
export const SCENE_SPAWN_CAMERA_TARGET = {
  x: CASTLE_CENTER_X,
  y: FRONT_UTILITY_Y + 36,
  z: FRONT_DECK_Z,
} as const;

export const LEADERBOARD_BLOWERS_SRC = "assets/images/ui_leaderboardBlowers.png";
export const LEADERBOARD_POPPERS_SRC = "assets/images/ui_leaderboardPoppers.png";
/** Authored 1024×1536 (2:3). Poppers PNG is 1024×1535 — same scale. */
export const LEADERBOARD_ART_WIDTH = 1024;
export const LEADERBOARD_ART_HEIGHT = 1536;
/** World-meter width. Height follows the art so both boards stay 2:3. */
export const LEADERBOARD_PLANE_WIDTH = 9;
export const LEADERBOARD_EMISSIVE_INTENSITY = 0.7;
/** DCL planes face +Z; yaw 180 aims them at the drop court. */
export const LEADERBOARD_PLANE_YAW = 180;
export const LEADERBOARD_CENTER_OFFSET_X = 7;
export const LEADERBOARD_BLOWERS_POSITION = {
  x: CASTLE_CENTER_X - LEADERBOARD_CENTER_OFFSET_X,
  y: 8,
  z: 80.3,
} as const;
export const LEADERBOARD_POPPERS_POSITION = {
  x: CASTLE_CENTER_X + LEADERBOARD_CENTER_OFFSET_X,
  y: 8,
  z: 80.3,
} as const;

/** Wide social-boost banner on the chest-facing hall wall. */
export const SOCIAL_BOOST_BANNER_SRC = "assets/images/bannerSocialBoost.png";
export const SOCIAL_BOOST_BANNER_ART_WIDTH = 1024;
export const SOCIAL_BOOST_BANNER_ART_HEIGHT = 341;
export const SOCIAL_BOOST_BANNER_WIDTH = 18 * 0.75;
/** Self-lit through its own art (emissiveTexture). Leaderboard planes sit at 0.7; DCL's default is 2. */
export const SOCIAL_BOOST_BANNER_EMISSIVE_INTENSITY = 1;
/** DCL planes face +Z; yaw 0 aims the front at the deposit chest (greater Z). */
export const SOCIAL_BOOST_BANNER_YAW = 0;
export const SOCIAL_BOOST_BANNER_POSITION = {
  x: CASTLE_CENTER_X,
  y: 4.6,
  z: 43.38,
} as const;
/** Scroller shares the banner's wall position, with its authored base at 2m. */
export const SCROLLER_POSITION = {
  x: SOCIAL_BOOST_BANNER_POSITION.x,
  y: 7.4,
  z: 43.42,
} as const;

export function socialBoostBannerScale(
  width = SOCIAL_BOOST_BANNER_WIDTH,
): { x: number; y: number; z: number } {
  return {
    // Negative X un-mirrors the PNG so the chest-facing front reads left-to-right.
    x: -width,
    y: width * (SOCIAL_BOOST_BANNER_ART_HEIGHT / SOCIAL_BOOST_BANNER_ART_WIDTH),
    z: 1,
  };
}

/** Square social-XP chart posters, mirrored across the build center X. */
export const BONUS_CHART_SRC = "assets/images/bonusChart.jpg";
export const BONUS_CHART_ART_SIZE = 1024;
export const BONUS_CHART_SIZE = 4.5;
/** Matches the social boost banner so the two social-XP surfaces read at one brightness. */
export const BONUS_CHART_EMISSIVE_INTENSITY = 1;
export const BONUS_CHART_POSITION = { x: 34, y: 2.7, z: 52.3 } as const;
/** DCL planes face +Z; yaw 90 aims the west poster +X toward build center. */
export const BONUS_CHART_WEST_YAW = 90;
export const BONUS_CHART_EAST_YAW = -90;

export function mirrorXAcrossBuildCenter(x: number): number {
  return 2 * CASTLE_CENTER_X - x;
}

export const BONUS_CHART_MIRROR_POSITION = {
  x: mirrorXAcrossBuildCenter(BONUS_CHART_POSITION.x),
  y: BONUS_CHART_POSITION.y,
  z: BONUS_CHART_POSITION.z,
} as const;

export function bonusChartScale(size = BONUS_CHART_SIZE): { x: number; y: number; z: number } {
  return {
    x: -size,
    y: size,
    z: 1,
  };
}

export type LeaderboardKind = "blowers" | "poppers";

export function grassGroundPosition(): { x: number; y: number; z: number } {
  return { x: CASTLE_CENTER_X, y: GRASS_GROUND_Y, z: CASTLE_CENTER_Z };
}

export function grassGroundScale(): { x: number; y: number; z: number } {
  return { x: CASTLE_SIZE_METERS, y: CASTLE_SIZE_METERS, z: 1 };
}

export function walkwayLength(): number {
  return WALKWAY_END_Z - WALKWAY_START_Z;
}

export function walkwayWidth(): number {
  return WALKWAY_WIDTH_REFERENCE_LENGTH * (WALKWAY_ART_WIDTH / WALKWAY_ART_HEIGHT) * WALKWAY_WIDTH_SCALE;
}

export function walkwayPosition(): { x: number; y: number; z: number } {
  return {
    x: CASTLE_CENTER_X,
    y: WALKWAY_Y,
    z: (WALKWAY_START_Z + WALKWAY_END_Z) / 2,
  };
}

export function walkwayScale(): { x: number; y: number; z: number } {
  return { x: walkwayWidth(), y: walkwayLength(), z: 1 };
}

export function walkwayTextureTiling(): { x: number; y: number } {
  return { x: 1, y: 1 / WALKWAY_TEXTURE_OVERFLOW };
}

export function walkwayTextureOffset(): { x: number; y: number } {
  const tilingY = 1 / WALKWAY_TEXTURE_OVERFLOW;
  return { x: 0, y: (1 - tilingY) / 2 };
}

export function leaderboardPlaneScale(width = LEADERBOARD_PLANE_WIDTH): { x: number; y: number; z: number } {
  return {
    x: -width,
    y: width * (LEADERBOARD_ART_HEIGHT / LEADERBOARD_ART_WIDTH),
    z: 1,
  };
}

export function leaderboardBoards(): Array<{
  kind: LeaderboardKind;
  src: string;
  position: { x: number; y: number; z: number };
}> {
  return [
    { kind: "blowers", src: LEADERBOARD_BLOWERS_SRC, position: { ...LEADERBOARD_BLOWERS_POSITION } },
    { kind: "poppers", src: LEADERBOARD_POPPERS_SRC, position: { ...LEADERBOARD_POPPERS_POSITION } },
  ];
}

/** Authored balloon-fall polygon. Landings are valid anywhere inside this loop. */
export const DROP_COURT_POLYGON = [
  { x: 60, y: 0.1, z: 77 },
  { x: 60, y: 0.1, z: 68.5 },
  { x: 57.8, y: 0.1, z: 68 },
  { x: 57, y: 0.1, z: 52 },
  { x: 54.5, y: 0.1, z: 52 },
  { x: 54, y: 0.1, z: 55 },
  { x: 41.5, y: 0.1, z: 55 },
  { x: 41.5, y: 0.1, z: 52 },
  { x: 38.5, y: 0.1, z: 52 },
  { x: 38.5, y: 0.1, z: 79 },
  { x: 43, y: 0.1, z: 78.8 },
  { x: 44.4, y: 0.1, z: 72 },
  { x: 52, y: 0.1, z: 72 },
  { x: 52.5, y: 0.1, z: 78.5 },
] as const;

const DROP_COURT_XS = DROP_COURT_POLYGON.map((point) => point.x);
const DROP_COURT_ZS = DROP_COURT_POLYGON.map((point) => point.z);

export const DROP_COURT_LAYOUT = {
  minX: Math.min(...DROP_COURT_XS),
  maxX: Math.max(...DROP_COURT_XS),
  minZ: Math.min(...DROP_COURT_ZS),
  maxZ: Math.max(...DROP_COURT_ZS),
  floorY: CASTLE_FLOOR_Y,
  wallPadding: 0,
  balloonHover: 1.2,
  forbiddenMargin: 0.45,
} as const;

/** World meters in the scaled scene. Identity on purpose so layout cannot drift from placement. */
export function castleWorldPosition(world: { x: number; y?: number; z: number }): { x: number; y: number; z: number } {
  return { x: world.x, y: world.y ?? 0, z: world.z };
}

export function dropCourtCenterX(bounds = DROP_COURT_LAYOUT): number {
  return (bounds.minX + bounds.maxX) / 2;
}

export function dropCourtCenterZ(bounds = DROP_COURT_LAYOUT): number {
  return (bounds.minZ + bounds.maxZ) / 2;
}

export function isWithinParcel(point: { x: number; z: number }, slop = 0): boolean {
  return (
    point.x >= CASTLE_PARCEL.minX - slop &&
    point.x <= CASTLE_PARCEL.maxX + slop &&
    point.z >= CASTLE_PARCEL.minZ - slop &&
    point.z <= CASTLE_PARCEL.maxZ + slop
  );
}

export function respectsArchMargin(point: { x: number; z: number }, slop = 0.05): boolean {
  return (
    point.x >= CASTLE_SHELL.minX - slop &&
    point.x <= CASTLE_SHELL.maxX + slop &&
    point.z >= CASTLE_SHELL.minZ - slop &&
    point.z <= CASTLE_SHELL.maxZ + slop
  );
}

export function isInHelpWantedZone(point: { x: number; z: number }, radius = 3.4 * SCENE_SCALE): boolean {
  return Math.hypot(point.x - HELP_WANTED_PLAZA.x, point.z - HELP_WANTED_PLAZA.z) <= radius;
}

export function isInChestZone(point: { x: number; z: number }, radius = 3.4 * SCENE_SCALE): boolean {
  return Math.hypot(point.x - CHEST_PLAZA.x, point.z - CHEST_PLAZA.z) <= radius;
}

export function dropCourtIsInRearZone(bounds = DROP_COURT_LAYOUT): boolean {
  return bounds.minZ >= FRONT_UTILITY_MAX_Z && bounds.maxZ <= CASTLE_PARCEL.maxZ;
}

export function dropCourtIsCenteredOnAxis(bounds = DROP_COURT_LAYOUT, axis = CASTLE_CENTER_X): boolean {
  return Math.abs(dropCourtCenterX(bounds) - axis) < 0.05;
}

export const MAJOR_LAYOUT_POINTS: Array<{ id: string; x: number; z: number }> = [
  { id: "origin", x: CASTLE_CENTER_X, z: CASTLE_CENTER_Z },
  { id: "castle-model", x: CASTLE_MODEL_POSITION.x, z: CASTLE_MODEL_POSITION.z },
  { id: "help", x: HELP_WANTED_PLAZA.x, z: HELP_WANTED_PLAZA.z },
  { id: "chest", x: CHEST_PLAZA.x, z: CHEST_PLAZA.z },
  { id: "npc", x: NPC_PLACEHOLDER.x, z: NPC_PLACEHOLDER.z },
  { id: "court-center", x: dropCourtCenterX(), z: dropCourtCenterZ() },
];
