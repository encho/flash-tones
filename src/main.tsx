import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { MicProvider } from "./MicContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <MicProvider>
        <App />
      </MicProvider>
    </BrowserRouter>
  </StrictMode>,
);
