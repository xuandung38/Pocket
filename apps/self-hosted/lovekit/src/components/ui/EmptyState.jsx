import clsx from "clsx";

export default function EmptyState({
  icon: Icon,
  title,
  subtitle,
  action,
  className,
}) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center text-center px-6 py-12",
        className,
      )}
    >
      <div className="relative mb-5">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 blur-2xl opacity-70 rounded-full bg-gradient-to-br from-primary/30 via-secondary/30 to-accent/20"
        />
        <div className="size-20 rounded-full bg-base-200 flex items-center justify-center text-primary">
          {Icon ? <Icon className="size-9" strokeWidth={1.75} /> : null}
        </div>
      </div>

      {title && (
        <h3 className="text-lg font-semibold text-base-content mb-1">
          {title}
        </h3>
      )}

      {subtitle && (
        <p className="text-sm text-base-content/60 max-w-xs leading-relaxed">
          {subtitle}
        </p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
