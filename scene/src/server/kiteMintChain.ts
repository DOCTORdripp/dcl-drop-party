import {
  POLYGON_MAINNET_CHAIN_ID,
  UNLIMITED_MINTER_ALLOWANCE,
  decodeBoolResult,
  decodeItemsMaxAndTotalSupply,
  decodeUint256Result,
  encodeGlobalMintersCalldata,
  encodeIsApprovedCalldata,
  encodeIsCompletedCalldata,
  encodeIsMintingAllowedCalldata,
  encodeItemMintersCalldata,
  encodeItemsCalldata,
} from "../shared/collectionV2";
import { createAsyncMutex } from "../shared/asyncMutex";

export type MintingAllowedSource = "explicit" | "fallback";

export type KiteChainInspect = {
  exists: boolean;
  mintingAllowed: boolean;
  mintingAllowedSource: MintingAllowedSource;
  globalMinter: boolean;
  allowance: bigint;
  maxSupply: bigint;
  totalSupply: bigint;
  remaining: bigint;
};

export type KiteIssueStock = {
  remaining?: bigint;
  maxSupply?: bigint;
  totalSupply?: bigint;
  allowance?: bigint;
};

export type KiteIssueResult =
  | ({ ok: true; txHash: string } & KiteIssueStock)
  | ({
      ok: false;
      error: string;
      result?:
        | "ALLOWANCE_EXHAUSTED"
        | "SUPPLY_EXHAUSTED"
        | "UNAVAILABLE"
        | "MINTING_DISABLED"
        | "FAILED_PRE_SUBMIT"
        | "REVERTED"
        | "NOT_CONFIGURED";
    } & KiteIssueStock);

export type KiteReceiptStatus = "success" | "reverted" | "pending" | "unknown";

export type KiteMintChain = {
  readonly pollMs: number;
  readonly receiptAttempts: number;
  distributorAddress(): string;
  inspect(contract: string, itemId: bigint): Promise<KiteChainInspect>;
  getReceipt(txHash: string): Promise<KiteReceiptStatus>;
  issueOne(args: {
    contract: string;
    beneficiary: string;
    itemId: bigint;
    attemptId?: string;
    kiteId?: string;
  }): Promise<KiteIssueResult>;
};

export function inspectBlocksMint(
  inspect: KiteChainInspect,
): "ALLOWANCE_EXHAUSTED" | "SUPPLY_EXHAUSTED" | "UNAVAILABLE" | "MINTING_DISABLED" | null {
  if (inspect.mintingAllowedSource === "explicit" && !inspect.mintingAllowed) {
    return "MINTING_DISABLED";
  }
  if (!inspect.exists) {
    return "UNAVAILABLE";
  }
  if (!inspect.mintingAllowed) {
    return "UNAVAILABLE";
  }
  if (inspect.remaining <= 0n) {
    return "SUPPLY_EXHAUSTED";
  }
  if (!inspect.globalMinter && inspect.allowance <= 0n) {
    return "ALLOWANCE_EXHAUSTED";
  }
  return null;
}

export type MemoryKiteMintOptions = {
  allowance?: bigint;
  remaining?: bigint;
  maxSupply?: bigint;
  mintingAllowed?: boolean;
  mintingAllowedSource?: MintingAllowedSource;
  globalMinter?: boolean;
  exists?: boolean;
  pollMs?: number;
  receiptAttempts?: number;
  failIssue?: string | null;
  receiptAfterIssue?: KiteReceiptStatus;
  receipts?: Map<string, KiteReceiptStatus>;
  decrementOnIssue?: boolean;
  issueDelayMs?: number;
};

