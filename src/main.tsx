import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./ErrorBoundary";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  document.body.innerHTML = `
    <main style="font-family: system-ui, sans-serif; padding: 24px; color: #e5e7eb; background: #020617; min-height: 100vh;">
      <h1 style="margin: 0 0 8px;">Application failed to start</h1>
      <p style="margin: 0; color: #94a3b8;">Missing #root mount element in index.html</p>
    </main>
  `;
} else {
  window.addEventListener("error", (event) => {
    console.error("[window.error]", event.error ?? event.message);
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("[window.unhandledrejection]", event.reason);
  });

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
