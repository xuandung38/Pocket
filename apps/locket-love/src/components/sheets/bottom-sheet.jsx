import { useEffect, useState } from "react";

// Reusable bottom sheet wrapper — backdrop + slide-up panel.
// Plays a symmetric slide-down on close so the sheet exits before unmounting.
const EXIT_DURATION = 340; // ms — slightly longer than the 320ms keyframe to avoid early unmount snap

export default function BottomSheet({ open, onClose, title, children }) {
  // `mounted` keeps the panel in the tree during the exit animation
  const [mounted, setMounted] = useState(open);
  // `closing` triggers the slide-down animation
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      // Begin exit animation, unmount after it finishes
      setClosing(true);
      const t = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, EXIT_DURATION);
      return () => clearTimeout(t);
    }
  }, [open, mounted]);

  if (!mounted) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 40,
        overflow: "hidden",
      }}
    >
      <div
        className={closing ? "animate-fade-out" : "animate-fade-in"}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      />
      <div className={`sheet-panel ${closing ? "animate-slide-down" : "animate-slide-up"}`}>
        <div className="sheet-handle" />
        {title && (
          <div
            style={{
              textAlign: "center",
              fontSize: 16,
              fontWeight: 600,
              padding: "14px 16px",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            {title}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
