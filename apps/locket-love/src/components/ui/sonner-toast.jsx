// sonner-toast.jsx
// Thin wrappers over `sonner` toast variants. Keeping them centralized lets
// non-React modules (axios interceptors) import these without pulling in the
// raw sonner dependency at every call site.

import { toast } from "sonner";

export function SonnerError(title, description) {
  return toast.error(title, description ? { description } : undefined);
}

export function SonnerSuccess(title, description) {
  return toast.success(title, description ? { description } : undefined);
}

export function SonnerInfo(title, description) {
  return toast.info(title, description ? { description } : undefined);
}

export function SonnerWarning(title, description) {
  return toast.warning(title, description ? { description } : undefined);
}
