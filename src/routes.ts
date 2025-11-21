import type { RouteConfig, RouteConfigEntry } from "@react-router/dev/routes";
import path from "path";
import { routerMiddleware } from "./routerMiddleware";
import type {
  IndexRouteObject,
  NonIndexRouteObject,
  RouteObject,
} from "react-router";
import { findFileInProjectRoot, projectRoot } from "./fileLoader";

/**
 * These are the routes that get rendered during tests. They are needed for certain
 * integration tests for components that rely on the router context, like ones that
 * use the useFetcher hook or other similar hook.
 *
 */

let routes: Promise<RouteObject[]> | undefined;

export async function getRoutes(): Promise<RouteObject[]> {
  async function loadRoutes(): Promise<RouteObject[]> {
    const appDirectory = await findAppDir();
    const appDirectoryFullPath = path.join(projectRoot, appDirectory);

    // Inform the fs-routes module where the app directory is located, otherwise an error will be thrown
    globalThis.__reactRouterAppDirectory = appDirectoryFullPath;

    const routesFilename = findFileInProjectRoot(
      path.join(appDirectory, "routes")
    );

    if (!routesFilename) {
      throw new Error(
        "react-router-test-router: could not find routes.(ts|js|mjs|mts) in your project root. Please create one to use this library."
      );
    }

    const appRoutesModule = await import(routesFilename);
    const appRoutes = await (appRoutesModule.default as RouteConfig);

    const rootFilename = findFileInProjectRoot(path.join(appDirectory, "root"));

    if (!rootFilename) {
      throw new Error(
        `react-router-test-router: could not find root.(ts|js|mjs|mts) in your project root: ${projectRoot}. Please create one to use this library.`
      );
    }

    const Root = await import(rootFilename);

    const childRoutes = await Promise.all(
      appRoutes.map((route) => createRouteObject(appDirectory, route))
    );

    const rootRoute = {
      routeId: "root",
      path: "/",
    };

    return [
      {
        id: rootRoute.routeId,
        path: rootRoute.path,
        Component: Root.default,
        loader: routerMiddleware.wrapLoader(rootRoute, Root.loader),
        action: routerMiddleware.wrapAction(rootRoute, Root.action),
        ErrorBoundary: Root.ErrorBoundary,
        children: childRoutes,
      },
    ];
  }

  if (!routes) {
    routes = loadRoutes();
  }

  return routes;
}

async function findAppDir(): Promise<string> {
  const reactRouterConfigFilePath = findFileInProjectRoot(
    "react-router.config"
  );

  if (!reactRouterConfigFilePath) {
    throw new Error(
      "react-router-test-router: could not find react-router.config.(ts|js|mjs|mts) in your project root. Please create one to use this library."
    );
  }

  const reactRouterConfigFile = await import(reactRouterConfigFilePath);

  return reactRouterConfigFile.default.appDirectory || "app";
}

async function createRouteObject(
  appDirectory: string,
  fsRoute: RouteConfigEntry
): Promise<RouteObject> {
  const modulePath = path.join(projectRoot, appDirectory, fsRoute.file);

  const module = await import(modulePath);

  const children = await Promise.all(
    fsRoute.children?.map((childRoute: RouteConfigEntry) =>
      createRouteObject(appDirectory, childRoute)
    ) ?? []
  );

  function createPartialRouteObject(): Pick<
    RouteObject,
    | "id"
    | "path"
    | "Component"
    | "loader"
    | "action"
    | "ErrorBoundary"
    | "HydrateFallback"
  > {
    return {
      id: fsRoute.id,
      path: fsRoute.path,
      Component: module.default,
      loader: routerMiddleware.wrapLoader(fsRoute, module.loader),
      action: routerMiddleware.wrapAction(fsRoute, module.action),
      ErrorBoundary: module.ErrorBoundary,
      HydrateFallback: module.HydrateFallback,
    };
  }

  function createIndexRouteObject(): IndexRouteObject {
    return {
      index: true,
      ...createPartialRouteObject(),
    };
  }

  function createNonIndexRouteObject(): NonIndexRouteObject {
    return {
      index: false,
      children,
      ...createPartialRouteObject(),
    };
  }

  if (fsRoute.index) {
    return createIndexRouteObject();
  }

  return createNonIndexRouteObject();
}
