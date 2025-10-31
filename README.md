# React Router Test Routes

A small library to use when you need `react-router` routes in your tests.

## Motivation

When testing React Router applications in framework mode, developers can often face challenges when testing Routes or components that rely on hooks like `useLoaderData()` or `useNavigation` because they are expecting your component to be server rendered and also re-hydrated on the client browser.

The [official documentation](https://reactrouter.com/start/framework/testing) from react-router recommends that you use `createRoutesStub` with the action and loader info for your route. There are several problems with that approach. First, taking that approach would require you to do that for every new route that you create which can be a tedious process for a simple component test. Second, that is only simulating client-side hydration, so if you have nested routes and need to call all of the loaders down the tree, then this approach will require a lot of manual code. That's where this library comes in.

This library takes care of that manual tedious process of creating a "test router" for you, and instead it simulates the same behavior that `react-router` does when it build it's router component (by looking at `routes.tsx` file, calling the loaders on all the nested routes for a particular request). Additionally, if you wanted to add a request header or query parameters to a specific route for testing, you'd have to manually call your loader or action function with a specific request object, which works great for unit testing, but I often find myself wanting to write an integration test to know that the parts work together rather than in isolation.

This library addresses these limitations by providing a thin abstraction to enable developers to modify requests while maintaining consistency with production routing behavior. Rather than relying on mocks (as some articles might suggest), it leverages React Router's existing methods to create a testing environment that closely mirrors the production router implementation.

## Usage

**Basic Usage**
The simplest way to use this library.

Update vite.config.ts

```ts
import testRoutes from "react-router-test-routes/vite";

export default defineConfig({
  plugins: [
    testRoutes(), // <- add plugin
  ],
});
```

```tsx
import { navigateTo } from "react-router-test-routes";

it("should render", async () => {
  // ⬇️ this will call all of your loaders along the deeply nested path and add the custom header to the request
  await navigateTo("/my/deeply/nested/path");

  expect(screen.getByText("Hello world!")).toBeInTheDocument();
});
```

**Adding headers**
Add headers to the navigation request.

```tsx
import { navigateTo } from "react-router-test-routes";

it("should render", async () => {
  await navigateTo("/my/deeply/nested/path", {
    headers: {
      "my-auth-header": "fakeTokenForTesting",
    },
  });

  expect(screen.getByText("Hello world!")).toBeInTheDocument();
});
```

**Middleware**
Injecting headers into all requests

```tsx
import { navigateTo, routerMiddleware } from "react-router-test-routes";

beforeAll(() => {
  // add an auth header to all requests when calling navigateTo
  routerMiddleware.use(({ request, route }) => {
    // only append headers if its not in there, otherwise we might append it multiple times
    if (!request.headers.has("my-auth-header")) {
      request.headers.append("my-auth-header", "someUserWhoIsAwesomeAuthToken");
    }
  });
});

it("should render", async () => {
  await navigateTo("/my-path");

  expect(screen.getByText("Hello world!")).toBeInTheDocument();
});
```

## routerMiddleware

### routerMiddleware.use(callback)

**callback** - a callback that takes in arg of type `{request: Request, route: {routeId: string, path: string} }`. It will be called for all loaders down the nested path when calling `navigateTo`. That means if you have a route like `/deeply/nested/route` the callback will be called for the following routes: `root, and deeply.nested.route`. Note that it's always called for the root loader since root is always matched for all requests.

### routerMiddleware.removeAllListeners()

Removes all the middleware. Useful when you have different test cases that might add different middleware. For example, in my `setup.ts` file I like to have

```ts
import { navigateTo, routerMiddleware } from "react-router-test-routes";

beforeEach(() => routerMiddleware.removeAllListeners());
```
