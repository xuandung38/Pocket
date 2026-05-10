const ALLOWED_SCHEME = /^https?:/i;

export const downloadByLink = (url, filename) => {
  try {
    const parsed = new URL(url, window.location.origin);
    if (!ALLOWED_SCHEME.test(parsed.protocol)) return;
  } catch {
    return;
  }
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
};
