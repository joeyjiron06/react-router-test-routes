import {
  createMemoryRouter,
  RouterProvider,
  createStaticHandler,
  type RouteObject,
} from "react-router";
import { getRoutes } from "./routes";
import { render, type RenderResult } from "@testing-library/react";
import React from "react";

type NavigationOptions = {
  headers?: HeadersInit;
};

// Preload routes once for all navigateTo calls. This helps with performance.
const routes = await getRoutes();

/**
 * Navigate to a specific path. This will call all the necessary loaders given
 * the specified path. This more or less simulates what would happen in a server-side
 * request in a real React Router app.
 *
 * @param path - the path to navigate to, can include search params
 * @returns
 */
export async function navigateTo(
  path: string,
  navigationOptions?: NavigationOptions
): Promise<RenderResult> {
  // convert it to a url so that we can extract pathname, search, and hash
  // for the memory router because it doesn't like query params when you
  // pass them as a plain string in initialEntries.
  const url = new URL(path, window.location.origin);

  const { context } = await ssrRequest({
    routes,
    path,
    requestInit: {
      headers: navigationOptions?.headers,
    },
  });

  if (!context) {
    throw new Error("Not Implemented. No context returned from ssrRequest");
  }

  const router = createMemoryRouter(routes, {
    initialEntries: [
      {
        pathname: url.pathname,
        search: url.search,
        hash: url.hash,
      },
    ],
    initialIndex: 0,
    hydrationData: context,
  });

  const element = React.createElement(RouterProvider, { router });

  return render(element);
}

/**
 * Run a server pass for a given URL: calls loaders/actions and returns
 * the SSR context (loaderData, errors, etc.). This context can be used
 * to hydrate a router on the client side.
 */
async function ssrRequest({
  routes,
  path,
  requestInit,
}: {
  routes: RouteObject[];
  path: string;
  requestInit?: RequestInit;
}) {
  const url = new URL(path, window.location.origin).toString();
  const request = new Request(url, {
    // You can pass method, headers, cookies, body here to simulate prod
    method: "GET",
    ...requestInit,
  });

  const { query } = createStaticHandler(routes);
  const context = await query(request);

  // Handle SSR redirects just like prod
  if (context instanceof Response) {
    // 3xx redirect or thrown Response – adapt to your test needs
    return { redirect: context, html: "", context: null as any };
  }
  return { context };
}
