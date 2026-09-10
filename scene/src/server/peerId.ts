export type MessageContext = {
  from?: string;
};

/**
 * Fail closed: a missing or empty context.from is not a player identity.
 * Callers must not invent a wallet, create a session, or call Convex.
 */
export function requirePeerId(context: MessageContext | undefined): string | null {
  if (!context?.from) {
    return null;
  }
  return context.from;
}
