import clsx from "clsx";
import { User } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";

export default function ProfileScreen({ className, onLogout }) {
  return (
    <section
      role="tabpanel"
      aria-label="Profile"
      className={clsx("h-full w-full overflow-y-auto", className)}
    >
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon={User}
          title="Profile coming soon"
          subtitle="Streak, friends, settings, and logout land in Phase 06."
          action={
            onLogout ? (
              <button
                type="button"
                onClick={onLogout}
                className="btn btn-ghost btn-sm rounded-full text-base-content/60"
              >
                Log out
              </button>
            ) : null
          }
        />
      </div>
    </section>
  );
}
