import {
  DROP_COURT,
  SPAWN_MATRIX_COLUMNS,
  SPAWN_MATRIX_ROWS,
  isAllowedLanding,
  isInsideUsableCourt,
  spawnMatrixCells,
  usableDropCourt,
} from "./dropCourt";

export type Vec3 = { x: number; y: number; z: number };

const USABLE = usableDropCourt(DROP_COURT);

/** Usable padded Drop Court. Kept as PARTY_FLOOR for existing spawn helpers. */
export const PARTY_FLOOR = {
  minX: USABLE.minX,
  maxX: USABLE.maxX,
  minZ: USABLE.minZ,
  maxZ: USABLE.maxZ,
  y: USABLE.y,
} as const;

export type SpawnMatrixConfig = {
  columns: number;
  rows: number;
  minimumSpacing: number;
  jitterRatio: number;
};

export const DEFAULT_SPAWN_MATRIX: SpawnMatrixConfig = {
  columns: SPAWN_MATRIX_COLUMNS,
  rows: SPAWN_MATRIX_ROWS,
  minimumSpacing: 1.65,
  jitterRatio: 0.32,
};

export type WaveSpawnResult = {
  points: Vec3[];
};

function hash32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function xzDistance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function clampToFloor(point: Vec3, margin = 0.35): Vec3 {
  return {
    x: Math.min(PARTY_FLOOR.maxX - margin, Math.max(PARTY_FLOOR.minX + margin, point.x)),
    y: PARTY_FLOOR.y,
    z: Math.min(PARTY_FLOOR.maxZ - margin, Math.max(PARTY_FLOOR.minZ + margin, point.z)),
  };
}

const POLYGON_INTERIOR = { x: 48, z: 64 };

function snapAllowed(point: Vec3): Vec3 {
  const clamped = clampToFloor(point);
  if (isAllowedLanding(clamped)) {
    return clamped;
  }
  const offsets = [1.4, -1.4, 2.4, -2.4, 3.2, -3.2];
  for (const ox of offsets) {
    for (const oz of offsets) {
      const candidate = clampToFloor({ x: clamped.x + ox, y: clamped.y, z: clamped.z + oz });
      if (isAllowedLanding(candidate)) {
        return candidate;
      }
    }
  }
  for (const t of [0.35, 0.55, 0.75, 0.9]) {
    const candidate = clampToFloor({
      x: clamped.x + (POLYGON_INTERIOR.x - clamped.x) * t,
      y: clamped.y,
      z: clamped.z + (POLYGON_INTERIOR.z - clamped.z) * t,
    });
    if (isAllowedLanding(candidate)) {
      return candidate;
    }
  }
  return { x: POLYGON_INTERIOR.x, y: PARTY_FLOOR.y, z: POLYGON_INTERIOR.z };
}

function cellCenters(config: SpawnMatrixConfig): Vec3[] {
  return spawnMatrixCells(DROP_COURT, config.columns, config.rows).map((cell) => ({
    x: cell.x,
    y: PARTY_FLOOR.y,
    z: cell.z,
  }));
}

function shuffleInPlace<T>(items: T[], random: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

function jitterInCell(
  center: Vec3,
  config: SpawnMatrixConfig,
  random: () => number,
): Vec3 {
  const width = (PARTY_FLOOR.maxX - PARTY_FLOOR.minX) / config.columns;
  const depth = (PARTY_FLOOR.maxZ - PARTY_FLOOR.minZ) / config.rows;
  const jx = (random() - 0.5) * width * config.jitterRatio * 2;
  const jz = (random() - 0.5) * depth * config.jitterRatio * 2;
  const candidate = { x: center.x + jx, y: PARTY_FLOOR.y, z: center.z + jz };
  if (isAllowedLanding(candidate)) {
    return candidate;
  }
  if (isAllowedLanding(center)) {
    return center;
  }
  return snapAllowed(candidate);
}

function respectsSpacing(point: Vec3, others: Vec3[], minimum: number): boolean {
  return others.every((other) => xzDistance(point, other) >= minimum);
}

function distinctFrom(point: Vec3, others: Vec3[]): boolean {
  return others.every((other) => xzDistance(point, other) > 0.05);
}

export function layoutSeed(args: {
  partyId?: string;
  waveNumber: number;
  waveId?: string;
  spawnSeed?: number | string;
}): number {
  return hash32(
    `${args.partyId ?? "dev"}:${args.waveId ?? `wave-${args.waveNumber}`}:${args.spawnSeed ?? 0}`,
  );
}

function forceDistinct(base: Vec3, used: Vec3[]): Vec3 {
  if (isAllowedLanding(base) && distinctFrom(base, used)) {
    return base;
  }
  for (let ring = 1; ring <= 40; ring++) {
    const step = Math.max(8, ring * 4);
    const radius = ring * 0.45;
    for (let k = 0; k < step; k++) {
      const angle = (k / step) * Math.PI * 2;
      const candidate = snapAllowed({
        x: base.x + Math.cos(angle) * radius,
        y: PARTY_FLOOR.y,
        z: base.z + Math.sin(angle) * radius,
      });
      if (isAllowedLanding(candidate) && distinctFrom(candidate, used)) {
        return candidate;
      }
    }
  }
  return snapAllowed({
    x: POLYGON_INTERIOR.x + used.length * 0.7,
    y: PARTY_FLOOR.y,
    z: POLYGON_INTERIOR.z + (used.length % 5) * 0.7,
  });
}

function nextUniquePoint(
  cells: Vec3[],
  takenCells: Set<number>,
  used: Vec3[],
  config: SpawnMatrixConfig,
  random: () => number,
): Vec3 {
  const order: number[] = [];
  for (let i = 0; i < cells.length; i++) {
    if (!takenCells.has(i)) {
      order.push(i);
    }
  }
  shuffleInPlace(order, random);

  for (const cellIndex of order) {
    const cell = cells[cellIndex]!;
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = jitterInCell(cell, config, random);
      if (
        isAllowedLanding(candidate) &&
        respectsSpacing(candidate, used, config.minimumSpacing) &&
        distinctFrom(candidate, used)
      ) {
        takenCells.add(cellIndex);
        return candidate;
      }
    }
    const snapped = snapAllowed(cell);
    if (
      isAllowedLanding(snapped) &&
      respectsSpacing(snapped, used, config.minimumSpacing) &&
      distinctFrom(snapped, used)
    ) {
      takenCells.add(cellIndex);
      return snapped;
    }
  }

  const fallbackCell = cells[used.length % Math.max(cells.length, 1)] ?? {
    x: POLYGON_INTERIOR.x,
    y: PARTY_FLOOR.y,
    z: POLYGON_INTERIOR.z,
  };
  return forceDistinct(snapAllowed(fallbackCell), used);
}

