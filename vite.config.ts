import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/google-places": {
        target: "https://places.googleapis.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/google-places/, "")
      }
    }
  },
  plugins: [dyadComponentTagger(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
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
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs em produção
        drop_debugger: true, // Remove debuggers em produção
      }
    }
  }
}));