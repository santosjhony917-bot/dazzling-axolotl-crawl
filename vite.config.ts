import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { spawn } from "child_process";
import fs from "fs";

let activeProcess: any = null;
let logBuffer = "";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    watch: {
      ignored: ["**/scratch/puppeteer_user_data/**", "**/scratch/puppeteer_user_data_*/**"]
    },
    proxy: {
      "/google-places": {
        target: "https://places.googleapis.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/google-places/, "")
      }
    }
  },
  plugins: [
    dyadComponentTagger(), 
    react(),
    {
      name: "local-collector-api",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith("/api/local-collector")) {
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            
            const urlPath = req.url.split("?")[0];
            
            if (urlPath === "/api/local-collector/status") {
              res.writeHead(200);
              res.end(JSON.stringify({
                running: activeProcess !== null,
                logs: logBuffer
              }));
              return;
            }
            
            if (urlPath === "/api/local-collector/run-maps" && req.method === "POST") {
              if (activeProcess) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Já existe uma coleta em execução." }));
                return;
              }
              
              logBuffer = "🚀 Iniciando Coleta do Google Maps (Fase 1)...\n";
              const proc = spawn("node", ["scratch/google_maps_scraper.cjs"], { shell: true });
              activeProcess = proc;
              
              proc.stdout.on("data", (data) => {
                logBuffer += data.toString("utf-8");
                if (logBuffer.length > 100000) logBuffer = logBuffer.slice(-100000);
              });
              
              proc.stderr.on("data", (data) => {
                logBuffer += `⚠️ [ERRO] ${data.toString("utf-8")}`;
              });
              
              proc.on("close", (code) => {
                logBuffer += `\n🏁 Coleta do Google Maps concluída com código de saída: ${code}\n`;
                activeProcess = null;
              });
              
              res.writeHead(200);
              res.end(JSON.stringify({ message: "Coleta do Google Maps iniciada." }));
              return;
            }
            
            if (urlPath === "/api/local-collector/run-social" && req.method === "POST") {
              if (activeProcess) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Já existe uma coleta em execução." }));
                return;
              }
              
              logBuffer = "🚀 Iniciando Enriquecimento de Redes Sociais (Fase 2)...\n";
              const proc = spawn("node", ["scratch/social_enricher.cjs"], { shell: true });
              activeProcess = proc;
              
              proc.stdout.on("data", (data) => {
                logBuffer += data.toString("utf-8");
                if (logBuffer.length > 100000) logBuffer = logBuffer.slice(-100000);
              });
              
              proc.stderr.on("data", (data) => {
                logBuffer += `⚠️ [ERRO] ${data.toString("utf-8")}`;
              });
              
              proc.on("close", (code) => {
                logBuffer += `\n🏁 Enriquecimento de Redes Sociais concluído com código de saída: ${code}\n`;
                activeProcess = null;
              });
              
              res.writeHead(200);
              res.end(JSON.stringify({ message: "Enriquecimento de Redes Sociais iniciado." }));
              return;
            }
            
            if (urlPath === "/api/local-collector/run-menu" && req.method === "POST") {
              if (activeProcess) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Já existe uma coleta em execução." }));
                return;
              }
              
              logBuffer = "🚀 Iniciando Coleta de Cardápios (Fase 2)...\n";
              const proc = spawn("node", ["scratch/menu_scraper.cjs"], { shell: true });
              activeProcess = proc;
              
              proc.stdout.on("data", (data) => {
                logBuffer += data.toString("utf-8");
                if (logBuffer.length > 100000) logBuffer = logBuffer.slice(-100000);
              });
              
              proc.stderr.on("data", (data) => {
                logBuffer += `⚠️ [ERRO] ${data.toString("utf-8")}`;
              });
              
              proc.on("close", (code) => {
                logBuffer += `\n🏁 Coleta de Cardápios concluída com código de saída: ${code}\n`;
                activeProcess = null;
              });
              
              res.writeHead(200);
              res.end(JSON.stringify({ message: "Coleta de Cardápios iniciada." }));
              return;
            }
            
            if (urlPath === "/api/local-collector/stop" && req.method === "POST") {
              if (!activeProcess) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Nenhuma coleta em execução." }));
                return;
              }
              
              activeProcess.kill();
              activeProcess = null;
              logBuffer += "\n🛑 Coleta interrompida pelo usuário.\n";
              
              res.writeHead(200);
              res.end(JSON.stringify({ message: "Processo interrompido." }));
              return;
            }
            
            if (urlPath === "/api/local-collector/clear-logs" && req.method === "POST") {
              logBuffer = "";
              res.writeHead(200);
              res.end(JSON.stringify({ message: "Logs limpos." }));
              return;
            }
            
            if (urlPath === "/api/local-collector/scraped-data" && req.method === "GET") {
              try {
                const filePath = path.resolve(__dirname, "./scraped_restaurants_google.json");
                if (fs.existsSync(filePath)) {
                  const data = fs.readFileSync(filePath, "utf-8");
                  res.writeHead(200);
                  res.end(data);
                } else {
                  res.writeHead(404);
                  res.end(JSON.stringify({ error: "Nenhum dado do Google Maps encontrado." }));
                }
              } catch (err: any) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
              }
              return;
            }
            
            if (urlPath === "/api/local-collector/save-scraped-data" && req.method === "POST") {
              try {
                let body = "";
                req.on("data", chunk => {
                  body += chunk.toString();
                });
                req.on("end", () => {
                  try {
                    const filePath = path.resolve(__dirname, "./scraped_restaurants_google.json");
                    const parsed = JSON.parse(body);
                    fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), "utf-8");
                    res.writeHead(200);
                    res.end(JSON.stringify({ message: "Dados atualizados com sucesso localmente!" }));
                  } catch (e: any) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: "JSON inválido ou falha ao gravar: " + e.message }));
                  }
                });
              } catch (err: any) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
              }
              return;
            }

            if (urlPath === "/api/local-collector/scraped-menus" && req.method === "GET") {
              try {
                const filePath = path.resolve(__dirname, "./scraped_menus.json");
                if (fs.existsSync(filePath)) {
                  const data = fs.readFileSync(filePath, "utf-8");
                  res.writeHead(200);
                  res.end(data);
                } else {
                  res.writeHead(404);
                  res.end(JSON.stringify({ error: "Nenhum dado de cardápio encontrado." }));
                }
              } catch (err: any) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
              }
              return;
            }
          }
          next();
        });
      }
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'utils-vendor': ['zod', 'react-hook-form', '@hookform/resolvers/zod']
        }
      }
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      }
    }
  }
}));