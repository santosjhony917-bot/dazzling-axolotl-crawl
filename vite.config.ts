import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const terserOptions = {
  compress: {
    drop_console: true,
    drop_debugger: true,
  },
};

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [dyadComponentTagger(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          // Separa vendor libraries em chunks menores
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'utils-vendor': ['zod', 'react-hook-form', '@hookform/resolvers/zod']
        }
      }
    },
    // Otimizações para reduzir o tamanho do bundle
    terserOptions: terserOptions as any
  }
});