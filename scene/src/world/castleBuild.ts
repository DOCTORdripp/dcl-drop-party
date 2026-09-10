import { Animator, Billboard, ColliderLayer, engine, GltfContainer, GltfNodeModifiers, LightSource, Material, MaterialTransparencyMode, MeshCollider, MeshRenderer, TextShape, Transform, VisibilityComponent } from "@dcl/sdk/ecs";
import { Color3, Color4, Quaternion } from "@dcl/sdk/math";
import { isSceneShellReady, whenSceneShellReady } from "./sceneShellPreload";
import {
  CASTLE_CENTER_X,
  CASTLE_INTERIOR_SCALE,
  CASTLE_INTERIOR_SRC,
  CASTLE_MODEL_POSITION,
  CASTLE_MODEL_SCALE,
  CASTLE_MODEL_SRC,
  CASTLE_ROOT,
  CHEST_GOLD_LIGHT_COLOR,
  CHEST_GOLD_LIGHT_INTENSITY,
  CHEST_GOLD_LIGHT_POSITION,
  DEPOSIT_CHEST_SRC,
  GRASS_GROUND_PITCH,
  GRASS_GROUND_SRC,
  HELP_DESK_SRC,
  WALL_POSTERS_SRC,
  WALL_POSTER_EDGE_EMISSIVE,
  WALL_POSTER_EDGE_INTENSITY,
  WALL_POSTER_EDGE_NODES,
  wallPosterEdgeAlbedo,
  BANNER_MAIN_SRC,
  SCROLLER_SRC,
  HALL_TABLE_SRC,
  HALL_TABLE_SUPPLIES_SRC,
  ENTRY_BLOCKER_SRC,
  CASTLE_HEDGES_SRC,
  CASTLE_HEDGES_MIRROR_SCALE,
  INDICATOR_PORTAL_SRC,
  INDICATOR_PORTAL_GOLD_SRC,
  INDICATOR_PORTAL_CLIP,
  INDICATOR_PORTAL_POSITION,
  INDICATOR_PORTAL_SCALE,
  HIRE_PORTAL_SCALE,
  FRONT_UTILITY_Y,
  entryBlockerVisible,
  shouldLoadEntryBlocker,
  hirePortalVisible,
  chestGoldPortalVisible,
  NPC_IDLE_CLIP,
  NPC_MODEL_SCALE,
  NPC_MODEL_SRC,
  NPC_PLACEHOLDER,
  NPC_WHITE_LIGHT_COLOR,
  NPC_WHITE_LIGHT_INTENSITY,
  NPC_WHITE_LIGHT_POSITION,
  SOCIAL_BOOST_BANNER_EMISSIVE_INTENSITY,
  SOCIAL_BOOST_BANNER_POSITION,
  SOCIAL_BOOST_BANNER_SRC,
  SOCIAL_BOOST_BANNER_YAW,
  SCROLLER_POSITION,
  BONUS_CHART_EAST_YAW,
  BONUS_CHART_EMISSIVE_INTENSITY,
  BONUS_CHART_MIRROR_POSITION,
  BONUS_CHART_POSITION,
  BONUS_CHART_SRC,
  BONUS_CHART_WEST_YAW,
  WALKWAY_SRC,
  castleWorldPosition,
  grassGroundPosition,
  grassGroundScale,
  bonusChartScale,
  socialBoostBannerScale,
  walkwayPosition,
  walkwayScale,
  walkwayTextureOffset,
  walkwayTextureTiling,
} from "../shared/castleLayout";
import { buildLeaderboardPlanes, type LeaderboardHandles } from "./leaderboardPlanes";
import { HELP_WANTED_TRIGGER } from "../shared/employeeGreetingTrigger";

