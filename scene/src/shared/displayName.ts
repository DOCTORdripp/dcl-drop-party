const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

export function looksLikeWallet(value: string): boolean {
  return WALLET_RE.test(value.trim());
}

/** True when a leaderboard label is a wallet or a shortened 0x… address. */
export function isWalletStyleLabel(value?: string): boolean {
  const name = value?.trim() ?? "";
  if (name.length === 0 || looksLikeWallet(name)) {
    return true;
  }
  return /^0x[a-fA-F0-9]{3,}/i.test(name);
}

/** Profile name for cards. Never returns a wallet address. */
export function sanitizeProfileName(value?: string): string | undefined {
  const name = value?.trim() ?? "";
  if (name.length === 0 || looksLikeWallet(name)) {
    return undefined;
  }
  return name.slice(0, 40);
}

export function hostCardLabel(party: { hostDisplayName?: string }): string | undefined {
  return sanitizeProfileName(party.hostDisplayName);
}

export function shortenWallet(wallet: string): string {
  const normalized = wallet.trim();
  if (normalized.length < 12) {
    return normalized;
  }
  return `${normalized.slice(0, 6)}…${normalized.slice(-4)}`;
}

export function resolveWinnerLabel(args: {
  wallet: string;
  verifiedDisplayName?: string;
  clientClaimedName?: string;
}): string {
  void args.clientClaimedName;
  const verified = args.verifiedDisplayName?.trim() ?? "";
  if (verified.length > 0 && !looksLikeWallet(verified)) {
    return verified.slice(0, 40);
  }
  return shortenWallet(args.wallet);
}
