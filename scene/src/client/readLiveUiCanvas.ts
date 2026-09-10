import { engine, UiCanvasInformation } from "@dcl/sdk/ecs";
import { DEFAULT_UI_CANVAS, type UiCanvas } from "../shared/uiLayout";
import { liveInsetsAreUsable, type UiEdgeInsets } from "../shared/chestUiLayout";

export function readLiveUiCanvas(): { canvas: UiCanvas; insets?: UiEdgeInsets } {
  try {
    const info = UiCanvasInformation.getOrNull(engine.RootEntity);
    if (!info || info.width <= 0 || info.height <= 0) {
      return { canvas: DEFAULT_UI_CANVAS };
    }
    const area = info.interactableArea;
    const candidate =
      area && area.top + area.left + area.right + area.bottom > 0
        ? { top: area.top, left: area.left, right: area.right, bottom: area.bottom }
        : undefined;
    const canvas = { virtualWidth: info.width, virtualHeight: info.height };
    const insets = candidate && liveInsetsAreUsable(canvas, candidate) ? candidate : undefined;
    return { canvas, insets };
  } catch {
    return { canvas: DEFAULT_UI_CANVAS };
  }
}
