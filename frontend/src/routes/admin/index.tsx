import { createFileRoute } from "@tanstack/react-router";

import { AdminDashboard } from "#/pages/admin";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });
