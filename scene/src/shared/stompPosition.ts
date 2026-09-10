import { POP_STOMP_FLOOR_Y } from "./constants";
import type { ImpactPosition } from "./popActionLock";

export type StompPosition = ImpactPosition;

/**
 * Standing plant over the claimed balloon footprint.
 * Uses landing X/Z and the scene floor Y so the avatar is not
 * teleported into the balloon mesh center.
 */
export function getBalloonStompPosition(
  balloon: { position: { x: number; y: number; z: number } },
  floorY = POP_STOMP_FLOOR_Y,
): StompPosition {
  return {
    x: balloon.position.x,
    y: floorY,
    z: balloon.position.z,
  };
}

/** Server runtime lookup for the Convex-winning balloon only. */
export function resolveAuthoritativeStomp(
  getBalloon: (balloonId: string) => { position: StompPosition } | undefined,
  wonBalloonId: string,
): { stompPosition?: StompPosition; resolved: boolean } {
  const balloon = getBalloon(wonBalloonId);
  if (!balloon) {
    return { resolved: false };
  }
  return { resolved: true, stompPosition: getBalloonStompPosition(balloon) };
}

export function isFiniteStomp(position: Partial<StompPosition> | undefined): position is StompPosition {
  return (
    position !== undefined &&
    Number.isFinite(position.x) &&
    Number.isFinite(position.y) &&
    Number.isFinite(position.z)
  );
}

/** Reads only the winner-only server popResult fields. */
export function stompPositionFromPopResult(data: {
  hasStompPosition?: boolean;
  stompPosition?: Partial<StompPosition>;
}): StompPosition | undefined {
  if (!data.hasStompPosition) {
    return undefined;
  }
  return isFiniteStomp(data.stompPosition) ? { ...data.stompPosition } : undefined;
}

/**
 * Plant target after a committed WON.
 * Client-suggested coordinates are ignored.
 */
export function choosePlantPosition(args: {
  serverStomp?: StompPosition;
  localFallback?: StompPosition;
  clientSuggested?: StompPosition;
}): { position?: StompPosition; source: "server" | "local" | "none" } {
  void args.clientSuggested;
  if (isFiniteStomp(args.serverStomp)) {
    return { position: args.serverStomp, source: "server" };
  }
  if (isFiniteStomp(args.localFallback)) {
    return { position: args.localFallback, source: "local" };
  }
  return { source: "none" };
}

/** Presentation data must never roll back a committed Convex WON. */
export function deliverWonPresentation(args: {
  convexResult: "WON";
  balloonId: string;
  stompPosition?: StompPosition;
}): {
  result: "WON";
  balloonId: string;
  stompPosition?: StompPosition;
  claimRolledBack: false;
} {
  return {
    result: "WON",
    balloonId: args.balloonId,
    stompPosition: args.stompPosition,
    claimRolledBack: false,
  };
}

/** popResult is winner-only; other peers are not in the audience. */
export function wonPopResultAudience(winnerPeerId: string): string[] {
  return [winnerPeerId];
}
