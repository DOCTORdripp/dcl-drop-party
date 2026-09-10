import {
  CASTLE_PLATFORM_Y,
  CASTLE_SIZE_METERS,
  CHEST_PLAZA,
  DROP_COURT_LAYOUT,
  DROP_COURT_POLYGON,
  FRONT_UTILITY_MAX_Z,
  HELP_WANTED_PLAZA,
} from "./castleLayout";

export type RectZone = {
  kind: "rect";
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type CircleZone = {
  kind: "circle";
  id: string;
  x: number;
  z: number;
  radius: number;
};

export type ForbiddenZone = RectZone | CircleZone;

export type DropCourtBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  floorY: number;
  wallPadding: number;
  balloonHover: number;
  forbiddenMargin: number;
};

export {
  CASTLE_PLATFORM_Y,
  CASTLE_SIZE_METERS,
  CHEST_PLAZA,
  DROP_COURT_POLYGON,
  FRONT_UTILITY_MAX_Z,
  HELP_WANTED_PLAZA,
};

export const DROP_COURT: DropCourtBounds = { ...DROP_COURT_LAYOUT };

export const DROP_COURT_FORBIDDEN: ForbiddenZone[] = [
  { kind: "rect", id: "front-utility", minX: 0, maxX: CASTLE_SIZE_METERS, minZ: 0, maxZ: FRONT_UTILITY_MAX_Z },
  { kind: "circle", id: "chest-plaza", x: CHEST_PLAZA.x, z: CHEST_PLAZA.z, radius: 6.4 },
  { kind: "circle", id: "help-plaza", x: HELP_WANTED_PLAZA.x, z: HELP_WANTED_PLAZA.z, radius: 6.4 },
];

export function balloonLandingY(bounds: DropCourtBounds = DROP_COURT): number {
  return bounds.floorY + bounds.balloonHover;
}

export function usableDropCourt(bounds: DropCourtBounds = DROP_COURT): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
} {
  return {
    minX: bounds.minX + bounds.wallPadding,
    maxX: bounds.maxX - bounds.wallPadding,
    minZ: bounds.minZ + bounds.wallPadding,
    maxZ: bounds.maxZ - bounds.wallPadding,
    y: balloonLandingY(bounds),
  };
}

export function pointInRect(point: { x: number; z: number }, rect: RectZone, margin = 0): boolean {
  return (
    point.x >= rect.minX - margin &&
    point.x <= rect.maxX + margin &&
    point.z >= rect.minZ - margin &&
    point.z <= rect.maxZ + margin
  );
}

export function pointInCircle(point: { x: number; z: number }, circle: CircleZone, margin = 0): boolean {
  return Math.hypot(point.x - circle.x, point.z - circle.z) <= circle.radius + margin;
}

export function pointInForbiddenZone(
  point: { x: number; z: number },
  zone: ForbiddenZone,
  margin = DROP_COURT.forbiddenMargin,
): boolean {
  return zone.kind === "rect" ? pointInRect(point, zone, margin) : pointInCircle(point, zone, margin);
}

export function pointOnSegment(
  point: { x: number; z: number },
  a: { x: number; z: number },
  b: { x: number; z: number },
  slop = 0.05,
): boolean {
  const abx = b.x - a.x;
  const abz = b.z - a.z;
  const length = Math.hypot(abx, abz);
  if (length < 1e-6) {
    return Math.hypot(point.x - a.x, point.z - a.z) <= slop;
  }
  const cross = (point.z - a.z) * abx - (point.x - a.x) * abz;
  if (Math.abs(cross) > slop * length) {
    return false;
  }
  const dot = (point.x - a.x) * abx + (point.z - a.z) * abz;
  return dot >= -slop * length && dot <= length * length + slop * length;
}

export function pointInPolygon(
  point: { x: number; z: number },
  polygon: ReadonlyArray<{ x: number; z: number }> = DROP_COURT_POLYGON,
): boolean {
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    if (pointOnSegment(point, polygon[j]!, polygon[i]!)) {
      return true;
    }
  }
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    const intersect = a.z > point.z !== b.z > point.z && point.x < ((b.x - a.x) * (point.z - a.z)) / (b.z - a.z) + a.x;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

export function isInsideDropCourt(
  point: { x: number; z: number },
  _bounds: DropCourtBounds = DROP_COURT,
  polygon: ReadonlyArray<{ x: number; z: number }> = DROP_COURT_POLYGON,
): boolean {
  return pointInPolygon(point, polygon);
}

export function isInsideUsableCourt(
  point: { x: number; z: number },
  bounds: DropCourtBounds = DROP_COURT,
  slop = 0.05,
): boolean {
  if (isInsideDropCourt(point, bounds)) {
    return true;
  }
  if (slop <= 0) {
    return false;
  }
  const neighbors = [
    { x: point.x - slop, z: point.z },
    { x: point.x + slop, z: point.z },
    { x: point.x, z: point.z - slop },
    { x: point.x, z: point.z + slop },
  ];
  return neighbors.some((neighbor) => isInsideDropCourt(neighbor, bounds));
}

export function isAllowedLanding(
  point: { x: number; z: number },
  bounds: DropCourtBounds = DROP_COURT,
  _zones: ForbiddenZone[] = DROP_COURT_FORBIDDEN,
): boolean {
  return isInsideUsableCourt(point, bounds, 0);
}

export const SPAWN_MATRIX_COLUMNS = 16;
export const SPAWN_MATRIX_ROWS = 14;

function hash01(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

export function spawnMatrixCells(
  bounds: DropCourtBounds = DROP_COURT,
  columns = SPAWN_MATRIX_COLUMNS,
  rows = SPAWN_MATRIX_ROWS,
): Array<{ x: number; z: number }> {
  const usable = usableDropCourt(bounds);
  const cellW = (usable.maxX - usable.minX) / columns;
  const cellD = (usable.maxZ - usable.minZ) / rows;
  const cells: Array<{ x: number; z: number }> = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const ox = 0.12 + hash01(`${col}:${row}:x`) * 0.76;
      const oz = 0.12 + hash01(`${row}:${col}:z`) * 0.76;
      const cell = {
        x: usable.minX + (col + ox) * cellW,
        z: usable.minZ + (row + oz) * cellD,
      };
      if (isAllowedLanding(cell, bounds)) {
        cells.push(cell);
      }
    }
  }
  return cells;
}

export function pointsAvoidForbidden(
  points: Array<{ x: number; z: number }>,
  zones: ForbiddenZone[] = DROP_COURT_FORBIDDEN,
  margin = DROP_COURT.forbiddenMargin,
): boolean {
  return points.every((point) => !zones.some((zone) => pointInForbiddenZone(point, zone, margin)));
}

export function pointsStayOffFrontUtility(points: Array<{ x: number; z: number }>): boolean {
  return points.every((point) => point.z > FRONT_UTILITY_MAX_Z);
}

export function pointsRespectWallPadding(
  points: Array<{ x: number; z: number }>,
  bounds: DropCourtBounds = DROP_COURT,
): boolean {
  return points.every((point) => isInsideUsableCourt(point, bounds));
}

export function pointsStayInsideParcel(points: Array<{ x: number; z: number }>): boolean {
  return points.every((point) => point.x >= 0 && point.x <= CASTLE_SIZE_METERS && point.z >= 0 && point.z <= CASTLE_SIZE_METERS);
}
