import { engine, Schemas } from "@dcl/sdk/ecs";
import { isServer } from "@dcl/sdk/network";
import { AUTH_SERVER_PEER_ID } from "@dcl/sdk/network/message-bus-sync";

/** Live balloon presentation. No prize identity. */
export const BalloonRuntime = engine.defineComponent("dropparty:BalloonRuntime", {
  balloonId: Schemas.String,
  status: Schemas.String,
  partyId: Schemas.String,
  waveId: Schemas.String,
  spawnedAt: Schemas.Int64,
});

export const ServerHeartbeat = engine.defineComponent("dropparty:ServerHeartbeat", {
  tick: Schemas.Int64,
});

export const PopHud = engine.defineComponent("dropparty:PopHud", {
  playerId: Schemas.String,
  eligibleCount: Schemas.Int,
  visible: Schemas.Boolean,
});

export const PartyRoundHud = engine.defineComponent("dropparty:PartyRoundHud", {
  partyId: Schemas.String,
  status: Schemas.String,
  phase: Schemas.String,
  headline: Schemas.String,
  scheduledAt: Schemas.Int64,
  startedAt: Schemas.Int64,
  wavePhaseEndsAt: Schemas.Int64,
  nextWaveAt: Schemas.Int64,
  finalWaveSpawnedAt: Schemas.Int64,
  finalBalloonExpiresAt: Schemas.Int64,
  waveNumber: Schemas.Int,
  isFinal: Schemas.Boolean,
  playerCount: Schemas.Int,
  liveCount: Schemas.Int,
});

if (isServer()) {
  BalloonRuntime.validateBeforeChange((value) => value.senderAddress === AUTH_SERVER_PEER_ID);
  ServerHeartbeat.validateBeforeChange((value) => value.senderAddress === AUTH_SERVER_PEER_ID);
  PopHud.validateBeforeChange((value) => value.senderAddress === AUTH_SERVER_PEER_ID);
  PartyRoundHud.validateBeforeChange((value) => value.senderAddress === AUTH_SERVER_PEER_ID);
}
