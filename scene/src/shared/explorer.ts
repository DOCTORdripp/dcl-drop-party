const TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/;

export const POLYGON_MAINNET_CHAIN_ID = 137;
export const EXPLORER_LABEL = "EXPLORER";

export function normalizeTxHash(txHash: string): string | undefined {
  const hash = txHash.trim();
  return TX_HASH_RE.test(hash) ? hash : undefined;
}

export function transactionExplorerUrl(txHash: string, chainId = POLYGON_MAINNET_CHAIN_ID): string | undefined {
  const hash = normalizeTxHash(txHash);
  if (!hash) return undefined;
  if (chainId === 80001 || chainId === 80002) {
    return `https://amoy.polygonscan.com/tx/${hash}`;
  }
  return `https://polygonscan.com/tx/${hash}`;
}

export function isSafeExplorerUrl(url: string): boolean {
  return (
    /^https:\/\/polygonscan\.com\/tx\/0x[a-fA-F0-9]{64}$/i.test(url) ||
    /^https:\/\/amoy\.polygonscan\.com\/tx\/0x[a-fA-F0-9]{64}$/i.test(url)
  );
}