export type CastleHandles = {
  root: ReturnType<typeof engine.addEntity>;
  grassGround: ReturnType<typeof engine.addEntity>;
  walkway: ReturnType<typeof engine.addEntity>;
  castleModel: ReturnType<typeof engine.addEntity>;
  castleInterior: ReturnType<typeof engine.addEntity>;
  castleHedges: ReturnType<typeof engine.addEntity>;
  castleHedgesMirror: ReturnType<typeof engine.addEntity>;
  wallPosters: ReturnType<typeof engine.addEntity>;
  bannerMain: ReturnType<typeof engine.addEntity>;
  scroller: ReturnType<typeof engine.addEntity>;
  socialBoostBanner: ReturnType<typeof engine.addEntity>;
  bonusChartWest: ReturnType<typeof engine.addEntity>;
  bonusChartEast: ReturnType<typeof engine.addEntity>;
  hallTable: ReturnType<typeof engine.addEntity>;
  hallTableSupplies: ReturnType<typeof engine.addEntity>;
  entryBlocker: ReturnType<typeof engine.addEntity>;
  indicatorPortal: ReturnType<typeof engine.addEntity>;
  hirePortal: ReturnType<typeof engine.addEntity>;
  helpDesk: ReturnType<typeof engine.addEntity>;
  depositChest: ReturnType<typeof engine.addEntity>;
  depositChestLight: ReturnType<typeof engine.addEntity>;
  npcLight: ReturnType<typeof engine.addEntity>;
  npcRoot: ReturnType<typeof engine.addEntity>;
  npcTorso: ReturnType<typeof engine.addEntity>;
  npcSpeech: ReturnType<typeof engine.addEntity>;
  leaderboards: LeaderboardHandles;
};

const CASTLE_GLTF_COLLIDERS = ColliderLayer.CL_PHYSICS | ColliderLayer.CL_POINTER;

function attachGltf(
  entity: ReturnType<typeof engine.addEntity>,
  src: string,
  collisionMask = CASTLE_GLTF_COLLIDERS,
) {
  GltfContainer.createOrReplace(entity, {
    src,
    visibleMeshesCollisionMask: collisionMask,
    invisibleMeshesCollisionMask: collisionMask,
  });
}

function placeGltfSlot(
  root: ReturnType<typeof engine.addEntity>,
  scale: { x: number; y: number; z: number },
) {
  const entity = engine.addEntity();
  Transform.create(entity, {
    parent: root,
    position: castleWorldPosition(CASTLE_MODEL_POSITION),
    scale,
  });
  return entity;
}

function placeGltf(
  root: ReturnType<typeof engine.addEntity>,
  src: string,
  scale: { x: number; y: number; z: number },
  collisionMask = CASTLE_GLTF_COLLIDERS,
) {
  const entity = placeGltfSlot(root, scale);
  attachGltf(entity, src, collisionMask);
  return entity;
}

function placeGroundPlane(
  root: ReturnType<typeof engine.addEntity>,
  src: string,
  position: { x: number; y: number; z: number },
  scale: { x: number; y: number; z: number },
  uv?: { tiling: { x: number; y: number }; offset: { x: number; y: number } },
) {
  const plane = engine.addEntity();
  Transform.create(plane, {
    parent: root,
    position: castleWorldPosition(position),
    rotation: Quaternion.fromEulerDegrees(GRASS_GROUND_PITCH, 0, 0),
    scale,
  });
  MeshRenderer.setPlane(plane);
  const texture = Material.Texture.Common({
    src,
    ...(uv ? { tiling: uv.tiling, offset: uv.offset } : {}),
  });
  Material.setPbrMaterial(plane, {
    texture,
    albedoColor: Color4.create(1, 1, 1, 1),
    metallic: 0,
    roughness: 1,
    specularIntensity: 0,
    castShadows: false,
  });
  return plane;
}

function buildGrassGround(root: ReturnType<typeof engine.addEntity>) {
  return placeGroundPlane(root, GRASS_GROUND_SRC, grassGroundPosition(), grassGroundScale());
}

function buildWalkway(root: ReturnType<typeof engine.addEntity>) {
  return placeGroundPlane(root, WALKWAY_SRC, walkwayPosition(), walkwayScale(), {
    tiling: walkwayTextureTiling(),
    offset: walkwayTextureOffset(),
  });
}

