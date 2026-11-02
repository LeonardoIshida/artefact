import Skeleton from "@/components/ui/skeleton";

export default function TaskFormSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading task form"
      aria-busy="true"
      className="mx-auto w-full max-w-4xl space-y-4"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="space-y-4 rounded-xl border p-5">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="flex justify-end gap-3">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  );
}
