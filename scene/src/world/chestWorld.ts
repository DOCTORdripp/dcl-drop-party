import { InputAction, PointerEvents, Transform, engine, pointerEventsSystem } from "@dcl/sdk/ecs";
import { CASTLE_MODEL_POSITION, castleWorldPosition } from "../shared/castleLayout";
import type { ChestPresentation } from "../shared/chestPresentation";
import type { CastleHandles } from "./castleBuild";

/** Native prompt and the only F → open path. Same PointerEvents registration for desktop and mobile. */
export const CHEST_OPEN_INPUT = InputAction.IA_SECONDARY;
const CHEST_HOVER_DISTANCE = 8;
let chestInteractionEnabled = true;

export function bindChestInteractions(
  handles: CastleHandles,
  onOpenRoot: () => void,
  _onSecondary?: () => void,
): void {
  pointerEventsSystem.onPointerDown(
    {
      entity: handles.depositChest,
      opts: {
        button: CHEST_OPEN_INPUT,
        hoverText: "DEPOSIT CHEST",
        maxDistance: CHEST_HOVER_DISTANCE,
      },
    },
    (event) => {
      const registered = PointerEvents.getOrNull(handles.depositChest);
      const info = registered?.pointerEvents[0]?.eventInfo;
      console.log("[CHEST F] key received");
      console.log(`[CHEST F] chestEntity=${handles.depositChest}`);
      console.log("[CHEST F] chestInteractionActive=true");
      console.log(`[CHEST F] hitEntity=${event.hit?.entityId ?? "none"}`);
      console.log("[CHEST F] source=pointer-event");
      console.log(
        `[CHEST F] maxDistance=${info?.maxDistance ?? "engine-default"} button=${info?.button} hoverText=${info?.hoverText}`,
      );
      console.log("[CHEST F] openChestRoot called");
      onOpenRoot();
    },
  );
}

export function setChestInteractionEnabled(
  handles: CastleHandles,
  enabled: boolean,
): void {
  if (chestInteractionEnabled === enabled) return;
  chestInteractionEnabled = enabled;
  const registered = PointerEvents.getMutableOrNull(handles.depositChest);
  const info = registered?.pointerEvents[0]?.eventInfo;
  if (!info) return;
  info.showFeedback = enabled;
  info.showHighlight = enabled;
  info.maxDistance = enabled ? CHEST_HOVER_DISTANCE : 0;
}

export function tickChestVisual(handles: CastleHandles, chest: ChestPresentation, now: number): void {
  const transform = Transform.getMutable(handles.depositChest);
  const rest = castleWorldPosition(CASTLE_MODEL_POSITION);
  transform.position.x = rest.x + (chest.shake ? Math.sin(now / 40) * 0.08 : 0);
  transform.position.y = rest.y;
  transform.position.z = rest.z;
}

export function chestEntityCount(): number {
  return [...engine.getEntitiesWith(Transform)].length;
}
