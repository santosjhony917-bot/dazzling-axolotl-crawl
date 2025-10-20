import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { UserProvider } from "./contexts/UserContext.tsx";

createRoot(document.getElementById("root")!).render(
  <UserProvider>
    <App />
  </UserProvider>
);