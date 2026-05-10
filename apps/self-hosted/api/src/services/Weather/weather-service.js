const { integrations } = require("../../config/app.config");

const WEATHER_API_BASE = "https://api.weatherapi.com/v1/current.json";

// Maps WeatherAPI condition codes to WeatherKit-style condition strings
const mapWkCondition = (code, isDay) => {
  if (code === 1000) return isDay ? "clear" : "clearNight";
  if ([1003].includes(code)) return isDay ? "partlyCloudy" : "mostlyClearNight";
  if ([1006, 1009].includes(code)) return "cloudy";
  if ([1030, 1135, 1147].includes(code)) return "foggy";
  if ([1063, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(code)) return "rain";
  if ([1069, 1204, 1207, 1249, 1252].includes(code)) return "sleet";
  if ([1066, 1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258].includes(code)) return "snow";
  if ([1087, 1273, 1276, 1279, 1282].includes(code)) return "thunderstorms";
  if ([1072, 1150, 1153, 1168, 1171, 1198, 1201].includes(code)) return "drizzle";
  if ([1237, 1261, 1264].includes(code)) return "hail";
  return "cloudy";
};

const getCurrentWeather = async (lat, lon) => {
  const apiKey = integrations.weatherApiKey;
  if (!apiKey) throw new Error("WEATHER_API_KEY chưa được cấu hình");

  const url = `${WEATHER_API_BASE}?key=${apiKey}&q=${lat},${lon}&aqi=no`;
  const res = await fetch(url);

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const msg = errBody?.error?.message || `WeatherAPI error ${res.status}`;
    throw new Error(msg);
  }

  const { location, current } = await res.json();

  return {
    location,
    current: {
      temp_c: current.temp_c,
      temp_c_rounded: Math.round(current.temp_c),
      condition: current.condition.text,
      icon: current.condition.icon,
      temperature: current.feelslike_f,
      cloud_cover: current.cloud / 100,
      is_daylight: current.is_day === 1,
      wk_condition: mapWkCondition(current.condition.code, current.is_day === 1),
    },
  };
};

module.exports = { getCurrentWeather };
