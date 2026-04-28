import { createFileRoute, redirect } from "@tanstack/react-router";

import { fetchCurrentUser } from "#/entities/user";

export const Route = createFileRoute("/$")({
  beforeLoad: async () => {
    const user = await fetchCurrentUser();
    if (!user) {
      throw redirect({ to: "/login" });
    }
    throw redirect({ to: user.role === "admin" ? "/admin" : "/" });
  },
});
