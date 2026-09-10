/**
 * Intended registerMessages() schema once @dcl/sdk@auth-server is installed.
 *
 * Client → server: popAttempt { balloonId }
 * Server → client: popResult { balloonId, result }
 *
 * The client must not send wallet, position, distance, prize, or timestamps
 * that affect authorization.
 */

export type PopAttemptMessage = {
  balloonId: string;
};

export type PopResultMessage = {
  balloonId: string;
  result: "WON" | "RACE_LOST" | "NOT_ELIGIBLE" | "INVALID_INTERACTION" | "SESSION_EXPIRED" | "RATE_LIMITED";
};

export const POP_ATTEMPT_MESSAGE = "popAttempt";
export const POP_RESULT_MESSAGE = "popResult";
