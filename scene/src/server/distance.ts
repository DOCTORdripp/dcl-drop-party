import {
  EFFECTIVE_POP_RADIUS_METERS,
  POP_VERTICAL_TOLERANCE_METERS,
} from "../shared/constants";

export type Vec3 = { x: number; y: number; z: number };

/** Full 3D distance. Used for movement sanity, not POP eligibility. */
export function distanceMeters(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Horizontal stomp distance. Player feet can sit on a balloon whose center is elevated. */
export function horizontalDistanceMeters(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function verticalSeparationMeters(a: Vec3, b: Vec3): number {
  return Math.abs(a.y - b.y);
}

export function isWithinPopProximity(
  player: Vec3,
  balloon: Vec3,
  radiusMeters = EFFECTIVE_POP_RADIUS_METERS,
  verticalToleranceMeters = POP_VERTICAL_TOLERANCE_METERS,
): boolean {
  return (
    verticalSeparationMeters(player, balloon) <= verticalToleranceMeters &&
    horizontalDistanceMeters(player, balloon) <= radiusMeters
  );
}
