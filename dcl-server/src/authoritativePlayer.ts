/**
 * Adapter for official DCL Multiplayer Server player state.
 *
 * Official claim-proximity source (docs + sdk-skills authoritative-server):
 *   for (const [entity, identity] of engine.getEntitiesWith(PlayerIdentityData)) {
 *     const transform = Transform.getOrNull(entity)
 *     // identity.address is server-verified
 *     // transform.position is scene-local metres and is not client-spoofable
 *   }
 *
 * Do not use client getPlayer() / Transform on PlayerEntity as claim authority.
 * This module does not import @dcl/sdk because that package is not installed
 * by the scene's private service.
 */

export type OfficialPlayerIdentity = {
  address: string;
};

export type OfficialTransform = {
  position: { x: number; y: number; z: number };
};

export type AuthoritativePlayerSnapshot = {
  wallet: string;
  position: { x: number; y: number; z: number };
  observedAt: number;
};

export function mapOfficialPlayerState(args: {
  identity: OfficialPlayerIdentity;
  transform: OfficialTransform | null;
  observedAt: number;
}): AuthoritativePlayerSnapshot | null {
  if (!args.transform) {
    return null;
  }
  return {
    wallet: args.identity.address.toLowerCase(),
    position: args.transform.position,
    observedAt: args.observedAt,
  };
}

export function notWiredError(): never {
  throw new Error(
    "DCL Multiplayer Server is not wired. Install @dcl/sdk@auth-server in the scene project and read PlayerIdentityData + Transform on isServer().",
  );
}
