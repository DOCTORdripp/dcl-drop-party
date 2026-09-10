import type { BlowerSceneEntry } from "./blowerWall";

export type LeaderboardStore = {
  generatedAt: number;
  entries: BlowerSceneEntry[];
};

export type LeaderboardUpdate = {
  generatedAt: number;
  entries: readonly BlowerSceneEntry[];
};

export function emptyLeaderboardStore(): LeaderboardStore {
  return { generatedAt: 0, entries: [] };
}

/** Replace only leaderboard rows. Never clones or resets unrelated session state. */
export function applyLeaderboardUpdate(store: LeaderboardStore, update: LeaderboardUpdate): LeaderboardStore {
  return {
    generatedAt: update.generatedAt,
    entries: [...update.entries],
  };
}

export function leaderboardTargetsOnConnect(connectingPeerId: string): string[] {
  return connectingPeerId ? [connectingPeerId] : [];
}

export function leaderboardTargetsOnRefresh(connectedPeerIds: readonly string[]): string[] {
  return [...connectedPeerIds];
}

export function existingPlayersUnaffectedByConnect(
  existingPeerIds: readonly string[],
  connectingPeerId: string,
): string[] {
  return existingPeerIds.filter((peerId) => peerId !== connectingPeerId);
}

export type LeaderboardHandlerSlot = {
  bound: boolean;
  handlerCount: number;
};

export function createLeaderboardHandlerSlot(): LeaderboardHandlerSlot {
  return { bound: false, handlerCount: 0 };
}

export function bindLeaderboardUpdateOnce(
  slot: LeaderboardHandlerSlot,
  attach: () => void,
): void {
  if (slot.bound) {
    return;
  }
  slot.bound = true;
  slot.handlerCount += 1;
  attach();
}
