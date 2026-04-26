import { createFileRoute, redirect } from "@tanstack/react-router";

import { meQueryOptions } from "#/entities/user";
import { LoginPage } from "#/pages/login";
import { queryClient } from "#/shared/api";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const user = await queryClient.ensureQueryData(meQueryOptions);
    if (user) {
      throw redirect({ to: user.role === "admin" ? "/admin" : "/" });
    }
  },
  component: LoginPage,
});
