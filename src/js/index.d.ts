import type { LoaderFunction, ActionFunction, RouteObject } from "react-router";

type LoaderMiddleware = (
  ...args: Parameters<LoaderFunction>
) => void | Promise<Parameters<LoaderFunction>>;
type ActionMiddleware = (
  ...args: Parameters<ActionFunction>
) => void | Promise<Parameters<ActionFunction>>;

type FlatRouteOptions = {
  appDirectory?: string;
};

export function flatRoutes(options?: FlatRouteOptions): Promise<RouteObject[]>;

export type RouterMiddleware = {
  wrapLoader(realLoaderFn?: LoaderFunction): LoaderFunction | undefined;
  loader(loader: LoaderMiddleware): () => void;
  action(action: ActionMiddleware): () => void;
  wrapAction(realActionFn?: ActionFunction): ActionFunction | undefined;
};

export const routerMiddleware: RouterMiddleware;
