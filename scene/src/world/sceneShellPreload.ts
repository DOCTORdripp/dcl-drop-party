import { AssetLoad, AssetLoadLoadingState, engine, LoadingState } from "@dcl/sdk/ecs";
import { PRELOAD_SCENE_SHELL } from "../shared/uiTexturePreload";

const SCENE_SHELL_WAIT_SEC = 10;
const SCENE_SHELL_SYSTEM = "dropparty-scene-shell";

let shellEntity: ReturnType<typeof engine.addEntity> | undefined;
let shellReady = false;
const shellCallbacks: Array<() => void> = [];

function assetLoadFinished(state: LoadingState): boolean {
  return (
    state === LoadingState.FINISHED ||
    state === LoadingState.FINISHED_WITH_ERROR ||
    state === LoadingState.NOT_FOUND
  );
}

export function sceneShellAssetsLoaded(entity: ReturnType<typeof engine.addEntity>): boolean {
  if (!AssetLoadLoadingState.has(entity)) {
    return false;
  }
  const remaining = new Set(PRELOAD_SCENE_SHELL);
  for (const event of AssetLoadLoadingState.get(entity)) {
    if (assetLoadFinished(event.currentState)) {
      remaining.delete(event.asset);
    }
  }
  return remaining.size === 0;
}

function flushSceneShellReady(): void {
  if (shellReady) {
    return;
  }
  shellReady = true;
  engine.removeSystem(SCENE_SHELL_SYSTEM);
  const queued = shellCallbacks.splice(0);
  for (const callback of queued) {
    callback();
  }
}

/** Official SDK7 AssetLoad: castle, hedges, grass, and road before anything else. */
export function preloadSceneShell(): void {
  if (shellEntity !== undefined) {
    return;
  }
  shellEntity = engine.addEntity();
  AssetLoad.create(shellEntity, { assets: [...PRELOAD_SCENE_SHELL] });
  let elapsed = 0;
  engine.addSystem(
    (dt) => {
      if (shellReady) {
        return;
      }
      elapsed += dt;
      if (sceneShellAssetsLoaded(shellEntity!) || elapsed >= SCENE_SHELL_WAIT_SEC) {
        flushSceneShellReady();
      }
    },
    Number.MAX_SAFE_INTEGER,
    SCENE_SHELL_SYSTEM,
  );
}

export function isSceneShellReady(): boolean {
  return shellReady;
}

export function whenSceneShellReady(callback: () => void): void {
  preloadSceneShell();
  if (shellReady) {
    callback();
    return;
  }
  shellCallbacks.push(callback);
}
