import type { RandomSource } from "./cryptoLite";
import { trustedPost, type TrustedFetchResult } from "./convexBroker";
import type { KiteChainInspect, KiteIssueResult, KiteMintChain, KiteReceiptStatus } from "./kiteMintChain";

export type CentralKiteMintResponse = {
  result?: string;
  attemptId?: string;
  txHash?: string;
  status?: string;
  maxSupply?: string;
  totalSupply?: string;
  remaining?: string;
  allowance?: string;
  error?: string;
};

function asInspect(json: unknown): KiteChainInspect {
  const row = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  if (typeof row.error === "string") {
    throw new Error(row.error);
  }
  const remaining = BigInt(typeof row.remaining === "string" ? row.remaining : "0");
  const maxSupply = BigInt(typeof row.maxSupply === "string" ? row.maxSupply : "0");
  const totalSupply = BigInt(typeof row.totalSupply === "string" ? row.totalSupply : "0");
  const allowance = BigInt(typeof row.allowance === "string" ? row.allowance : "0");
  return {
    exists: row.exists !== false,
    mintingAllowed: row.mintingAllowed !== false,
    mintingAllowedSource: row.mintingAllowedSource === "fallback" ? "fallback" : "explicit",
    globalMinter: row.globalMinter === true,
    allowance,
    maxSupply,
    totalSupply,
    remaining,
  };
}

function stockFromCentral(json: CentralKiteMintResponse): {
  remaining?: bigint;
  maxSupply?: bigint;
  totalSupply?: bigint;
  allowance?: bigint;
} {
  const parse = (value: string | undefined) =>
    typeof value === "string" && value.length > 0 ? BigInt(value) : undefined;
  return {
    remaining: parse(json.remaining),
    maxSupply: parse(json.maxSupply),
    totalSupply: parse(json.totalSupply),
    allowance: parse(json.allowance),
  };
}

export function mapCentralMintFailure(result: string, stock: ReturnType<typeof stockFromCentral> = {}): KiteIssueResult {
  if (result === "SUPPLY_EXHAUSTED") {
    return { ok: false, error: "supply exhausted", result, ...stock };
  }
  if (result === "ALLOWANCE_EXHAUSTED") {
    return { ok: false, error: "allowance exhausted", result, ...stock };
  }
  if (result === "MINTING_DISABLED") {
    return { ok: false, error: "minting disabled", result, ...stock };
  }
  if (result === "FAILED_PRE_SUBMIT") {
    return { ok: false, error: "submit rejected", result, ...stock };
  }
  if (result === "REVERTED") {
    return { ok: false, error: "reverted", result, ...stock };
  }
  if (result === "NOT_CONFIGURED") {
    return { ok: false, error: "kite minter is not configured", result, ...stock };
  }
  return { ok: false, error: "unavailable", result: "UNAVAILABLE", ...stock };
}

export function createConvexKiteMintChain(args: {
  siteUrl: string;
  secret: string;
  randomBytes: RandomSource;
  post?: typeof trustedPost;
}): KiteMintChain {
  const post = args.post ?? trustedPost;
  const receipts = new Map<string, KiteReceiptStatus>();

  async function call(path: string, body: unknown): Promise<TrustedFetchResult> {
    return await post({
      siteUrl: args.siteUrl,
      secret: args.secret,
      path,
      body,
      randomBytes: args.randomBytes,
    });
  }

  return {
    pollMs: 0,
    receiptAttempts: 1,
    distributorAddress() {
      return "";
    },
    async inspect(contract: string, itemId: bigint): Promise<KiteChainInspect> {
      const fetched = await call("/trusted/kite-mint/inspect", {
        contract,
        itemId: itemId.toString(),
      });
      if (fetched.status !== 200) {
        throw new Error(fetched.error ?? `inspect HTTP ${fetched.status}`);
      }
      return asInspect(fetched.json);
    },
    async getReceipt(txHash: string): Promise<KiteReceiptStatus> {
      return receipts.get(txHash.toLowerCase()) ?? "unknown";
    },
    async issueOne(issueArgs: {
      contract: string;
      beneficiary: string;
      itemId: bigint;
      attemptId?: string;
      kiteId?: string;
    }): Promise<KiteIssueResult> {
      if (!issueArgs.attemptId) {
        return { ok: false, error: "missing attempt id", result: "UNAVAILABLE" };
      }
      const fetched = await call("/trusted/kite-mint", {
        attemptId: issueArgs.attemptId,
        wallet: issueArgs.beneficiary,
        kiteId: issueArgs.kiteId ?? "GREEN",
        contract: issueArgs.contract,
        itemId: issueArgs.itemId.toString(),
        beneficiary: issueArgs.beneficiary,
      });
      const json = (fetched.json && typeof fetched.json === "object" ? fetched.json : {}) as CentralKiteMintResponse;
      const stock = stockFromCentral(json);
      if (fetched.status !== 200 && fetched.status !== 0) {
        return { ok: false, error: json.error ?? `HTTP ${fetched.status}`, result: "UNAVAILABLE", ...stock };
      }
      const result = json.result ?? "UNAVAILABLE";
      const txHash = typeof json.txHash === "string" ? json.txHash : "";
      if (result === "CONFIRMED" && txHash) {
        receipts.set(txHash.toLowerCase(), "success");
        return { ok: true, txHash, ...stock };
      }
      if (result === "SUBMITTED") {
        if (txHash) {
          receipts.set(txHash.toLowerCase(), "pending");
        }
        return { ok: true, txHash, ...stock };
      }
      if (result === "REVERTED" && txHash) {
        receipts.set(txHash.toLowerCase(), "reverted");
        return { ok: false, error: json.error ?? "reverted", result: "REVERTED", ...stock };
      }
      return mapCentralMintFailure(result, stock);
    },
  };
}
