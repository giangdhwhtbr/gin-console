import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./app/App";
import { initTheme } from "./app/theme";

const root = document.getElementById("root");
if (root === null) throw new Error("#root element missing");

initTheme();
// REQ-UI-127: the app puts the page back where it was, once its data has shown
window.history.scrollRestoration = "manual";

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
