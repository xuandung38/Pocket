// poll-overlay.jsx
// Renders a 2-option emoji poll chip.
//
// pollVariant="friend" (default) — two tappable buttons; fires onVote(emoji)
//   which the host (feed-screen) connects to sendReactMoment + triggerReaction.
//   No network call here: overlay stays pure-render.
// pollVariant="owner" — display-only; shows vote counts when isPoll is true.
//
// No DaisyUI classes or getCaptionStyle helper — locket-love uses inline style
// + caption-chip class for consistency with all other overlay chips.

const DEFAULT_LEFT = "👍";
const DEFAULT_RIGHT = "👎";

export default function PollOverlay({
  overlayData,
  pollCounts,
  pollVariant = "friend",
  momentId,   // forwarded by host; unused in render but accepted so callers
              // can pass it once without conditional spreading
  onVote = null,
}) {
  const payload = overlayData?.payload ?? {};
  const leftEmoji  = pollCounts?.leftEmoji  || payload.left_emoji  || DEFAULT_LEFT;
  const rightEmoji = pollCounts?.rightEmoji || payload.right_emoji || DEFAULT_RIGHT;

  const isOwner   = pollVariant === "owner";
  const showCounts = isOwner && Boolean(pollCounts?.isPoll);
  const leftCount  = pollCounts?.leftCount  ?? 0;
  const rightCount = pollCounts?.rightCount ?? 0;

  // Gradient from overlayData.background.colors if present (same pattern as
  // default-overlay.jsx); fall back to a neutral translucent pill.
  const colors = overlayData?.color_top
    ? [overlayData.color_top, overlayData.color_bottom || overlayData.color_top]
    : null;
  const shellBg = colors
    ? `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`
    : "rgba(255,255,255,0.22)";

  const optionStyle = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 20,
    padding: "6px 16px",
    background: "rgba(255,255,255,0.15)",
    backdropFilter: "blur(8px)",
    border: "none",
    cursor: isOwner ? "default" : "pointer",
    fontSize: 22,
    fontWeight: 700,
    color: "#fff",
    minWidth: 64,
  };

  const countStyle = {
    fontSize: 15,
    fontWeight: 800,
    color: "#685AF7",
    textShadow: "-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff",
    transform: "rotate(-6deg)",
    display: "inline-block",
    tabularNums: "tabular-nums",
  };

  return (
    <div
      className="caption-chip"
      style={{
        background: shellBg,
        flexDirection: "column",
        gap: 6,
        padding: "10px 12px",
        maxWidth: "85%",
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {isOwner ? (
          <>
            <div
              style={optionStyle}
              aria-label={`${leftEmoji} ${leftCount} votes`}
            >
              <span>{leftEmoji}</span>
              {showCounts && <span style={countStyle}>{leftCount}</span>}
            </div>
            <div
              style={optionStyle}
              aria-label={`${rightEmoji} ${rightCount} votes`}
            >
              <span>{rightEmoji}</span>
              {showCounts && <span style={countStyle}>{rightCount}</span>}
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              aria-label={leftEmoji}
              style={optionStyle}
              onClick={() => onVote?.(leftEmoji)}
            >
              {leftEmoji}
            </button>
            <button
              type="button"
              aria-label={rightEmoji}
              style={optionStyle}
              onClick={() => onVote?.(rightEmoji)}
            >
              {rightEmoji}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
