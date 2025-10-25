# React Router Test Routes

A small library to use when you need `react-router` routes in your tests.

## Motivation

When testing React Router applications in framework mode, developers can often face challenges injecting authentication headers and other request modifications into their loaders and actions. Yes you can call your loaders and actions directly in a test, but I think it's better to render a specific route and let the framework call it for you. Doing it that way is much less boilerplate and more closely mimics the behavior that happens in production. Existing solutions often require extensive mocking of request objects and related infrastructure, which reduces test confidence and diverges from production behavior.

This library addresses these limitations by providing a thin abstraction over React Router's native testing utilities, enabling developers to modify requests while maintaining consistency with production routing behavior. Rather than relying on mocks, it leverages React Router's existing methods to create a testing environment that closely mirrors the production router implementation.

## Usage

```tsx
import { createMemoryRouter, RouterProvider } from "react-router";
import { getRoutes } from "react-router-test-router";

it("should render", async () => {
  const routes = await getRoutes(); // <-- calls yours <appDir>/routes.ts file
  const router = createMemoryRouter(routes(), {
    initialEntries: ["/my-path"], // <-- the path you want to render goes here
    initialIndex: 0,
  });

  render(<RouterProvider router={router} />);

  expect(screen.getByText("Hello world!")).toBeInTheDocument();
});
```

I prefer to keep this reusable logic in a separate file so I can reuse it across tests

**render.tsx**

```tsx
import { createMemoryRouter, RouterProvider } from "react-router";
import { getRoutes } from "react-router-test-router";

const routes = await getRoutes();

export function renderRoute(path: string) {
  const router = createMemoryRouter(routes(), {
    initialEntries: [path],
    initialIndex: 0,
  });

  return render(<RouterProvider router={router} />);
}
```

**test.tsx**

```tsx
import { renderRoute } from "@test-utils/render";

it("should render", async () => {
  renderRoute("/my-path");

  expect(screen.getByText("Hello world!")).toBeInTheDocument();
});
```

## Modifying requests

Sometimes you want to test your loaders and rendering logic based on query parameter, headers, or anything else that might be in a request. You can use the `routerMiddleware` function to modify requests to your hearts content. Here's a simple example of adding a query parameter

```tsx
import { renderRoute } from "@test-utils/render";

it("should render", async () => {
  routerMiddleware.loader(({ request }) => {
    request.url.searchParams.set("my-param", "hello!");
  });

  routerMiddleware.action(({ request }) => {
    request.url.searchParams.set("another-param", "world!");
  });

  renderRoute("/my-path");

  expect(screen.getByText("Hello world!")).toBeInTheDocument();
});
```

The `routerMiddleware.loader` and `routerMiddleware.action` functions register callbacks for when your loaders and actions run, giving you a chance to modify the request. See typescript types for more info, I will update these docs very soon with more advance usage.
