// use-reaction-store.js
// Global reaction state — drives GlobalReactionEffect burst animation.
// `triggerReaction` accepts a single emoji string or array; invalid/non-string
// inputs are filtered out. If nothing valid remains, state is not mutated
// (prevents spurious empty bursts). Each valid call gets a unique id so the
// effect component can key on it and restart the animation.
import { create } from "zustand";

// crypto.randomUUID is only available on HTTPS contexts. Provide a lightweight
// fallback so development over plain HTTP (or jest/vitest jsdom) still works.
function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Math.random-based fallback — not crypto-secure, but fine for animation IDs.
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export const useReactionStore = create((set) => ({
  reaction: null,

  triggerReaction: (input) => {
    const arr = Array.isArray(input) ? input : [input];
    const valid = arr.filter((e) => typeof e === "string");
    // Do not mutate state if nothing usable arrived (number, null, empty).
    if (!valid.length) return;
    set({ reaction: { id: generateId(), reactions: valid } });
  },
}));