function buildCastleModel(root: ReturnType<typeof engine.addEntity>) {
  return placeGltf(root, CASTLE_MODEL_SRC, CASTLE_MODEL_SCALE);
}

function buildCastleInteriorSlot(root: ReturnType<typeof engine.addEntity>) {
  return placeGltfSlot(root, CASTLE_INTERIOR_SCALE);
}

function buildCastleHedges(root: ReturnType<typeof engine.addEntity>) {
  return placeGltf(root, CASTLE_HEDGES_SRC, CASTLE_MODEL_SCALE);
}

function buildCastleHedgesMirror(root: ReturnType<typeof engine.addEntity>) {
  return placeGltf(root, CASTLE_HEDGES_SRC, CASTLE_HEDGES_MIRROR_SCALE);
}

function buildHelpDeskSlot(root: ReturnType<typeof engine.addEntity>) {
  return placeGltfSlot(root, CASTLE_MODEL_SCALE);
}

function buildDepositChestSlot(root: ReturnType<typeof engine.addEntity>) {
  return placeGltfSlot(root, CASTLE_MODEL_SCALE);
}

function buildDepositChestLight() {
  const light = engine.addEntity();
  Transform.create(light, {
    position: castleWorldPosition(CHEST_GOLD_LIGHT_POSITION),
  });
  LightSource.create(light, {
    type: LightSource.Type.Point({}),
    color: Color3.create(
      CHEST_GOLD_LIGHT_COLOR.r,
      CHEST_GOLD_LIGHT_COLOR.g,
      CHEST_GOLD_LIGHT_COLOR.b,
    ),
    intensity: CHEST_GOLD_LIGHT_INTENSITY,
  });
  return light;
}

function buildNpcLight() {
  const light = engine.addEntity();
  Transform.create(light, {
    position: castleWorldPosition(NPC_WHITE_LIGHT_POSITION),
  });
  LightSource.create(light, {
    type: LightSource.Type.Point({}),
    color: Color3.create(
      NPC_WHITE_LIGHT_COLOR.r,
      NPC_WHITE_LIGHT_COLOR.g,
      NPC_WHITE_LIGHT_COLOR.b,
    ),
    intensity: NPC_WHITE_LIGHT_INTENSITY,
  });
  return light;
}

function attachWallPosterEdges(entity: ReturnType<typeof engine.addEntity>) {
  const albedo = wallPosterEdgeAlbedo();
  GltfNodeModifiers.createOrReplace(entity, {
    modifiers: WALL_POSTER_EDGE_NODES.map((path) => ({
      path,
      material: {
        material: {
          $case: "pbr" as const,
          pbr: {
            albedoColor: Color4.create(albedo.r, albedo.g, albedo.b, 1),
            emissiveColor: Color3.create(
              WALL_POSTER_EDGE_EMISSIVE.r,
              WALL_POSTER_EDGE_EMISSIVE.g,
              WALL_POSTER_EDGE_EMISSIVE.b,
            ),
            emissiveIntensity: WALL_POSTER_EDGE_INTENSITY,
            metallic: 0,
            roughness: 0.4,
          },
        },
      },
    })),
  });
}

function buildWallPosterSlot(root: ReturnType<typeof engine.addEntity>) {
  return placeGltfSlot(root, CASTLE_MODEL_SCALE);
}

function buildBannerMainSlot(root: ReturnType<typeof engine.addEntity>) {
  return placeGltfSlot(root, CASTLE_MODEL_SCALE);
}

function buildScrollerSlot(root: ReturnType<typeof engine.addEntity>) {
  const entity = engine.addEntity();
  Transform.create(entity, {
    parent: root,
    position: castleWorldPosition(SCROLLER_POSITION),
    rotation: Quaternion.fromEulerDegrees(0, 0, 0),
    scale: { x: 0.35, y: 0.35, z: 0.35 },
  });
  return entity;
}

