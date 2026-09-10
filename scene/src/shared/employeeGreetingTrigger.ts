export type AxisAlignedTrigger = {
  center: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
};

export const EMPLOYEE_GREETING_TRIGGER = {
  center: { x: 48, y: 14, z: 41 },
  size: { x: 4, y: 12, z: 4 },
} as const satisfies AxisAlignedTrigger;

/** Same box as the entry welcome zone, shifted to the help desk on Z. */
export const HELP_WANTED_TRIGGER = {
  center: { x: 48, y: 14, z: 48.5 },
  size: { x: 4, y: 12, z: 4 },
} as const satisfies AxisAlignedTrigger;

/** Employed walk-in is a no-op. Flip on only for zone QA. */
export const HELP_WANTED_WALK_IN_ALREADY_HIRED_TEST = false;

/** Hire card is unemployed-only. Keep false unless QA needs the hire card for everyone. */
export const HELP_WANTED_FOR_ALL_PLAYERS = false;

export type GreetingTriggerEdge = "enter" | "exit" | "inside" | "outside";

export function employeeGreetingTriggerBounds(zone: AxisAlignedTrigger = EMPLOYEE_GREETING_TRIGGER): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
} {
  const hx = zone.size.x / 2;
  const hy = zone.size.y / 2;
  const hz = zone.size.z / 2;
  return {
    minX: zone.center.x - hx,
    maxX: zone.center.x + hx,
    minY: zone.center.y - hy,
    maxY: zone.center.y + hy,
    minZ: zone.center.z - hz,
    maxZ: zone.center.z + hz,
  };
}

export function isInsideEmployeeGreetingTrigger(
  position: { x: number; y: number; z: number },
  zone: AxisAlignedTrigger = EMPLOYEE_GREETING_TRIGGER,
): boolean {
  const box = employeeGreetingTriggerBounds(zone);
  return (
    position.x >= box.minX &&
    position.x <= box.maxX &&
    position.y >= box.minY &&
    position.y <= box.maxY &&
    position.z >= box.minZ &&
    position.z <= box.maxZ
  );
}

export function stepEmployeeGreetingTrigger(inside: boolean, wasInside: boolean): GreetingTriggerEdge {
  if (inside && !wasInside) {
    return "enter";
  }
  if (!inside && wasInside) {
    return "exit";
  }
  return inside ? "inside" : "outside";
}

export function shouldFireEmployeeGreeting(edge: GreetingTriggerEdge, employed: boolean): boolean {
  return edge === "enter" && employed;
}

export function shouldFireHelpWantedWalkIn(
  edge: GreetingTriggerEdge,
  employed: boolean,
  forAll = HELP_WANTED_FOR_ALL_PLAYERS,
): boolean {
  return edge === "enter" && (forAll || !employed);
}

export function shouldFireAlreadyHiredWalkInTest(
  edge: GreetingTriggerEdge,
  employed: boolean,
  enabled = HELP_WANTED_WALK_IN_ALREADY_HIRED_TEST,
): boolean {
  return enabled && edge === "enter" && employed;
}
