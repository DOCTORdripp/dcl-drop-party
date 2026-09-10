export type Vec3 = { x: number; y: number; z: number };

export type TableSeatFace = "negX" | "chest" | "chair1" | "awayChest";

export type TableSeat = {
  id: number;
  sit: Vec3;
  face: TableSeatFace;
};

/** Deposit chest mesh sits near the gold portal; chairs 2–15 look this way. */
export const TABLE_CHEST_LOOK_AT = { x: 48, y: 1.6, z: 78 } as const;

export const TABLE_SEAT_BOX = { x: 1, y: 3, z: 1 } as const;
export const TABLE_SEAT_BEHIND_METERS = 1.1;
export const TABLE_SIT_MOVE_EPSILON = 0.35;
export const TABLE_SIT_GRACE_MS = 1200;
export const TABLE_SIT_REPLANT_MS = 250;
export const TABLE_SIT_EMOTE = "sittingChair1";
/** Standing clip that overrides a chair sit. Never call stopEmote (no-op on mobile). */
export const TABLE_STAND_EMOTE = "shrug";
export const TABLE_SIT_REPLAY_MS = 4000;
/** Scoot the avatar toward the table, away from the chair back. */
export const TABLE_SIT_FORWARD_METERS = 0.36;
/** Chairs 2–15 sit closer to the table wood; use less scoot. */
export const TABLE_SIT_FORWARD_CHEST_METERS = 0.16;
/** Sit-and-blow on chairs 17–30 stays slightly back from the table. */
export const TABLE_SIT_BLOW_FORWARD_METERS = 0.08;
/** End chairs 1 and 16: less blow scoot, farther from the table on X. */
export const TABLE_SIT_BLOW_FORWARD_END_METERS = 0.06;
/** Sit-and-blow on chairs 2–15 sits slightly behind the chair anchor. */
export const TABLE_SIT_BLOW_FORWARD_CHEST_METERS = -0.08;
/** Lift so the sit pose sits on the seat instead of clipping through it. */
export const TABLE_SIT_Y_LIFT = 0.22;
/**
 * Bevy has no Unity furniture snap for sittingChair1, so the avatar keeps normal
 * physics while seated and slides off the plant down to the hall floor — the sunk
 * root is what put the body inside the chair. The plant itself is already correct
 * (desktop uses the same one), so Bevy only needs something solid underneath it:
 * an invisible pad whose top is exactly the plant height. The sit-and-blow GLB
 * bakes its hips above the root, which is why only the idle clip ever looked wrong.
 */
