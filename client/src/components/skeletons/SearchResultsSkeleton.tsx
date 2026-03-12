export function SearchResultsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2 animate-fade-in">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg">
          <div className="h-5 w-5 rounded bg-muted animate-pulse flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded-md bg-muted animate-pulse" />
            <div className="h-3 w-1/2 rounded-md bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
