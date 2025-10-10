// Import webrtc-adapter FIRST to polyfill WebRTC APIs across browsers
import "webrtc-adapter";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./i18n";
import App from "./App";
import MinimalFooter from "./components/Footer";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="flex flex-col min-h-screen">
      <App />
      <MinimalFooter />
    </div>
  </StrictMode>
);
