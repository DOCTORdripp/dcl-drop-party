import { ColliderLayer, engine, InputAction, Material, MeshCollider, MeshRenderer, PointerEvents, Transform, pointerEventsSystem } from "@dcl/sdk/ecs";
import { Color4, Quaternion } from "@dcl/sdk/math";
import {
  TABLE_SEATS,
  TABLE_SEAT_BOX,
  chairColliderPoses,
  sitSupportPose,
  tableSeatBoxCenter,
  tableTopColliderPose,
  tableTopCollisionEnabled,
  type TableSeat,
  type Vec3,
} from "../shared/tableSeats";
import { isChairOccupied } from "../shared/tableSocialBonus";

export const TABLE_SEAT_DEBUG = false;
export const TABLE_SEAT_HOVER_TEXT = "GET BONUS XP";
const TABLE_SEAT_HOVER_DISTANCE = 8;

const SEAT_DEBUG_COLOR = Color4.create(0.2, 0.85, 1, 0.28);
const TABLE_TOP_DEBUG_COLOR = Color4.create(0.2, 0.55, 1, 0.22);
const CHAIR_PHYSICS_DEBUG_COLOR = Color4.create(1, 0.45, 0.2, 0.28);

let tableTopCollider: ReturnType<typeof engine.addEntity> | undefined;
let sitSupport: ReturnType<typeof engine.addEntity> | undefined;
const chairColliders: Array<ReturnType<typeof engine.addEntity>> = [];
const sitTargetEntities: Array<ReturnType<typeof engine.addEntity>> = [];

function removeTracked(entities: Array<ReturnType<typeof engine.addEntity>>): void {
  for (const entity of entities) {
    engine.removeEntity(entity);
  }
  entities.length = 0;
}

function buildSeatDebugBox(seat: TableSeat, onSit: (seat: TableSeat) => void): ReturnType<typeof engine.addEntity> {
  const entity = engine.addEntity();
  Transform.create(entity, {
    position: tableSeatBoxCenter(seat.sit),
    scale: { ...TABLE_SEAT_BOX },
  });
  MeshCollider.setBox(entity, ColliderLayer.CL_POINTER);
  if (TABLE_SEAT_DEBUG) {
    MeshRenderer.setBox(entity);
    Material.setPbrMaterial(entity, {
      albedoColor: SEAT_DEBUG_COLOR,
      emissiveColor: Color4.create(0.2, 0.85, 1, 1),
      emissiveIntensity: 0.4,
    });
  }
  pointerEventsSystem.onPointerDown(
    {
      entity,
      opts: { button: InputAction.IA_POINTER, hoverText: TABLE_SEAT_HOVER_TEXT, maxDistance: TABLE_SEAT_HOVER_DISTANCE },
    },
    () => onSit(seat),
  );
  return entity;
}

export function buildTableSeatTargets(onSit: (seat: TableSeat) => void): Array<ReturnType<typeof engine.addEntity>> {
  removeTracked(sitTargetEntities);
  console.log("[SIT] seats", { count: TABLE_SEATS.length, size: TABLE_SEAT_BOX, debug: TABLE_SEAT_DEBUG });
  const built = TABLE_SEATS.map((seat) => buildSeatDebugBox(seat, onSit));
  sitTargetEntities.push(...built);
  return built;
}

let promptsHiddenForLocalSit = false;
let promptsHiddenForModal = false;
let occupiedChairMask = 0;

function setSeatPromptEnabled(entity: ReturnType<typeof engine.addEntity>, enabled: boolean): void {
  const registered = PointerEvents.getMutableOrNull(entity);
  const info = registered?.pointerEvents[0]?.eventInfo;
  if (info) {
    info.showFeedback = enabled;
    info.showHighlight = enabled;
    info.maxDistance = enabled ? TABLE_SEAT_HOVER_DISTANCE : 0;
  }
  if (enabled) {
    MeshCollider.setBox(entity, ColliderLayer.CL_POINTER);
  } else if (MeshCollider.has(entity)) {
    MeshCollider.deleteFrom(entity);
  }
}

function applyTableSeatPrompts(): void {
  for (let i = 0; i < sitTargetEntities.length; i++) {
    const entity = sitTargetEntities[i];
    const seat = TABLE_SEATS[i];
    if (!entity || !seat) {
      continue;
    }
    const taken = isChairOccupied(occupiedChairMask, seat.id);
    setSeatPromptEnabled(
      entity,
      !promptsHiddenForLocalSit && !promptsHiddenForModal && !taken,
    );
  }
}

