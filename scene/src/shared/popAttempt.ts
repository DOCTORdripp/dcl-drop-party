export type PopAttemptPayload = { intent: "pop" };

export function createPopAttemptPayload(): PopAttemptPayload {
  return { intent: "pop" };
}

export function popAttemptHasNoClientAuthority(payload: PopAttemptPayload): boolean {
  const keys = Object.keys(payload);
  return keys.length === 1 && keys[0] === "intent" && payload.intent === "pop";
}
