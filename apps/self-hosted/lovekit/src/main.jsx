import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./app.css";

function App() {
  return (
    <main className="min-h-dvh bg-base-100 text-base-content flex items-center justify-center p-6">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold text-primary">Lovekit</h1>
        <p className="text-base-content/70">
          Warm shell ready — phase 01 scaffold.
        </p>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
