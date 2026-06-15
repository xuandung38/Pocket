// weather-services.js
// Fetches current weather from the self-hosted weatherV2 endpoint.
// Returns the `current` sub-object with temp_c_rounded, icon (protocol-relative),
// condition, etc. Network errors propagate so the caller can show user feedback.
import { api } from "@/libs";
import { CONFIG } from "@/config";

/**
 * POST {lat, lon} to the self-hosted weather API and return the `current` object.
 * @param {number} lat  - WGS-84 latitude
 * @param {number} lon  - WGS-84 longitude
 * @returns {Promise<object|null>} current weather data, or null if absent in response
 */
export async function getWeatherByCoords(lat, lon) {
  const res = await api.post(`${CONFIG.api.baseUrl}/api/weatherV2`, { lat, lon });
  return res.data?.data?.current ?? null;
}
