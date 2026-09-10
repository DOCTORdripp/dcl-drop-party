/**
 * Client presentation of deposit stages. Confirmation is only Convex CONFIRMED.
 */

import { formatNftMintLabel } from "./mintNumber";

export type DepositStage =
  | "idle"
  | "preparing"
  | "waiting_wallet"
  | "submitted"
  | "waiting_confirmation"
  | "confirmed"
  | "failed";

export type DepositReceipt = {
  itemName?: string;
  quantity?: number;
  mintLabels?: string[];
  tokenIds?: string[];
  destinationLabel: string;
  txHash?: string;
  depositIntentId?: string;
  sessionId?: string;
  vaultAddress?: string;
  chainId?: number;
  contractAddress?: string;
  itemUrn?: string;
  itemId?: string;
  manaAmount?: number;
  manaAmountBaseUnits?: string;
  scheduledPartyId?: string;
  destination?: "PUBLIC_ROLLING" | "SCHEDULED_PARTY";
  backendStatus?: string;
  verificationNeedsRetry?: boolean;
};

export function emptyDepositReceipt(): DepositReceipt {
  return { destinationLabel: "Next Public Party" };
}

export function depositStageLabel(stage: DepositStage): string {
  switch (stage) {
    case "preparing":
      return "Preparing deposit";
    case "waiting_wallet":
      return "Waiting for wallet";
    case "submitted":
      return "Transaction submitted";
    case "waiting_confirmation":
      return "Waiting for vault confirmation";
    case "confirmed":
      return "Confirmed";
    case "failed":
      return "Failed";
    default:
      return "";
  }
}

export function isDepositFullyConfirmed(stage: DepositStage): boolean {
  return stage === "confirmed";
}

export function txHashAloneIsNotConfirmation(stage: DepositStage, txHash?: string): boolean {
  return Boolean(txHash) && stage !== "confirmed";
}

export function shortTxHash(txHash?: string): string {
  if (!txHash || txHash.length < 12) {
    return txHash ?? "";
  }
  return `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;
}

export function formatMintLabels(ids: string[]): string {
  return ids
    .map((id) => formatNftMintLabel(id.startsWith("#") ? id.slice(1) : id))
    .filter(Boolean)
    .join(", ");
}

export function friendlyDepositMessage(raw: string): string {
  const cleaned = raw
    .replace(/^(Uncaught Error:\s*)+/gi, "")
    .split(/\r?\n/)[0]
    ?.replace(/\s+at\s+.*$/i, "")
    .trim() ?? "";
  const lower = cleaned.toLowerCase();
  if (lower.includes("not accepting deposits") || lower.includes("contributions are locked")) {
    return "This party is no longer accepting deposits.";
  }
  if (lower.includes("does not allow community")) {
    return "Only the host can add prizes to this party.";
  }
  if (!cleaned || cleaned.length > 90 || /convex\/|\.ts:\d+|handler \(/.test(cleaned)) {
    return "Deposit failed. Please try again.";
  }
  return cleaned;
}

export function formatDepositSummaryLines(args: {
  asset: "NFT" | "MANA";
  stage: DepositStage;
  message: string;
  receipt: DepositReceipt;
}): string[] {
  const lines: string[] = [];
  const heading = depositStageLabel(args.stage);
  if (heading) {
    lines.push(args.stage === "confirmed" ? `${heading} ✓` : heading);
  }
  if (args.asset === "NFT") {
    if (args.receipt.quantity && args.receipt.itemName) {
      lines.push(`${args.receipt.quantity} NFT${args.receipt.quantity === 1 ? "" : "s"}`);
      lines.push(args.receipt.itemName);
    } else if (args.receipt.itemName) {
      lines.push(args.receipt.itemName);
    }
    const mints = args.receipt.mintLabels ?? args.receipt.tokenIds ?? [];
    if (mints.length > 0) {
      lines.push(formatMintLabels(mints));
    }
  } else if (args.receipt.manaAmount !== undefined) {
    lines.push(`${args.receipt.manaAmount} MANA`);
  }
  if (args.receipt.destinationLabel) {
    lines.push(`Destination: ${args.receipt.destinationLabel}`);
  }
  if (args.receipt.txHash && args.stage !== "failed") {
    lines.push(`Transaction: ${shortTxHash(args.receipt.txHash)}`);
  }
  if (args.stage === "waiting_confirmation") {
    lines.push("Waiting for vault confirmation...");
    if (args.message && args.message !== "Waiting for vault confirmation") {
      lines.push(friendlyDepositMessage(args.message));
    }
  } else if (args.stage === "failed") {
    lines.push(friendlyDepositMessage(args.message || "Deposit failed. Please try again."));
  } else if (args.message && args.stage !== "confirmed") {
    lines.push(friendlyDepositMessage(args.message));
  }
  return lines;
}

export function formatDevDiagnostics(_receipt: DepositReceipt, _enabled: boolean): string[] {
  return [];
}

export function stageFromBackendStatus(status: string): DepositStage {
  if (status === "CONFIRMED" || status === "ALREADY_CONFIRMED") {
    return "confirmed";
  }
  if (status === "FAILED") {
    return "failed";
  }
  return "waiting_confirmation";
}

export function depositRetryIsVerificationOnly(receipt: DepositReceipt): boolean {
  return Boolean(receipt.txHash && (receipt.sessionId || receipt.depositIntentId));
}

export function canShowRetryVerification(args: {
  stage: DepositStage;
  receipt: DepositReceipt;
}): boolean {
  if (!depositRetryIsVerificationOnly(args.receipt)) {
    return false;
  }
  if (args.stage === "waiting_confirmation") {
    return Boolean(args.receipt.verificationNeedsRetry);
  }
  return args.stage === "failed";
}
