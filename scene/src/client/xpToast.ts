import { Billboard, engine, TextShape, Transform } from "@dcl/sdk/ecs";
import { Color4 } from "@dcl/sdk/math";
import {
  XP_TOAST_FONT_SIZE,
  XP_TOAST_START_Y,
  tickCenterToastState,
  type CenterToastPlayback,
  type CenterToastState,
  xpToastHeight,
} from "../shared/balloonXpToast";

const GREEN = Color4.create(0.2, 0.95, 0.35, 1);

export function createXpToastEntity(): ReturnType<typeof engine.addEntity> {
  const entity = engine.addEntity();
  Transform.create(entity, {
    parent: engine.PlayerEntity,
    position: { x: 0, y: XP_TOAST_START_Y, z: 0 },
  });
  TextShape.create(entity, {
    text: "",
    fontSize: XP_TOAST_FONT_SIZE,
    textColor: GREEN,
  });
  Billboard.create(entity);
  return entity;
}

function writeToastText(entity: ReturnType<typeof engine.addEntity>, text: string, resetHeight: boolean): void {
  if (TextShape.has(entity)) {
    TextShape.getMutable(entity).text = text;
  }
  if (resetHeight && Transform.has(entity)) {
    Transform.getMutable(entity).position.y = XP_TOAST_START_Y;
  }
}

export function tickCenterToasts(
  entity: ReturnType<typeof engine.addEntity>,
  state: CenterToastState,
  now: number,
): CenterToastState {
  const previous = state.current;
  const next = tickCenterToastState(state, now);
  applyCenterToastVisual(entity, previous, next.current, now);
  return next;
}

export function applyCenterToastVisual(
  entity: ReturnType<typeof engine.addEntity>,
  previous: CenterToastPlayback | undefined,
  current: CenterToastPlayback | undefined,
  now: number,
): void {
  if (!current) {
    if (previous || (TextShape.has(entity) && TextShape.get(entity).text)) {
      writeToastText(entity, "", false);
    }
    return;
  }
  const existing = TextShape.has(entity) ? TextShape.get(entity).text : "";
  const switched = existing !== current.text;
  writeToastText(entity, current.text, switched);
  if (!switched && Transform.has(entity)) {
    Transform.getMutable(entity).position.y = xpToastHeight(current.startedAt, now);
  }
}
