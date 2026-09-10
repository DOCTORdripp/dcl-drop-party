import { engine, InputAction, InputModifier, inputSystem, Transform } from "@dcl/sdk/ecs";
import { Vector3 } from "@dcl/sdk/math";
import { getPlatform, isMobile } from "@dcl/sdk/platform";
import { movePlayerTo, triggerEmote } from "~system/RestrictedActions";
import {
  setLocalSitSupport,
  setLocalTableTopCollision,
  setTableSeatPromptsHiddenForLocalSit,
} from "../world/tableSeats";
import {
  seatedEmoteNeedsReplay,
  seatedTablePose,
  shouldReplantSeatedPose,
  type SeatedTablePose,
} from "../shared/balloonEmote";
import { sitPlantMoveArgs } from "../shared/sitPlant";
import {
  TABLE_SIT_EMOTE,
  TABLE_SIT_REPLAY_MS,
  TABLE_SIT_REPLANT_MS,
  TABLE_STAND_EMOTE,
  tableSeatBehind,
  tableSeatLookAt,
  tableSeatPlantPoseForSitting,
  tableSitUnlocks,
  sitSupportNeeded,
  tableTopCollisionEnabled,
  type TableSeat,
  type Vec3,
} from "../shared/tableSeats";
import { playBlowingEmoteVisual, playSitAndBlowEmoteVisual } from "./blowingEmote";

type SitState = {
  seat: TableSeat;
  seatedAt: number;
  lastEmoteAt: number;
  blowing: boolean;
  planted: boolean;
  /** Unity: wait for sittingChair1 furniture snap, then play sitAndBlow. */
  pendingBlow?: boolean;
  pose?: SeatedTablePose;
} | undefined;

let sitting: SitState;
let sitListener: ((seat: TableSeat | undefined) => void) | undefined;
let sitGeneration = 0;

export function currentTableSeat(): TableSeat | undefined {
  return sitting?.seat;
}

/** True after sit → plant → sit. Plant-only leaves the avatar standing, then furniture-snaps. */
export function isTableSitSettled(): boolean {
  return Boolean(sitting?.planted);
}

export function setTableSitListener(listener: ((seat: TableSeat | undefined) => void) | undefined): void {
  sitListener = listener;
}

function isBevyClient(): boolean {
  return isMobile() || getPlatform() === "mobile";
}

function cameraLookAtPoint(distance = 12): Vec3 | undefined {
  const cam = Transform.getOrNull(engine.CameraEntity);
  if (!cam) {
    return undefined;
  }
  const forward = Vector3.rotate(Vector3.Forward(), cam.rotation);
  return {
    x: cam.position.x + forward.x * distance,
    y: cam.position.y + forward.y * distance,
    z: cam.position.z + forward.z * distance,
  };
}

/**
 * Explorer cancels movePlayerTo if the player is walking. Freeze locomotion for
 * the whole sit so plant (and stand-behind) can resolve even with WASD held.
 * Input still reports isPressed, which is how we detect "get up".
 */
function freezeSitLocomotion(): void {
  InputModifier.createOrReplace(engine.PlayerEntity, {
    mode: InputModifier.Mode.Standard({
      disableWalk: true,
      disableRun: true,
      disableJog: true,
      disableJump: true,
      disableDoubleJump: true,
      disableGliding: true,
      disableEmote: false,
    }),
  });
}

function unfreezeSitLocomotion(): void {
  if (InputModifier.has(engine.PlayerEntity)) {
    InputModifier.deleteFrom(engine.PlayerEntity);
  }
}

/** Re-apply after pop unlock deletes InputModifier while still seated. */
export function restoreTableSitFreeze(): void {
  if (sitting) {
    freezeSitLocomotion();
  }
}

function playSitEmote(): void {
  void triggerEmote({ predefinedEmote: TABLE_SIT_EMOTE }).catch((error) => {
    console.log("[SIT] emote failed", {
      emote: TABLE_SIT_EMOTE,
      error: error instanceof Error ? error.message.slice(0, 80) : "unknown",
    });
  });
}

function playStandEmote(): void {
  void triggerEmote({ predefinedEmote: TABLE_STAND_EMOTE }).catch((error) => {
    console.log("[SIT] stand emote failed", {
      emote: TABLE_STAND_EMOTE,
      error: error instanceof Error ? error.message.slice(0, 80) : "unknown",
    });
  });
}

function playSeatedPose(pose: SeatedTablePose): void {
  if (pose === "sitAndBlow") {
    void playSitAndBlowEmoteVisual();
    return;
  }
  playSitEmote();
}

function plantForPose(seat: TableSeat, pose: SeatedTablePose) {
  return tableSeatPlantPoseForSitting(seat, pose === "sitAndBlow");
}

/** Pass undefined when standing. Must run before the plant so Bevy lands on the pad. */
function applySitCollision(seat: TableSeat | undefined, pose: SeatedTablePose | undefined): void {
  setLocalTableTopCollision(tableTopCollisionEnabled(pose !== undefined));
  const support =
    seat && sitSupportNeeded({ pose, bevy: isBevyClient() }) ? plantForPose(seat, pose!) : undefined;
  setLocalSitSupport(support);
}

function plantPlayer(
  position: { x: number; y: number; z: number },
  lookAt: { x: number; y: number; z: number },
): Promise<unknown> {
  return movePlayerTo(
    sitPlantMoveArgs({
      position,
      tableLookAt: lookAt,
      cameraLookAt: cameraLookAtPoint(),
      mobile: isBevyClient(),
    }),
  ).catch((error) => {
    console.log("[SIT] movePlayerTo failed", {
      error: error instanceof Error ? error.message.slice(0, 80) : "unknown",
    });
  });
}

