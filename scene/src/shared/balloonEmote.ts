import { MEANINGFUL_BLOW_MOVE_EPSILON_METERS } from "./balloonProfile";

export const BLOWING_EMOTE_COLORS = ["Purple", "Blue", "Green", "Orange", "Pink", "Red", "Yellow"] as const;

export type BlowingEmoteColor = (typeof BLOWING_EMOTE_COLORS)[number];

/** Short folder + 3-letter codes keep scene-emote URNs under the Explorer's maxEmoteUrnBytes cap. */
export const BLOWING_EMOTE_DIR = "assets/e";

export const BLOWING_EMOTE_COLOR_CODE: Record<BlowingEmoteColor, string> = {
  Purple: "Prp",
  Blue: "Blu",
  Green: "Grn",
  Orange: "Org",
  Pink: "Pnk",
  Red: "Red",
  Yellow: "Ylw",
};

export function blowingEmoteSrc(color: BlowingEmoteColor): string {
  return `${BLOWING_EMOTE_DIR}/blow${BLOWING_EMOTE_COLOR_CODE[color]}_emote.glb`;
}

export function blowingSitEmoteSrc(color: BlowingEmoteColor): string {
  return `${BLOWING_EMOTE_DIR}/sitBlow${BLOWING_EMOTE_COLOR_CODE[color]}_emote.glb`;
}

/** Next color in the rotation. Used by late-join visual refresh so Explorer gets a different URN. */
export function nextBlowingEmoteColor(current: BlowingEmoteColor | undefined): BlowingEmoteColor {
  if (!current) {
    return BLOWING_EMOTE_COLORS[1] ?? BLOWING_EMOTE_COLORS[0]!;
  }
  const index = BLOWING_EMOTE_COLORS.indexOf(current);
  const from = index < 0 ? 0 : index;
  return BLOWING_EMOTE_COLORS[(from + 1) % BLOWING_EMOTE_COLORS.length]!;
}

/** Same pose family, different GLB than the currently displayed color. */
export function alternateBlowingEmoteSrc(args: {
  color: BlowingEmoteColor | undefined;
  seated: boolean;
}): { from: string; to: string; nextColor: BlowingEmoteColor } {
  const fromColor = args.color ?? "Purple";
  const nextColor = nextBlowingEmoteColor(fromColor);
  const srcFor = args.seated ? blowingSitEmoteSrc : blowingEmoteSrc;
  return {
    from: srcFor(fromColor),
    to: srcFor(nextColor),
    nextColor,
  };
}

/** Random color, never repeating the balloon that just finished. */
export function pickBlowingEmoteColor(
  previous: BlowingEmoteColor | undefined,
  random: () => number = Math.random,
): BlowingEmoteColor {
  const pool = previous ? BLOWING_EMOTE_COLORS.filter((color) => color !== previous) : BLOWING_EMOTE_COLORS;
  const index = Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)));
  return pool[index]!;
}

/**
 * Standing blowing emote. Explorer only accepts avatar clips named `*_emote.glb`.
 * Each balloon interval picks a color clip; `loop` holds that clip until the next balloon.
 */
export const BLOWING_EMOTE = {
  predefinedEmote: "",
  sceneSrc: blowingEmoteSrc("Purple"),
  loop: true,
  replayMs: 0,
  /** Ignore stop-start walk retriggers for this long so comms is not spammed. */
  walkRetriggerMs: 2_000,
} as const;

/**
 * Seated blowing pose. Same color rotation as standing; looping scene clips
 * replace the old sittingChair2 placeholder.
 */
export const SIT_AND_BLOW_EMOTE = {
  predefinedEmote: "",
  sceneSrc: blowingSitEmoteSrc("Purple"),
  loop: true,
} as const;

export type SeatedTablePose = "sit" | "sitAndBlow";

export function seatedTablePose(isBlowing: boolean): SeatedTablePose {
  return isBlowing ? "sitAndBlow" : "sit";
}

/**
 * Sit-and-blow uses a different plant offset. Only entering that pose should
 * replant. Leaving it (party interrupt / STOP) must keep `planted` / sit-ready.
 */
export function shouldReplantSeatedPose(args: {
  planted: boolean;
  from: SeatedTablePose;
  to: SeatedTablePose;
}): boolean {
  if (!args.planted || args.from === args.to) {
    return false;
  }
  return args.to === "sitAndBlow";
}

/** Looping scene sitAndBlow should not retrigger. Unity predefined chair sits must, or the avatar stands. Bevy sittingChair1 re-snaps every clip tick if retriggered. */
export function seatedEmoteNeedsReplay(pose: SeatedTablePose, bevyExplorer = false): boolean {
  if (pose === "sitAndBlow" && SIT_AND_BLOW_EMOTE.sceneSrc.length > 0) {
    return false;
  }
  if (bevyExplorer && pose === "sit") {
    return false;
  }
  return true;
}

export function blowingEmoteConfigured(): boolean {
  return BLOWING_EMOTE_COLORS.length > 0 || BLOWING_EMOTE.sceneSrc.length > 0 || BLOWING_EMOTE.predefinedEmote.length > 0;
}

export function sitAndBlowEmoteConfigured(): boolean {
  return SIT_AND_BLOW_EMOTE.sceneSrc.length > 0 || SIT_AND_BLOW_EMOTE.predefinedEmote.length > 0;
}

/** Standing blow starts once, retriggers after a walk, and only timer-loops when replayMs > 0. */
export function shouldPlayStandingBlowEmote(input: {
  seated: boolean;
  moving: boolean;
  wasMoving: boolean;
  playing: boolean;
  lastPlayedAt: number;
  now: number;
  replayMs: number;
  walkRetriggerMs?: number;
  /** True if the player walked since the last successful standing play. Survives the cooldown. */
  movedSincePlay?: boolean;
}): boolean {
  if (input.seated || input.moving) {
    return false;
  }
  if (!input.playing) {
    return true;
  }
  const walkMs = input.walkRetriggerMs ?? 0;
  if (walkMs > 0 && input.now - input.lastPlayedAt < walkMs) {
    return false;
  }
  if (input.wasMoving || input.movedSincePlay) {
    return true;
  }
  return input.replayMs > 0 && input.now - input.lastPlayedAt >= input.replayMs;
}

export type BalloonMoveSample = { x: number; y: number; z: number };

export function displacementMeters(from: BalloonMoveSample, to: BalloonMoveSample): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function isMeaningfulBlowMove(
  from: BalloonMoveSample | undefined,
  to: BalloonMoveSample,
  epsilon = MEANINGFUL_BLOW_MOVE_EPSILON_METERS,
): boolean {
  if (!from) {
    return false;
  }
  return displacementMeters(from, to) > epsilon;
}
