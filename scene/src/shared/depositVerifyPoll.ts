export const VERIFY_POLL = {
  initialDelayMs: 1500,
  intervalMs: 2500,
  windowMs: 40_000,
} as const;

export const VERIFY_TIMEOUT_MESSAGE =
  "Transaction submitted. Confirmation is taking longer than expected.";

export type VerifyPollSchedule = {
  initialDelayMs: number;
  intervalMs: number;
  windowMs: number;
};

export function isConfirmedVerifyStatus(status: string): boolean {
  return status === "CONFIRMED" || status === "ALREADY_CONFIRMED";
}

export function isPendingVerifyStatus(status: string): boolean {
  return status === "PENDING" || status === "PENDING_CONFIRMATIONS" || status === "PARTIAL";
}

export function isFailedVerifyStatus(status: string): boolean {
  return status === "FAILED";
}

export async function pollDepositVerification<T extends { status: string; reason?: string }>(args: {
  verify: () => Promise<T>;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  schedule?: VerifyPollSchedule;
  onAttempt?: (result: T) => void;
}): Promise<{ result: T; timedOut: boolean }> {
  const schedule = args.schedule ?? VERIFY_POLL;
  const now = args.now ?? Date.now;
  const sleep = args.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

  await sleep(schedule.initialDelayMs);
  const deadline = now() + schedule.windowMs;
  let last: T | undefined;

  while (now() <= deadline) {
    last = await args.verify();
    args.onAttempt?.(last);
    if (isConfirmedVerifyStatus(last.status) || isFailedVerifyStatus(last.status)) {
      return { result: last, timedOut: false };
    }
    if (last.reason === "RPC_NOT_CONFIGURED") {
      return { result: last, timedOut: true };
    }
    if (now() + schedule.intervalMs > deadline) {
      break;
    }
    await sleep(schedule.intervalMs);
  }

  if (!last) {
    last = await args.verify();
    args.onAttempt?.(last);
    if (isConfirmedVerifyStatus(last.status) || isFailedVerifyStatus(last.status)) {
      return { result: last, timedOut: false };
    }
  }

  return { result: last, timedOut: !isConfirmedVerifyStatus(last.status) && !isFailedVerifyStatus(last.status) };
}
