import { PlayerIdentityData, engine } from "@dcl/sdk/ecs";
import {
  createManaPlan,
  createNftPlan,
  fetchDepositChestConfig,
  submitManaTx,
  submitNftSession,
  type ChestVerifyResult,
} from "./api";
import { signManaDepositPlan, signNftDepositPlan } from "./walletTx";
import type { DepositChestItem } from "../../shared/chestPanels";
import {
  stageFromBackendStatus,
  type DepositReceipt,
  type DepositStage,
} from "../../shared/depositProgress";
import {
  isFailedVerifyStatus,
  pollDepositVerification,
  VERIFY_TIMEOUT_MESSAGE,
} from "../../shared/depositVerifyPoll";

export type DepositProgressEvent = {
  stage: DepositStage;
  message: string;
  receipt: Partial<DepositReceipt>;
};

function localWallet(): string {
  const me = PlayerIdentityData.getOrNull(engine.PlayerEntity);
  if (!me?.address) {
    throw new Error("Connect a Web3 wallet to deposit");
  }
  return me.address;
}

function asPendingIfTransient(error: unknown, txHash: string): ChestVerifyResult {
  const message = error instanceof Error ? error.message : "";
  if (
    /receipt was not found yet/i.test(message) ||
    /temporarily unavailable/i.test(message) ||
    /Retry verification later/i.test(message)
  ) {
    return { status: "PENDING", reason: "RECEIPT_NOT_AVAILABLE", txHash };
  }
  throw error instanceof Error ? error : new Error("Vault confirmation failed");
}

async function finishVerification(
  verified: ChestVerifyResult,
  notify: (event: DepositProgressEvent) => void,
  timedOut: boolean,
): Promise<string> {
  if (timedOut) {
    notify({
      stage: "waiting_confirmation",
      message: VERIFY_TIMEOUT_MESSAGE,
      receipt: {
        txHash: verified.txHash,
        backendStatus: verified.status,
        verificationNeedsRetry: true,
      },
    });
    return verified.status;
  }
  if (isFailedVerifyStatus(verified.status)) {
    notify({
      stage: "failed",
      message: "Vault confirmation failed",
      receipt: { txHash: verified.txHash, backendStatus: verified.status, verificationNeedsRetry: true },
    });
    return verified.status;
  }
  const stage = stageFromBackendStatus(verified.status);
  notify({
    stage,
    message: stage === "confirmed" ? "Confirmed" : "Waiting for vault confirmation",
    receipt: { txHash: verified.txHash, backendStatus: verified.status, verificationNeedsRetry: false },
  });
  return verified.status;
}

function destinationLabel(
  destination?: "PUBLIC_ROLLING" | "SCHEDULED_PARTY",
  title?: string,
): string {
  if (destination === "SCHEDULED_PARTY") {
    return title || "scheduled party";
  }
  return "Next Public Party";
}