export const SIT_SUPPORT_SIZE = 1.2;
export const SIT_SUPPORT_THICKNESS = 0.2;
/** Sit-and-blow on chairs 2–15 sits lower than the idle plant. */
export const TABLE_SIT_BLOW_Y_CHEST = -0.1;
/** Tabletop height for the local physics plane (not the chair GLB). */
export const TABLE_TOP_Y = 1.5;
/** Short ends: smaller inset so the box reaches closer to the wood. */
export const TABLE_TOP_INSET_X = 0.32;
/** Away-chest long edge (opposite chair 2). */
export const TABLE_TOP_INSET_Z = 0.42;
/** Chair-2 / chest-facing long edge. */
export const TABLE_TOP_INSET_Z_CHEST = 0.55;
export const TABLE_TOP_THICKNESS = 0.1;
/** Seat slab you can stand on; top is a bit under the old single-box height. */
export const CHAIR_SEAT_HEIGHT = 0.4;
export const CHAIR_SEAT_DEPTH = 0.52;
export const CHAIR_SEAT_WIDTH = 0.58;
/** Scoot the seat slab toward the backrest so the L has no gap. */
export const CHAIR_SEAT_BACK_METERS = 0.14;
/** Near-chest row: scoot the L toward the table (negative = toward facing). */
export const CHAIR_SEAT_BACK_NEAR_CHEST = 0.06;
/** Backrest slab: walk into it, stand on the top rail. */
export const CHAIR_BACK_HEIGHT = 1.18;
export const CHAIR_BACK_DEPTH = 0.16;
export const CHAIR_BACK_WIDTH = 0.55;
/** Extra gap so the back slab sits on the wood behind the sit zone. */
export const CHAIR_BACK_GAP = -0.02;
/** Extra backrest scoot only on the chest-facing long row (not ends or the near-chest row). */
export const CHAIR_BACK_GAP_CHEST_ROW = 0.1;
/** Chair 1 backrest sits a bit too far from the table. */
export const CHAIR_BACK_GAP_CHAIR_1 = -0.14;
/** Chair 7 backrest sits a bit too close to the table. */
export const CHAIR_BACK_GAP_CHAIR_7 = 0.15
/** Chair 15 backrest sits a bit too far from the table. */
export const CHAIR_BACK_GAP_CHAIR_15 = -0.005;
/** Raise the L so the seat top matches the wood. */
export const CHAIR_COLLIDER_Y_LIFT = 0.44;
/** Seats 17–21 sit a bit higher than the rest of the near-chest row. */
export const CHAIR_SEAT_Y_LIFT_17_21 = 0.12;
/** Seats 15–17 still sat a hair under the wood. */
export const CHAIR_SEAT_Y_LIFT_15_17 = 0.05;
/** Seat 16 still needs more seat height. */
export const CHAIR_SEAT_Y_LIFT_16 = 0.08;
/** Seat 16 backrest sits too far from the table. */
export const CHAIR_BACK_GAP_CHAIR_16 = 0.08;
/** Seat 16 seat slab was too far from the table. */
export const CHAIR_SEAT_BACK_CHAIR_16 = -0.08;
/** Seats 17–29: pull the backrest toward the table. */
export const CHAIR_BACK_GAP_NEAR_CHEST_17_29 = -0.14;
/** Degrees the backrest leans away from the table (matches the chair mesh). */
export const CHAIR_BACK_LEAN_DEGREES = 6;

const CHEST_ROW_Z = 45.25;
/** Chair 30’s sit Z — all 17–30 use this so scoot from the seat collider matches. */
const AWAY_ROW_Z = 49.68;

function seat(id: number, x: number, z: number, face: TableSeatFace, y = 0.1): TableSeat {
  return { id, sit: { x, y, z }, face };
}

export const TABLE_SEATS: readonly TableSeat[] = [
  seat(1, 58.5, 47.0, "negX"),
  seat(2, 56.0, CHEST_ROW_Z, "chest"),
  seat(3, 54.5, CHEST_ROW_Z, "chest"),
  seat(4, 52.9, CHEST_ROW_Z, "chest"),
  seat(5, 51.1, CHEST_ROW_Z, "chest"),
  seat(6, 49.8, CHEST_ROW_Z, "chest"),
  seat(7, 48.4, CHEST_ROW_Z, "chest"),
  seat(8, 47.0, CHEST_ROW_Z, "chest"),
  seat(9, 45.9, CHEST_ROW_Z, "chest"),
  seat(10, 44.5, CHEST_ROW_Z, "chest"),
  seat(11, 43.4, CHEST_ROW_Z, "chest"),
  seat(12, 41.9, CHEST_ROW_Z, "chest"),
  seat(13, 40.7, CHEST_ROW_Z, "chest"),
  seat(14, 39.5, CHEST_ROW_Z, "chest"),
  seat(15, 38.1, CHEST_ROW_Z, "chest"),
  seat(16, 37.5, 47.4, "chair1"),
  seat(17, 39.5, AWAY_ROW_Z, "awayChest"),
  seat(18, 40.9, AWAY_ROW_Z, "awayChest"),
  seat(19, 42.2, AWAY_ROW_Z, "awayChest"),
  seat(20, 43.5, AWAY_ROW_Z, "awayChest"),
  seat(21, 44.8, AWAY_ROW_Z, "awayChest"),
  seat(22, 45.9, AWAY_ROW_Z, "awayChest"),
  seat(23, 47.1, AWAY_ROW_Z, "awayChest"),
  seat(24, 48.4, AWAY_ROW_Z, "awayChest"),
  seat(25, 50.0, AWAY_ROW_Z, "awayChest"),
  seat(26, 51.3, AWAY_ROW_Z, "awayChest"),
  seat(27, 52.5, AWAY_ROW_Z, "awayChest"),
  seat(28, 53.8, AWAY_ROW_Z, "awayChest"),
  seat(29, 54.9, AWAY_ROW_Z, "awayChest"),
  seat(30, 56.4, AWAY_ROW_Z, "awayChest"),
];

