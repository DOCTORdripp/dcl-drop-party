/** Scene-server admission handshake. Client and server share retry classification only. */

export function isRetryableAdmissionResult(reason: string): boolean {
  return reason === "TOKEN_EXPIRED" || reason === "PLAYER_NOT_READY" || reason === "INVALID_TOKEN";
}

export function isPlayerNotReadyAdmission(reason: string): boolean {
  return reason === "PLAYER_NOT_READY";
}

export function isIdentityNotReadyAdmissionError(message: string): boolean {
  return message === "Authenticated identity required";
}
