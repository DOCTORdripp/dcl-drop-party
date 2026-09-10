import { detectLocalTimeZone } from "./partyTime";

export const DISPLAY_TIME_ZONE_KEY = "dropParty.displayTimeZone";
export const DEVICE_TIME_ZONE_SENTINEL = "device";

type KvStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

let memory: Record<string, string> = {};

const memoryStore: KvStore = {
  getItem(key) {
    return memory[key] ?? null;
  },
  setItem(key, value) {
    memory[key] = value;
  },
};

export function resetTimezonePreferenceForTests(): void {
  memory = {};
}

function resolveStore(): KvStore {
  try {
    const ls = (globalThis as { localStorage?: KvStore }).localStorage;
    if (ls && typeof ls.getItem === "function" && typeof ls.setItem === "function") {
      return ls;
    }
  } catch {
    // DCL preview / runtime may not expose localStorage.
  }
  return memoryStore;
}

export function isUsableIanaTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function loadDisplayTimeZone(): { timeZone: string; isOverride: boolean } {
  const raw = resolveStore().getItem(DISPLAY_TIME_ZONE_KEY);
  if (!raw || raw === DEVICE_TIME_ZONE_SENTINEL) {
    return { timeZone: detectLocalTimeZone(), isOverride: false };
  }
  if (!isUsableIanaTimeZone(raw)) {
    return { timeZone: detectLocalTimeZone(), isOverride: false };
  }
  return { timeZone: raw, isOverride: true };
}

export function saveDisplayTimeZone(timeZone: string): void {
  resolveStore().setItem(DISPLAY_TIME_ZONE_KEY, timeZone);
}
