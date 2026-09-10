export type AxisAlignedBox = {
  center: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
};

export type AxisAlignedBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
};

export const TABLE_SURROUND_CORNER_A = { x: 59.8, y: 0.1, z: 51.3 } as const;
export const TABLE_SURROUND_CORNER_B = { x: 35.6, y: 0.1, z: 43.7 } as const;
export const TABLE_SURROUND_HEIGHT = 6.2;

export type TableSurroundEdge = "enter" | "exit" | "inside" | "outside";

export function tableSurroundTriggerBounds(
  a: { x: number; y: number; z: number } = TABLE_SURROUND_CORNER_A,
  b: { x: number; y: number; z: number } = TABLE_SURROUND_CORNER_B,
  height = TABLE_SURROUND_HEIGHT,
): AxisAlignedBounds {
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minZ = Math.min(a.z, b.z);
  const maxZ = Math.max(a.z, b.z);
  const minY = Math.min(a.y, b.y);
  return { minX, maxX, minY, maxY: minY + height, minZ, maxZ };
}

export function tableSurroundTriggerFromBounds(box: AxisAlignedBounds = tableSurroundTriggerBounds()): AxisAlignedBox {
  return {
    center: {
      x: (box.minX + box.maxX) / 2,
      y: (box.minY + box.maxY) / 2,
      z: (box.minZ + box.maxZ) / 2,
    },
    size: {
      x: box.maxX - box.minX,
      y: box.maxY - box.minY,
      z: box.maxZ - box.minZ,
    },
  };
}

export const TABLE_SURROUND_TRIGGER = tableSurroundTriggerFromBounds();

export function isInsideTableSurroundTrigger(
  position: { x: number; y: number; z: number },
  box: AxisAlignedBounds = tableSurroundTriggerBounds(),
): boolean {
  return (
    position.x >= box.minX &&
    position.x <= box.maxX &&
    position.y >= box.minY &&
    position.y <= box.maxY &&
    position.z >= box.minZ &&
    position.z <= box.maxZ
  );
}

export function tableSurroundOccupants<T extends { position: { x: number; y: number; z: number } }>(
  players: readonly T[],
  box: AxisAlignedBounds = tableSurroundTriggerBounds(),
): T[] {
  return players.filter((player) => isInsideTableSurroundTrigger(player.position, box));
}

export function stepTableSurroundTrigger(inside: boolean, wasInside: boolean): TableSurroundEdge {
  if (inside && !wasInside) {
    return "enter";
  }
  if (!inside && wasInside) {
    return "exit";
  }
  return inside ? "inside" : "outside";
}
