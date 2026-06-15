// share-targets.js
// Best-effort share routing for the moment share sheet.
//
// HONEST LIMITATION: web apps cannot attach an image directly into Instagram
// Stories / Snapchat / TikTok — those need native SDKs. From the browser we can
// only (a) open the app via its URL scheme and (b) hand the user the image via
// the OS share sheet or a download. So branded targets attempt the app scheme
// and fall back to the native Web Share API (which lists those apps on mobile).

// App URL schemes. Opening these does nothing if the app isn't installed (esp.
// desktop), hence the timeout-based fallback in openShareTarget.
const APP_SCHEMES = {
  instagram: "instagram://app",
  snapchat: "snapchat://",
  tiktok: "snssdk1233://",
};

// Native Web Share. Prefers sharing the image file when the platform allows it,
// else shares the link. Returns true if the share sheet opened.
export async function webShare({ title = "Locket", text = "", url, file } = {}) {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  try {
    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title, text, files: [file] });
    } else {
      await navigator.share({ title, text, url });
    }
    return true;
  } catch (err) {
    // AbortError = user dismissed the sheet; treat as handled (no fallback).
    if (err?.name === "AbortError") return true;
    console.warn("[share-targets] webShare failed:", err);
    return false;
  }
}

// Copy a link to the clipboard. Returns true on success.
export async function copyLink(url) {
  if (!url) return false;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch (err) {
    console.warn("[share-targets] copyLink failed:", err);
    return false;
  }
}

// Route a share intent for one target. Returns true if the app scheme or Web
// Share handled it; falls back to copy-link otherwise.
//   target: "instagram" | "snapchat" | "tiktok" | "messages" | "other"
export async function openShareTarget(target, { url, file, caption = "" } = {}) {
  const shareText = caption || "";

  if (target === "messages") {
    // sms: is a real, broadly-supported scheme.
    const body = encodeURIComponent(`${shareText} ${url ?? ""}`.trim());
    window.location.href = `sms:?body=${body}`;
    return true;
  }

  if (target === "other") {
    const ok = await webShare({ text: shareText, url, file });
    return ok || (await copyLink(url));
  }

  const scheme = APP_SCHEMES[target];
  if (!scheme) {
    return (await webShare({ text: shareText, url, file })) || (await copyLink(url));
  }

  // Best-effort app open with a fallback if nothing handled the scheme.
  return await new Promise((resolve) => {
    let handled = false;
    const onHide = () => {
      // The app launched (tab backgrounded) — consider it handled.
      handled = true;
    };
    document.addEventListener("visibilitychange", onHide, { once: true });

    try {
      window.location.href = scheme;
    } catch {
      /* scheme navigation can throw on some browsers */
    }

    setTimeout(async () => {
      document.removeEventListener("visibilitychange", onHide);
      if (handled) {
        resolve(true);
        return;
      }
      // App not installed / scheme ignored → native share, then copy link.
      const ok = await webShare({ text: shareText, url, file });
      resolve(ok || (await copyLink(url)));
    }, 1200);
  });
}
