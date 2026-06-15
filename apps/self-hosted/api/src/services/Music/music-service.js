// music-service.js
// Resolves a Spotify / Apple Music share link into lightweight caption metadata
// ({ title, artist, image, platform }) for the "music" caption overlay.
//
// Spotify exposes a public oEmbed endpoint (no OAuth) which gives title +
// thumbnail. Apple Music has no stable oEmbed, so we best-effort scrape the
// page's Open Graph tags. Artist is optional — oEmbed/OG rarely separates it.

const SPOTIFY_OEMBED = "https://open.spotify.com/oembed";

const ogTag = (html, prop) => {
  const m = html.match(
    new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']*)["']`, "i"),
  );
  return m ? m[1] : "";
};

const fetchSpotify = async (url) => {
  const res = await fetch(`${SPOTIFY_OEMBED}?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error(`Spotify oEmbed ${res.status}`);
  const d = await res.json();
  // oEmbed `title` is the track name; some include "Track · Artist" — split best-effort.
  let title = d.title || "";
  let artist = "";
  const sep = title.split(/\s+[·–—-]\s+/);
  if (sep.length > 1) {
    title = sep[0].trim();
    artist = sep.slice(1).join(" ").trim();
  }
  return { title, artist, image: d.thumbnail_url || "", platform: "spotify" };
};

const fetchAppleMusic = async (url) => {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; LocketLove/1.0)" } });
  if (!res.ok) throw new Error(`Apple Music ${res.status}`);
  const html = await res.text();
  return {
    title: ogTag(html, "title"),
    artist: ogTag(html, "music:musician") || "",
    image: ogTag(html, "image"),
    platform: "apple",
  };
};

/**
 * @param {string} url      share link
 * @param {string} platform "spotify" | "apple" (auto-detected from the URL if omitted)
 * @returns {Promise<{title:string,artist:string,image:string,platform:string}>}
 */
const getMusicInfo = async (url, platform) => {
  if (!url || typeof url !== "string") throw new Error("Thiếu hoặc sai url");
  const p = (platform || "").toLowerCase();
  if (p === "apple" || url.includes("music.apple.com") || url.includes("itunes.apple.com")) {
    return fetchAppleMusic(url);
  }
  return fetchSpotify(url);
};

module.exports = { getMusicInfo };