function applyEmissivePlaneTexture(
  plane: ReturnType<typeof engine.addEntity>,
  src: string,
  emissiveIntensity: number,
) {
  const texture = Material.Texture.Common({ src });
  Material.setPbrMaterial(plane, {
    texture,
    emissiveTexture: texture,
    albedoColor: Color4.create(1, 1, 1, 1),
    emissiveColor: Color3.create(1, 1, 1),
    emissiveIntensity,
    metallic: 0,
    roughness: 1,
    specularIntensity: 0,
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST_AND_ALPHA_BLEND,
    alphaTest: 0.35,
    castShadows: false,
  });
}

function buildSocialBoostBanner(root: ReturnType<typeof engine.addEntity>) {
  const plane = engine.addEntity();
  Transform.create(plane, {
    parent: root,
    position: castleWorldPosition(SOCIAL_BOOST_BANNER_POSITION),
    rotation: Quaternion.fromEulerDegrees(0, SOCIAL_BOOST_BANNER_YAW, 0),
    scale: socialBoostBannerScale(),
  });
  MeshRenderer.setPlane(plane);
  return plane;
}

function buildBonusChartPlane(
  root: ReturnType<typeof engine.addEntity>,
  position: { x: number; y: number; z: number },
  yaw: number,
) {
  const plane = engine.addEntity();
  Transform.create(plane, {
    parent: root,
    position: castleWorldPosition(position),
    rotation: Quaternion.fromEulerDegrees(0, yaw, 0),
    scale: bonusChartScale(),
  });
  MeshRenderer.setPlane(plane);
  return plane;
}

function buildHallTableSlot(root: ReturnType<typeof engine.addEntity>) {
  // Temporary: no physics/pointer colliders so sitting is not shoved by the table/chairs.
  return placeGltfSlot(root, CASTLE_MODEL_SCALE);
}

function buildHallTableSuppliesSlot(root: ReturnType<typeof engine.addEntity>) {
  return placeGltfSlot(root, CASTLE_MODEL_SCALE);
}

function buildEntryBlockerSlot(root: ReturnType<typeof engine.addEntity>) {
  return placeGltfSlot(root, CASTLE_MODEL_SCALE);
}

let lastEntryBlockerEmployed = false;

export function syncEntryBlockerWithEmployment(
  entity: ReturnType<typeof engine.addEntity>,
  employed: boolean,
): void {
  lastEntryBlockerEmployed = employed;
  const visible = entryBlockerVisible(employed);
  VisibilityComponent.createOrReplace(entity, { visible });
  if (!shouldLoadEntryBlocker(employed, isSceneShellReady())) {
    if (GltfContainer.has(entity)) {
      GltfContainer.deleteFrom(entity);
    }
    return;
  }
  if (!GltfContainer.has(entity)) {
    attachGltf(entity, ENTRY_BLOCKER_SRC);
  }
}

function placeIndicatorPortalSlot(
  root: ReturnType<typeof engine.addEntity>,
  position: { x: number; y: number; z: number },
  scale: { x: number; y: number; z: number },
  parent?: ReturnType<typeof engine.addEntity>,
) {
  const entity = engine.addEntity();
  Transform.create(entity, {
    parent: parent ?? root,
    position: parent ? position : castleWorldPosition(position),
    scale,
  });
  return entity;
}

function attachIndicatorPortalGltf(
  entity: ReturnType<typeof engine.addEntity>,
  src: string,
  clip?: string,
) {
  GltfContainer.createOrReplace(entity, {
    src,
    visibleMeshesCollisionMask: ColliderLayer.CL_NONE,
    invisibleMeshesCollisionMask: ColliderLayer.CL_NONE,
  });
  if (clip) {
    Animator.createOrReplace(entity, {
      states: [{ clip, playing: true, loop: true }],
    });
  }
}

function buildIndicatorPortalSlot(root: ReturnType<typeof engine.addEntity>) {
  return placeIndicatorPortalSlot(root, INDICATOR_PORTAL_POSITION, INDICATOR_PORTAL_SCALE);
}

