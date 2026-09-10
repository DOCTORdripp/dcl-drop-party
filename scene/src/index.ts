import { isServer } from "@dcl/sdk/network";
import "./shared/messages";
import "./shared/schemas";
import "@dcl/sdk/react-ecs";
import "./client/ui";

/**
 * Official Multiplayer Server entry.
 *
 * registerMessages, custom defineComponent, and React ECS UI components
 * (UiTransform / UiText / UiBackground / …) must be imported at module load.
 * `@dcl/sdk/react-ecs` calls createReactBasedUiSystem() on import, which
 * defineComponentFromSchema's the UI components. Doing that from a dynamic
 * import inside startClient() throws "Engine is already sealed".
 *
 * setUiRenderer stays client-only in startClient().
 * @dcl/sdk/server stays dynamically imported in the server branch.
 */
export async function main() {
  if (isServer()) {
    const { startServer } = await import("./server/server");
    await startServer();
    return;
  }
  const { startClient } = await import("./client/setup");
  startClient();
}
