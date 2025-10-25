import { flatRoutes as flatRoutesReactRouter } from "@react-router/fs-routes";
import path from "path";
import { routerMiddleware } from "../routerMiddleware";
import { packageDirectory } from "package-directory";

/**
 * @typedef {import("@react-router/dev/routes").RouteConfigEntry} RouteConfigEntry
 * @typedef {import("react-router").RouteObject} RouteObject
 */

/**
 * These are the routes that get rendered during tests. They are needed for certain
 * integration tests for components that rely on the router context, like ones that
 * use the useFetcher hook or other similar hook.
 *
 */

export async function flatRoutes(options) {
  // Inform the fs-routes module where the app directory is located, otherwise an error will be thrown
  globalThis.__reactRouterAppDirectory = await findAppDir(options);

  const fsRoutes = await flatRoutesReactRouter();

  return [
    await createRouteObject({
      id: "root",
      path: "/",
      file: "root.tsx",
      children: fsRoutes,
    }),
  ];
}

/**
 *
 * @returns {Promise<string>}
 */
async function findAppDir(options) {
  const pkgDir = await packageDirectory();

  if (!pkgDir) {
    throw new Error(
      "react-router-test-router: could not find your package root directory. Please log an issue on github."
    );
  }

  const appDirectory = path.join(pkgDir, options.appDirectory || "app");

  return appDirectory;
}

/**
 * @param {string} appDirectory
 * @param {RouteConfigEntry} fsRoute
 * @returns {Promise<RouteObject>}
 */
async function createRouteObject(fsRoute) {
  const appDirectory = globalThis.__reactRouterAppDirectory;
  const modulePath = path.join(appDirectory, fsRoute.file);

  const module = await import(modulePath);

  const children = await Promise.all(
    fsRoute.children?.map((childRoute) => createRouteObject(childRoute)) ?? []
  );

  const routeProperties = {
    id: fsRoute.id,
    path: fsRoute.path,
    Component: module.default,
    loader: routerMiddleware.wrapLoader(module.loader),
    action: routerMiddleware.wrapAction(module.action),
    ErrorBoundary: module.ErrorBoundary,
    HydrateFallback: module.HydrateFallback,
  };

  if (fsRoute.index) {
    return {
      index: true,
      ...routeProperties,
    };
  }

  return {
    index: false,
    children,
    ...routeProperties,
  };
}
