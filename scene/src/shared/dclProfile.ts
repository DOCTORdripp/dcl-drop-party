import { isWalletStyleLabel, looksLikeWallet, sanitizeProfileName } from "./displayName";

const LAMBDAS_PROFILE_BASE = "https://peer.decentraland.org/lambdas/profiles";
const ABR_PROFILES = "https://asset-bundle-registry.decentraland.org/profiles";

const nameCache = new Map<string, string>();

type LambdasAvatarRow = {
  name?: string;
};

export function profileNameFromLambdasBody(body: unknown): string | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }
  const avatars = (body as { avatars?: LambdasAvatarRow[] }).avatars;
  return sanitizeProfileName(avatars?.[0]?.name);
}

export function profileNameFromAbrBody(body: unknown): string | undefined {
  if (!Array.isArray(body)) {
    return undefined;
  }
  for (const row of body) {
    const name = profileNameFromLambdasBody(row);
    if (name) {
      return name;
    }
  }
  return undefined;
}

async function readJson(res: Response): Promise<unknown> {
  const raw = (await res.text()).trim();
  if (!raw) {
    return undefined;
  }
  return JSON.parse(raw) as unknown;
}

export async function fetchDclProfileName(wallet: string): Promise<string | undefined> {
  const address = wallet.trim().toLowerCase();
  if (!looksLikeWallet(address)) {
    return undefined;
  }
  const cached = nameCache.get(address);
  if (cached) {
    return cached;
  }
  try {
    const lambdas = await fetch(`${LAMBDAS_PROFILE_BASE}/${encodeURIComponent(address)}`, {
      method: "GET",
      headers: { accept: "application/json" },
    });
    if (lambdas.ok) {
      const name = profileNameFromLambdasBody(await readJson(lambdas));
      if (name) {
        nameCache.set(address, name);
        return name;
      }
    }
  } catch {
    /* ABR fallback */
  }
  try {
    const abr = await fetch(ABR_PROFILES, {
      method: "POST",
      headers: { "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({ ids: [address] }),
    });
    if (abr.ok) {
      const name = profileNameFromAbrBody(await readJson(abr));
      if (name) {
        nameCache.set(address, name);
        return name;
      }
    }
  } catch {
    /* no public profile */
  }
  return undefined;
}

export async function applyHostDisplayNames<T extends { hostWallet?: string; hostDisplayName?: string }>(
  parties: T[],
  opts?: {
    localName?: string;
    localWallet?: string;
    fetchName?: (wallet: string) => Promise<string | undefined>;
  },
): Promise<T[]> {
  const localName = sanitizeProfileName(opts?.localName);
  const localWallet = opts?.localWallet?.trim().toLowerCase();
  const fetchName = opts?.fetchName ?? fetchDclProfileName;
  const missing = new Set<string>();
  for (const party of parties) {
    if (sanitizeProfileName(party.hostDisplayName)) {
      continue;
    }
    const wallet = party.hostWallet?.trim().toLowerCase();
    if (!wallet || !looksLikeWallet(wallet)) {
      continue;
    }
    if (localName && wallet === localWallet) {
      continue;
    }
    if (!nameCache.has(wallet)) {
      missing.add(wallet);
    }
  }
  await Promise.all(
    [...missing].map(async (wallet) => {
      const name = await fetchName(wallet);
      if (name) {
        nameCache.set(wallet, name);
      }
    }),
  );
  return parties.map((party) => {
    const existing = sanitizeProfileName(party.hostDisplayName);
    if (existing) {
      return { ...party, hostDisplayName: existing };
    }
    const wallet = party.hostWallet?.trim().toLowerCase();
    if (localName && wallet && wallet === localWallet) {
      return { ...party, hostDisplayName: localName };
    }
    const fetched = wallet ? nameCache.get(wallet) : undefined;
    if (localName && (!wallet || wallet === localWallet)) {
      return { ...party, hostDisplayName: localName };
    }
    return { ...party, hostDisplayName: fetched };
  });
}

export async function applyWinnerDisplayNames<
  T extends { winnerWallet?: string; winnerDisplayName?: string },
>(
  wins: T[],
  opts?: { fetchName?: (wallet: string) => Promise<string | undefined> },
): Promise<T[]> {
  const fetchName = opts?.fetchName ?? fetchDclProfileName;
  const missing = new Set<string>();
  for (const win of wins) {
    if (sanitizeProfileName(win.winnerDisplayName)) {
      continue;
    }
    const wallet = win.winnerWallet?.trim().toLowerCase();
    if (!wallet || !looksLikeWallet(wallet) || nameCache.has(wallet)) {
      continue;
    }
    missing.add(wallet);
  }
  await Promise.all(
    [...missing].map(async (wallet) => {
      const name = await fetchName(wallet);
      if (name) {
        nameCache.set(wallet, name);
      }
    }),
  );
  return wins.map((win) => {
    const existing = sanitizeProfileName(win.winnerDisplayName);
    if (existing) {
      return { ...win, winnerDisplayName: existing };
    }
    const wallet = win.winnerWallet?.trim().toLowerCase();
    const fetched = wallet ? nameCache.get(wallet) : undefined;
    return fetched ? { ...win, winnerDisplayName: fetched } : win;
  });
}

export async function applyLeaderboardDisplayNames<T extends { wallet?: string; name: string }>(
  rows: T[],
  opts?: { fetchName?: (wallet: string) => Promise<string | undefined> },
): Promise<T[]> {
  const fetchName = opts?.fetchName ?? fetchDclProfileName;
  const missing = new Set<string>();
  for (const row of rows) {
    if (!isWalletStyleLabel(row.name)) {
      continue;
    }
    const wallet = row.wallet?.trim().toLowerCase();
    if (!wallet || !looksLikeWallet(wallet) || nameCache.has(wallet)) {
      continue;
    }
    missing.add(wallet);
  }
  await Promise.all(
    [...missing].map(async (wallet) => {
      const name = await fetchName(wallet);
      if (name) {
        nameCache.set(wallet, name);
      }
    }),
  );
  return rows.map((row) => {
    if (!isWalletStyleLabel(row.name)) {
      return row;
    }
    const wallet = row.wallet?.trim().toLowerCase();
    const fetched = wallet ? nameCache.get(wallet) : undefined;
    return fetched ? { ...row, name: fetched } : row;
  });
}