function locomotionPressed(): boolean {
  return (
    inputSystem.isPressed(InputAction.IA_FORWARD) ||
    inputSystem.isPressed(InputAction.IA_BACKWARD) ||
    inputSystem.isPressed(InputAction.IA_LEFT) ||
    inputSystem.isPressed(InputAction.IA_RIGHT) ||
    inputSystem.isPressed(InputAction.IA_JUMP) ||
    inputSystem.isPressed(InputAction.IA_WALK)
  );
}

/**
 * Unity: plant cancels sit, so sittingChair1 must run after plant (furniture snap).
 * Sit-and-blow used to plant first and skip that snap, which left the avatar standing.
 * After the snap, wait TABLE_SIT_REPLANT_MS then play the seated blow clip.
 * Bevy: no furniture snap; idle sit is not retriggered; sit-and-blow plays after plant.
 */
function runPlantSandwich(seat: TableSeat, pose: SeatedTablePose): void {
  const generation = ++sitGeneration;
  const bevy = isBevyClient();
  sitting!.planted = false;
  sitting!.pendingBlow = false;
  sitting!.pose = pose;
  sitting!.lastEmoteAt = Date.now();
  freezeSitLocomotion();
  applySitCollision(seat, pose);
  const plant = plantForPose(seat, pose);
  const lookAt = tableSeatLookAt(seat);
  if (pose === "sit" || !bevy) {
    playSitEmote();
  }
  void plantPlayer(plant, lookAt).then(() => {
    if (sitGeneration !== generation || !sitting || sitting.seat.id !== seat.id) {
      return;
    }
    const next = sitting.pose ?? pose;
    if (!bevy) {
      playSitEmote();
    }
    sitting.planted = true;
    sitting.lastEmoteAt = Date.now();
    if (next !== "sitAndBlow") {
      return;
    }
    if (bevy) {
      playSeatedPose("sitAndBlow");
      return;
    }
    sitting.pendingBlow = true;
  });
}

export function sitAtTableSeat(seat: TableSeat, now: number, blowing = false): void {
  const pose = seatedTablePose(blowing);
  sitting = {
    seat,
    seatedAt: now,
    lastEmoteAt: now,
    blowing,
    planted: false,
    pose,
  };
  sitListener?.(seat);
  setTableSeatPromptsHiddenForLocalSit(true);
  runPlantSandwich(seat, pose);
  console.log("[SIT] seated", { id: seat.id, plant: plantForPose(seat, pose), lookAt: tableSeatLookAt(seat), blowing, pose });
}

export function replayTableSitBlowing(): void {
  if (!sitting?.planted || !sitting.blowing) {
    return;
  }
  sitting.pendingBlow = false;
  playSeatedPose("sitAndBlow");
  sitting.lastEmoteAt = Date.now();
}

export function setTableSitBlowing(blowing: boolean): void {
  if (!sitting) {
    return;
  }
  const from = sitting.pose ?? seatedTablePose(sitting.blowing);
  sitting.blowing = blowing;
  const pose = seatedTablePose(blowing);
  if (from === pose) {
    return;
  }
  if (!sitting.planted || !shouldReplantSeatedPose({ planted: true, from, to: pose })) {
    sitting.pose = pose;
    sitting.pendingBlow = false;
    if (sitting.planted) {
      playSeatedPose(pose);
      sitting.lastEmoteAt = Date.now();
    }
    return;
  }
  runPlantSandwich(sitting.seat, pose);
}

export function standFromTableSeat(now: number): void {
  if (!sitting) {
    return;
  }
  sitGeneration += 1;
  const wasBlowing = sitting.blowing;
  const seat = sitting.seat;
  const behind = tableSeatBehind(seat);
  const lookAt = tableSeatLookAt(seat);
  sitting = undefined;
  sitListener?.(undefined);
  freezeSitLocomotion();
  setTableSeatPromptsHiddenForLocalSit(false);
  setLocalSitSupport(undefined);
  if (wasBlowing) {
    playBlowingEmoteVisual();
  } else {
    playStandEmote();
  }
  void plantPlayer(behind, lookAt).then(() => {
    if (!sitting) {
      unfreezeSitLocomotion();
      applySitCollision(undefined, undefined);
    }
  });
  console.log("[SIT] stood", { id: seat.id, behind, now });
}

export function tickTableSit(now: number): void {
  if (!sitting) {
    return;
  }
  freezeSitLocomotion();
  if (sitting.planted && tableSitUnlocks(now, sitting.seatedAt, locomotionPressed())) {
    standFromTableSeat(now);
    return;
  }
  if (!sitting.planted) {
    return;
  }
  if (sitting.pendingBlow && now - sitting.lastEmoteAt >= TABLE_SIT_REPLANT_MS) {
    sitting.pendingBlow = false;
    playSeatedPose("sitAndBlow");
    sitting.lastEmoteAt = now;
    return;
  }
  const pose = sitting.pose ?? seatedTablePose(sitting.blowing);
  if (seatedEmoteNeedsReplay(pose, isBevyClient()) && now - sitting.lastEmoteAt >= TABLE_SIT_REPLAY_MS) {
    playSeatedPose(pose);
    sitting.lastEmoteAt = now;
  }
}
