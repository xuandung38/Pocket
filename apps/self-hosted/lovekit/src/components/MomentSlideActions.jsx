import { MoreVertical, Laugh } from "lucide-react";
import EmojiReactionBar from "@/components/EmojiReactionBar";
import { useApp } from "@/context/AppContext";

/**
 * Per-moment action overlay buttons:
 *  - Top-right ⋮ opens OptionMoment (download/delete)
 *  - Bottom row hosts EmojiReactionBar + Laugh button (opens EmojiStudio)
 *
 * Extracted from FeedScreen.MomentSlide to keep that file under the
 * project's 300-LOC ceiling. Stops click bubbling so feed swipe nav
 * doesn't fire when tapping the buttons.
 */
export default function MomentSlideActions({ momentId, ownerUid }) {
  // Safe-access guards: if AppProvider is missing (e.g. rendered outside
  // the authed shell), buttons simply become inert instead of crashing.
  const app = useApp();
  const { setOptionModalOpen } = app?.navigation ?? {};
  const { setSelectedMomentId, setSelectedFriendUid, setShowEmojiPicker } =
    app?.post ?? {};

  const openOptions = (e) => {
    e.stopPropagation();
    setSelectedMomentId?.(momentId);
    setSelectedFriendUid?.(ownerUid);
    setOptionModalOpen?.(true);
  };

  const openEmojiPicker = (e) => {
    e.stopPropagation();
    setSelectedMomentId?.(momentId);
    setShowEmojiPicker?.(true);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Tùy chọn khoảnh khắc"
        onClick={openOptions}
        className="absolute top-3 right-3 btn btn-circle btn-sm bg-base-100/60 backdrop-blur-sm z-10"
        style={{ marginTop: "env(safe-area-inset-top)" }}
      >
        <MoreVertical size={16} />
      </button>

      <div
        className="absolute left-0 right-0 bottom-0 px-4 flex items-center gap-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        <div className="flex-1">
          <EmojiReactionBar
            momentId={momentId}
            size="lg"
            className="bg-white/15 backdrop-blur-md"
          />
        </div>
        <button
          type="button"
          aria-label="Chọn emoji"
          onClick={openEmojiPicker}
          className="btn btn-circle btn-sm bg-base-100/60 backdrop-blur-sm flex-shrink-0"
        >
          <Laugh size={18} />
        </button>
      </div>
    </>
  );
}
