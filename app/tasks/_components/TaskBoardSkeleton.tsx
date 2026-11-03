import Skeleton from "@/components/ui/skeleton";

export default function TaskBoardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading tasks"
      aria-busy="true"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[0.75fr_repeat(3,minmax(0,1fr))]"
    >
      <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed p-4">
        <Skeleton className="h-10 w-32" />
      </div>
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="min-h-48 rounded-xl border bg-muted/30 p-4"
        >
          <Skeleton className="mb-5 h-5 w-28" />
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
