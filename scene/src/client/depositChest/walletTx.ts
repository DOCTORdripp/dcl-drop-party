/**
 * Wallet signing only. Destination, token IDs, and amounts come from a Convex plan.
 */

import { createEthereumProvider } from "@dcl/sdk/ethereum-provider";
import type { ChestManaPlan, ChestNftPlan } from "./api";

const SAFE_TRANSFER_FROM = "0x42842e0e";
const BATCH_TRANSFER_SINGLE_TO = "0xf3993d11";
const ERC20_TRANSFER = "0xa9059cbb";
const GAS_NFT = "0x7A120";
const GAS_BATCH = "0x3D0900";
const GAS_ERC20 = "0x186A0";

type EthProvider = ReturnType<typeof createEthereumProvider>;

function padAddr(addr: string): string {
  return addr.slice(2).toLowerCase().padStart(64, "0");
}

function padUint(value: string): string {
  return BigInt(value).toString(16).padStart(64, "0");
}

function sendTx(provider: EthProvider, tx: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    provider.sendAsync(
      {
        jsonrpc: "2.0",
        id: Math.floor(Math.random() * 1_000_000_000) + 1,
        method: "eth_sendTransaction",
        params: [tx],
      },
      (err: Error | null, result?: unknown) => {
        if (err) {
          reject(err);
          return;
        }
        const boxed = result as { error?: { message?: string }; result?: string } | string | null;
        if (boxed && typeof boxed === "object" && boxed.error?.message) {
          reject(new Error(boxed.error.message));
          return;
        }
        const hash = typeof boxed === "string" ? boxed : boxed?.result;
        if (typeof hash === "string" && hash.startsWith("0x")) {
          resolve(hash);
          return;
        }
        reject(new Error("Wallet did not return a transaction hash"));
      },
    );
  });
}

export async function signNftDepositPlan(fromAddr: string, plan: ChestNftPlan): Promise<string> {
  const provider = createEthereumProvider();
  const to = plan.vaultAddress;
  if (plan.tokenIds.length === 1) {
    const data = SAFE_TRANSFER_FROM + padAddr(fromAddr) + padAddr(to) + padUint(plan.tokenIds[0]!);
    return await sendTx(provider, {
      from: fromAddr,
      to: plan.contractAddress,
      data,
      gas: GAS_NFT,
    });
  }
  const offset = (3 * 32).toString(16).padStart(64, "0");
  const data =
    BATCH_TRANSFER_SINGLE_TO +
    padAddr(fromAddr) +
    padAddr(to) +
    offset +
    padUint(String(plan.tokenIds.length)) +
    plan.tokenIds.map(padUint).join("");
  return await sendTx(provider, {
    from: fromAddr,
    to: plan.contractAddress,
    data,
    gas: GAS_BATCH,
  });
}

export async function signManaDepositPlan(fromAddr: string, plan: ChestManaPlan): Promise<string> {
  const provider = createEthereumProvider();
  const data = ERC20_TRANSFER + padAddr(plan.vaultAddress) + padUint(plan.amountBaseUnits);
  return await sendTx(provider, {
    from: fromAddr,
    to: plan.manaContract,
    data,
    gas: GAS_ERC20,
  });
}
