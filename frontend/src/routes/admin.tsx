import { createFileRoute, redirect } from "@tanstack/react-router";

import { fetchCurrentUser } from "#/entities/user";
import { AdminLayout } from "#/pages/admin";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const user = await fetchCurrentUser();
    if (!user) {
      throw redirect({ to: "/login" });
    }
    if (user.role !== "admin") {
      throw redirect({ to: "/" });
    }
  },
  component: AdminLayout,
});
