import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import MinimalFooter from "./components/Footer";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <MinimalFooter />
  </StrictMode>,
);
