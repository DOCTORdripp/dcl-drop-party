/**
 * Decentraland Collection V2 (ERC721BaseCollectionV2) read-only helpers.
 * Selectors are keccak256(signature)[:4] from the installed/official ABI.
 */

export const COLLECTION_V2_ITEMS_SELECTOR = "bfb231d2";
export const COLLECTION_V2_ITEM_MINTERS_SELECTOR = "6d67b1ab";
export const COLLECTION_V2_GLOBAL_MINTERS_SELECTOR = "b4c2025e";
export const COLLECTION_V2_IS_MINTING_ALLOWED_SELECTOR = "2b481883";
export const COLLECTION_V2_IS_APPROVED_SELECTOR = "28f371aa";
export const COLLECTION_V2_IS_COMPLETED_SELECTOR = "fa391c64";

export const POLYGON_MAINNET_CHAIN_ID = 137;
export const UNLIMITED_MINTER_ALLOWANCE = (1n << 256n) - 1n;

const ADDRESS_RE = /^0x[0-9a-f]{40}$/;

export function strip0x(value: string): string {
  return value.startsWith("0x") || value.startsWith("0X") ? value.slice(2) : value;
}

export function padHex(value: string, bytes: number): string {
  const hex = strip0x(value).toLowerCase();
  if (hex.length > bytes * 2) {
    return hex.slice(hex.length - bytes * 2);
  }
  return hex.padStart(bytes * 2, "0");
}

export function encodeUint256(value: bigint): string {
  if (value < 0n) {
    throw new Error("uint256 cannot be negative");
  }
  return value.toString(16).padStart(64, "0");
}

export function encodeAddress(address: string): string {
  const normalized = address.trim().toLowerCase();
  if (!ADDRESS_RE.test(normalized)) {
    throw new Error("invalid address");
  }
  return padHex(normalized, 32);
}

export function readUint256Word(hex: string, wordIndex: number): bigint {
  const body = strip0x(hex);
  const start = wordIndex * 64;
  const word = body.slice(start, start + 64);
  if (word.length < 64) {
    return 0n;
  }
  return BigInt(`0x${word}`);
}

export function readAddressWord(hex: string, wordIndex: number): string {
  const body = strip0x(hex);
  const start = wordIndex * 64;
  const word = body.slice(start, start + 64);
  return `0x${word.slice(24).toLowerCase()}`;
}

export function encodeItemsCalldata(itemId: bigint): string {
  return `0x${COLLECTION_V2_ITEMS_SELECTOR}${encodeUint256(itemId)}`;
}

export function encodeItemMintersCalldata(itemId: bigint, minter: string): string {
  return `0x${COLLECTION_V2_ITEM_MINTERS_SELECTOR}${encodeUint256(itemId)}${encodeAddress(minter)}`;
}

export function encodeGlobalMintersCalldata(minter: string): string {
  return `0x${COLLECTION_V2_GLOBAL_MINTERS_SELECTOR}${encodeAddress(minter)}`;
}

export function encodeIsMintingAllowedCalldata(): string {
  return `0x${COLLECTION_V2_IS_MINTING_ALLOWED_SELECTOR}`;
}

export function encodeIsApprovedCalldata(): string {
  return `0x${COLLECTION_V2_IS_APPROVED_SELECTOR}`;
}

export function encodeIsCompletedCalldata(): string {
  return `0x${COLLECTION_V2_IS_COMPLETED_SELECTOR}`;
}

export type CollectionV2ItemView = {
  maxSupply: bigint;
  totalSupply: bigint;
};

/**
 * items(uint256) returns (string rarity, uint256 maxSupply, uint256 totalSupply, ...).
 * Word 0 is the rarity string offset; maxSupply/totalSupply are words 1 and 2.
 */
export function decodeItemsMaxAndTotalSupply(data: string): CollectionV2ItemView {
  return {
    maxSupply: readUint256Word(data, 1),
    totalSupply: readUint256Word(data, 2),
  };
}

export function decodeUint256Result(data: string): bigint {
  return readUint256Word(data, 0);
}

export function decodeBoolResult(data: string): boolean {
  return decodeUint256Result(data) !== 0n;
}
