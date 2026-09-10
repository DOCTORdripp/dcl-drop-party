import { engine, Material, MeshRenderer, Transform } from "@dcl/sdk/ecs";
import { Color4 } from "@dcl/sdk/math";
import {
  EMPLOYEE_GREETING_TRIGGER,
  HELP_WANTED_TRIGGER,
  type AxisAlignedTrigger,
} from "../shared/employeeGreetingTrigger";

export const EMPLOYEE_GREETING_TRIGGER_DEBUG = false;

const ENTRY_DEBUG_COLOR = Color4.create(0.15, 1, 0.35, 0.28);
const HELP_WANTED_DEBUG_COLOR = Color4.create(1, 0.45, 0.12, 0.28);

function buildTriggerDebugBox(
  zone: AxisAlignedTrigger,
  color: ReturnType<typeof Color4.create>,
  label: string,
): ReturnType<typeof engine.addEntity> {
  const entity = engine.addEntity();
  Transform.create(entity, {
    position: { ...zone.center },
    scale: { ...zone.size },
  });
  MeshRenderer.setBox(entity);
  Material.setPbrMaterial(entity, {
    albedoColor: color,
    emissiveColor: Color4.create(color.r, color.g, color.b, 1),
    emissiveIntensity: 0.45,
  });
  console.log(`[BALLOON] ${label} debug trigger`, { center: zone.center, size: zone.size });
  return entity;
}

export function buildEmployeeGreetingTriggerDebug(
  enabled = EMPLOYEE_GREETING_TRIGGER_DEBUG,
): ReturnType<typeof engine.addEntity> | undefined {
  if (!enabled) {
    return undefined;
  }
  buildTriggerDebugBox(HELP_WANTED_TRIGGER, HELP_WANTED_DEBUG_COLOR, "help-wanted");
  return buildTriggerDebugBox(EMPLOYEE_GREETING_TRIGGER, ENTRY_DEBUG_COLOR, "returning-employee");
}
