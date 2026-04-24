import { createFileRoute } from "@tanstack/react-router";

import { AdminSchedule } from "#/pages/admin";

export const Route = createFileRoute("/admin/schedule")({ component: AdminSchedule });