export function tableSeatLookAt(seat: TableSeat, seats: readonly TableSeat[] = TABLE_SEATS): Vec3 {
  const sit = seat.sit;
  if (seat.face === "negX") {
    return { x: sit.x - 2, y: sit.y + 1.4, z: sit.z };
  }
  if (seat.face === "chest") {
    return { ...TABLE_CHEST_LOOK_AT };
  }
  if (seat.face === "chair1") {
    const chair1 = seats[0]!.sit;
    return { x: chair1.x, y: chair1.y + 1.4, z: chair1.z };
  }
  return { x: sit.x, y: sit.y + 1.4, z: sit.z - 2 };
}

export function tableSeatYawDegrees(seat: TableSeat): number {
  const look = tableSeatLookAt(seat);
  return (Math.atan2(look.x - seat.sit.x, look.z - seat.sit.z) * 180) / Math.PI;
}

function tableSeatForwardXZ(seat: TableSeat): { x: number; z: number } {
  const look = tableSeatLookAt(seat);
  const dx = look.x - seat.sit.x;
  const dz = look.z - seat.sit.z;
  const len = Math.hypot(dx, dz) || 1;
  return { x: dx / len, z: dz / len };
}

export function tableSeatBehind(seat: TableSeat, meters = TABLE_SEAT_BEHIND_METERS): Vec3 {
  const forward = tableSeatForwardXZ(seat);
  return {
    x: seat.sit.x - forward.x * meters,
    y: seat.sit.y,
    z: seat.sit.z - forward.z * meters,
  };
}

/** Chair-wood extras on top of the global sit lift (17–21, 15–17, 16). */
export function tableSeatPlantYLift(seat: TableSeat): number {
  return TABLE_SIT_Y_LIFT + (chairSeatYLift(seat) - CHAIR_COLLIDER_Y_LIFT);
}

export function tableSeatIdleForwardMeters(seat: TableSeat): number {
  return seat.id >= 2 && seat.id <= 15 ? TABLE_SIT_FORWARD_CHEST_METERS : TABLE_SIT_FORWARD_METERS;
}

export function tableSeatBlowForwardMeters(seat: TableSeat): number {
  if (seat.id === 1 || seat.id === 16) {
    return TABLE_SIT_BLOW_FORWARD_END_METERS;
  }
  return seat.id >= 2 && seat.id <= 15 ? TABLE_SIT_BLOW_FORWARD_CHEST_METERS : TABLE_SIT_BLOW_FORWARD_METERS;
}

export function tableSeatBlowYLift(seat: TableSeat): number {
  return seat.id >= 2 && seat.id <= 15 ? TABLE_SIT_BLOW_Y_CHEST : 0;
}

function isAwayChestSeat(seat: TableSeat): boolean {
  return seat.face === "awayChest";
}

