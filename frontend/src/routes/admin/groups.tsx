import { createFileRoute } from "@tanstack/react-router";

import { AdminGroups } from "#/pages/admin";

export const Route = createFileRoute("/admin/groups")({ component: AdminGroups });
