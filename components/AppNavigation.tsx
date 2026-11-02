"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppNavigation() {
  const pathname = usePathname();
  const isNewTaskPage = pathname === "/tasks/new";
  const isTasksPage =
    pathname === "/tasks" ||
    (pathname.startsWith("/tasks/") && !isNewTaskPage);

  return (
    <nav aria-label="Primary navigation" className="flex items-center gap-1">
      <Link
        href="/tasks"
        aria-current={isTasksPage ? "page" : undefined}
        className={navigationLinkClassName(isTasksPage)}
      >
        Tasks
      </Link>
      <Link
        href="/tasks/new"
        aria-current={isNewTaskPage ? "page" : undefined}
        className={navigationLinkClassName(isNewTaskPage)}
      >
        New Task
      </Link>
    </nav>
  );
}

function navigationLinkClassName(isActive: boolean) {
  return isActive
    ? "rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    : "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
}
