export function createRouterMiddleware() {
  const loaders = [];
  const actions = [];

  async function applyLoaders(...args) {
    let currentArgs = args;

    for (const loader of loaders) {
      const result = await loader(...currentArgs);

      if (result !== undefined) {
        currentArgs = result;
      }
    }

    return currentArgs;
  }

  async function applyActions(...args) {
    let currentArgs = args;

    for (const action of actions) {
      const result = await action(...currentArgs);

      if (result !== undefined) {
        currentArgs = result;
      }
    }

    return currentArgs;
  }

  return {
    wrapLoader(realLoaderFn) {
      if (!realLoaderFn) {
        return undefined;
      }

      return async (...args) => {
        const modifiedArgs = await applyLoaders(...args);
        return realLoaderFn(...modifiedArgs);
      };
    },

    loader(loader) {
      loaders.push(loader);
      return () => {
        const index = loaders.indexOf(loader);
        if (index !== -1) {
          loaders.splice(index, 1);
        }
      };
    },

    action(action) {
      actions.push(action);
      return () => {
        const index = actions.indexOf(action);
        if (index !== -1) {
          actions.splice(index, 1);
        }
      };
    },

    wrapAction(realActionFn) {
      if (!realActionFn) {
        return undefined;
      }

      return async (...args) => {
        const modifiedArgs = await applyActions(...args);
        return realActionFn(...modifiedArgs);
      };
    },
  };
}

export const routerMiddleware = createRouterMiddleware();
