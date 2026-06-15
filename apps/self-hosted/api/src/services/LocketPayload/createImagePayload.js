const { createBaseImagePayload } = require("./createBasePayload");

const WEATHER_THEME = {
  clear:           { sf: "sun.max.fill",        colors: ["#F5B700", "#FF8C00"] },
  clearNight:      { sf: "moon.stars.fill",      colors: ["#1A2F5A", "#2C3E66"] },
  partlyCloudy:    { sf: "cloud.sun.fill",       colors: ["#5B9BD5", "#7DB0E2"] },
  mostlyClearNight:{ sf: "cloud.moon.fill",      colors: ["#2A3D6A", "#3D5480"] },
  cloudy:          { sf: "cloud.fill",           colors: ["#7790A6", "#AAAAAA"] },
  foggy:           { sf: "cloud.fog.fill",       colors: ["#8AA0AD", "#A9B8BF"] },
  rain:            { sf: "cloud.rain.fill",      colors: ["#4B7FA6", "#6BA3C9"] },
  drizzle:         { sf: "cloud.drizzle.fill",   colors: ["#5B8FA6", "#7AA8BE"] },
  sleet:           { sf: "cloud.sleet.fill",     colors: ["#6B90A8", "#8BAEC0"] },
  snow:            { sf: "cloud.snow.fill",      colors: ["#7BADC8", "#A8C7D8"] },
  thunderstorms:   { sf: "cloud.bolt.rain.fill", colors: ["#3D5A6E", "#566F82"] },
  hail:            { sf: "cloud.hail.fill",      colors: ["#607D8B", "#78909C"] },
};

// Đăng nền mặc định + caption
exports.imagePostPayloadDefault = ({ imageUrl, optionsData }) => {
  const { caption } = optionsData;
  const data = createBaseImagePayload({ imageUrl, optionsData });

  if (caption?.trim()) {
    data.caption = caption;
    data.overlays.push({
      data: {
        text: caption,
        text_color: "#FFFFFFE6",
        type: "standard",
        max_lines: 4,
        background: {
          colors: [],
          material_blur: "ultra_thin",
        },
      },
      alt_text: caption,
      overlay_id: "caption:standard",
      overlay_type: "caption",
    });
  }
  return { data };
};

exports.imagePostPayloadDecorative = ({ imageUrl, optionsData }) => {
  const { overlay_id, caption, text_color, color_top, color_bottom, icon } =
    optionsData;
  const data = createBaseImagePayload({ imageUrl, optionsData });

  data.overlays.push({
    data: {
      text: caption,
      text_color,
      type: "static_content",
      icon: { type: "emoji", data: icon },
      max_lines: {
        "@type": "type.googleapis.com/google.protobuf.Int64Value",
        value: "4",
      },
      background: {
        material_blur: "ultra_thin",
        colors: [color_top, color_bottom],
      },
    },
    alt_text: caption,
    overlay_id: `caption:${overlay_id}`,
    overlay_type: "caption",
  });

  return { data };
};

exports.imagePostPayloadCustome = ({ imageUrl, optionsData }) => {
  const { caption, text_color, color_top, color_bottom, icon } = optionsData;
  const data = createBaseImagePayload({ imageUrl, optionsData });

  data.overlays.push({
    data: {
      text: caption,
      text_color,
      type: "static_content",
      icon: { type: "emoji", data: icon },
      max_lines: {
        "@type": "type.googleapis.com/google.protobuf.Int64Value",
        value: "4",
      },
      background: {
        material_blur: "ultra_thin",
        colors: [color_top, color_bottom],
      },
    },
    alt_text: caption,
    overlay_id: "caption:miss_you",
    overlay_type: "caption",
  });

  return { data };
};

exports.imagePostPayloadIcon = ({ imageUrl, optionsData }) => {
  const { caption, text_color, color_top, color_bottom, icon } = optionsData;
  const data = createBaseImagePayload({ imageUrl, optionsData });

  data.overlays.push({
    data: {
      text: caption,
      text_color,
      type: "static_content",
      icon: { type: "image", data: icon },
      max_lines: {
        "@type": "type.googleapis.com/google.protobuf.Int64Value",
        value: "4",
      },
      background: {
        material_blur: "ultra_thin",
        colors: [],
      },
    },
    alt_text: caption,
    overlay_id: "caption:ootd",
    overlay_type: "caption",
  });

  return { data };
};

exports.imagePostPayloadWeather = ({ imageUrl, optionsData }) => {
  const { text, caption, text_color, icon, background, payload } = optionsData;
  const data = createBaseImagePayload({ imageUrl, optionsData });

  const altText = text || caption || "";
  // Use frontend-provided values; fall back to WEATHER_THEME if missing
  const wkCondition = payload?.wk_condition || "cloudy";
  const theme = WEATHER_THEME[wkCondition] || WEATHER_THEME.cloudy;
  const resolvedIcon = icon?.data ? icon : { type: "sf_symbol", color: text_color || "#FFFFFF", data: theme.sf };
  const resolvedColors = background?.colors?.length ? background.colors : theme.colors;

  data.overlays.push({
    data: {
      max_lines: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "1" },
      payload: {
        temperature: payload?.temperature ?? 0,
        cloud_cover: payload?.cloud_cover ?? 0,
        is_daylight: payload?.is_daylight ?? true,
        wk_condition: wkCondition,
      },
      text: altText,
      background: { colors: resolvedColors },
      type: "weather",
      icon: resolvedIcon,
      text_color: text_color || "#FFFFFF",
    },
    overlay_id: "caption:weather",
    alt_text: altText,
    overlay_type: "caption",
  });

  return { data };
};

