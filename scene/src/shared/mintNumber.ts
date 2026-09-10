const DCL_V2_MASK_128 = (1n << 128n) - 1n;

export function humanMintNumberFromTokenId(tokenId: string): number | null {
  try {
    const bi = BigInt(tokenId.trim());
    if (bi <= 0n) return null;
    if (bi <= 999999n) return Number(bi);
    const issued = bi & DCL_V2_MASK_128;
    if (issued > 0n && issued <= 999999n) return Number(issued);
  } catch {
    /* ignore */
  }
  return null;
}

export function formatNftMintLabel(tokenId: string | undefined): string {
  if (!tokenId) return "";
  const mint = humanMintNumberFromTokenId(tokenId);
  return `#${mint ?? tokenId}`;
}
