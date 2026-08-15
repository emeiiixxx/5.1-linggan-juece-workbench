import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { registerImageCache } from "./utils/registerImageCache";
import { installImageTransitions } from "./utils/installImageTransitions";
import "./index.css";

installImageTransitions();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerImageCache();
