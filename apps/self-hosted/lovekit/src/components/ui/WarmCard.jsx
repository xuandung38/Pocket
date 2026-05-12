import clsx from "clsx";

export default function WarmCard({
  children,
  className,
  padded = true,
  as: Tag = "div",
  ...rest
}) {
  return (
    <Tag
      className={clsx(
        "rounded-3xl bg-base-100 border border-base-200",
        "shadow-[0_4px_24px_-8px_rgba(249,115,22,0.18)]",
        padded && "p-4",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
