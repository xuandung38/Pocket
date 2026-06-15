// download-moment.js
// Save a moment's media to the device. Fetches the remote asset as a Blob then
// triggers an anchor download. Returns true on success, false on failure (e.g.
// CORS-blocked) so callers can surface an honest toast.
//
// CORS-less CDN URLs (Locket/Firebase) are routed through the API proxy so the
// fetch succeeds; if even that fails we fall back to opening the URL in a tab.

import { proxyImageUrl } from "./moment-media";

export async function downloadMoment(url, filename = `locket_${Date.now()}.jpg`) {
  if (!url) return false;
  try {
    const res = await fetch(proxyImageUrl(url), { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoke on the next tick so the click has consumed the URL.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    return true;
  } catch (err) {
    console.warn("[download-moment] fetch/download failed, opening in tab:", err);
    try {
      window.open(url, "_blank", "noopener");
    } catch {
      /* noop */
    }
    return false;
  }
}
