export function TerritoryInfoSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-6 w-3/4 rounded-md bg-muted animate-pulse" />
          <div className="h-4 w-1/2 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
      </div>

      {/* Badges */}
      <div className="flex gap-2">
        <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
        <div className="h-6 w-24 rounded-full bg-muted animate-pulse" />
        <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
      </div>

      {/* Info rows */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-5 w-5 rounded bg-muted animate-pulse flex-shrink-0" />
            <div className="h-4 rounded-md bg-muted animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <div className="h-10 flex-1 rounded-xl bg-muted animate-pulse" />
        <div className="h-10 w-24 rounded-xl bg-muted animate-pulse" />
      </div>
    </div>
  );
}
