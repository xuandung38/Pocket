export default function Modal({ open, onClose, title, children, actions }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-base-100 rounded-2xl p-6 w-80 shadow-xl z-10">
        {title && <h3 className="text-lg font-semibold mb-3">{title}</h3>}
        <div className="text-sm text-base-content/70">{children}</div>
        {actions && <div className="flex justify-end gap-2 mt-4">{actions}</div>}
      </div>
    </div>
  );
}
