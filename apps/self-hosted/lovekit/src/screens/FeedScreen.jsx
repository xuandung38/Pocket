import clsx from "clsx";
import { Sparkles } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";

export default function FeedScreen({ className }) {
  return (
    <section
      role="tabpanel"
      aria-label="Feed"
      className={clsx("h-full w-full overflow-y-auto", className)}
    >
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon={Sparkles}
          title="Your feed is warming up"
          subtitle="Moments from friends will appear here in Phase 04."
        />
      </div>
    </section>
  );
}
