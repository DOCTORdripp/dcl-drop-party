import { engine, PlayerIdentityData, Transform } from "@dcl/sdk/ecs";
import { distanceMeters } from "./distance";

/**
 * Official Multiplayer Server player state.
 * Docs + sdk-skills: engine.getEntitiesWith(PlayerIdentityData) + Transform.getOrNull
 * on isServer(). Scene-local metres. Clients cannot spoof these reads.
 */
export type AuthoritativePlayer = {
  wallet: string;
  peerId: string;
  position: { x: number; y: number; z: number };
  entityPresent: boolean;
};

export function getAuthoritativePlayer(address: string): AuthoritativePlayer | null {
  const wanted = address.toLowerCase();
  for (const [entity, identity] of engine.getEntitiesWith(PlayerIdentityData)) {
    if (identity.address.toLowerCase() !== wanted) {
      continue;
    }
    const transform = Transform.getOrNull(entity);
    if (!transform) {
      return {
        wallet: wanted,
        peerId: identity.address,
        position: { x: 0, y: 0, z: 0 },
        entityPresent: false,
      };
    }
    return {
      wallet: wanted,
      peerId: identity.address,
      position: {
        x: transform.position.x,
        y: transform.position.y,
        z: transform.position.z,
      },
      entityPresent: true,
    };
  }
  return null;
}

export function listAuthoritativePlayers(): AuthoritativePlayer[] {
  const players: AuthoritativePlayer[] = [];
  for (const [entity, identity] of engine.getEntitiesWith(PlayerIdentityData)) {
    if (!identity.address) {
      continue;
    }
    const transform = Transform.getOrNull(entity);
    players.push({
      wallet: identity.address.toLowerCase(),
      peerId: identity.address,
      position: transform
        ? { x: transform.position.x, y: transform.position.y, z: transform.position.z }
        : { x: 0, y: 0, z: 0 },
      entityPresent: transform !== null,
    });
  }
  return players;
}

export function presentAuthoritativePlayerCount(): number {
  return listAuthoritativePlayers().filter((player) => player.entityPresent).length;
}

export function distance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  return distanceMeters(a, b);
}