function buildHirePortalSlot(root: ReturnType<typeof engine.addEntity>) {
  return placeIndicatorPortalSlot(root, {
    x: HELP_WANTED_TRIGGER.center.x,
    y: FRONT_UTILITY_Y + INDICATOR_PORTAL_POSITION.y,
    z: HELP_WANTED_TRIGGER.center.z,
  }, HIRE_PORTAL_SCALE);
}

export function syncHirePortalWithEmployment(
  entity: ReturnType<typeof engine.addEntity>,
  employed: boolean,
  needsTurnIn = false,
): void {
  VisibilityComponent.createOrReplace(entity, { visible: hirePortalVisible(employed, needsTurnIn) });
}

export function syncChestGoldPortalWithParty(
  entity: ReturnType<typeof engine.addEntity>,
  partyActive: boolean,
): void {
  VisibilityComponent.createOrReplace(entity, { visible: chestGoldPortalVisible(partyActive) });
}

function buildNpc(root: ReturnType<typeof engine.addEntity>) {
  const npcRoot = engine.addEntity();
  const lookX = CASTLE_CENTER_X - NPC_PLACEHOLDER.x;
  const lookZ = 16.4 - NPC_PLACEHOLDER.z;
  const yaw = (Math.atan2(lookX, lookZ) * 180) / Math.PI;
  Transform.create(npcRoot, {
    parent: root,
    position: castleWorldPosition(NPC_PLACEHOLDER),
    rotation: Quaternion.fromEulerDegrees(0, yaw, 0),
  });
  const npcModel = engine.addEntity();
  Transform.create(npcModel, { parent: npcRoot, scale: NPC_MODEL_SCALE });
  const npcTorso = engine.addEntity();
  Transform.create(npcTorso, {
    parent: npcRoot,
    position: { x: 0, y: 0.9, z: 0 },
    scale: { x: 0.7, y: 1.8, z: 0.5 },
  });
  MeshCollider.setBox(npcTorso);
  const npcSpeech = engine.addEntity();
  Transform.create(npcSpeech, { parent: npcRoot, position: { x: 0, y: 2.2, z: 0 } });
  TextShape.create(npcSpeech, {
    text: "",
    fontSize: 1.4,
    textWrapping: true,
    width: 3.6,
    height: 1.4,
    textColor: Color4.White(),
  });
  Billboard.create(npcSpeech);
  return { npcRoot, npcModel, npcTorso, npcSpeech };
}

function attachNpcModel(npcModel: ReturnType<typeof engine.addEntity>) {
  GltfContainer.createOrReplace(npcModel, {
    src: NPC_MODEL_SRC,
    visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
    invisibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
  });
  Animator.createOrReplace(npcModel, {
    states: [{ clip: NPC_IDLE_CLIP, playing: true, loop: true }],
  });
}

