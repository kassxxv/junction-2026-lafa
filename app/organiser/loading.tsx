export default function Loading() {
  return (
    <div className="flex-1 p-6" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-64 animate-pulse rounded-md bg-muted" />
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="mt-6 h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
