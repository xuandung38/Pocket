// use-location.js
// Location lookup via Nominatim (OpenStreetMap, free, no API key):
//   - fetchCurrent(): geolocation → reverse geocode → the current address.
//   - search(query): forward geocode, biased to a viewbox around the current
//     coords so nearby places rank first (lets the user pick a neighbouring
//     place instead of only the exact GPS address).
// Reverse results are cached per rounded lat/lon; search is debounced to respect
// Nominatim's ~1 req/s fair-use policy.
import { useState, useCallback, useRef } from "react";

const REVERSE = "https://nominatim.openstreetmap.org/reverse";
const SEARCH = "https://nominatim.openstreetmap.org/search";
const reverseCache = new Map();

const roundCoord = (v) => Math.round(v * 10) / 10;

export function useLocation() {
  const [current, setCurrent] = useState(null); // { label } current address
  const [options, setOptions] = useState([]); // search results [{ label }]
  const [loading, setLoading] = useState(false); // geolocate + reverse
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const coordsRef = useRef(null);
  const debounceRef = useRef(null);

  const fetchCurrent = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        coordsRef.current = { lat, lon };
        const key = `${roundCoord(lat)},${roundCoord(lon)}`;
        if (reverseCache.has(key)) {
          setCurrent({ label: reverseCache.get(key) });
          setLoading(false);
          return;
        }
        try {
          const res = await fetch(`${REVERSE}?format=json&lat=${lat}&lon=${lon}`);
          if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
          const data = await res.json();
          const label = data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
          reverseCache.set(key, label);
          setCurrent({ label });
        } catch (err) {
          setError(err?.message || "Reverse geocode failed");
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

  const search = useCallback((query) => {
    const q = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q) {
      setOptions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        let url = `${SEARCH}?format=json&q=${encodeURIComponent(q)}&limit=6&addressdetails=0`;
        // Bias toward the user's area (viewbox ≈ ±0.1°, not bounded — soft bias).
        if (coordsRef.current) {
          const { lat, lon } = coordsRef.current;
          url += `&viewbox=${lon - 0.1},${lat + 0.1},${lon + 0.1},${lat - 0.1}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
        const data = await res.json();
        setOptions((data || []).map((d) => ({ label: d.display_name })));
      } catch (err) {
        setError(err?.message || "Location search failed");
        setOptions([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  return { current, options, loading, searching, error, fetchCurrent, search };
}
