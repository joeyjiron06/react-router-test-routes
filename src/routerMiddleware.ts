import type {
  LoaderFunction,
  ActionFunction,
  LoaderFunctionArgs,
  ActionFunctionArgs,
  Params,
} from "react-router";

type LoaderMiddleware = (
  args: LoaderFunctionArgs & { routeId?: string },
  context?: unknown
) => void | Promise<Parameters<LoaderMiddleware>>;

type ActionMiddleware = (
  args: ActionFunctionArgs & { routeId?: string },
  context?: unknown
) => void | Promise<Parameters<ActionMiddleware>>;

type GenericMiddleware = (
  args: DataFunctionArgs<any> & { routeId?: string },
  context?: unknown
) => void | Promise<Parameters<GenericMiddleware>>;

interface DataFunctionArgs<Context> {
  request: Request;
  params: Params;
  context: Context;
}

export function createRouterMiddleware() {
  const loaders: LoaderMiddleware[] = [];
  const actions: ActionMiddleware[] = [];

  function removeLoader(loader: LoaderMiddleware) {
    const index = loaders.indexOf(loader);
    if (index !== -1) {
      loaders.splice(index, 1);
    }
  }

  async function applyLoaders(
    ...args: Parameters<LoaderMiddleware>
  ): Promise<Parameters<LoaderMiddleware>> {
    let currentArgs: Parameters<LoaderMiddleware> = args;

    for (const loader of loaders) {
      const result = await loader(...currentArgs);

      if (result !== undefined) {
        currentArgs = result;
      }
    }

    return currentArgs;
  }

  function removeAction(action: ActionMiddleware) {
    const index = actions.indexOf(action);
    if (index !== -1) {
      actions.splice(index, 1);
    }
  }

  async function applyActions(
    ...args: Parameters<ActionMiddleware>
  ): Promise<Parameters<ActionMiddleware>> {
    let currentArgs: Parameters<ActionMiddleware> = args;

    for (const action of actions) {
      const result = await action(...currentArgs);

      if (result !== undefined) {
        currentArgs = result;
      }
    }

    return currentArgs;
  }

  return {
    wrapLoader(
      realLoaderFn?: LoaderFunction,
      routeId?: string
    ): LoaderFunction | undefined {
      if (!realLoaderFn) {
        return undefined;
      }

      return async (args: LoaderFunctionArgs, context: unknown) => {
        const modifiedArgs = await applyLoaders({ ...args, routeId }, context);
        return realLoaderFn(...modifiedArgs);
      };
    },

    loader(loader: LoaderMiddleware): () => void {
      loaders.push(loader);
      return () => {
        removeLoader(loader);
      };
    },

    action(action: ActionMiddleware): () => void {
      actions.push(action);
      return () => {
        removeAction(action);
      };
    },

    wrapAction(
      realActionFn?: ActionFunction,
      routeId?: string
    ): ActionFunction | undefined {
      if (!realActionFn) {
        return undefined;
      }

      return async (args: ActionFunctionArgs, context: unknown) => {
        const modifiedArgs = await applyActions({ ...args, routeId }, context);
        return realActionFn(...modifiedArgs);
      };
    },

    use(middleware: GenericMiddleware): () => void {
      loaders.push(middleware);
      actions.push(middleware);

      return () => {
        removeLoader(middleware);
        removeAction(middleware);
      };
    },

    removeAllListeners() {
      loaders.length = 0;
      actions.length = 0;
    },
  };
}

export const routerMiddleware = createRouterMiddleware();
