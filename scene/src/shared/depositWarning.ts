export const DEPOSIT_WARNING_SCENE_PREFIX = "depositWarningSkip_";

/** Flip back to true before release — when false, the warning always shows for UI preview. */
export const DEPOSIT_WARNING_SKIP_PERSISTENCE_ENABLED = true;
export const DEPOSIT_WARNING_HEADING = "WARNING";
export const DEPOSIT_WARNING_BODY_LEAD =
  "Depositing items or mana into this chest removes them from your wallet.\n\nAny items you deposit will be given away to others at a drop party.\n\nYou may never get these items back.";
export const DEPOSIT_WARNING_BODY_FOOTER = "Depositing items is not a required part of gameplay.";
export const DEPOSIT_WARNING_BODY = `${DEPOSIT_WARNING_BODY_LEAD}\n${DEPOSIT_WARNING_BODY_FOOTER}`;
export const DEPOSIT_WARNING_DONT_SHOW_LABEL = "DO NOT SHOW THIS MESSAGE AGAIN";
export const DEPOSIT_WARNING_UNDERSTAND_LABEL = "I UNDERSTAND";
export const DEPOSIT_WARNING_EXIT_LABEL = "EXIT";

/** DCL UiText supports `<b>` for emphasis. */
export function depositWarningLeadMarkup(): string {
  return `<b>${DEPOSIT_WARNING_BODY_LEAD}</b>`;
}

export function depositWarningFooterMarkup(): string {
  return `<b>${DEPOSIT_WARNING_BODY_FOOTER}</b>`;
}

export function depositWarningSceneKey(wallet: string): string {
  return `${DEPOSIT_WARNING_SCENE_PREFIX}${wallet.trim().toLowerCase()}`;
}

export function parseDepositWarningSkip(raw: unknown): boolean {
  if (raw === true) {
    return true;
  }
  if (raw && typeof raw === "object") {
    const row = raw as Record<string, unknown>;
    if (row.skip === true) {
      return true;
    }
    if (row.version === 1 && row.skip === true) {
      return true;
    }
  }
  return false;
}

export function encodeDepositWarningSkip(skip: boolean): { version: 1; skip: boolean } {
  return { version: 1, skip };
}
