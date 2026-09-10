import {
  employeeGreetingTriggerBounds,
  isInsideEmployeeGreetingTrigger,
} from "./employeeGreetingTrigger";

export const SCENE_MUSIC_OUTDOOR_SRC = "assets/songs/birds0.mp3";
export const SCENE_MUSIC_INDOOR_SRCS = [
  "assets/songs/song1.mp3",
  "assets/songs/song2.mp3",
  "assets/songs/song3.mp3",
  "assets/songs/song4.mp3",
  "assets/songs/song5.mp3",
  "assets/songs/song6.mp3",
] as const;

export const SCENE_MUSIC_VOLUME_STEP = 0.1;
export const SCENE_MUSIC_VOLUME_DEFAULT = 0.45;
export const SCENE_MUSIC_VOLUME_MIN = 0;
export const SCENE_MUSIC_VOLUME_MAX = 1;

export const SFX_BALLOON_FILL_SRC = "assets/songs/sfx_balloonFill.mp3";
export const SFX_BALLOON_POP_SRC = "assets/songs/sfx_balloonPop.mp3";
export const SFX_BALLOON_VOLUME = 0.6;

/** Balloon SFX follow STOP on the volume HUD, not the music slider. */
export function balloonSfxAllowed(paused: boolean): boolean {
  return !paused;
}

export const MUSIC_ICON_STOP_SRC = "assets/images/icon_volStop.png";
export const MUSIC_ICON_PLAY_SRC = "assets/images/icon_volPlay.png";
export const MUSIC_ICON_NEXT_SRC = "assets/images/icon_volSkip.png";
export const MUSIC_ICON_VOL_DOWN_SRC = "assets/images/icon_volDown.png";
export const MUSIC_ICON_VOL_UP_SRC = "assets/images/icon_volUp.png";

export type SceneMusicHud = {
  paused: boolean;
  volume: number;
};

export type SceneMusicZone = "outdoor" | "indoor";

export type SceneMusicPlayback = {
  zone: SceneMusicZone;
  indoorPlaylist: readonly string[];
  indoorIndex: number;
  paused: boolean;
  volume: number;
  clipUrl: string;
  loop: boolean;
};

export function shuffleIndoorPlaylist(random: () => number = Math.random): string[] {
  const next = [...SCENE_MUSIC_INDOOR_SRCS];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = next[i]!;
    next[i] = next[j]!;
    next[j] = a;
  }
  return next;
}

export function clampMusicVolume(volume: number): number {
  const stepped = Math.round(volume * 10) / 10;
  return Math.min(SCENE_MUSIC_VOLUME_MAX, Math.max(SCENE_MUSIC_VOLUME_MIN, stepped));
}

export function stepMusicVolume(volume: number, direction: 1 | -1): number {
  return clampMusicVolume(volume + direction * SCENE_MUSIC_VOLUME_STEP);
}

export function sceneMusicZone(position: { x: number; y: number; z: number }): SceneMusicZone {
  const door = employeeGreetingTriggerBounds();
  if (isInsideEmployeeGreetingTrigger(position) || position.z >= door.minZ) {
    return "indoor";
  }
  return "outdoor";
}

function clipForZone(state: SceneMusicPlayback, zone: SceneMusicZone): Pick<SceneMusicPlayback, "clipUrl" | "loop"> {
  if (zone === "outdoor") {
    return { clipUrl: SCENE_MUSIC_OUTDOOR_SRC, loop: true };
  }
  return { clipUrl: state.indoorPlaylist[state.indoorIndex] ?? SCENE_MUSIC_INDOOR_SRCS[0], loop: false };
}

export function createSceneMusicPlayback(
  random: () => number = Math.random,
  zone: SceneMusicZone = "outdoor",
): SceneMusicPlayback {
  const indoorPlaylist = shuffleIndoorPlaylist(random);
  const base: SceneMusicPlayback = {
    zone,
    indoorPlaylist,
    indoorIndex: 0,
    paused: false,
    volume: SCENE_MUSIC_VOLUME_DEFAULT,
    clipUrl: SCENE_MUSIC_OUTDOOR_SRC,
    loop: true,
  };
  return { ...base, ...clipForZone(base, zone) };
}

export function applyMusicZone(state: SceneMusicPlayback, zone: SceneMusicZone): SceneMusicPlayback {
  if (state.zone === zone) {
    return state;
  }
  return { ...state, zone, ...clipForZone(state, zone) };
}

export function toggleMusicPaused(state: SceneMusicPlayback): SceneMusicPlayback {
  return { ...state, paused: !state.paused };
}

export function skipIndoorTrack(state: SceneMusicPlayback): SceneMusicPlayback {
  const indoorIndex = (state.indoorIndex + 1) % Math.max(1, state.indoorPlaylist.length);
  const next: SceneMusicPlayback = { ...state, indoorIndex };
  if (state.zone !== "indoor") {
    return next;
  }
  return {
    ...next,
    paused: false,
    ...clipForZone(next, "indoor"),
  };
}

/** True when an indoor clip has ended and the shuffled playlist should move on. */
export function shouldAdvanceIndoorPlaylist(args: {
  zone: SceneMusicZone;
  paused: boolean;
  heardPlaying: boolean;
  enginePlaying: boolean;
}): boolean {
  return args.zone === "indoor" && !args.paused && args.heardPlaying && !args.enginePlaying;
}

export function setMusicVolume(state: SceneMusicPlayback, volume: number): SceneMusicPlayback {
  return { ...state, volume: clampMusicVolume(volume) };
}

export function musicPlayLabel(paused: boolean): string {
  return paused ? "PLAY" : "STOP";
}

export function musicToggleIconSrc(paused: boolean): string {
  return paused ? MUSIC_ICON_PLAY_SRC : MUSIC_ICON_STOP_SRC;
}

export function musicVolumeLabel(volume: number): string {
  return `${Math.round(clampMusicVolume(volume) * 100)}%`;
}
