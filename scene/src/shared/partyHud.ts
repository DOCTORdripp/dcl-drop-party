import { derivePlayPhase, type PlayPhaseInput, type PlayPhaseView } from "./playPhase";
import type { WinView } from "./wins";

export type PartyHudModel = {
  visible: boolean;
  headline: string;
  timerLine: string;
  playersLine: string;
  balloonsLine: string;
  phase: string;
  partyId?: string;
  liveBalloonCount: number;
  winFeed: WinView[];
  nextDropVisible: boolean;
  nextDropLine: string;
};

export function formatPartyHud(
  snapshot: PlayPhaseInput & { playerCount?: number; liveBalloonCount?: number; partyId?: string },
  now: number,
): PartyHudModel {
  if (!snapshot.status || snapshot.status === "NONE" || snapshot.partyId === "") {
    return emptyPartyHud();
  }
  const phase: PlayPhaseView = derivePlayPhase({ ...snapshot, now });
  const timerLine =
    phase.kind === "COMPLETED" || phase.kind === "SETTLING"
      ? ""
      : phase.timerSuffix
        ? `${phase.timerLabel} ${phase.timerSuffix}`
        : phase.timerLabel;
  return {
    visible: true,
    headline: phase.headline,
    timerLine,
    playersLine: `${snapshot.playerCount ?? 0} PLAYERS`,
    balloonsLine: `${snapshot.liveBalloonCount ?? 0} BALLOONS LIVE`,
    phase: phase.kind,
    partyId: snapshot.partyId,
    liveBalloonCount: snapshot.liveBalloonCount ?? 0,
    winFeed: [],
    nextDropVisible: false,
    nextDropLine: "",
  };
}

export function emptyPartyHud(): PartyHudModel {
  return {
    visible: false,
    headline: "",
    timerLine: "",
    playersLine: "",
    balloonsLine: "",
    phase: "",
    liveBalloonCount: 0,
    winFeed: [],
    nextDropVisible: false,
    nextDropLine: "",
  };
}

/** Round HUD stays gated on admission; the public next-drop bar does not. */
export function partyHudForAdmission(hud: PartyHudModel, admitted: boolean): PartyHudModel {
  if (admitted) return hud;
  return {
    ...emptyPartyHud(),
    nextDropVisible: hud.nextDropVisible,
    nextDropLine: hud.nextDropLine,
  };
}
