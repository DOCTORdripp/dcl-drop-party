import { triggerEmote, triggerSceneEmote } from "~system/RestrictedActions";
import {
  BLOWING_EMOTE,
  SIT_AND_BLOW_EMOTE,
  alternateBlowingEmoteSrc,
  blowingEmoteSrc,
  blowingSitEmoteSrc,
  blowingEmoteConfigured,
  pickBlowingEmoteColor,
  sitAndBlowEmoteConfigured,
  type BlowingEmoteColor,
} from "../shared/balloonEmote";

let lastBlowingColor: BlowingEmoteColor | undefined;
let blowingColorSessionId = "";
let blowingVisualPlayCount = 0;

export function getBlowingVisualPlayCount(): number {
  return blowingVisualPlayCount;
}

export function resetBlowingVisualPlayCount(): void {
  blowingVisualPlayCount = 0;
}

function noteBlowingVisualPlay(): void {
  blowingVisualPlayCount += 1;
}

/** Picks a new color when a balloon interval starts. Returns true if the clip should restart. */
export function syncBlowingEmoteSession(sessionId: string, blowing: boolean): boolean {
  if (!blowing || sessionId.length === 0) {
    blowingColorSessionId = "";
    return false;
  }
  if (sessionId === blowingColorSessionId) {
    return false;
  }
  lastBlowingColor = pickBlowingEmoteColor(lastBlowingColor);
  blowingColorSessionId = sessionId;
  return true;
}

export function currentBlowingEmoteSrc(): string {
  return lastBlowingColor ? blowingEmoteSrc(lastBlowingColor) : BLOWING_EMOTE.sceneSrc;
}

export function currentSitBlowingEmoteSrc(): string {
  return lastBlowingColor ? blowingSitEmoteSrc(lastBlowingColor) : SIT_AND_BLOW_EMOTE.sceneSrc;
}

/**
 * Late-join refresh only: play a different existing color GLB so Explorer
 * cannot dedupe the same looping scene-emote URN.
 */
export function playAlternateBlowingEmoteVisual(seated: boolean): void {
  const swap = alternateBlowingEmoteSrc({ color: lastBlowingColor, seated });
  lastBlowingColor = swap.nextColor;
  console.log("[blow-sync] forced alternate visual", { from: swap.from, to: swap.to });
  noteBlowingVisualPlay();
  if (seated) {
    if (!sitAndBlowEmoteConfigured()) {
      return;
    }
    void playSceneEmote(swap.to, SIT_AND_BLOW_EMOTE.loop, "sitAndBlow");
    return;
  }
  if (!blowingEmoteConfigured()) {
    return;
  }
  void playSceneEmote(swap.to, BLOWING_EMOTE.loop, "blowing");
}

function playSceneEmote(src: string, loop: boolean, label: string): Promise<unknown> {
  return triggerSceneEmote({ src, loop }).then((result) => {
    if (!result?.success) {
      console.log(`[CLIENT] ${label} scene emote rejected`, { src, success: result?.success });
    }
  }).catch((error) => {
    console.log(`[CLIENT] ${label} scene emote failed`, {
      src,
      error: error instanceof Error ? error.message.slice(0, 80) : "unknown",
    });
  });
}

export function playBlowingEmoteVisual(): void {
  if (!blowingEmoteConfigured()) {
    return;
  }
  noteBlowingVisualPlay();
  const src = currentBlowingEmoteSrc();
  if (src) {
    void playSceneEmote(src, BLOWING_EMOTE.loop, "blowing");
    return;
  }
  void triggerEmote({ predefinedEmote: BLOWING_EMOTE.predefinedEmote }).catch((error) => {
    console.log("[CLIENT] blowing emote failed", {
      error: error instanceof Error ? error.message.slice(0, 80) : "unknown",
    });
  });
}

export function playSitAndBlowEmoteVisual(): Promise<unknown> {
  if (!sitAndBlowEmoteConfigured()) {
    return Promise.resolve();
  }
  noteBlowingVisualPlay();
  const src = currentSitBlowingEmoteSrc();
  if (src) {
    return playSceneEmote(src, SIT_AND_BLOW_EMOTE.loop, "sitAndBlow");
  }
  return triggerEmote({ predefinedEmote: SIT_AND_BLOW_EMOTE.predefinedEmote }).catch((error) => {
    console.log("[CLIENT] sitAndBlow emote failed", {
      emote: SIT_AND_BLOW_EMOTE.predefinedEmote,
      error: error instanceof Error ? error.message.slice(0, 80) : "unknown",
    });
  });
}
