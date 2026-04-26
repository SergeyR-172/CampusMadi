import { createFileRoute, redirect } from "@tanstack/react-router";

import { meQueryOptions } from "#/entities/user";
import { AdminLayout } from "#/pages/admin";
import { queryClient } from "#/shared/api";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const user = await queryClient.ensureQueryData(meQueryOptions);
    if (!user) {
      throw redirect({ to: "/login" });
    }
    if (user.role !== "admin") {
      throw redirect({ to: "/" });
    }
  },
  component: AdminLayout,
});
