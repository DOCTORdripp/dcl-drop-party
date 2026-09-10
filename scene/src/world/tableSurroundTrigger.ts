import { engine, Material, MeshRenderer, Transform } from "@dcl/sdk/ecs";
import { Color4 } from "@dcl/sdk/math";
import { TABLE_SURROUND_TRIGGER } from "../shared/tableSurroundTrigger";

export const TABLE_SURROUND_DEBUG = false;

const SURROUND_DEBUG_COLOR = Color4.create(0.35, 1, 0.45, 0.18);

let surroundDebug: ReturnType<typeof engine.addEntity> | undefined;

export function buildTableSurroundTriggerDebug(
  enabled = TABLE_SURROUND_DEBUG,
): ReturnType<typeof engine.addEntity> | undefined {
  if (surroundDebug) {
    engine.removeEntity(surroundDebug);
    surroundDebug = undefined;
  }
  if (!enabled) {
    return undefined;
  }
  const entity = engine.addEntity();
  surroundDebug = entity;
  Transform.create(entity, {
    position: { ...TABLE_SURROUND_TRIGGER.center },
    scale: { ...TABLE_SURROUND_TRIGGER.size },
  });
  MeshRenderer.setBox(entity);
  Material.setPbrMaterial(entity, {
    albedoColor: SURROUND_DEBUG_COLOR,
    emissiveColor: Color4.create(0.35, 1, 0.45, 1),
    emissiveIntensity: 0.3,
  });
  console.log("[TABLE] surround trigger", TABLE_SURROUND_TRIGGER);
  return entity;
}