/** Chair 30’s idle/blow offsets from its seat collider — applied to all 17–30. */
function awayChestPlantFromCollider(seat: TableSeat, blowing: boolean): Vec3 {
  const ref = TABLE_SEATS[29];
  const refCol = chairColliderPoses(ref).seat.position;
  const refPose = blowing
    ? {
        x: ref.sit.x + tableSeatForwardXZ(ref).x * tableSeatBlowForwardMeters(ref),
        y: ref.sit.y + tableSeatBlowYLift(ref),
        z: ref.sit.z + tableSeatForwardXZ(ref).z * tableSeatBlowForwardMeters(ref),
      }
    : {
        x: ref.sit.x + tableSeatForwardXZ(ref).x * tableSeatIdleForwardMeters(ref),
        y: ref.sit.y + tableSeatPlantYLift(ref),
        z: ref.sit.z + tableSeatForwardXZ(ref).z * tableSeatIdleForwardMeters(ref),
      };
  const refF = tableSeatForwardXZ(ref);
  const along =
    (refPose.x - refCol.x) * refF.x + (refPose.z - refCol.z) * refF.z;
  const yFromCol = refPose.y - refCol.y;
  const col = chairColliderPoses(seat).seat.position;
  const f = tableSeatForwardXZ(seat);
  return {
    x: col.x + f.x * along,
    y: col.y + yFromCol,
    z: col.z + f.z * along,
  };
}

export function tableSeatPlantPose(
  seat: TableSeat,
  forwardMeters = tableSeatIdleForwardMeters(seat),
  yLift = tableSeatPlantYLift(seat),
): Vec3 {
  if (isAwayChestSeat(seat)) {
    return awayChestPlantFromCollider(seat, false);
  }
  const forward = tableSeatForwardXZ(seat);
  return {
    x: seat.sit.x + forward.x * forwardMeters,
    y: seat.sit.y + yLift,
    z: seat.sit.z + forward.z * forwardMeters,
  };
}

/** Custom sit-and-blow clips keep a lighter scoot and skip the idle Y lift. */
export function tableSeatBlowingPlantPose(seat: TableSeat): Vec3 {
  if (isAwayChestSeat(seat)) {
    return awayChestPlantFromCollider(seat, true);
  }
  return tableSeatPlantPose(seat, tableSeatBlowForwardMeters(seat), tableSeatBlowYLift(seat));
}

export function tableSeatPlantPoseForSitting(seat: TableSeat, blowing: boolean): Vec3 {
  return blowing ? tableSeatBlowingPlantPose(seat) : tableSeatPlantPose(seat);
}

/** Local-only: sitters skip hall furniture physics; everyone else still collides. */
export function tableTopCollisionEnabled(sitting: boolean): boolean {
  return !sitting;
}

/** Pad top lands on the plant, so the avatar rests exactly where desktop is snapped. */
export function sitSupportPose(plant: Vec3): { position: Vec3; scale: Vec3 } {
  return {
    position: { x: plant.x, y: plant.y - SIT_SUPPORT_THICKNESS / 2, z: plant.z },
    scale: { x: SIT_SUPPORT_SIZE, y: SIT_SUPPORT_THICKNESS, z: SIT_SUPPORT_SIZE },
  };
}

/** Only Bevy falls off the plant, and only the built-in idle clip needs the root held. */
export function sitSupportNeeded(input: { pose: "sit" | "sitAndBlow" | undefined; bevy: boolean }): boolean {
  return input.bevy && input.pose === "sit";
}

export type ColliderPose = { position: Vec3; scale: Vec3; rotation: Vec3 };

export function chairBackEuler(seat: TableSeat): Vec3 {
  const forward = tableSeatForwardXZ(seat);
  const lean = CHAIR_BACK_LEAN_DEGREES;
  if (Math.abs(forward.x) >= Math.abs(forward.z)) {
    return { x: 0, y: 0, z: Math.sign(forward.x || 1) * lean };
  }
  return { x: -Math.sign(forward.z || 1) * lean, y: 0, z: 0 };
}

