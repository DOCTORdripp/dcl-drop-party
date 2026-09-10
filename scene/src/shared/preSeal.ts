/**
 * Modules that register ECS components or messages and MUST be statically
 * imported from index.ts before the engine seals. Never load these first
 * from startClient() / setupUi() / a dynamic import.
 */
export const PRE_SEAL_MODULE_IMPORTS = [
  "./shared/messages",
  "./shared/schemas",
  "@dcl/sdk/react-ecs",
  "./client/ui",
] as const;

export function indexStaticallyImportsPreSealModules(indexSource: string): boolean {
  return PRE_SEAL_MODULE_IMPORTS.every((moduleId) => {
    const escaped = moduleId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|\\n)import\\s+["']${escaped}["']`, "m").test(indexSource);
  });
}

export function indexHasNoLateReactEcsImport(indexSource: string): boolean {
  return !/await\s+import\(\s*["']@dcl\/sdk\/react-ecs["']\s*\)/.test(indexSource);
}
