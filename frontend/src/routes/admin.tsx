import { createFileRoute, redirect } from "@tanstack/react-router";

import { useAuthStore } from "#/entities/user";
import { AdminLayout } from "#/pages/admin";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    const { user, isLoading } = useAuthStore.getState();
    if (isLoading) return;
    if (!user) {
      throw redirect({ to: "/login" });
    }
    if (user.role !== "admin") {
      throw redirect({ to: "/" });
    }
  },
  component: AdminLayout,
});
