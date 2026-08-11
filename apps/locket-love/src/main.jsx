import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import App from "./App";
import "./index.css";
import { useAuthStore } from "@/stores/use-auth-store";

// Sync hydrate before first render so RequireAuth sees correct isAuth state
// on the very first paint (avoids flash-redirect to /login on hard reload).
useAuthStore.getState().hydrate();

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
    {/* Global toast surface — kept here so it survives route changes */}
    <Toaster position="top-center" richColors closeButton />
  </BrowserRouter>
);
