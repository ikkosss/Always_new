import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { setupImmersiveMode } from "./immersive";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch((err) => console.error("SW registration failed", err));
  });
// Предупреждение при закрытии вкладки при несохраненных изменениях
window.addEventListener('beforeunload', (e) => {
  if (window.__unsaved) {
    e.preventDefault();
    e.returnValue = '';
  }
});

}

// Initialize immersive fullscreen helper
try { setupImmersiveMode(); } catch (e) { /* noop */ }

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);