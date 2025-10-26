import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
// import AppProvider from "./providers/AppProvider"; // Removido

createRoot(document.getElementById("root")!).render(
  // <AppProvider> // Removido
    <App />
  // </AppProvider> // Removido
);