/** Hide every GET BONUS XP prompt while this client is seated. */
export function setTableSeatPromptsHiddenForLocalSit(hidden: boolean): void {
  promptsHiddenForLocalSit = hidden;
  applyTableSeatPrompts();
}

/** Hide every GET BONUS XP action while a blocking scene UI is open. */
export function setTableSeatPromptsHiddenForModal(hidden: boolean): void {
  if (promptsHiddenForModal === hidden) return;
  promptsHiddenForModal = hidden;
  applyTableSeatPrompts();
}

/** Occupied chairs have no GET BONUS XP so nobody sits on someone else. */
export function setOccupiedChairMask(mask: number): void {
  occupiedChairMask = mask >>> 0;
  applyTableSeatPrompts();
}

export function buildTableTopCollider(): ReturnType<typeof engine.addEntity> {
  if (tableTopCollider) {
    engine.removeEntity(tableTopCollider);
    tableTopCollider = undefined;
  }
  const pose = tableTopColliderPose();
  const entity = engine.addEntity();
  tableTopCollider = entity;
  Transform.create(entity, {
    position: pose.position,
    scale: pose.scale,
  });
  setLocalTableTopCollision(tableTopCollisionEnabled(false));
  if (TABLE_SEAT_DEBUG) {
    MeshRenderer.setBox(entity);
    Material.setPbrMaterial(entity, {
      albedoColor: TABLE_TOP_DEBUG_COLOR,
      emissiveColor: Color4.create(0.2, 0.55, 1, 1),
      emissiveIntensity: 0.25,
    });
  }
  console.log("[SIT] table top collider", pose);
  return entity;
}

export function setLocalTableTopCollision(enabled: boolean): void {
  if (tableTopCollider) {
    if (enabled) {
      MeshCollider.setBox(tableTopCollider, ColliderLayer.CL_PHYSICS);
    } else if (MeshCollider.has(tableTopCollider)) {
      MeshCollider.deleteFrom(tableTopCollider);
    }
  }
  for (const chair of chairColliders) {
    if (enabled) {
      MeshCollider.setBox(chair, ColliderLayer.CL_PHYSICS);
    } else if (MeshCollider.has(chair)) {
      MeshCollider.deleteFrom(chair);
    }
  }
}

/**
 * Invisible pad that holds a Bevy sitter at the plant height. Local-only, and only
 * alive while this client is idle-sitting, so it can never block anyone walking.
 */
export function setLocalSitSupport(plant: Vec3 | undefined): void {
  if (!plant) {
    if (sitSupport) {
      engine.removeEntity(sitSupport);
      sitSupport = undefined;
    }
    return;
  }
  if (!sitSupport) {
    sitSupport = engine.addEntity();
  }
  const pose = sitSupportPose(plant);
  Transform.createOrReplace(sitSupport, { position: pose.position, scale: pose.scale });
  MeshCollider.setBox(sitSupport, ColliderLayer.CL_PHYSICS);
  if (TABLE_SEAT_DEBUG) {
    MeshRenderer.setBox(sitSupport);
    Material.setPbrMaterial(sitSupport, {
      albedoColor: CHAIR_PHYSICS_DEBUG_COLOR,
      emissiveColor: Color4.create(0.2, 1, 0.45, 1),
      emissiveIntensity: 0.35,
    });
  }
}

function applyChairPhysicsDebug(entity: ReturnType<typeof engine.addEntity>): void {
  if (!TABLE_SEAT_DEBUG) {
    return;
  }
  MeshRenderer.setBox(entity);
  Material.setPbrMaterial(entity, {
    albedoColor: CHAIR_PHYSICS_DEBUG_COLOR,
    emissiveColor: Color4.create(1, 0.45, 0.2, 1),
    emissiveIntensity: 0.35,
  });
}

export function buildChairColliders(): Array<ReturnType<typeof engine.addEntity>> {
  removeTracked(chairColliders);
  for (const seat of TABLE_SEATS) {
    const poses = chairColliderPoses(seat);
    for (const pose of [poses.seat, poses.back]) {
      const entity = engine.addEntity();
      const rotation =
        pose.rotation.x === 0 && pose.rotation.y === 0 && pose.rotation.z === 0
          ? undefined
          : Quaternion.fromEulerDegrees(pose.rotation.x, pose.rotation.y, pose.rotation.z);
      Transform.create(entity, {
        position: pose.position,
        scale: pose.scale,
        ...(rotation ? { rotation } : {}),
      });
      applyChairPhysicsDebug(entity);
      chairColliders.push(entity);
    }
  }
  setLocalTableTopCollision(tableTopCollisionEnabled(false));
  console.log("[SIT] chair colliders", { count: chairColliders.length });
  return chairColliders;
}
