import { engine, Transform } from "@dcl/sdk/ecs";
import { movePlayerTo } from "~system/RestrictedActions";
import { SCENE_SPAWN, SCENE_SPAWN_CAMERA_TARGET } from "../shared/castleLayout";

const NEAR_SPAWN_METERS = 6;
let spawnLookApplied = false;

/** scene.json cameraTarget is often ignored in third-person; plant the look once at spawn. */
export function tickSpawnCameraLook(): void {
  if (spawnLookApplied) {
    return;
  }
  const transform = Transform.getOrNull(engine.PlayerEntity);
  if (!transform) {
    return;
  }
  const dx = transform.position.x - SCENE_SPAWN.x;
  const dz = transform.position.z - SCENE_SPAWN.z;
  if (Math.hypot(dx, dz) > NEAR_SPAWN_METERS) {
    spawnLookApplied = true;
    return;
  }
  spawnLookApplied = true;
  void movePlayerTo({
    newRelativePosition: {
      x: transform.position.x,
      y: transform.position.y,
      z: transform.position.z,
    },
    cameraTarget: {
      x: SCENE_SPAWN_CAMERA_TARGET.x,
      y: SCENE_SPAWN_CAMERA_TARGET.y,
      z: SCENE_SPAWN_CAMERA_TARGET.z,
    },
  }).catch((error) => {
    console.log("[CLIENT] spawn camera look failed", {
      error: error instanceof Error ? error.message.slice(0, 80) : "unknown",
    });
  });
}
