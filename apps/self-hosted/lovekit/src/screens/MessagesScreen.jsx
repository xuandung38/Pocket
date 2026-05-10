import clsx from "clsx";
import { MessageCircle } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";

export default function MessagesScreen({ className }) {
  return (
    <section
      role="tabpanel"
      aria-label="Chats"
      className={clsx("h-full w-full overflow-y-auto", className)}
    >
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon={MessageCircle}
          title="No conversations yet"
          subtitle="Conversation list and chat detail land in Phase 05."
        />
      </div>
    </section>
  );
}