export function memoryKiteMintChain(options: MemoryKiteMintOptions = {}): KiteMintChain & {
  issueCalls: Array<{ contract: string; beneficiary: string; itemId: bigint }>;
  issueNonces: bigint[];
  lastTxHash: string;
  maxInFlight: number;
  options: MemoryKiteMintOptions;
} {
  const issueCalls: Array<{ contract: string; beneficiary: string; itemId: bigint }> = [];
  const issueNonces: bigint[] = [];
  const receipts = options.receipts ?? new Map<string, KiteReceiptStatus>();
  const attempts = new Map<string, string>();
  const sendMutex = createAsyncMutex();
  let seq = 0;
  let nextNonce = 0n;
  let inFlight = 0;
  const store = {
    issueCalls,
    issueNonces,
    lastTxHash: "",
    maxInFlight: 0,
    options,
    pollMs: options.pollMs ?? 0,
    receiptAttempts: options.receiptAttempts ?? 3,
    distributorAddress(): string {
      return "0x692ab385d0730d45b8e6340cf4eca4551a3f6733";
    },
    async inspect(_contract: string, _itemId: bigint): Promise<KiteChainInspect> {
      const maxSupply = options.maxSupply ?? 5000n;
      const remaining = options.remaining ?? 4022n;
      const totalSupply = maxSupply - remaining;
      const allowance = options.allowance ?? 100n;
      return {
        exists: options.exists !== false,
        mintingAllowed: options.mintingAllowed !== false,
        mintingAllowedSource: options.mintingAllowedSource ?? "explicit",
        globalMinter: options.globalMinter === true,
        allowance,
        maxSupply,
        totalSupply,
        remaining,
      };
    },
    async getReceipt(txHash: string): Promise<KiteReceiptStatus> {
      return receipts.get(txHash.toLowerCase()) ?? "unknown";
    },
    async issueOne(args: { contract: string; beneficiary: string; itemId: bigint; attemptId?: string; kiteId?: string }): Promise<KiteIssueResult> {
      return sendMutex.run(async () => {
        if (args.attemptId) {
          const existing = attempts.get(args.attemptId);
          if (existing) {
            return { ok: true, txHash: existing };
          }
        }
        inFlight += 1;
        store.maxInFlight = Math.max(store.maxInFlight, inFlight);
        try {
          if (options.failIssue) {
            return { ok: false, error: options.failIssue };
          }
          const delay = options.issueDelayMs ?? 0;
          const nonce = nextNonce;
          if (delay > 0) {
            await new Promise<void>((resolve) => {
              setTimeout(resolve, delay);
            });
          }
          if ((options.remaining ?? 1n) <= 0n) {
            return { ok: false, error: "supply exhausted" };
          }
          nextNonce = nonce + 1n;
          issueNonces.push(nonce);
          if (options.decrementOnIssue !== false && options.remaining !== undefined) {
            options.remaining -= 1n;
          }
          issueCalls.push(args);
          seq += 1;
          const txHash = `0x${seq.toString(16).padStart(64, "0")}`;
          store.lastTxHash = txHash;
          receipts.set(txHash.toLowerCase(), options.receiptAfterIssue ?? "success");
          if (args.attemptId) {
            attempts.set(args.attemptId, txHash);
          }
          return { ok: true, txHash };
        } finally {
          inFlight -= 1;
        }
      });
    },
  };
  return store;
}

export function inspectFromRpcResults(args: {
  itemsData: string;
  minterAllowance: bigint;
  globalMinter: boolean;
  mintingAllowed: boolean;
  mintingAllowedSource: MintingAllowedSource;
}): KiteChainInspect {
  const { maxSupply, totalSupply } = decodeItemsMaxAndTotalSupply(args.itemsData);
  const remaining = maxSupply > totalSupply ? maxSupply - totalSupply : 0n;
  return {
    exists: maxSupply > 0n,
    mintingAllowed: args.mintingAllowed,
    mintingAllowedSource: args.mintingAllowedSource,
    globalMinter: args.globalMinter,
    allowance: args.minterAllowance > UNLIMITED_MINTER_ALLOWANCE ? UNLIMITED_MINTER_ALLOWANCE : args.minterAllowance,
    maxSupply,
    totalSupply,
    remaining,
  };
}

export { POLYGON_MAINNET_CHAIN_ID };

export type MintingAllowedDecode = {
  allowed: boolean;
  source: MintingAllowedSource;
};

export function decodeMintingAllowedState(
  mintingData: string,
  approvedData: string,
  completedData: string,
): MintingAllowedDecode {
  if (stripCall(mintingData)) {
    return { allowed: decodeBoolResult(mintingData), source: "explicit" };
  }
  return {
    allowed: decodeBoolResult(approvedData) && decodeBoolResult(completedData),
    source: "fallback",
  };
}

export function decodeMintingAllowed(mintingData: string, approvedData: string, completedData: string): boolean {
  return decodeMintingAllowedState(mintingData, approvedData, completedData).allowed;
}

function stripCall(data: string): boolean {
  return data.replace(/^0x/i, "").length >= 64;
}

export function decodeItemMinterAllowance(data: string): bigint {
  return decodeUint256Result(data);
}

export const COLLECTION_V2_VIEW_CALLS = {
  encodeItemsCalldata,
  encodeItemMintersCalldata,
  encodeGlobalMintersCalldata,
  encodeIsMintingAllowedCalldata,
  encodeIsApprovedCalldata,
  encodeIsCompletedCalldata,
};
