import { QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";

import { queryClient } from "#/shared/api";

export const Route = createRootRoute({
  component: RootComponent,
});

// eslint-disable-next-line @typescript-eslint/naming-convention
function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
