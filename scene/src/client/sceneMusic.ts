import { AudioSource, engine, Transform } from "@dcl/sdk/ecs";
import {
  applyMusicZone,
  balloonSfxAllowed,
  createSceneMusicPlayback,
  sceneMusicZone,
  setMusicVolume,
  shouldAdvanceIndoorPlaylist,
  skipIndoorTrack,
  SCENE_MUSIC_VOLUME_STEP,
  SFX_BALLOON_FILL_SRC,
  SFX_BALLOON_POP_SRC,
  SFX_BALLOON_VOLUME,
  toggleMusicPaused,
  type SceneMusicPlayback,
} from "../shared/sceneMusic";

export type SceneMusicController = {
  entity: ReturnType<typeof engine.addEntity>;
  fillSfxEntity: ReturnType<typeof engine.addEntity>;
  popSfxEntity: ReturnType<typeof engine.addEntity>;
  playback: SceneMusicPlayback;
  heardPlaying: boolean;
};

function attachToPlayerHead(entity: ReturnType<typeof engine.addEntity>): void {
  Transform.create(entity, {
    parent: engine.PlayerEntity,
    position: { x: 0, y: 1.6, z: 0 },
  });
}

function playOneShot(
  entity: ReturnType<typeof engine.addEntity>,
  audioClipUrl: string,
): void {
  AudioSource.createOrReplace(entity, {
    audioClipUrl,
    playing: true,
    loop: false,
    volume: SFX_BALLOON_VOLUME,
    global: true,
    currentTime: 0,
  });
}

function writeAudio(controller: SceneMusicController, restart: boolean): void {
  AudioSource.createOrReplace(controller.entity, {
    audioClipUrl: controller.playback.clipUrl,
    playing: !controller.playback.paused,
    loop: controller.playback.loop,
    volume: controller.playback.volume,
    global: true,
    ...(restart ? { currentTime: 0 } : {}),
  });
  controller.heardPlaying = false;
}

export function createSceneMusicController(): SceneMusicController {
  const entity = engine.addEntity();
  const fillSfxEntity = engine.addEntity();
  const popSfxEntity = engine.addEntity();
  attachToPlayerHead(entity);
  attachToPlayerHead(fillSfxEntity);
  attachToPlayerHead(popSfxEntity);
  const controller: SceneMusicController = {
    entity,
    fillSfxEntity,
    popSfxEntity,
    playback: createSceneMusicPlayback(),
    heardPlaying: false,
  };
  writeAudio(controller, true);
  return controller;
}

export function playBalloonFillSfx(controller: SceneMusicController): void {
  if (!balloonSfxAllowed(controller.playback.paused)) {
    return;
  }
  playOneShot(controller.fillSfxEntity, SFX_BALLOON_FILL_SRC);
}

export function playBalloonPopSfx(controller: SceneMusicController): void {
  if (!balloonSfxAllowed(controller.playback.paused)) {
    return;
  }
  playOneShot(controller.popSfxEntity, SFX_BALLOON_POP_SRC);
}

function syncVolumeAndLoop(controller: SceneMusicController): void {
  if (!AudioSource.getOrNull(controller.entity)) {
    writeAudio(controller, true);
    return;
  }
  const mutable = AudioSource.getMutable(controller.entity);
  mutable.volume = controller.playback.volume;
  mutable.loop = controller.playback.loop;
}

function applyPauseState(controller: SceneMusicController): void {
  if (!AudioSource.getOrNull(controller.entity)) {
    writeAudio(controller, true);
    return;
  }
  const mutable = AudioSource.getMutable(controller.entity);
  mutable.playing = !controller.playback.paused;
  mutable.volume = controller.playback.volume;
  mutable.loop = controller.playback.loop;
}

export function tickSceneMusicController(controller: SceneMusicController): void {
  const transform = Transform.getOrNull(engine.PlayerEntity);
  if (transform) {
    const previous = controller.playback.clipUrl;
    controller.playback = applyMusicZone(controller.playback, sceneMusicZone(transform.position));
    if (controller.playback.clipUrl !== previous) {
      writeAudio(controller, true);
    }
  }

  const source = AudioSource.getOrNull(controller.entity);
  if (
    shouldAdvanceIndoorPlaylist({
      zone: controller.playback.zone,
      paused: controller.playback.paused,
      heardPlaying: controller.heardPlaying,
      enginePlaying: Boolean(source?.playing),
    })
  ) {
    controller.playback = skipIndoorTrack(controller.playback);
    writeAudio(controller, true);
    return;
  }

  if (source?.playing) {
    controller.heardPlaying = true;
  }

  if (source && controller.playback.paused && source.playing) {
    applyPauseState(controller);
    return;
  }

  if (source && controller.playback.loop && !controller.playback.paused && !source.playing) {
    applyPauseState(controller);
    return;
  }

  syncVolumeAndLoop(controller);
}

export function toggleSceneMusic(controller: SceneMusicController): void {
  controller.playback = toggleMusicPaused(controller.playback);
  applyPauseState(controller);
  if (controller.playback.paused) {
    controller.heardPlaying = false;
  }
}

export function nextSceneSong(controller: SceneMusicController): void {
  const previous = controller.playback.clipUrl;
  controller.playback = skipIndoorTrack(controller.playback);
  if (controller.playback.clipUrl !== previous) {
    writeAudio(controller, true);
  }
}

export function nudgeSceneMusicVolume(controller: SceneMusicController, direction: 1 | -1): void {
  controller.playback = setMusicVolume(
    controller.playback,
    controller.playback.volume + direction * SCENE_MUSIC_VOLUME_STEP,
  );
  syncVolumeAndLoop(controller);
}
