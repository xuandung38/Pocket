import clsx from "clsx";
import { Camera } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";

export default function CameraScreen({ className }) {
  return (
    <section
      role="tabpanel"
      aria-label="Capture"
      className={clsx("h-full w-full overflow-y-auto", className)}
    >
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon={Camera}
          title="Capture coming soon"
          subtitle="Live preview, capture, and post will land in Phase 03."
        />
      </div>
    </section>
  );
}
