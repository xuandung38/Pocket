// Global app state shared across screens — wired by App.jsx via <AppProvider>.
// Shape per dev-10 task spec:
//   { selectedFriend, selectedMoment, modals: { optionMoment, friendsSheet, ... } }
//
// Other phases (feed, send, chat, reactions) read & mutate this state through
// the `useAppContext()` hook — no zustand dependency to keep the shell light.
import { createContext, useCallback, useContext, useMemo, useState } from "react";

const AppContext = createContext(null);

// Default modal flags — extend by adding more keys; reducer accepts any string key.
const INITIAL_MODALS = {
  optionMoment: false,   // long-press moment menu (delete / report / save)
  friendsSheet: false,   // audience picker for posting a moment
  emojiStudio: false,    // emoji reaction picker
  cropImage: false,      // post-capture crop editor
  profileEdit: false,    // edit-profile bottom sheet
};

export function AppProvider({ children }) {
  // Currently focused friend (e.g. tapped avatar in friends row)
  const [selectedFriend, setSelectedFriend] = useState(null);
  // Currently focused moment (feed item under long-press / detail view)
  const [selectedMoment, setSelectedMoment] = useState(null);
  // Modal/sheet open flags — one boolean per overlay
  const [modals, setModals] = useState(INITIAL_MODALS);

  // Open one modal by key. Idempotent — no-op if already open.
  const openModal = useCallback((key) => {
    setModals((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  }, []);

  // Close one modal by key.
  const closeModal = useCallback((key) => {
    setModals((prev) => (prev[key] ? { ...prev, [key]: false } : prev));
  }, []);

  // Close every modal — useful when navigating tabs.
  const closeAllModals = useCallback(() => {
    setModals(INITIAL_MODALS);
  }, []);

  const value = useMemo(
    () => ({
      selectedFriend,
      setSelectedFriend,
      selectedMoment,
      setSelectedMoment,
      modals,
      openModal,
      closeModal,
      closeAllModals,
    }),
    [selectedFriend, selectedMoment, modals, openModal, closeModal, closeAllModals],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Hook — returns context or throws if called outside <AppProvider>.
// Falling back to an empty object hides bugs; explicit error is better DX.
export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext must be used within <AppProvider>");
  }
  return ctx;
}
