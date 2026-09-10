export const BASE_POP_RADIUS_METERS = 0.55;
export const POP_LATENCY_TOLERANCE_METERS = 0.20;
export const EFFECTIVE_POP_RADIUS_METERS = BASE_POP_RADIUS_METERS + POP_LATENCY_TOLERANCE_METERS;
export const POP_VERTICAL_TOLERANCE_METERS = 2.5;
export const MAX_PLAYER_POSITION_AGE_MS = 1500;
/** Missing Transform / identity for this long fails closed. One 150ms miss must not flicker POP. */
export const AUTHORITATIVE_OBSERVATION_LOSS_TOLERANCE_MS = 750;
/** Movement history only advances when the player actually moves. */
export const MEANINGFUL_MOVE_EPSILON_METERS = 0.05;
/** Local movement + POP input lock after WON. Matches balloon burst. Not the toast duration. */
export const POP_ACTION_LOCK_MS = 2200;
/** Per-player server/client claim spacing. Aligns with POP_ACTION_LOCK_MS so the next balloon is claimable after unlock. */
export const SUCCESSFUL_CLAIM_COOLDOWN_MS = POP_ACTION_LOCK_MS;
export const CLAIM_ANIMATION_MS = POP_ACTION_LOCK_MS;
/** Toast remains after burst while the player is already free to run. */
export const WIN_TOAST_MS = 4500;
export const PRIZE_REVEAL_MS = WIN_TOAST_MS;
export const MAX_POP_CANDIDATES = 5;
export const HEARTBEAT_INTERVAL_MS = 2000;
export const ELIGIBILITY_INTERVAL_MS = 150;
export const TRUSTED_FETCH_TIMEOUT_MS = 8000;
/** Public Convex HTTP site. Selected from SDK build mode in convexEnv.ts. */
export { CONVEX_SITE_URL, DROPPARTY_BUILD_ENV } from "./convexEnv";
export const POP_RESULT_TIMEOUT_MS = 10000;

export const POP_UI_VIRTUAL_WIDTH = 1920;
export const POP_UI_VIRTUAL_HEIGHT = 1080;
export const POP_UI_MOBILE_VIRTUAL_WIDTH = 1600;
export const POP_UI_MOBILE_VIRTUAL_HEIGHT = 720;
export const POP_BUTTON_SIZE = 240;
/** Button center sits ~43.5% from the top — above midpoint, not centered. */
export const POP_BUTTON_CENTER_RATIO = 0.435;
export const POP_BUTTON_TOP = Math.round(
  POP_UI_VIRTUAL_HEIGHT * POP_BUTTON_CENTER_RATIO - POP_BUTTON_SIZE / 2,
);
export const POP_BUTTON_LEFT = (POP_UI_VIRTUAL_WIDTH - POP_BUTTON_SIZE) / 2;
export const POP_ELIGIBLE_LABEL_HEIGHT = 44;
export const POP_ELIGIBLE_LABEL_GAP = 16;
export const POP_BUTTON_CLUSTER_TOP =
  POP_BUTTON_TOP - POP_ELIGIBLE_LABEL_HEIGHT - POP_ELIGIBLE_LABEL_GAP;
export const POP_BUTTON_BOTTOM = POP_UI_VIRTUAL_HEIGHT - POP_BUTTON_TOP - POP_BUTTON_SIZE;
export const POP_STOMP_EMOTE = "hammer";
/** Avatar stand height for the post-WON plant. Not the balloon mesh center Y. */
export const POP_STOMP_FLOOR_Y = 0;
/** Lock / burst impact. A future custom emote may last longer than this. */
export const POP_IMPACT_TIME_MS = POP_ACTION_LOCK_MS;
export const POP_EMOTE_NAME = POP_STOMP_EMOTE;
export const POP_EMOTE_URN = "";
export const BALLOON_LAND_MS = 1400;
/** Local server wake period. Network interval is adaptive via partyPoll. */
export const PARTY_TICK_MS = 1000;
export const WORLD_TOAST_DURATION_MS = 6000;
export const WORLD_TOAST_MAX_VISIBLE = 3;

/** Slim NEXT DROP PARTY ticker (virtual 1920×1080). Taller so ui_header.png caps stay uncrushed. */
export const NEXT_DROP_TICKER_TOP = 8;
export const NEXT_DROP_TICKER_HEIGHT = 56;
export const NEXT_DROP_TICKER_COMPACT_TOP = 4;
export const NEXT_DROP_TICKER_COMPACT_HEIGHT = 42;
/** Gap between the ticker and the DROP PARTY STARTS IN banner. */
export const NEXT_DROP_HUD_GAP = 10;

/** Top-center persistent party header, below the next-drop ticker. */
export const PARTY_HUD_TOP = NEXT_DROP_TICKER_TOP + NEXT_DROP_TICKER_HEIGHT + NEXT_DROP_HUD_GAP;
export const PARTY_HUD_WIDTH = 640;
export const PARTY_HUD_HEIGHT = 118;
export const PARTY_HUD_LEFT = (POP_UI_VIRTUAL_WIDTH - PARTY_HUD_WIDTH) / 2;
export const TOAST_BELOW_HUD_GAP = 28;

/** Personal win toast: centered, below the round HUD. */
export const WIN_TOAST_TOP = PARTY_HUD_TOP + PARTY_HUD_HEIGHT + TOAST_BELOW_HUD_GAP;
export const WIN_TOAST_WIDTH = 760;
export const WIN_TOAST_HEIGHT = 150;

/** World feed: same toast band, offset right so it never mimics YOU WON. */
export const WORLD_TOAST_TOP = WIN_TOAST_TOP;
export const WORLD_TOAST_WIDTH = 380;
export const WORLD_TOAST_RIGHT = 72;
export const WORLD_TOAST_ROW_HEIGHT = 66;

/** Compact current-party win feed: upper-right, below the header band. */
export const PARTY_WIN_FEED_TOP = 14;
export const PARTY_WIN_FEED_RIGHT = 72;
export const PARTY_WIN_FEED_WIDTH = 260;
export const PARTY_WIN_FEED_ROW_HEIGHT = 42;

/**
 * Clustered so a player standing in the pile is within the ~0.75 m XZ radius of all three.
 */
export const TEST_BALLOON_POSITIONS: ReadonlyArray<{ x: number; y: number; z: number }> = [
  { x: 47.4, y: 1.2, z: 56 },
  { x: 48.0, y: 1.2, z: 56 },
  { x: 48.6, y: 1.2, z: 56 },
];
