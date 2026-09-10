import { engine, InputModifier, Transform } from "@dcl/sdk/ecs";
import { movePlayerTo, triggerEmote } from "~system/RestrictedActions";
import { POP_EMOTE_NAME, POP_STOMP_EMOTE } from "../shared/constants";
import type { ImpactPosition } from "../shared/popActionLock";
import { restoreTableSitFreeze } from "./sitLock";

/**
 * Local pose fallback when the server could not resolve a stomp position.
 * Never used as claim authority.
 */
export function captureLocalImpactPosition(): ImpactPosition | undefined {
  const transform = Transform.getOrNull(engine.PlayerEntity);
  if (!transform) {
    return undefined;
  }
  return {
    x: transform.position.x,
    y: transform.position.y,
    z: transform.position.z,
  };
}

/**
 * One-shot plant at the trusted stomp pose, then disable locomotion inputs.
 * Instant movePlayerTo (no duration, no cameraTarget) is the installed SDK
 * way to halt Explorer momentum. No per-frame teleport loop.
 */
export function lockLocalMovement(impact?: ImpactPosition): void {
  if (impact) {
    console.log("[CLIENT] pop impact position captured");
    void movePlayerTo({
      newRelativePosition: { x: impact.x, y: impact.y, z: impact.z },
    }).catch((error) => {
      console.log("[CLIENT] pop plant failed", {
        error: error instanceof Error ? error.message.slice(0, 80) : "unknown",
      });
    });
  }
  InputModifier.createOrReplace(engine.PlayerEntity, {
    mode: InputModifier.Mode.Standard({
      disableWalk: true,
      disableRun: true,
      disableJog: true,
      disableJump: true,
      disableDoubleJump: true,
      disableGliding: true,
      disableEmote: true,
    }),
  });
  console.log("[CLIENT] pop movement lock acquired");
}

export function unlockLocalMovement(): void {
  if (InputModifier.has(engine.PlayerEntity)) {
    InputModifier.deleteFrom(engine.PlayerEntity);
  }
  restoreTableSitFreeze();
  console.log("[CLIENT] pop movement lock released");
}

/** Built-in smash emote. Scene can trigger this while voluntary emotes are disabled. */
export function playPopStompEmote(): void {
  const emote = POP_EMOTE_NAME || POP_STOMP_EMOTE;
  void triggerEmote({ predefinedEmote: emote }).catch((error) => {
    console.log("[CLIENT] pop emote failed", {
      emote,
      error: error instanceof Error ? error.message.slice(0, 80) : "unknown",
    });
  });
}
