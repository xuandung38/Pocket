// use-battery.js
// Best-effort Battery Status API hook. Desktop Chrome/Firefox/Safari have
// deprecated this API, so `supported` will be false on most desktops — callers
// should hide battery UI when supported is false rather than showing 0%.
import { useState, useEffect } from "react";

/**
 * @returns {{ level: number|null, charging: boolean, supported: boolean }}
 *   level  — battery percentage 0-100, or null before API resolves
 *   charging — true when plugged in
 *   supported — false when navigator.getBattery is absent (hide the button)
 */
export function useBattery() {
  const [level, setLevel] = useState(null);
  const [charging, setCharging] = useState(false);

  // Evaluated once per render but stable for the page lifetime — navigator
  // never gains/loses getBattery while the tab is open.
  const supported =
    typeof navigator !== "undefined" &&
    typeof navigator.getBattery === "function";

  useEffect(() => {
    if (!supported) return;

    let bat = null;

    const handleLevelChange = () => {
      if (bat) setLevel(Math.round(bat.level * 100));
    };
    const handleChargingChange = () => {
      if (bat) setCharging(bat.charging);
    };

    navigator
      .getBattery()
      .then((battery) => {
        bat = battery;
        setLevel(Math.round(battery.level * 100));
        setCharging(battery.charging);
        battery.addEventListener("levelchange", handleLevelChange);
        battery.addEventListener("chargingchange", handleChargingChange);
      })
      .catch(() => {
        // Permission denied or API unavailable at runtime — leave level null
      });

    return () => {
      if (bat) {
        bat.removeEventListener("levelchange", handleLevelChange);
        bat.removeEventListener("chargingchange", handleChargingChange);
      }
    };
  }, []); // Runs once — battery object is stable for the page lifetime

  return { level, charging, supported };
}
