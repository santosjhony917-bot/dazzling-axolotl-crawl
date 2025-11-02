import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext"; // Importar AuthProvider
import React from "react";

const AppProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <AuthProvider> {/* Envolver children com AuthProvider */}
        {children}
      </AuthProvider>
      <Toaster />
    </ThemeProvider>
  );
};

export default AppProvider;