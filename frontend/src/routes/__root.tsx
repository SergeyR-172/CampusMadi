import appCss from "@app/styles/global.css?url";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";

import { useAuthStore } from "#/entities/user";
import { authApi } from "#/shared/api";

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
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    authApi
      .me()
      .then((user) => {
        setUser(user);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [setUser, setLoading]);

  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
