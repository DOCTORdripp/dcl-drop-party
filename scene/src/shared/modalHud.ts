/**
 * Blocking scene dialogs hide competing gameplay HUD without changing game state.
 * Opening Learn More while blowing must not stop the session — only the HUD.
 */

export type BlockingModalInput = {
  helpOpen?: boolean;
  chestOpen?: boolean;
  partyOpen?: boolean;
  rewardsOpen?: boolean;
};

export function isBlockingSceneModal(input: BlockingModalInput): boolean {
  return Boolean(input.helpOpen || input.chestOpen || input.partyOpen || input.rewardsOpen);
}

export function showGameplayActionHud(blocking: boolean): boolean {
  return !blocking;
}

/** Next-drop ticker hides under dialogs. Start/Stop is not a blocking dialog. */
export function showNextDropTicker(blocking: boolean): boolean {
  return !blocking;
}
