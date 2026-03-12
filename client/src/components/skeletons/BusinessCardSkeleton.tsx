export function BusinessCardSkeleton() {
  return (
    <div className="p-4 rounded-xl border border-border space-y-3 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-5 w-2/3 rounded-md bg-muted animate-pulse" />
          <div className="h-3 w-1/3 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
      </div>
      <div className="h-4 w-full rounded-md bg-muted animate-pulse" />
      <div className="h-4 w-4/5 rounded-md bg-muted animate-pulse" />
      <div className="flex gap-2 pt-1">
        <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
        <div className="h-6 w-24 rounded-full bg-muted animate-pulse" />
      </div>
    </div>
  );
}

export function BusinessCardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <BusinessCardSkeleton key={i} />
      ))}
    </div>
  );
}
