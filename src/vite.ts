import { Plugin, type UserConfig } from "vite";

/**
 * Vite plugin for react-router-test-routes
 *
 * Automatically configures `ssr.noExternal` and `optimizeDeps.include`
 * so TypeScript dynamic imports inside your library work correctly
 * during development and testing (e.g. Vitest).
 */
export default function reactRouterTestRoutesPlugin(): Plugin {
  const pkgName = "react-router-test-routes";

  return {
    name: `${pkgName}-vite-plugin`,
    enforce: "pre",

    // Only run in dev or Vitest — skip production builds
    apply: ({ mode }) => mode === "test",

    config: (userConfig) => {
      const ssr = userConfig.ssr ?? {};
      const optimizeDeps = userConfig.optimizeDeps ?? {};

      const mergedConfig: UserConfig = {
        ssr: {
          ...ssr,
          noExternal: mergeArray(ssr.noExternal, [pkgName]),
        },
        optimizeDeps: {
          ...optimizeDeps,
          include: mergeArray(optimizeDeps.include, [pkgName]),
        },
      };

      return mergedConfig;
    },
  };
}

function mergeArray(existing: any, items: string[]): string[] {
  if (!existing) return items;
  if (Array.isArray(existing)) return [...new Set([...existing, ...items])];
  if (typeof existing === "string") return [...new Set([existing, ...items])];
  return items;
}
