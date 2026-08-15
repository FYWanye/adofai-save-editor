import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/design-tokens.css";
import "./styles/global.css";
import { isMac } from "./utils/platform";

if (isMac) document.body.classList.add("is-mac");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