export async function runNftDeposit(args: {
  item: DepositChestItem;
  quantity: number;
  autoPick: boolean;
  lowMintLock: boolean;
  selectedMints: string[];
  destination?: "PUBLIC_ROLLING" | "SCHEDULED_PARTY";
  scheduledPartyId?: string;
  scheduledPartyTitle?: string;
  onProgress?: (event: DepositProgressEvent) => void;
}): Promise<string> {
  const notify = args.onProgress ?? (() => undefined);
  const destLabel = destinationLabel(args.destination, args.scheduledPartyTitle);
  notify({
    stage: "preparing",
    message: "Preparing deposit",
    receipt: {
      itemName: args.item.name,
      quantity: args.quantity,
      mintLabels: args.autoPick ? undefined : args.selectedMints,
      destinationLabel: destLabel,
      destination: args.destination,
      scheduledPartyId: args.scheduledPartyId,
      itemUrn: args.item.urn,
    },
  });
  const config = await fetchDepositChestConfig();
  if (!config?.depositChestEnabled || !config.nftDepositsEnabled) {
    throw new Error("Deposit Chest NFT deposits are disabled");
  }
  const wallet = localWallet();
  const destination = args.destination ?? "PUBLIC_ROLLING";
  const plan = await createNftPlan({
    wallet,
    destination,
    ...(destination === "SCHEDULED_PARTY" && args.scheduledPartyId
      ? { scheduledPartyId: args.scheduledPartyId }
      : {}),
    itemUrn: args.item.urn,
    kind: args.item.kind,
    ownedTokenIds: args.item.mints,
    quantity: args.quantity,
    autoPick: args.autoPick,
    lowMintLock: args.lowMintLock,
    ...(args.autoPick ? {} : { selectedTokenIds: args.selectedMints }),
    displayName: args.item.name,
    rarity: args.item.rarity,
    assetCategory: args.item.kind,
    imageUrl: args.item.thumbnailUrl,
  });
  notify({
    stage: "waiting_wallet",
    message: "Waiting for wallet",
    receipt: {
      itemName: args.item.name,
      quantity: plan.quantity,
      tokenIds: plan.tokenIds,
      mintLabels: plan.tokenIds,
      destinationLabel: destLabel,
      destination: args.destination,
      scheduledPartyId: args.scheduledPartyId,
      depositIntentId: plan.depositIntentId,
      sessionId: plan.sessionId,
      vaultAddress: plan.vaultAddress,
      chainId: plan.chainId,
      contractAddress: plan.contractAddress,
      itemUrn: plan.itemUrn,
      itemId: plan.itemId,
    },
  });
  const txHash = await signNftDepositPlan(wallet, plan);
  notify({
    stage: "submitted",
    message: "Transaction submitted",
    receipt: { txHash, backendStatus: "SUBMITTED" },
  });
  notify({
    stage: "waiting_confirmation",
    message: "Waiting for vault confirmation",
    receipt: { txHash, sessionId: plan.sessionId, verificationNeedsRetry: false },
  });
  const polled = await pollDepositVerification({
    verify: async () => {
      try {
        return await submitNftSession({ wallet, sessionId: plan.sessionId, txHash });
      } catch (error) {
        return asPendingIfTransient(error, txHash);
      }
    },
    onAttempt: (verified) => {
      if (stageFromBackendStatus(verified.status) === "waiting_confirmation") {
        notify({
          stage: "waiting_confirmation",
          message: "Waiting for vault confirmation",
          receipt: { txHash, backendStatus: verified.status, verificationNeedsRetry: false },
        });
      }
    },
  });
  return await finishVerification({ ...polled.result, txHash }, notify, polled.timedOut);
}

export async function retryNftSessionVerification(args: {
  wallet: string;
  sessionId: string;
  txHash: string;
  onProgress?: (event: DepositProgressEvent) => void;
}): Promise<string> {
  const notify = args.onProgress ?? (() => undefined);
  notify({
    stage: "waiting_confirmation",
    message: "Waiting for vault confirmation",
    receipt: {
      txHash: args.txHash,
      sessionId: args.sessionId,
      verificationNeedsRetry: false,
    },
  });
  const polled = await pollDepositVerification({
    verify: async () => {
      try {
        return await submitNftSession({
          wallet: args.wallet,
          sessionId: args.sessionId,
          txHash: args.txHash,
        });
      } catch (error) {
        return asPendingIfTransient(error, args.txHash);
      }
    },
    onAttempt: (verified) => {
      if (stageFromBackendStatus(verified.status) === "waiting_confirmation") {
        notify({
          stage: "waiting_confirmation",
          message: "Waiting for vault confirmation",
          receipt: { txHash: args.txHash, backendStatus: verified.status, verificationNeedsRetry: false },
        });
      }
    },
  });
  return await finishVerification({ ...polled.result, txHash: args.txHash }, notify, polled.timedOut);
}

