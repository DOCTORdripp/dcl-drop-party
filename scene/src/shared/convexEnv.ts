/**
 * Public Convex HTTP sites and DEV/PROD selection.
 *
 * The Decentraland SDK esbuild pipeline replaces `process.env.NODE_ENV` at bundle
 * time (`sdk-commands start` → "development", `sdk-commands deploy` / `--production`
 * → "production"). Ordinary Node env vars are not available inside the ECS client.
 */
declare const process: { env: { NODE_ENV?: string } };

export const CONVEX_SITE_DEV = "https://combative-axolotl-292.convex.site";
export const CONVEX_SITE_PROD = "https://lovely-basilisk-48.convex.site";

export const CONVEX_HOST_DEV = "combative-axolotl-292.convex.site";
export const CONVEX_HOST_PROD = "lovely-basilisk-48.convex.site";

export type DropPartyBuildEnv = "development" | "production";

export function dropPartyBuildEnv(nodeEnv?: string): DropPartyBuildEnv {
  return nodeEnv === "production" ? "production" : "development";
}

export function convexSiteUrlFor(env: DropPartyBuildEnv): string {
  return env === "production" ? CONVEX_SITE_PROD : CONVEX_SITE_DEV;
}

export function convexSiteHost(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
}

export function isDevConvexSite(url: string): boolean {
  return convexSiteHost(url) === CONVEX_HOST_DEV;
}

export function isProdConvexSite(url: string): boolean {
  return convexSiteHost(url) === CONVEX_HOST_PROD;
}

/** Must stay the exact member expression `process.env.NODE_ENV` for SDK define. */
export const DROPPARTY_BUILD_ENV = dropPartyBuildEnv(process.env.NODE_ENV);

/**
 * Client and default server Convex site for this bundle.
 * Selected only from SDK build mode — never from caller-declared identity.
 */
export const CONVEX_SITE_URL = convexSiteUrlFor(DROPPARTY_BUILD_ENV);

/**
 * Opt-in local-only: EnvVar DROPPARTY_SERVER_CONVEX=production keeps the local
 * Multiplayer Server on PROD while NODE_ENV is still development.
 * Ignored in production bundles so Worlds cannot be pointed at DEV.
 */
export function resolveServerConvexSiteUrl(args: {
  envSiteUrl?: string;
  nodeEnv?: string;
  serverConvexOverride?: string;
}): { env: DropPartyBuildEnv; siteUrl: string; ignoredEnvSiteUrl: boolean } {
  const env = dropPartyBuildEnv(args.nodeEnv);
  const requested = (args.envSiteUrl ?? "").trim();
  const override = (args.serverConvexOverride ?? "").trim().toLowerCase();

  if (env === "production") {
    if (requested && isProdConvexSite(requested)) {
      return { env, siteUrl: CONVEX_SITE_PROD, ignoredEnvSiteUrl: false };
    }
    return { env, siteUrl: CONVEX_SITE_PROD, ignoredEnvSiteUrl: requested.length > 0 };
  }

  if (override === "production") {
    return { env, siteUrl: CONVEX_SITE_PROD, ignoredEnvSiteUrl: false };
  }

  if (requested && isDevConvexSite(requested)) {
    return { env, siteUrl: CONVEX_SITE_DEV, ignoredEnvSiteUrl: false };
  }

  return {
    env,
    siteUrl: CONVEX_SITE_DEV,
    ignoredEnvSiteUrl: requested.length > 0,
  };
}

export function assertProductionClientBundle(source: string): void {
  if (source.includes("sourceMappingURL=data:")) {
    throw new Error("Refusing production deploy of a non-production SDK bundle (inline sourcemap)");
  }
  if (!source.includes(CONVEX_HOST_PROD)) {
    throw new Error("Production bundle does not target lovely-basilisk-48.convex.site");
  }
  if (/CONVEX_SITE_URL\s*=\s*"https:\/\/combative-axolotl-292\.convex\.site"/.test(source)) {
    throw new Error("Production bundle client CONVEX_SITE_URL is the DEV Convex site");
  }
}
