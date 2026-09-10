/**
 * Thin HTTP client for Deposit Chest Convex endpoints.
 * Policy, selection, and confirmation stay on the backend.
 */

import { CONVEX_SITE_URL } from "../../shared/constants";
import { signedConvexPost } from "../signedConvex";

export type DepositChestPublicConfig = {
  depositChestEnabled: boolean;
  nftDepositsEnabled: boolean;
  manaDepositsEnabled: boolean;
  wearableDepositsEnabled: boolean;
  emoteDepositsEnabled: boolean;
  vaultAddress: string;
  supportedChainId: number;
  supportedManaContract: string;
  lowMintLockDefaultEnabled: boolean;
  protectedMintNumbers: number[];
  autoPickDefaultEnabled: boolean;
  autoPickStrategy: string;
  maxNftsPerDeposit: number;
  minManaDeposit: string;
  maxManaDeposit: string | null;
};

export type ChestNftPlan = {
  sessionId: string;
  intentIds: string[];
  depositIntentId: string;
  vaultAddress: string;
  chainId: number;
  contractAddress: string;
  itemUrn: string;
  itemId: string;
  tokenIds: string[];
  kind: "wearable" | "emote";
  quantity: number;
  expiresAt: number;
};

export type ChestManaPlan = {
  depositIntentId: string;
  vaultAddress: string;
  chainId: number;
  manaContract: string;
  amountBaseUnits: string;
  expiresAt: number;
};

async function postJson<T>(path: string, body: unknown): Promise<T> {
  return await signedConvexPost<T>(path, body);
}

export async function fetchDepositChestConfig(): Promise<DepositChestPublicConfig | null> {
  const res = await fetch(`${CONVEX_SITE_URL.replace(/\/$/, "")}/deposit-chest/config`);
  if (!res.ok) return null;
  return (await res.json()) as DepositChestPublicConfig;
}

export async function createNftPlan(body: Record<string, unknown>): Promise<ChestNftPlan> {
  return await postJson<ChestNftPlan>("/deposit-chest/nft-plan", body);
}

export async function createManaPlan(body: Record<string, unknown>): Promise<ChestManaPlan> {
  return await postJson<ChestManaPlan>("/deposit-chest/mana-plan", body);
}

export async function fetchManaBalance(wallet: string): Promise<{ balanceBaseUnits: string; display: string }> {
  return await postJson("/deposit-chest/mana-balance", { wallet });
}

export type ChestVerifyResult = {
  status: string;
  reason?: string;
  sessionId?: string;
  txHash?: string;
};

export async function submitNftSession(args: {
  wallet: string;
  sessionId: string;
  txHash: string;
}): Promise<ChestVerifyResult> {
  return await postJson("/deposit-chest/verify-session", args);
}

export async function submitManaTx(args: {
  wallet: string;
  depositIntentId: string;
  txHash: string;
}): Promise<ChestVerifyResult> {
  return await postJson("/deposit-chest/verify", args);
}
