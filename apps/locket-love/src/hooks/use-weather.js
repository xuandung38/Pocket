// use-weather.js
// On-demand weather hook — call fetchWeather() to trigger geolocation lookup
// then POST to the weather API. State stays null until the user requests it.
// Geolocation denied / timeout sets error without crashing.
import { useState, useCallback } from "react";
import { getWeatherByCoords } from "@/services/weather-services";

/**
 * @returns {{ weather: object|null, loading: boolean, error: string|null, fetchWeather: () => void }}
 */
export function useWeather() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWeather = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }
    // Reset state before each new fetch so stale data doesn't re-trigger callers
    setLoading(true);
    setWeather(null);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const data = await getWeatherByCoords(
            pos.coords.latitude,
            pos.coords.longitude,
          );
          setWeather(data);
        } catch (err) {
          setError(err?.message || "Weather fetch failed");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError(err?.message || "Geolocation denied");
        setLoading(false);
      },
      { timeout: 10_000 },
    );
  }, []);

  return { weather, loading, error, fetchWeather };
}
