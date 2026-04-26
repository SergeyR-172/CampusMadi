import appCss from "@app/styles/global.css?url";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";

import { queryClient } from "#/shared/api";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CampusMadi" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
});

// eslint-disable-next-line @typescript-eslint/naming-convention
function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <html lang="ru" suppressHydrationWarning>
        <head>
          <HeadContent />
        </head>
        <body className="min-h-screen font-sans antialiased">
          <Outlet />
          <Scripts />
        </body>
      </html>
    </QueryClientProvider>
  );
}
