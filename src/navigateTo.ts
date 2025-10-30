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

/**
 * Navigate to a specific path. This will call all the necessary loaders given
 * the specified path. This more or less simulates what would happen in a server-side
 * request in a real React Router app.
 *
 * @param path - the path to navigate to
 * @returns
 */
export async function navigateTo(
  path: string,
  navigationOptions?: NavigationOptions
): Promise<RenderResult> {
  const routes = await getRoutes();

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
    initialEntries: [path],
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
  const request = new Request(
    new URL(path, window.location.origin).toString(),
    {
      // You can pass method, headers, cookies, body here to simulate prod
      method: "GET",
      ...requestInit,
    }
  );

  const { query } = createStaticHandler(routes);
  const context = await query(request);

  // Handle SSR redirects just like prod
  if (context instanceof Response) {
    // 3xx redirect or thrown Response – adapt to your test needs
    return { redirect: context, html: "", context: null as any };
  }
  return { context };
}
