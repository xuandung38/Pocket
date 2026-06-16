import { normalizeOverlay } from "@/utils/caption-overlay-schema";
import DefaultOverlay from "./default-overlay";
import GradientOverlay from "./gradient-overlay";
import ImageIconOverlay from "./image-icon-overlay";
import SpecialSnowOverlay from "./special-snow-overlay";
import TimeOverlay from "./time-overlay";
import BatteryOverlay from "./battery-overlay";
import WeatherOverlay from "./weather-overlay";
import LocationOverlay from "./location-overlay";
import ReviewOverlay from "./review-overlay";
import HeartOverlay from "./heart-overlay";
import MusicOverlay from "./music-overlay";
import PollOverlay from "./poll-overlay";

// Display-only caption renderer shared by the compose preview and the feed.
// Dispatches on overlay.type to a per-type chip. Editing is owned by the host
// (the compose slot/Aa input) — this component never mutates state, it only
// paints. Pass a pre-normalized `overlay`, or a `raw` producer shape to fold.
//
// Unknown types fall through to the gradient default so unrecognised values
// from the API render visibly without crashing (forward-compat for future types).
export default function CaptionOverlay({ overlay, raw }) {
  const ov = overlay ?? normalizeOverlay(raw);

  switch (ov.type) {
    case "default":
      return <DefaultOverlay overlay={ov} />;
    case "image_icon":
    case "image_gif":
    // Locket Dio v2 image-based caption types (badge PNG, GIF, zodiac image).
    // star_sign carries both an image icon and "Mùa <cung>" text → the
    // image+text pill fits it too.
    case "caption_image":
    case "caption_gif":
    case "star_sign":
      return <ImageIconOverlay overlay={ov} />;
    case "special":
      return <SpecialSnowOverlay overlay={ov} />;
    case "custome":
    case "background":
    case "decorative":
    // Locket Dio v2 gradient text types (suggest=custom gradient, Dio templates).
    case "custom":
    case "template":
      return <GradientOverlay overlay={ov} />;
    case "time":
      return <TimeOverlay overlay={ov} />;
    case "battery":
      return <BatteryOverlay overlay={ov} />;
    case "weather":
      return <WeatherOverlay overlay={ov} />;
    case "location":
      return <LocationOverlay overlay={ov} />;
    case "review":
      return <ReviewOverlay overlay={ov} />;
    case "heart":
      return <HeartOverlay overlay={ov} />;
    case "music":
      return <MusicOverlay overlay={ov} />;
    case "poll":
      // Display-only render — vote buttons require feed context (moment id,
      // sendReaction, triggerReaction) that CaptionOverlay intentionally never
      // receives. Real callers (feed-screen, captured-send-preview) render
      // <PollOverlay> directly with the correct variant and callbacks.
      return <PollOverlay overlayData={ov} pollVariant="owner" pollCounts={{ isPoll: false }} />;
    default:
      return <GradientOverlay overlay={ov} />;
  }
}
