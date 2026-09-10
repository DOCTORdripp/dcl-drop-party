import type { PlayPhaseKind } from "./playPhase";

export type ChestVisualState = "IDLE" | "COUNTDOWN" | "PRE_T10" | "PRE_T5" | "ACTIVE" | "COMPLETE";

export type ChestPotModel = {
  prizeCount: number;
  manaLabel: string;
  source: "PUBLIC_ROLLING" | "SCHEDULED_PARTY" | "DEV";
  markedDev: boolean;
};

export type ChestPresentation = {
  visual: ChestVisualState;
  lidOpen: boolean;
  glow: number;
  pulse: boolean;
  shake: boolean;
  headline: string;
  timerLine: string;
  pot: ChestPotModel;
};

export const DEV_CHEST_POT: ChestPotModel = {
  prizeCount: 83,
  manaLabel: "12,450 MANA",
  source: "DEV",
  markedDev: true,
};

export function deriveChestVisual(args: {
  phase: PlayPhaseKind | string;
  status?: string;
  msToStart?: number;
}): ChestVisualState {
  if (args.phase === "COMPLETED" || args.phase === "SETTLING" || args.status === "COMPLETED") {
    return "COMPLETE";
  }
  const ms = args.msToStart ?? Number.POSITIVE_INFINITY;
  if (args.phase === "COUNTDOWN" || args.phase === "LOCKED" || args.status === "LOCKED") {
    if (ms <= 0) {
      return "ACTIVE";
    }
    if (ms <= 5000) {
      return "PRE_T5";
    }
    if (ms <= 10000) {
      return "PRE_T10";
    }
    return "COUNTDOWN";
  }
  if (
    args.phase === "WAVE" ||
    args.phase === "BREAK" ||
    args.phase === "FINAL_WAVE" ||
    args.phase === "FINAL_GRACE" ||
    args.status === "ACTIVE"
  ) {
    return "ACTIVE";
  }
  return "IDLE";
}

export function formatChestPresentation(args: {
  phase: PlayPhaseKind | string;
  status?: string;
  headline?: string;
  timerLine?: string;
  msToStart?: number;
  pot?: ChestPotModel;
}): ChestPresentation {
  const visual = deriveChestVisual(args);
  const pot = args.pot ?? DEV_CHEST_POT;
  return {
    visual,
    lidOpen: visual === "IDLE" || visual === "COUNTDOWN" || visual === "PRE_T10" || visual === "PRE_T5" || visual === "COMPLETE",
    glow: visual === "PRE_T5" ? 1 : visual === "PRE_T10" ? 0.78 : visual === "COUNTDOWN" ? 0.55 : visual === "ACTIVE" ? 0.2 : 0.35,
    pulse: visual === "PRE_T10" || visual === "PRE_T5" || visual === "COUNTDOWN",
    shake: visual === "PRE_T5",
    headline: args.headline ?? (visual === "ACTIVE" ? "DROP PARTY!" : "NEXT DROP PARTY"),
    timerLine: args.timerLine ?? "",
    pot,
  };
}

export function chestBlocksDepositsOnBackend(_visual: ChestVisualState): boolean {
  return false;
}

export function potHasNoBalloonMapping(pot: ChestPotModel): boolean {
  const raw = JSON.stringify(pot);
  return !raw.includes("balloonId") && !raw.includes("prizeMapping") && !raw.includes("assignment");
}

export function reconstructChestFromSnapshot(snapshot: {
  status: string;
  phase?: string;
  headline?: string;
  timerLabel?: string;
  scheduledAt?: number;
  now?: number;
  pot?: ChestPotModel;
}): ChestPresentation {
  const now = snapshot.now ?? 0;
  return formatChestPresentation({
    phase: snapshot.phase ?? snapshot.status,
    status: snapshot.status,
    headline: snapshot.headline,
    timerLine: snapshot.timerLabel,
    msToStart: snapshot.scheduledAt !== undefined ? snapshot.scheduledAt - now : undefined,
    pot: snapshot.pot,
  });
}