/**
 * Wave-wide matrix placement. Each balloon draws a unique shuffled cell,
 * with bounded jitter that still refuses already-used XZ positions.
 */
export function layoutWaveLandings(args: {
  balloonIds: string[];
  waveNumber: number;
  partyId?: string;
  waveId?: string;
  spawnSeed?: number | string;
  avoid?: Vec3[];
  config?: Partial<SpawnMatrixConfig>;
}): WaveSpawnResult {
  const config = { ...DEFAULT_SPAWN_MATRIX, ...args.config };
  const ids = [...args.balloonIds];
  const random = mulberry32(
    layoutSeed({
      partyId: args.partyId,
      waveNumber: args.waveNumber,
      waveId: args.waveId,
      spawnSeed: args.spawnSeed,
    }),
  );
  const cells = cellCenters(config);
  if (cells.length === 0) {
    cells.push({ x: POLYGON_INTERIOR.x, y: PARTY_FLOOR.y, z: POLYGON_INTERIOR.z });
  }
  const points: Vec3[] = [];
  const used: Vec3[] = [...(args.avoid ?? [])];
  const takenCells = new Set<number>();

  for (let i = 0; i < ids.length; i++) {
    const point = nextUniquePoint(cells, takenCells, used, config, random);
    points.push(point);
    used.push(point);
  }

  return { points };
}

export function landingPointForBalloon(
  balloonId: string,
  waveNumber: number,
  seed = 1,
): Vec3 {
  return layoutWaveLandings({
    balloonIds: [balloonId],
    waveNumber,
    spawnSeed: seed,
  }).points[0]!;
}

export function landingPointsAreSpread(points: Vec3[], minSpread = 2): boolean {
  if (points.length < 2) {
    return true;
  }
  let farPairs = 0;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (xzDistance(points[i]!, points[j]!) >= minSpread) {
        farPairs += 1;
      }
    }
  }
  return farPairs > 0;
}

export function pointsHaveExactOverlap(points: Vec3[]): boolean {
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (xzDistance(points[i]!, points[j]!) <= 0.05) {
        return true;
      }
    }
  }
  return false;
}

export function pointsRespectSpacing(points: Vec3[], minimum: number): boolean {
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (xzDistance(points[i]!, points[j]!) < minimum) {
        return false;
      }
    }
  }
  return true;
}

export function pointsInsideFloor(points: Vec3[], slop = 0.05): boolean {
  return points.every((point) => isAllowedLanding(point) || isInsideUsableCourt(point, DROP_COURT, slop));
}

export function coverageSpan(points: Vec3[]): { x: number; z: number } {
  if (points.length === 0) {
    return { x: 0, z: 0 };
  }
  let minX = points[0]!.x;
  let maxX = points[0]!.x;
  let minZ = points[0]!.z;
  let maxZ = points[0]!.z;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  }
  return { x: maxX - minX, z: maxZ - minZ };
}

export class WaveSpawnLayout {
  private readonly cache = new Map<string, Map<string, Vec3>>();

  landings(args: {
    waveKey: string;
    balloonIds: string[];
    waveNumber: number;
    partyId?: string;
    spawnSeed?: number | string;
    avoid?: Vec3[];
    config?: Partial<SpawnMatrixConfig>;
  }): Map<string, Vec3> {
    const cached = this.cache.get(args.waveKey);
    if (cached) {
      return cached;
    }
    const ids = [...args.balloonIds].sort();
    const laid = layoutWaveLandings({
      balloonIds: ids,
      waveNumber: args.waveNumber,
      partyId: args.partyId,
      waveId: args.waveKey,
      spawnSeed: args.spawnSeed,
      avoid: args.avoid,
      config: args.config,
    });
    const map = new Map<string, Vec3>();
    ids.forEach((id, index) => {
      map.set(id, laid.points[index]!);
    });
    this.cache.set(args.waveKey, map);
    return map;
  }
}
