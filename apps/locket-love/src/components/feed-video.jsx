import { useEffect, useRef } from "react";

// Locket-style feed video: autoplays (muted) only while in view, pauses when
// scrolled away. Muted + playsInline are required so iOS Safari allows the
// autoplay; without an in-view play() call the feed only showed a static
// poster frame and never played.
export default function FeedVideo({ src, poster, style }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // play() rejects if the tab is backgrounded / not yet allowed — ignore.
          el.play?.().catch(() => {});
        } else {
          el.pause?.();
        }
      },
      { threshold: 0.6 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [src]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      style={style}
      muted
      loop
      playsInline
      preload="metadata"
    />
  );
}
