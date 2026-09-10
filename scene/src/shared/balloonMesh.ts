import { engine, Material, MeshRenderer, Transform } from "@dcl/sdk/ecs";
import { Color3, Color4 } from "@dcl/sdk/math";
import {
  BALLOON_BODY_EMISSIVE_INTENSITY,
  BALLOON_BODY_SCALE,
  BALLOON_FRAGMENT_EMISSIVE_INTENSITY,
  BALLOON_KNOT_EMISSIVE_INTENSITY,
  BALLOON_KNOT_OFFSET,
  BALLOON_KNOT_SCALE,
  BALLOON_STRING_OFFSET,
  BALLOON_STRING_SCALE,
  BURST_FRAGMENT_COUNT,
  balloonColor,
} from "./balloonLook";

export type BalloonAttachment = {
  visualRoot: ReturnType<typeof engine.addEntity>;
  fragments: Array<ReturnType<typeof engine.addEntity>>;
};

function tint(
  entity: ReturnType<typeof engine.addEntity>,
  color: { r: number; g: number; b: number; a: number },
  emissiveIntensity = 0,
) {
  Material.setPbrMaterial(entity, {
    albedoColor: Color4.create(color.r, color.g, color.b, color.a),
    ...(emissiveIntensity > 0
      ? {
          emissiveColor: Color3.create(color.r, color.g, color.b),
          emissiveIntensity,
        }
      : {}),
  });
}

/**
 * Local-only balloon primitives parented under a synced root.
 * Never writes the synced root Transform — animation stays on visualRoot.
 */
export function attachBalloonVisuals(
  root: ReturnType<typeof engine.addEntity>,
  balloonId: string,
): BalloonAttachment {
  const color = balloonColor(balloonId);
  const visualRoot = engine.addEntity();
  Transform.create(visualRoot, {
    parent: root,
    position: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  });

  const body = engine.addEntity();
  Transform.create(body, {
    parent: visualRoot,
    position: { x: 0, y: 0, z: 0 },
    scale: { ...BALLOON_BODY_SCALE },
  });
  MeshRenderer.setSphere(body);
  tint(body, color, BALLOON_BODY_EMISSIVE_INTENSITY);

  const knot = engine.addEntity();
  Transform.create(knot, {
    parent: visualRoot,
    position: { ...BALLOON_KNOT_OFFSET },
    scale: { ...BALLOON_KNOT_SCALE },
  });
  MeshRenderer.setSphere(knot);
  tint(
    knot,
    { r: color.r * 0.55, g: color.g * 0.55, b: color.b * 0.55, a: 1 },
    BALLOON_KNOT_EMISSIVE_INTENSITY,
  );

  const string = engine.addEntity();
  Transform.create(string, {
    parent: visualRoot,
    position: { ...BALLOON_STRING_OFFSET },
    scale: { ...BALLOON_STRING_SCALE },
  });
  MeshRenderer.setBox(string);
  tint(string, { r: 0.85, g: 0.85, b: 0.82, a: 1 });

  const fragments: Array<ReturnType<typeof engine.addEntity>> = [];
  for (let i = 0; i < BURST_FRAGMENT_COUNT; i++) {
    const fragment = engine.addEntity();
    Transform.create(fragment, {
      parent: root,
      position: { x: 0, y: 0, z: 0 },
      scale: { x: 0, y: 0, z: 0 },
    });
    MeshRenderer.setBox(fragment);
    tint(fragment, color, BALLOON_FRAGMENT_EMISSIVE_INTENSITY);
    fragments.push(fragment);
  }

  return { visualRoot, fragments };
}
