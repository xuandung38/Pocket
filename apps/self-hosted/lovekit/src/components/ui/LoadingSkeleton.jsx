import clsx from "clsx";

const base = "animate-pulse bg-base-200 rounded-2xl";

function Card({ className }) {
  return (
    <div className={clsx(base, "h-72 w-full rounded-3xl", className)} />
  );
}

function Line({ className }) {
  return <div className={clsx(base, "h-3 w-full rounded-full", className)} />;
}

function Avatar({ className }) {
  return (
    <div className={clsx(base, "size-12 rounded-full shrink-0", className)} />
  );
}

function Feed({ count = 3, className }) {
  return (
    <div className={clsx("flex flex-col gap-6", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Avatar />
            <div className="flex-1 space-y-2">
              <Line className="w-1/3 h-3" />
              <Line className="w-1/4 h-2 opacity-60" />
            </div>
          </div>
          <Card />
        </div>
      ))}
    </div>
  );
}

export default function LoadingSkeleton({
  variant = "card",
  count,
  className,
}) {
  switch (variant) {
    case "line":
      return <Line className={className} />;
    case "avatar":
      return <Avatar className={className} />;
    case "feed":
      return <Feed count={count} className={className} />;
    case "card":
    default:
      return <Card className={className} />;
  }
}