export function chairSeatOnlyExtra(seat: TableSeat): number {
  let extra = 0;
  if (seat.id >= 15 && seat.id <= 17) {
    extra += CHAIR_SEAT_Y_LIFT_15_17;
  }
  if (seat.id === 16) {
    extra += CHAIR_SEAT_Y_LIFT_16;
  }
  return extra;
}

export function chairSeatYLift(seat: TableSeat): number {
  let lift = CHAIR_COLLIDER_Y_LIFT;
  if (seat.id >= 17 && seat.id <= 21) {
    lift += CHAIR_SEAT_Y_LIFT_17_21;
  }
  return lift + chairSeatOnlyExtra(seat);
}

export function chairSeatBackMeters(seat: TableSeat): number {
  if (seat.id === 16) {
    return CHAIR_SEAT_BACK_CHAIR_16;
  }
  if (seat.face === "awayChest") {
    return CHAIR_SEAT_BACK_NEAR_CHEST;
  }
  return CHAIR_SEAT_BACK_METERS;
}

export function chairBackGap(seat: TableSeat): number {
  if (seat.id === 1) {
    return CHAIR_BACK_GAP_CHAIR_1;
  }
  if (seat.id === 16) {
    return CHAIR_BACK_GAP_CHAIR_16;
  }
  if (seat.id === 15) {
    return CHAIR_BACK_GAP_CHAIR_15;
  }
  if (seat.id === 7) {
    return CHAIR_BACK_GAP_CHAIR_7;
  }
  if (seat.face === "chest") {
    return CHAIR_BACK_GAP_CHEST_ROW;
  }
  if (seat.id >= 17 && seat.id <= 29) {
    return CHAIR_BACK_GAP_NEAR_CHEST_17_29;
  }
  return CHAIR_BACK_GAP;
}

export function chairColliderPoses(seat: TableSeat): { seat: ColliderPose; back: ColliderPose } {
  const forward = tableSeatForwardXZ(seat);
  const alongX = Math.abs(forward.x) >= Math.abs(forward.z);
  const seatScale = alongX
    ? { x: CHAIR_SEAT_DEPTH, y: CHAIR_SEAT_HEIGHT, z: CHAIR_SEAT_WIDTH }
    : { x: CHAIR_SEAT_WIDTH, y: CHAIR_SEAT_HEIGHT, z: CHAIR_SEAT_DEPTH };
  const backScale = alongX
    ? { x: CHAIR_BACK_DEPTH, y: CHAIR_BACK_HEIGHT, z: CHAIR_BACK_WIDTH }
    : { x: CHAIR_BACK_WIDTH, y: CHAIR_BACK_HEIGHT, z: CHAIR_BACK_DEPTH };
  const seatBack = chairSeatBackMeters(seat);
  const yLift = chairSeatYLift(seat);
  const hingeLift = yLift - chairSeatOnlyExtra(seat);
  const seatPos = {
    x: seat.sit.x - forward.x * seatBack,
    y: yLift + CHAIR_SEAT_HEIGHT / 2,
    z: seat.sit.z - forward.z * seatBack,
  };
  const backOffset = CHAIR_SEAT_DEPTH / 2 + chairBackGap(seat) + CHAIR_BACK_DEPTH / 2;
  const seatTop = hingeLift + CHAIR_SEAT_HEIGHT;
  const lean = (CHAIR_BACK_LEAN_DEGREES * Math.PI) / 180;
  const halfBack = CHAIR_BACK_HEIGHT / 2;
  const hinge = {
    x: seatPos.x - forward.x * backOffset,
    y: seatTop,
    z: seatPos.z - forward.z * backOffset,
  };
  return {
    seat: {
      position: seatPos,
      scale: seatScale,
      rotation: { x: 0, y: 0, z: 0 },
    },
    back: {
      position: {
        x: hinge.x - forward.x * Math.sin(lean) * halfBack,
        y: hinge.y + Math.cos(lean) * halfBack,
        z: hinge.z - forward.z * Math.sin(lean) * halfBack,
      },
      scale: backScale,
      rotation: chairBackEuler(seat),
    },
  };
}

