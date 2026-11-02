import Link from "next/link";
import { Suspense } from "react";
import AppNavigation from "./AppNavigation";

function NavigationFallback() {
  return (
    <nav aria-label="Primary navigation" className="flex items-center gap-1">
      <Link
        href="/tasks"
        className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Tasks
      </Link>
      <Link
        href="/tasks/new"
        className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        New Task
      </Link>
    </nav>
  );
}

export default function AppHeader() {
  return (
    <header className="shrink-0 border-b bg-card">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/tasks"
          className="text-lg font-semibold tracking-tight text-foreground transition-colors hover:text-primary"
        >
          Artefact
        </Link>
        <Suspense fallback={<NavigationFallback />}>
          <AppNavigation />
        </Suspense>
      </div>
    </header>
  );
}
