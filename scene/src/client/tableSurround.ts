import { engine, PlayerIdentityData, Transform } from "@dcl/sdk/ecs";
import { isInsideTableSurroundTrigger } from "../shared/tableSurroundTrigger";

const aroundTable = new Set<string>();
let lastLocalInside = false;

export function walletsAroundTable(): string[] {
  return [...aroundTable];
}

export function isWalletAroundTable(wallet: string): boolean {
  return aroundTable.has(wallet.toLowerCase());
}

export function tickTableSurround(localWallet?: string): { localInside: boolean; localChanged: boolean } {
  const next = new Set<string>();
  for (const [entity, identity] of engine.getEntitiesWith(PlayerIdentityData)) {
    if (!identity.address) {
      continue;
    }
    const transform = Transform.getOrNull(entity);
    if (!transform) {
      continue;
    }
    if (isInsideTableSurroundTrigger(transform.position)) {
      next.add(identity.address.toLowerCase());
    }
  }
  for (const wallet of next) {
    if (!aroundTable.has(wallet)) {
      console.log("[TABLE] entered surround", { wallet });
    }
  }
  for (const wallet of aroundTable) {
    if (!next.has(wallet)) {
      console.log("[TABLE] left surround", { wallet });
    }
  }
  aroundTable.clear();
  for (const wallet of next) {
    aroundTable.add(wallet);
  }
  const localInside = localWallet ? next.has(localWallet.toLowerCase()) : false;
  const localChanged = Boolean(localWallet) && localInside !== lastLocalInside;
  lastLocalInside = localInside;
  return { localInside, localChanged };
}
