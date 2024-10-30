import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Style global pour le web
const style = document.createElement("style");
style.textContent = `
  * {
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
  }
  body {
    margin: 0;
    padding: 0;
    overscroll-behavior-y: contain;
  }
  input, button {
    -webkit-appearance: none;
    border-radius: 0;
  }
`;
document.head.appendChild(style);

const container = document.getElementById("root");
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
