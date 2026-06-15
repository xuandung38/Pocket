// music-services.js
// Client wrapper for the self-hosted music-link resolver. The browser never
// hits Spotify/Apple directly (avoids CORS) — it POSTs the share link to the
// backend, which parses oEmbed/OG tags and returns { title, artist, image,
// platform }.
import { api } from "@/libs";
import { CONFIG } from "@/config";

/**
 * @param {string} url       Spotify / Apple Music share link
 * @param {string} platform  "spotify" | "apple" (backend auto-detects if blank)
 * @returns {Promise<{title:string,artist:string,image:string,platform:string}|null>}
 */
export async function getInfoMusicByUrl(url, platform = "") {
  const res = await api.post(`${CONFIG.api.baseUrl}/api/getInfoMusic`, { url, platform });
  return res.data?.data ?? null;
}