export async function runManaDeposit(
  amountBaseUnits: string,
  destination: "PUBLIC_ROLLING" | "SCHEDULED_PARTY" = "PUBLIC_ROLLING",
  scheduledPartyId?: string,
  args?: {
    manaAmount?: number;
    scheduledPartyTitle?: string;
    onProgress?: (event: DepositProgressEvent) => void;
  },
): Promise<string> {
  const notify = args?.onProgress ?? (() => undefined);
  const destLabel = destinationLabel(destination, args?.scheduledPartyTitle);
  notify({
    stage: "preparing",
    message: "Preparing deposit",
    receipt: {
      manaAmount: args?.manaAmount,
      manaAmountBaseUnits: amountBaseUnits,
      destinationLabel: destLabel,
      destination,
      scheduledPartyId,
    },
  });
  const config = await fetchDepositChestConfig();
  if (!config?.depositChestEnabled || !config.manaDepositsEnabled) {
    throw new Error("Deposit Chest MANA deposits are disabled");
  }
  const wallet = localWallet();
  const plan = await createManaPlan({
    wallet,
    destination,
    ...(destination === "SCHEDULED_PARTY" && scheduledPartyId ? { scheduledPartyId } : {}),
    amountBaseUnits,
  });
  notify({
    stage: "waiting_wallet",
    message: "Waiting for wallet",
    receipt: {
      depositIntentId: plan.depositIntentId,
      vaultAddress: plan.vaultAddress,
      chainId: plan.chainId,
      manaAmountBaseUnits: plan.amountBaseUnits,
      manaAmount: args?.manaAmount,
      destinationLabel: destLabel,
      destination,
      scheduledPartyId,
    },
  });
  const txHash = await signManaDepositPlan(wallet, plan);
  notify({
    stage: "submitted",
    message: "Transaction submitted",
    receipt: { txHash, backendStatus: "SUBMITTED" },
  });
  notify({
    stage: "waiting_confirmation",
    message: "Waiting for vault confirmation",
    receipt: { txHash, depositIntentId: plan.depositIntentId, verificationNeedsRetry: false },
  });
  const polled = await pollDepositVerification({
    verify: async () => {
      try {
        return await submitManaTx({ wallet, depositIntentId: plan.depositIntentId, txHash });
      } catch (error) {
        return asPendingIfTransient(error, txHash);
      }
    },
    onAttempt: (verified) => {
      if (stageFromBackendStatus(verified.status) === "waiting_confirmation") {
        notify({
          stage: "waiting_confirmation",
          message: "Waiting for vault confirmation",
          receipt: { txHash, backendStatus: verified.status, verificationNeedsRetry: false },
        });
      }
    },
  });
  return await finishVerification({ ...polled.result, txHash }, notify, polled.timedOut);
}

export async function retryManaVerification(args: {
  wallet: string;
  depositIntentId: string;
  txHash: string;
  onProgress?: (event: DepositProgressEvent) => void;
}): Promise<string> {
  const notify = args.onProgress ?? (() => undefined);
  notify({
    stage: "waiting_confirmation",
    message: "Waiting for vault confirmation",
    receipt: {
      txHash: args.txHash,
      depositIntentId: args.depositIntentId,
      verificationNeedsRetry: false,
    },
  });
  const polled = await pollDepositVerification({
    verify: async () => {
      try {
        return await submitManaTx({
          wallet: args.wallet,
          depositIntentId: args.depositIntentId,
          txHash: args.txHash,
        });
      } catch (error) {
        return asPendingIfTransient(error, args.txHash);
      }
    },
    onAttempt: (verified) => {
      if (stageFromBackendStatus(verified.status) === "waiting_confirmation") {
        notify({
          stage: "waiting_confirmation",
          message: "Waiting for vault confirmation",
          receipt: { txHash: args.txHash, backendStatus: verified.status, verificationNeedsRetry: false },
        });
      }
    },
  });
  return await finishVerification({ ...polled.result, txHash: args.txHash }, notify, polled.timedOut);
}
