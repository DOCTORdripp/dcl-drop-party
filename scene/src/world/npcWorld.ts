import { Entity, InputAction, PointerEvents, TextShape, pointerEventsSystem } from "@dcl/sdk/ecs";
import type { CastleHandles } from "./castleBuild";
import { NPC_GREETING_MS } from "../shared/balloonProfile";
import { HELP_WANTED_HOVER_HIRE, npcGreetingStillVisible, npcGreetingText } from "../shared/helpWanted";

const NPC_HOVER_DISTANCE = 8;
let npcInteractionEnabled = true;

function bindTalkTarget(entity: Entity, onHelpWanted: () => void): void {
  pointerEventsSystem.onPointerDown(
    {
      entity,
      opts: {
        button: InputAction.IA_POINTER,
        hoverText: HELP_WANTED_HOVER_HIRE,
        maxDistance: NPC_HOVER_DISTANCE,
      },
    },
    () => onHelpWanted(),
  );
}

function setEntityHoverText(entity: Entity, hoverText: string): void {
  const registered = PointerEvents.getMutableOrNull(entity);
  const info = registered?.pointerEvents[0]?.eventInfo;
  if (!info || info.hoverText === hoverText) {
    return;
  }
  info.hoverText = hoverText;
}

export function bindNpcInteraction(handles: CastleHandles, onHelpWanted: () => void): void {
  bindTalkTarget(handles.npcTorso, onHelpWanted);
  bindTalkTarget(handles.helpDesk, onHelpWanted);
}

export function setNpcHoverText(handles: CastleHandles, hoverText: string): void {
  setEntityHoverText(handles.npcTorso, hoverText);
  setEntityHoverText(handles.helpDesk, hoverText);
}

function setEntityInteractionEnabled(entity: Entity, enabled: boolean): void {
  const registered = PointerEvents.getMutableOrNull(entity);
  const info = registered?.pointerEvents[0]?.eventInfo;
  if (!info) return;
  info.showFeedback = enabled;
  info.showHighlight = enabled;
  info.maxDistance = enabled ? NPC_HOVER_DISTANCE : 0;
}

export function setNpcInteractionEnabled(handles: CastleHandles, enabled: boolean): void {
  if (npcInteractionEnabled === enabled) return;
  npcInteractionEnabled = enabled;
  setEntityInteractionEnabled(handles.npcTorso, enabled);
  setEntityInteractionEnabled(handles.helpDesk, enabled);
}

export function tickNpcIdle(_handles: CastleHandles, _now: number): void {
  // Mixamo idle lives on the GLB; do not bob the whole character.
}

export function showNpcGreeting(handles: CastleHandles, playerName: string, now: number): number {
  if (TextShape.has(handles.npcSpeech)) {
    TextShape.getMutable(handles.npcSpeech).text = npcGreetingText(playerName);
  }
  return now + NPC_GREETING_MS;
}

export function tickNpcGreeting(handles: CastleHandles, hideAt: number | undefined, now: number): number | undefined {
  if (npcGreetingStillVisible(hideAt, now)) {
    return hideAt;
  }
  if (hideAt !== undefined && TextShape.has(handles.npcSpeech)) {
    TextShape.getMutable(handles.npcSpeech).text = "";
  }
  return undefined;
}
