const { integrations } = require("../../config/app.config");

// ─── WeatherAPI.com provider ──────────────────────────────────────────────────

const WEATHER_API_BASE = "https://api.weatherapi.com/v1/current.json";

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

const getFromWeatherApi = async (lat, lon, apiKey) => {
  const res = await fetch(`${WEATHER_API_BASE}?key=${apiKey}&q=${lat},${lon}&aqi=no`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `WeatherAPI error ${res.status}`);
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

// ─── Open-Meteo provider (free, no API key) ───────────────────────────────────

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/reverse";

// WMO code → WeatherKit condition string
const mapWmoToWkCondition = (code, isDay) => {
  if (code === 0) return isDay ? "clear" : "clearNight";
  if ([1, 2].includes(code)) return isDay ? "partlyCloudy" : "mostlyClearNight";
  if (code === 3) return "cloudy";
  if ([45, 48].includes(code)) return "foggy";
  if ([51, 53, 55, 56, 57].includes(code)) return "drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "thunderstorms";
  return "cloudy";
};

// WMO code → WeatherAPI CDN icon path (day/night variant)
const mapWmoToIcon = (code, isDay) => {
  const d = isDay ? "day" : "night";
  if (code === 0) return `//cdn.weatherapi.com/weather/64x64/${d}/113.png`;
  if ([1, 2].includes(code)) return `//cdn.weatherapi.com/weather/64x64/${d}/116.png`;
  if (code === 3) return `//cdn.weatherapi.com/weather/64x64/${d}/122.png`;
  if ([45, 48].includes(code)) return `//cdn.weatherapi.com/weather/64x64/${d}/143.png`;
  if ([51, 53, 55].includes(code)) return `//cdn.weatherapi.com/weather/64x64/${d}/263.png`;
  if ([61, 63].includes(code)) return `//cdn.weatherapi.com/weather/64x64/${d}/293.png`;
  if ([65, 66, 67].includes(code)) return `//cdn.weatherapi.com/weather/64x64/${d}/302.png`;
  if ([80, 81, 82].includes(code)) return `//cdn.weatherapi.com/weather/64x64/${d}/296.png`;
  if ([71, 73, 75, 77].includes(code)) return `//cdn.weatherapi.com/weather/64x64/${d}/338.png`;
  if ([95, 96, 99].includes(code)) return `//cdn.weatherapi.com/weather/64x64/${d}/386.png`;
  return `//cdn.weatherapi.com/weather/64x64/${d}/116.png`;
};

// WMO code → human-readable condition text
const WMO_TEXT = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Icy fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  56: "Light freezing drizzle", 57: "Freezing drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  66: "Light freezing rain", 67: "Freezing rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Light showers", 81: "Showers", 82: "Heavy showers",
  85: "Light snow showers", 86: "Snow showers",
  95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with heavy hail",
};

const getFromOpenMeteo = async (lat, lon) => {
  const params = new URLSearchParams({
    latitude: lat, longitude: lon,
    current: "temperature_2m,apparent_temperature,is_day,weather_code,cloud_cover",
    timezone: "auto",
    forecast_days: "1",
  });

  const [weatherRes, geoRes] = await Promise.allSettled([
    fetch(`${OPEN_METEO_BASE}?${params}`),
    fetch(`${NOMINATIM_BASE}?lat=${lat}&lon=${lon}&format=json`, {
      headers: { "User-Agent": "LocketDio/1.0" },
    }),
  ]);

  if (weatherRes.status === "rejected" || !weatherRes.value.ok) {
    throw new Error("Open-Meteo request failed");
  }

  const weather = await weatherRes.value.json();
  const c = weather.current;
  const isDay = c.is_day === 1;
  const code = c.weather_code;

  let locationName = "Unknown";
  let region = "";
  let country = "";
  if (geoRes.status === "fulfilled" && geoRes.value.ok) {
    const geo = await geoRes.value.json();
    locationName = geo.address?.city || geo.address?.town || geo.address?.village || geo.address?.county || "Unknown";
    region = geo.address?.state || "";
    country = geo.address?.country || "";
  }

  return {
    location: {
      name: locationName,
      region,
      country,
      lat: weather.latitude,
      lon: weather.longitude,
      tz_id: weather.timezone,
      localtime_epoch: Math.floor(Date.now() / 1000),
      localtime: new Date().toLocaleString("sv-SE", { timeZone: weather.timezone }).replace("T", " ").slice(0, 16),
    },
    current: {
      temp_c: c.temperature_2m,
      temp_c_rounded: Math.round(c.temperature_2m),
      condition: WMO_TEXT[code] || "Unknown",
      icon: mapWmoToIcon(code, isDay),
      temperature: c.apparent_temperature * 9 / 5 + 32,
      cloud_cover: c.cloud_cover / 100,
      is_daylight: isDay,
      wk_condition: mapWmoToWkCondition(code, isDay),
    },
  };
};

// ─── Public API ───────────────────────────────────────────────────────────────

const getCurrentWeather = async (lat, lon) => {
  const apiKey = integrations.weatherApiKey;
  if (apiKey) return getFromWeatherApi(lat, lon, apiKey);
  return getFromOpenMeteo(lat, lon);
};

module.exports = { getCurrentWeather };
