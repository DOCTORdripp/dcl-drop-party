import type { Vec3 } from "./tableSeats";

export type SitPlantMoveArgs = {
  newRelativePosition: Vec3;
  cameraTarget?: Vec3;
  avatarTarget?: Vec3;
};

/**
 * Unity (desktop): avatarTarget faces the table; omitting cameraTarget keeps the camera.
 * Bevy (mobile): send both — avatarTarget still faces the table, cameraTarget pins the
 * current view so 3rd-person camera does not inherit avatar yaw.
 */
export function sitPlantMoveArgs(input: {
  position: Vec3;
  tableLookAt: Vec3;
  cameraLookAt?: Vec3;
  mobile: boolean;
}): SitPlantMoveArgs {
  const newRelativePosition = { x: input.position.x, y: input.position.y, z: input.position.z };
  const avatarTarget = { x: input.tableLookAt.x, y: input.tableLookAt.y, z: input.tableLookAt.z };
  if (input.mobile) {
    if (input.cameraLookAt) {
      return {
        newRelativePosition,
        avatarTarget,
        cameraTarget: { x: input.cameraLookAt.x, y: input.cameraLookAt.y, z: input.cameraLookAt.z },
      };
    }
    return { newRelativePosition, avatarTarget };
  }
  return { newRelativePosition, avatarTarget };
}