export function tableTopColliderPose(seats: readonly TableSeat[] = TABLE_SEATS): { position: Vec3; scale: Vec3 } {
  const chestZ = seats.filter((seat) => seat.face === "chest").map((seat) => seat.sit.z);
  const awayZ = seats.filter((seat) => seat.face === "awayChest").map((seat) => seat.sit.z);
  const xs = seats.map((seat) => seat.sit.x);
  const minX = Math.min(...xs) + TABLE_TOP_INSET_X;
  const maxX = Math.max(...xs) - TABLE_TOP_INSET_X;
  const minZ = Math.max(...chestZ) + TABLE_TOP_INSET_Z_CHEST;
  const maxZ = Math.min(...awayZ) - TABLE_TOP_INSET_Z;
  return {
    position: { x: (minX + maxX) / 2, y: TABLE_TOP_Y, z: (minZ + maxZ) / 2 },
    scale: { x: maxX - minX, y: TABLE_TOP_THICKNESS, z: maxZ - minZ },
  };
}

export function tableSeatBoxCenter(sit: Vec3): Vec3 {
  return { x: sit.x, y: sit.y + TABLE_SEAT_BOX.y / 2, z: sit.z };
}

export function tableSeatById(id: number, seats: readonly TableSeat[] = TABLE_SEATS): TableSeat | undefined {
  return seats.find((seat) => seat.id === id);
}

/** Same 1×1×3 sit volumes the scene already uses as chair triggers. */
export function isInsideTableSeatTrigger(position: Vec3, seat: TableSeat): boolean {
  const center = tableSeatBoxCenter(seat.sit);
  const hx = TABLE_SEAT_BOX.x / 2;
  const hy = TABLE_SEAT_BOX.y / 2;
  const hz = TABLE_SEAT_BOX.z / 2;
  return (
    position.x >= center.x - hx &&
    position.x <= center.x + hx &&
    position.y >= center.y - hy &&
    position.y <= center.y + hy &&
    position.z >= center.z - hz &&
    position.z <= center.z + hz
  );
}

/** Sit clicks happen on the existing chair trigger; the avatar may still be a step behind. */
export function isAuthoritativeChairOccupant(position: Vec3, seat: TableSeat): boolean {
  if (isInsideTableSeatTrigger(position, seat)) {
    return true;
  }
  const idlePlant = tableSeatPlantPose(seat);
  const blowingPlant = tableSeatBlowingPlantPose(seat);
  const minY = seat.sit.y - 0.5;
  const maxY = seat.sit.y + TABLE_SEAT_BOX.y;
  if (position.y < minY || position.y > maxY) {
    return false;
  }
  return (
    !playerLeftSeat(position, seat.sit, 0.8) ||
    !playerLeftSeat(position, idlePlant, 0.9) ||
    !playerLeftSeat(position, blowingPlant, 0.9)
  );
}

/** Click-to-sit: player is at the table but not planted yet. */
export function isTableSitClaimNearChair(position: Vec3, seat: TableSeat): boolean {
  if (position.y < 0 || position.y > 4) {
    return false;
  }
  const dx = position.x - seat.sit.x;
  const dz = position.z - seat.sit.z;
  return Math.hypot(dx, dz) <= 3.5;
}

export function playerLeftSeat(player: Vec3, sit: Vec3, epsilon = TABLE_SIT_MOVE_EPSILON): boolean {
  const dx = player.x - sit.x;
  const dy = player.y - sit.y;
  const dz = player.z - sit.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) > epsilon;
}

/** Chair physics must not unsit; only locomotion after the sit grace period does. */
export function tableSitUnlocks(now: number, seatedAt: number, locomotionPressed: boolean, graceMs = TABLE_SIT_GRACE_MS): boolean {
  if (now - seatedAt < graceMs) {
    return false;
  }
  return locomotionPressed;
}
