import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import { runMigrations } from "./core/migrations";
import { initServiceWorker } from "./core/serviceWorker";

// Upgrade/stamp persisted-data schema before any hook reads localStorage.
runMigrations();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

initServiceWorker();
