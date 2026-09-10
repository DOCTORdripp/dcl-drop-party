import { notWiredError } from "./authoritativePlayer";
import type { PopAttemptMessage } from "./messages";

/**
 * Scene entry will branch with isServer() from @dcl/sdk/network.
 * Until that SDK is installed in a scene package, this foundation fails closed.
 */
export function initDropPartyAuthoritativeServer(): never {
  return notWiredError();
}

export function handlePopAttempt(_message: PopAttemptMessage): never {
  return notWiredError();
}
