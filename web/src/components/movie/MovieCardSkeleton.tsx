import { Skeleton } from "@/components/ui/skeleton";

export function MovieCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Skeleton className="aspect-[2/3] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/4" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function MovieGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  );
}