const INT64 = (v) => ({ "@type": "type.googleapis.com/google.protobuf.Int64Value", value: String(v) });

exports.imagePostPayloadTime = ({ imageUrl, optionsData }) => {
  const { caption, text_color } = optionsData;
  const data = createBaseImagePayload({ imageUrl, optionsData });

  data.overlays.push({
    data: {
      max_lines: INT64(1),
      text: caption,
      background: { colors: ["#3B3B3B", "#555555"] },
      type: "static_content",
      icon: { type: "sf_symbol", color: text_color || "#FFFFFF", data: "clock.fill" },
      text_color: text_color || "#FFFFFF",
    },
    overlay_id: "caption:time",
    alt_text: caption,
    overlay_type: "caption",
  });

  return { data };
};

exports.imagePostPayloadBattery = ({ imageUrl, optionsData }) => {
  const { caption, icon, text_color } = optionsData;
  const data = createBaseImagePayload({ imageUrl, optionsData });

  const isCharging = !!icon;
  const level = parseInt(caption) || 0;
  const sfIcon = isCharging ? "bolt.fill"
    : level > 60 ? "battery.100"
    : level > 30 ? "battery.50"
    : "battery.25";
  const bgColors = isCharging
    ? ["#2E7D32", "#388E3C"]
    : level <= 20 ? ["#C62828", "#D32F2F"]
    : ["#546E7A", "#607D8B"];

  data.overlays.push({
    data: {
      max_lines: INT64(1),
      text: `${caption}%`,
      background: { colors: bgColors },
      type: "static_content",
      icon: { type: "sf_symbol", color: text_color || "#FFFFFF", data: sfIcon },
      text_color: text_color || "#FFFFFF",
    },
    overlay_id: "caption:battery",
    alt_text: `${caption}%`,
    overlay_type: "caption",
  });

  return { data };
};

exports.imagePostPayloadSteps = ({ imageUrl, optionsData }) => {
  const { caption, text_color } = optionsData;
  const data = createBaseImagePayload({ imageUrl, optionsData });

  data.overlays.push({
    data: {
      max_lines: INT64(1),
      text: caption,
      background: { colors: ["#2E7D32", "#388E3C"] },
      type: "static_content",
      icon: { type: "sf_symbol", color: text_color || "#FFFFFF", data: "figure.walk" },
      text_color: text_color || "#FFFFFF",
    },
    overlay_id: "caption:steps",
    alt_text: caption,
    overlay_type: "caption",
  });

  return { data };
};

exports.imagePostPayloadSpecial = ({ imageUrl, optionsData }) => {
  const { caption, text_color, color_top, color_bottom, icon } = optionsData;
  const data = createBaseImagePayload({ imageUrl, optionsData });

  data.overlays.push({
    data: {
      text: caption,
      text_color: text_color || "#FFFFFF",
      type: "static_content",
      icon: { type: "emoji", data: icon || "✨" },
      max_lines: INT64(4),
      background: {
        material_blur: "ultra_thin",
        colors: [color_top || "#7B1FA2", color_bottom || "#9C27B0"],
      },
    },
    alt_text: caption,
    overlay_id: "caption:special",
    overlay_type: "caption",
  });

  return { data };
};

// Poll overlay: two-emoji question posted on a moment.
// Stores left_emoji + right_emoji in data.payload so the read path can surface them.
exports.imagePostPayloadPoll = ({ imageUrl, optionsData }) => {
  const { caption, text_color, background, payload } = optionsData;
  const data = createBaseImagePayload({ imageUrl, optionsData });

  const left_emoji = payload?.left_emoji || "👍";
  const right_emoji = payload?.right_emoji || "👎";
  const altText = caption || "";

  data.overlays.push({
    data: {
      text: altText,
      text_color: text_color || "#FFFFFF",
      type: "poll",
      max_lines: 4,
      background: {
        material_blur: "ultra_thin",
        colors: background?.colors?.length ? background.colors : [],
      },
      payload: { left_emoji, right_emoji },
    },
    alt_text: altText,
    overlay_id: "caption:poll",
    overlay_type: "caption",
  });

  return { data };
};

exports.imagePostPayloadBackground = ({ imageUrl, optionsData }) => {
  const { caption, text_color, color_top, color_bottom } = optionsData;
  const data = createBaseImagePayload({ imageUrl, optionsData });

  if (caption?.trim()) {
    data.overlays.push({
      data: {
        text: caption,
        text_color: text_color || "#FFFFFFE6",
        type: "standard",
        max_lines: 4,
        background: {
          colors: color_top ? [color_top, color_bottom || color_top] : [],
          material_blur: "ultra_thin",
        },
      },
      alt_text: caption,
      overlay_id: "caption:standard",
      overlay_type: "caption",
    });
  }

  return { data };
};