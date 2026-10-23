import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./app/App";
import { initTheme } from "./app/theme";

const root = document.getElementById("root");
if (root === null) throw new Error("#root element missing");

initTheme();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
