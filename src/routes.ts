import type { RouteConfig, RouteConfigEntry } from "@react-router/dev/routes";
import path from "path";
import { routerMiddleware } from "./routerMiddleware";
import type { RouteObject } from "react-router";
import { packageDirectory } from "package-directory";

/**
 * These are the routes that get rendered during tests. They are needed for certain
 * integration tests for components that rely on the router context, like ones that
 * use the useFetcher hook or other similar hook.
 *
 */

export async function getRoutes() {
  const appDirectory = await findAppDir();

  // Inform the fs-routes module where the app directory is located, otherwise an error will be thrown
  globalThis.__reactRouterAppDirectory = appDirectory;

  const appRoutesModule = await import(path.join(appDirectory, "routes.ts"));
  const appRoutes = await (appRoutesModule.default as RouteConfig);

  const stubRoutes = await Promise.all(
    appRoutes.map((route) => createRouteObject(appDirectory, route))
  );

  const Root = await import(path.join(appDirectory, "root.tsx"));

  return [
    {
      id: "root",
      path: "/",
      Component: Root.default,
      loader: routerMiddleware.wrapLoader(Root.loader),
      action: routerMiddleware.wrapAction(Root.action),
      meta: Root.meta,
      links: Root.links,
      ErrorBoundary: Root.ErrorBoundary,
      HydrateFallback: Root.HydrateFallback,
      children: stubRoutes,
    },
  ];
}

async function findAppDir(): Promise<string> {
  const pkgDir = await packageDirectory();

  if (!pkgDir) {
    throw new Error(
      "react-router-test-router: could not find your package root directory. Please log an issue on github."
    );
  }

  const reactRouterConfigFile = await import(
    path.join(pkgDir, "react-router.config.ts")
  );

  const appDirectory = path.join(
    pkgDir,
    reactRouterConfigFile.default.appDirectory || "app"
  );

  return appDirectory;
}

type PartialRouteObject = Pick<
  RouteObject,
  | "id"
  | "path"
  | "Component"
  | "loader"
  | "action"
  | "ErrorBoundary"
  | "HydrateFallback"
>;

async function createRouteObject(
  appDirectory: string,
  fsRoute: RouteConfigEntry
): Promise<RouteObject> {
  const modulePath = path.join(appDirectory, fsRoute.file);

  const module = await import(modulePath);

  const children = await Promise.all(
    fsRoute.children?.map((childRoute: RouteConfigEntry) =>
      createRouteObject(appDirectory, childRoute)
    ) ?? []
  );

  // The typescript types for RouteObject are a bit strange between index routes
  // and non-index routes, so we need to separate the code here and return different
  // types based on whether it's an index route or not since index routes cannot have
  // children.

  const routeProperties: PartialRouteObject = {
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
