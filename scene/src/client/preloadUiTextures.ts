import { AssetLoad, engine } from "@dcl/sdk/ecs";
import { PRELOAD_UI_TEXTURES } from "../shared/uiTexturePreload";
import { whenSceneShellReady } from "../world/sceneShellPreload";

let uiPreloaded = false;

/** Official SDK7 AssetLoad: remaining scene files after the world shell. */
export function preloadSceneUiTextures(): void {
  whenSceneShellReady(() => {
    if (uiPreloaded) {
      return;
    }
    uiPreloaded = true;
    const entity = engine.addEntity();
    AssetLoad.create(entity, { assets: [...PRELOAD_UI_TEXTURES] });
  });
}
