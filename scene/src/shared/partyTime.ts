/** Client-only presentation of a UTC start time. Authoritative validation stays in Convex. */

export function formatRelativeCountdown(
  scheduledAt: number,
  nowMs: number,
  status?: string,
): string {
  if (status === "ACTIVE" || status === "SETTLING") {
    return "LIVE";
  }
  if (status === "COMPLETED") {
    return "Completed";
  }
  if (status === "CANCELLED") {
    return "Cancelled";
  }
  const delta = scheduledAt - nowMs;
  if (delta <= 0) {
    return "Starting soon";
  }
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 2) {
    return "Starting soon";
  }
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days} day${days === 1 ? "" : "s"}`);
  }
  if (hours > 0 || days > 0) {
    parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  }
  parts.push(`${mins} minute${mins === 1 ? "" : "s"}`);
  return `Starts in: ${parts.join(", ")}`;
}

export function formatSelectedPartyClock(
  localDate: string,
  localTime: string,
  timeZone: string,
): string {
  if (!localDate || !localTime) {
    return `${timeZone}`;
  }
  return `${localDate} ${localTime}  ·  ${timeZone}`;
}

export function rescheduleLockMessage(rescheduleLockMinutes: number): string {
  return `Party time can no longer be changed within ${rescheduleLockMinutes} minutes of start.`;
}

export function detectLocalTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";
  } catch {
    return "America/Los_Angeles";
  }
}

export function formatTimeZoneAbbreviation(nowMs: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short",
  }).formatToParts(new Date(nowMs));
  return parts.find((part) => part.type === "timeZoneName")?.value ?? timeZone;
}

export function localTimeHelper(nowMs: number, timeZone: string): string {
  return `Times shown in your local time (${formatTimeZoneAbbreviation(nowMs, timeZone)})`;
}

export function utcMsToZonedLocal(
  epochMs: number,
  timeZone: string,
): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(epochMs));
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  let hour = read("hour");
  if (hour === "24") hour = "00";
  return {
    date: `${read("year")}-${read("month")}-${read("day")}`,
    time: `${hour}:${read("minute")}`,
  };
}

export function formatLocalClock(nowMs: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(nowMs));
}

export const COMMON_TIME_ZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "UTC",
  "Europe/London",
  "Europe/Paris",
] as const;

export const DISPLAY_ZONE_OPTIONS = [
  { id: "America/Los_Angeles", label: "Pacific" },
  { id: "America/Denver", label: "Mountain" },
  { id: "America/Chicago", label: "Central" },
  { id: "America/New_York", label: "Eastern" },
  { id: "UTC", label: "UTC" },
  { id: "device", label: "Device" },
] as const;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export type DayPeriod = "AM" | "PM";

export function sanitizeClock12hInput(value: string): string {
  const cleaned = value.replace(/[^\d:]/g, "");
  const colon = cleaned.indexOf(":");
  if (colon === -1) {
    return cleaned.slice(0, 2);
  }
  return `${cleaned.slice(0, colon).slice(0, 2)}:${cleaned
    .slice(colon + 1)
    .replace(/:/g, "")
    .slice(0, 2)}`;
}

export function draftTimeToClock12h(localTime: string): { clock: string; period: DayPeriod } {
  const match = /^(\d{1,2}):(\d{2})$/.exec(localTime.trim());
  if (!match) {
    return { clock: "", period: "AM" };
  }
  const hour24 = Number(match[1]);
  const minute = match[2];
  if (!Number.isFinite(hour24) || hour24 < 0 || hour24 > 23) {
    return { clock: localTime, period: "AM" };
  }
  const period: DayPeriod = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { clock: `${hour12}:${minute}`, period };
}

/** Complete 12-hour clock + period → stored 24-hour `HH:MM`. Partial typing returns undefined. */
export function clock12hToDraftTime(clock: string, period: DayPeriod): string | undefined {
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock.trim());
  if (!match) {
    return undefined;
  }
  const hour12 = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour12) || hour12 < 1 || hour12 > 12) {
    return undefined;
  }
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) {
    return undefined;
  }
  let hour24 = hour12 % 12;
  if (period === "PM") {
    hour24 += 12;
  }
  return `${pad2(hour24)}:${pad2(minute)}`;
}

export function sanitizeDateMdYInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

export function draftDateToDisplay(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) {
    return "";
  }
  return `${match[2]}-${match[3]}-${match[1]}`;
}

/** Complete MM-DD-YYYY → stored ISO `YYYY-MM-DD`. Partial typing returns undefined. */
export function displayDateToDraft(display: string): string | undefined {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(display.trim());
  if (!match) {
    return undefined;
  }
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    return undefined;
  }
  if (!Number.isFinite(day) || day < 1 || day > 31) {
    return undefined;
  }
  const utc = Date.UTC(year, month - 1, day);
  const check = new Date(utc);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return undefined;
  }
  return `${match[3]}-${match[1]}-${match[2]}`;
}

export function zonedDateKey(epochMs: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(epochMs));
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

export function addCalendarDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
}

export const PARTY_PLAYABLE_OVERLAP_MESSAGE =
  "That time is too close to another Drop Party. Choose another time.";

export const PUBLIC_DROP_PARTY_OVERLAP_MESSAGE = PARTY_PLAYABLE_OVERLAP_MESSAGE;

export function formatClock12hPlain(scheduledAt: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(new Date(scheduledAt));
  const hour = parts.find((part) => part.type === "hour")?.value ?? "";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "";
  const period = parts.find((part) => part.type === "dayPeriod")?.value ?? "";
  return `${hour}:${minute} ${period}`.replace(/\s+/g, " ").trim();
}

export function publicDropPartyOverlapMessage(nextAvailableClock?: string): string {
  if (!nextAvailableClock) {
    return PARTY_PLAYABLE_OVERLAP_MESSAGE;
  }
  return `That time is too close to another Drop Party. Next available time is ${nextAvailableClock}.`;
}

export function isPublicDropPartyOverlapMessage(message: string): boolean {
  return (
    message.includes("too close to another Drop Party") ||
    message.includes("overlaps a public Drop Party")
  );
}

export function nextAvailablePlayableStart(
  start: number,
  windowMs: number,
  reserved: Array<{ start: number; end: number }>,
): number | undefined {
  let cursor = start;
  for (let hop = 0; hop < 24; hop += 1) {
    const candidate = playableInterval(cursor, windowMs);
    const overlapping = reserved.filter((interval) => intervalsOverlap(candidate, interval));
    if (overlapping.length === 0) {
      return cursor === start ? undefined : cursor;
    }
    cursor = Math.max(...overlapping.map((interval) => interval.end));
  }
  return cursor === start ? undefined : cursor;
}

export function playableInterval(scheduledAt: number, windowMs: number): { start: number; end: number } {
  return { start: scheduledAt, end: scheduledAt + windowMs };
}

export function intervalsOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number },
): boolean {
  return a.start < b.end && a.end > b.start;
}

export function formatClock12h(scheduledAt: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).formatToParts(new Date(scheduledAt));
  const hour = parts.find((part) => part.type === "hour")?.value ?? "";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "";
  const period = parts.find((part) => part.type === "dayPeriod")?.value ?? "";
  const zone = parts.find((part) => part.type === "timeZoneName")?.value ?? "";
  return `${hour}:${minute} ${period} ${zone}`.replace(/\s+/g, " ").trim();
}

export function formatPartyWhen(scheduledAt: number, timeZone: string, nowMs: number): string {
  const eventDay = zonedDateKey(scheduledAt, timeZone);
  const today = zonedDateKey(nowMs, timeZone);
  const tomorrow = addCalendarDays(today, 1);
  const clock = formatClock12h(scheduledAt, timeZone);
  if (eventDay === today) return `Today · ${clock}`;
  if (eventDay === tomorrow) return `Tomorrow · ${clock}`;
  const monthDay = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(new Date(scheduledAt));
  return `${monthDay} · ${clock}`;
}

export function formatViewerClock(nowMs: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(nowMs));
}

export function formatHeroCountdown(scheduledAt: number, nowMs: number, status?: string): string {
  if (status === "ACTIVE" || status === "SETTLING") return "LIVE";
  const delta = scheduledAt - nowMs;
  if (delta <= 0) return "STARTING NOW";
  const totalSec = Math.floor(delta / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours <= 0 && totalSec < 5 * 60) {
    return `${pad2(minutes)}:${pad2(seconds)}`;
  }
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

/** Always HH:MM:SS for the top-of-screen next-drop ticker. */
export function formatTickerCountdownHms(scheduledAt: number, nowMs: number, status?: string): string {
  if (status === "ACTIVE" || status === "SETTLING") return "LIVE";
  const totalSec = Math.max(0, Math.floor((scheduledAt - nowMs) / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

export function formatCompactCountdown(scheduledAt: number, nowMs: number, status?: string): string {
  if (status === "ACTIVE" || status === "SETTLING") return "LIVE";
  if (status === "COMPLETED") return "Completed";
  if (status === "CANCELLED") return "Cancelled";
  const delta = scheduledAt - nowMs;
  if (delta <= 0) return "STARTING NOW";
  const minutes = Math.floor(delta / 60_000);
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = minutes % 60;
  if (days > 0) {
    return hours > 0 ? `Starts in ${days}d ${hours}h` : `Starts in ${days}d`;
  }
  if (hours > 0) {
    return mins > 0 ? `Starts in ${hours}h ${mins}m` : `Starts in ${hours}h`;
  }
  return `Starts in ${Math.max(1, minutes)}m`;
}

export function formatLineupLockCopy(
  lineupLocksAt: number | undefined,
  nowMs: number,
  isLineupLocked?: boolean,
): string {
  if (isLineupLocked) return "Prize lineup locked";
  if (lineupLocksAt === undefined) return "";
  const delta = lineupLocksAt - nowMs;
  if (delta <= 0) return "Prize lineup locking";
  const minutes = Math.floor(delta / 60_000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `Prize lineup locks in ${hours}h ${mins}m`;
  return `Prize lineup locks in ${mins}m`;
}
