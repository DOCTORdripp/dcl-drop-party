import { engine, Transform } from "@dcl/sdk/ecs";
import { BalloonRuntime } from "../shared/schemas";
import { attachBalloonVisuals, type BalloonAttachment } from "../shared/balloonMesh";
import {
  BalloonVisualPile,
  CLAIM_ANIMATION_TIMING,
  fragmentOffset,
  fragmentScale,
  presentationPose,
} from "../shared/balloonVisual";
import { dropPose } from "../shared/balloonDrop";
import { BALLOON_LAND_MS } from "../shared/constants";
import type { WinnerRevealPayload } from "../shared/prizeReveal";

export class ClientBalloonPresentation {
  readonly pile = new BalloonVisualPile();
  private readonly attachments = new Map<string, BalloonAttachment>();
  private pendingReveal: WinnerRevealPayload | undefined;
  private revealBalloonId: string | undefined;

  beginWinnerClaim(balloonId: string, now: number, reveal: WinnerRevealPayload): void {
    this.pile.beginWinnerAnimation(balloonId, now);
    this.pendingReveal = reveal;
    this.revealBalloonId = balloonId;
  }

  isPastBurst(balloonId: string): boolean {
    const visual = this.pile.get(balloonId);
    return visual?.state === "BURST" || visual?.state === "HIDDEN";
  }

  takePendingReveal(balloonId: string): WinnerRevealPayload | undefined {
    if (this.revealBalloonId !== balloonId || !this.pendingReveal) {
      return undefined;
    }
    const reveal = this.pendingReveal;
    this.pendingReveal = undefined;
    this.revealBalloonId = undefined;
    return reveal;
  }

  syncWorld(now: number): { bursted: string[]; completed: string[] } {
    for (const [entity, balloon] of engine.getEntitiesWith(BalloonRuntime)) {
      if (balloon.status === "SPAWNED") {
        this.pile.observeSpawned(balloon.balloonId, Number(balloon.spawnedAt) || now, now, BALLOON_LAND_MS);
      } else if (balloon.status === "CLAIMED" || balloon.status === "EXPIRED") {
        this.pile.observeClaimed(balloon.balloonId, now);
      }
      if (!this.attachments.has(balloon.balloonId)) {
        this.attachments.set(balloon.balloonId, attachBalloonVisuals(entity, balloon.balloonId));
      }
    }
    return this.pile.tick(now);
  }

  applyTransforms(now: number, visible = true): void {
    for (const visual of this.pile.list()) {
      const attachment = this.attachments.get(visual.balloonId);
      if (!attachment || !Transform.has(attachment.visualRoot)) {
        continue;
      }
      if (!visible) {
        Transform.getMutable(attachment.visualRoot).scale = { x: 0, y: 0, z: 0 };
        for (const fragment of attachment.fragments) {
          if (Transform.has(fragment)) {
            Transform.getMutable(fragment).scale = { x: 0, y: 0, z: 0 };
          }
        }
        continue;
      }
      const elapsed =
        visual.startedAt !== undefined ? now - visual.startedAt : visual.state === "HIDDEN" ? CLAIM_ANIMATION_TIMING.totalMs : 0;
      const pose =
        visual.state === "DROPPING"
          ? dropPose(visual.startedAt !== undefined ? now - visual.startedAt : 0)
          : visual.state === "LIVE"
            ? { scale: { x: 1, y: 1, z: 1 }, yOffset: 0 }
            : presentationPose(elapsed);
      const root = Transform.getMutable(attachment.visualRoot);
      root.scale = { ...pose.scale };
      root.position = { x: 0, y: pose.yOffset, z: 0 };
      for (let i = 0; i < attachment.fragments.length; i++) {
        const fragment = attachment.fragments[i]!;
        if (!Transform.has(fragment)) {
          continue;
        }
        const fragmentTransform = Transform.getMutable(fragment);
        if (visual.state === "BURST") {
          fragmentTransform.position = fragmentOffset(i, elapsed);
          fragmentTransform.scale = fragmentScale(elapsed);
        } else {
          fragmentTransform.scale = { x: 0, y: 0, z: 0 };
        }
      }
    }
  }
}
