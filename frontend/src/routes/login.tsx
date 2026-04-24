import { createFileRoute, redirect } from "@tanstack/react-router";

import { useAuthStore } from "#/entities/user";
import { LoginPage } from "#/pages/login";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    const { user } = useAuthStore.getState();
    if (user) {
      throw redirect({ to: user.role === "admin" ? "/admin" : "/" });
    }
  },
  component: LoginPage,
});
