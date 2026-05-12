import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
    {/* Global toast surface — kept here so it survives route changes */}
    <Toaster position="top-center" richColors closeButton />
  </BrowserRouter>
);
