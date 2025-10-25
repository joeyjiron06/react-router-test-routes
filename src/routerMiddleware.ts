import type { LoaderFunction, ActionFunction } from "react-router";

type LoaderMiddleware = (
  ...args: Parameters<LoaderFunction>
) => void | Promise<Parameters<LoaderFunction>>;
type ActionMiddleware = (
  ...args: Parameters<ActionFunction>
) => void | Promise<Parameters<ActionFunction>>;

export function createRouterMiddleware() {
  const loaders: LoaderMiddleware[] = [];
  const actions: ActionMiddleware[] = [];

  async function applyLoaders(
    ...args: Parameters<LoaderFunction>
  ): Promise<Parameters<LoaderFunction>> {
    let currentArgs: Parameters<LoaderFunction> = args;

    for (const loader of loaders) {
      const result = await loader(...currentArgs);

      if (result !== undefined) {
        currentArgs = result;
      }
    }

    return currentArgs;
  }

  async function applyActions(
    ...args: Parameters<ActionFunction>
  ): Promise<Parameters<ActionFunction>> {
    let currentArgs: Parameters<ActionFunction> = args;

    for (const action of actions) {
      const result = await action(...currentArgs);

      if (result !== undefined) {
        currentArgs = result;
      }
    }

    return currentArgs;
  }

  return {
    wrapLoader(realLoaderFn?: LoaderFunction): LoaderFunction | undefined {
      if (!realLoaderFn) {
        return undefined;
      }

      return async (...args: Parameters<LoaderFunction>) => {
        const modifiedArgs = await applyLoaders(...args);
        return realLoaderFn(...modifiedArgs);
      };
    },

    loader(loader: LoaderMiddleware): () => void {
      loaders.push(loader);
      return () => {
        const index = loaders.indexOf(loader);
        if (index !== -1) {
          loaders.splice(index, 1);
        }
      };
    },

    action(action: ActionMiddleware): () => void {
      actions.push(action);
      return () => {
        const index = actions.indexOf(action);
        if (index !== -1) {
          actions.splice(index, 1);
        }
      };
    },

    wrapAction(realActionFn?: ActionFunction): ActionFunction | undefined {
      if (!realActionFn) {
        return undefined;
      }

      return async (...args: Parameters<ActionFunction>) => {
        const modifiedArgs = await applyActions(...args);
        return realActionFn(...modifiedArgs);
      };
    },
  };
}

export const routerMiddleware = createRouterMiddleware();
