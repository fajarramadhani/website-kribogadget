import { ProductGridSkeleton, Skeleton } from "@/components/ui/states";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mt-6 h-32 w-full" />
      <div className="mt-8">
        <ProductGridSkeleton />
      </div>
    </div>
  );
}
