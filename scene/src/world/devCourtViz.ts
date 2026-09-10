import { engine, Material, MeshRenderer, Transform } from "@dcl/sdk/ecs";
import { Color4, Quaternion } from "@dcl/sdk/math";
import { DROP_COURT_POLYGON } from "../shared/castleLayout";
import { DROP_COURT, isAllowedLanding, spawnMatrixCells } from "../shared/dropCourt";

/** Temporary outline of the authored balloon-fall polygon. */
export const DEV_DROP_COURT_VIZ = false;

function ghost(
  position: { x: number; y: number; z: number },
  scale: { x: number; y: number; z: number },
  color: ReturnType<typeof Color4.create>,
  rotation: ReturnType<typeof Quaternion.fromEulerDegrees> = Quaternion.Identity(),
) {
  const entity = engine.addEntity();
  Transform.create(entity, { position, scale, rotation });
  MeshRenderer.setBox(entity);
  Material.setPbrMaterial(entity, {
    albedoColor: color,
    emissiveColor: color,
    emissiveIntensity: 0.55,
  });
}

function edgeGhost(
  a: { x: number; z: number },
  b: { x: number; z: number },
  y: number,
  color: ReturnType<typeof Color4.create>,
) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = Math.hypot(dx, dz);
  if (length < 0.05) {
    return;
  }
  ghost(
    { x: (a.x + b.x) / 2, y, z: (a.z + b.z) / 2 },
    { x: 0.22, y: 0.55, z: length },
    color,
    Quaternion.fromEulerDegrees(0, (Math.atan2(dx, dz) * 180) / Math.PI, 0),
  );
}

export function buildDevCourtVisualization(enabled = DEV_DROP_COURT_VIZ): void {
  if (!enabled) {
    return;
  }
  const y = 0.35;
  const edge = Color4.create(0.15, 0.95, 1, 0.7);
  const vertex = Color4.create(1, 0.85, 0.15, 0.9);
  const cell = Color4.create(0.25, 1, 0.4, 0.55);
  for (let i = 0; i < DROP_COURT_POLYGON.length; i++) {
    const a = DROP_COURT_POLYGON[i]!;
    const b = DROP_COURT_POLYGON[(i + 1) % DROP_COURT_POLYGON.length]!;
    edgeGhost(a, b, y, edge);
    ghost({ x: a.x, y: y + 0.15, z: a.z }, { x: 0.45, y: 0.7, z: 0.45 }, vertex);
  }
  for (const point of spawnMatrixCells()) {
    if (isAllowedLanding(point)) {
      ghost({ x: point.x, y: y + 0.02, z: point.z }, { x: 0.28, y: 0.1, z: 0.28 }, cell);
    }
  }
  console.log("[DEV] balloon fall polygon visualization on", {
    vertices: DROP_COURT_POLYGON.length,
    bounds: { minX: DROP_COURT.minX, maxX: DROP_COURT.maxX, minZ: DROP_COURT.minZ, maxZ: DROP_COURT.maxZ },
  });
}