export function buildDropPartyCastle(): CastleHandles {
  const root = engine.addEntity();
  Transform.create(root, { position: { x: CASTLE_ROOT.x, y: CASTLE_ROOT.y, z: CASTLE_ROOT.z } });
  const grassGround = buildGrassGround(root);
  const walkway = buildWalkway(root);
  const castleModel = buildCastleModel(root);
  const castleHedges = buildCastleHedges(root);
  const castleHedgesMirror = buildCastleHedgesMirror(root);
  const castleInterior = buildCastleInteriorSlot(root);
  const wallPosters = buildWallPosterSlot(root);
  const bannerMain = buildBannerMainSlot(root);
  const scroller = buildScrollerSlot(root);
  const socialBoostBanner = buildSocialBoostBanner(root);
  const bonusChartWest = buildBonusChartPlane(root, BONUS_CHART_POSITION, BONUS_CHART_WEST_YAW);
  const bonusChartEast = buildBonusChartPlane(root, BONUS_CHART_MIRROR_POSITION, BONUS_CHART_EAST_YAW);
  const hallTable = buildHallTableSlot(root);
  const hallTableSupplies = buildHallTableSuppliesSlot(root);
  const entryBlocker = buildEntryBlockerSlot(root);
  const indicatorPortal = buildIndicatorPortalSlot(root);
  const hirePortal = buildHirePortalSlot(root);
  const helpDesk = buildHelpDeskSlot(root);
  const depositChest = buildDepositChestSlot(root);
  const depositChestLight = buildDepositChestLight();
  const npc = buildNpc(root);
  const npcLight = buildNpcLight();
  const leaderboards = buildLeaderboardPlanes(root);
  whenSceneShellReady(() => {
    attachGltf(castleInterior, CASTLE_INTERIOR_SRC);
    attachGltf(wallPosters, WALL_POSTERS_SRC);
    attachWallPosterEdges(wallPosters);
    attachGltf(bannerMain, BANNER_MAIN_SRC);
    attachGltf(scroller, SCROLLER_SRC);
    applyEmissivePlaneTexture(socialBoostBanner, SOCIAL_BOOST_BANNER_SRC, SOCIAL_BOOST_BANNER_EMISSIVE_INTENSITY);
    applyEmissivePlaneTexture(bonusChartWest, BONUS_CHART_SRC, BONUS_CHART_EMISSIVE_INTENSITY);
    applyEmissivePlaneTexture(bonusChartEast, BONUS_CHART_SRC, BONUS_CHART_EMISSIVE_INTENSITY);
    attachGltf(hallTable, HALL_TABLE_SRC, ColliderLayer.CL_NONE);
    attachGltf(hallTableSupplies, HALL_TABLE_SUPPLIES_SRC);
    syncEntryBlockerWithEmployment(entryBlocker, lastEntryBlockerEmployed);
    attachIndicatorPortalGltf(indicatorPortal, INDICATOR_PORTAL_GOLD_SRC, INDICATOR_PORTAL_CLIP);
    attachIndicatorPortalGltf(hirePortal, INDICATOR_PORTAL_SRC, INDICATOR_PORTAL_CLIP);
    attachGltf(helpDesk, HELP_DESK_SRC);
    attachGltf(depositChest, DEPOSIT_CHEST_SRC);
    attachNpcModel(npc.npcModel);
  });
  console.log("[WORLD] castle model ready", {
    src: CASTLE_MODEL_SRC,
    interior: CASTLE_INTERIOR_SRC,
    hedges: CASTLE_HEDGES_SRC,
    hedgesMirrorScale: CASTLE_HEDGES_MIRROR_SCALE,
    wallPosters: WALL_POSTERS_SRC,
    bannerMain: BANNER_MAIN_SRC,
    scroller: SCROLLER_SRC,
    socialBoostBanner: SOCIAL_BOOST_BANNER_SRC,
    bonusChart: BONUS_CHART_SRC,
    hallTable: HALL_TABLE_SRC,
    hallTableSupplies: HALL_TABLE_SUPPLIES_SRC,
    entryBlocker: ENTRY_BLOCKER_SRC,
    indicatorPortal: INDICATOR_PORTAL_GOLD_SRC,
    hirePortal: INDICATOR_PORTAL_SRC,
    helpDesk: HELP_DESK_SRC,
    depositChest: DEPOSIT_CHEST_SRC,
    npc: NPC_MODEL_SRC,
    position: CASTLE_MODEL_POSITION,
    castleScale: CASTLE_MODEL_SCALE,
    interiorScale: CASTLE_INTERIOR_SCALE,
  });
  return { root, grassGround, walkway, castleModel, castleInterior, castleHedges, castleHedgesMirror, wallPosters, bannerMain, scroller, socialBoostBanner, bonusChartWest, bonusChartEast, hallTable, hallTableSupplies, entryBlocker, indicatorPortal, hirePortal, helpDesk, depositChest, depositChestLight, npcLight, npcRoot: npc.npcRoot, npcTorso: npc.npcTorso, npcSpeech: npc.npcSpeech, leaderboards };
}
