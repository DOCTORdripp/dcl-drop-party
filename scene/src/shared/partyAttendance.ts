/** One-shot T−10 occupancy snapshot. Local clock only; not a Convex poll cadence. */
export const ATTENDANCE_PRECHECK_LEAD_MS = 10 * 60_000;
/** Fallback if lineupLocksAt is missing from a cached upcoming row. */
export const ATTENDANCE_LOCK_LEAD_MS = 5 * 60_000;

export type AttendanceSnapshotPhase = "PRECHECK" | "LOCK";

export type AttendancePartyAnchor = {
  partyId: string;
  scheduledAt: number;
  status?: string;
  lineupLocksAt?: number;
  attendancePrecheckAt?: number;
  isLineupLocked?: boolean;
};

const SKIP_STATUSES = new Set(["LOCKED", "ACTIVE", "SETTLING", "COMPLETED", "CANCELLED"]);

export function dueAttendanceSnapshotPhase(
  party: AttendancePartyAnchor,
  nowMs: number,
): AttendanceSnapshotPhase | null {
  if (!party.partyId) {
    return null;
  }
  if (party.isLineupLocked) {
    return null;
  }
  const status = (party.status ?? "").trim().toUpperCase();
  if (SKIP_STATUSES.has(status)) {
    return null;
  }
  const lockAt =
    typeof party.lineupLocksAt === "number" && Number.isFinite(party.lineupLocksAt)
      ? party.lineupLocksAt
      : party.scheduledAt - ATTENDANCE_LOCK_LEAD_MS;
  const precheckAt =
    typeof party.attendancePrecheckAt === "number" && Number.isFinite(party.attendancePrecheckAt)
      ? party.attendancePrecheckAt
      : party.scheduledAt - ATTENDANCE_PRECHECK_LEAD_MS;
  if (nowMs >= lockAt) {
    return "LOCK";
  }
  if (nowMs >= precheckAt) {
    return "PRECHECK";
  }
  return null;
}

export function attendanceSnapshotKey(partyId: string, phase: AttendanceSnapshotPhase): string {
  return `${partyId}:${phase}`;
}
