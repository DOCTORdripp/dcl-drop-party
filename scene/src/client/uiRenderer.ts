import {
  POP_UI_MOBILE_VIRTUAL_HEIGHT,
  POP_UI_MOBILE_VIRTUAL_WIDTH,
  POP_UI_VIRTUAL_HEIGHT,
  POP_UI_VIRTUAL_WIDTH,
} from "../shared/constants";

export type UiScreenInset = "device" | "interactable" | "none";

export type UiRendererOptions = {
  virtualWidth?: number;
  virtualHeight?: number;
  screenInset?: UiScreenInset;
};

export type ScenePlatform = "mobile" | "desktop" | "web" | null;

export const DROP_PARTY_DESKTOP_UI_RENDERER_OPTIONS: UiRendererOptions = {
  virtualWidth: POP_UI_VIRTUAL_WIDTH,
  virtualHeight: POP_UI_VIRTUAL_HEIGHT,
};

/** Explicit 1600×720 so layout coords match the explorer; inset to the scene-UI rect. */
export const DROP_PARTY_MOBILE_UI_RENDERER_OPTIONS: UiRendererOptions = {
  virtualWidth: POP_UI_MOBILE_VIRTUAL_WIDTH,
  virtualHeight: POP_UI_MOBILE_VIRTUAL_HEIGHT,
  screenInset: "interactable",
};

/** Desktop/web fallback used before platform resolves. */
export const DROP_PARTY_UI_RENDERER_OPTIONS = DROP_PARTY_DESKTOP_UI_RENDERER_OPTIONS;

export function rendererOptionsForPlatform(platform: ScenePlatform): UiRendererOptions {
  if (platform === "mobile") {
    return { ...DROP_PARTY_MOBILE_UI_RENDERER_OPTIONS };
  }
  return { ...DROP_PARTY_DESKTOP_UI_RENDERER_OPTIONS };
}

/** Mobile Explorer sometimes reports platform late or as web; isMobile wins. */
export function resolveSceneUiPlatform(platform: ScenePlatform, mobileHint: boolean): "mobile" | "desktop" | "web" {
  if (mobileHint || platform === "mobile") {
    return "mobile";
  }
  if (platform === "web") {
    return "web";
  }
  return "desktop";
}

export type UiRendererApi = {
  setUiRenderer: (ui: () => any, options?: UiRendererOptions) => void;
};

let uiRendererRegistrationCount = 0;

export function getUiRendererRegistrationCount(): number {
  return uiRendererRegistrationCount;
}

export function resetUiRendererRegistrationCountForTests(): void {
  uiRendererRegistrationCount = 0;
}

/**
 * Register the scene UI renderer.
 * Call only from the client branch — never from isServer().
 * May be called again after platform resolves (Cozy Farm pattern).
 * Leaderboard updates must not call this.
 */
export function registerDropPartyUiRenderer(
  renderer: UiRendererApi,
  ui: () => any,
  options: UiRendererOptions = DROP_PARTY_UI_RENDERER_OPTIONS,
): void {
  uiRendererRegistrationCount += 1;
  renderer.setUiRenderer(ui, options);
}
