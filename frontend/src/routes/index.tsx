import { createFileRoute, redirect } from "@tanstack/react-router";

import { meQueryOptions } from "#/entities/user";
import { HomePage } from "#/pages/home/index.ts";
import { queryClient } from "#/shared/api";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const user = await queryClient.ensureQueryData(meQueryOptions);
    if (!user) {
      throw redirect({ to: "/login" });
    }
    if (user.role === "admin") {
      throw redirect({ to: "/admin" });
    }
  },
  component: HomePage,
});
