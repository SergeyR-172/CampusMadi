import { createFileRoute, redirect } from "@tanstack/react-router";

import { fetchCurrentUser } from "#/entities/user";
import { LoginPage } from "#/pages/login";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const user = await fetchCurrentUser();
    if (user) {
      throw redirect({ to: user.role === "admin" ? "/admin" : "/" });
    }
  },
  component: LoginPage,
});
