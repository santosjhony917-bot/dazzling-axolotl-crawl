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
      ignored: ["**/scratch/**"]
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
            
            const urlParts = req.url.split("?");
            const urlPath = urlParts[0];
            const urlParams = new URLSearchParams(urlParts[1] || "");
            
            const stateFilePath = path.join(__dirname, "scratch", "google_maps_scraper_state.json");

            if (urlPath === "/api/local-collector/status") {
              res.writeHead(200);
              res.end(JSON.stringify({
                running: activeProcess !== null,
                logs: logBuffer,
                hasSavedState: fs.existsSync(stateFilePath)
              }));
              return;
            }
            
            if (urlPath === "/api/local-collector/run-maps" && req.method === "POST") {
              if (activeProcess) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Já existe uma coleta em execução." }));
                return;
              }

              const hasState = fs.existsSync(stateFilePath);
              const fresh = urlParams.get("fresh") === "true" || !hasState;
              let freshLog = "";
              if (fresh) {
                // Deleta arquivo de estado
                if (fs.existsSync(stateFilePath)) {
                  try {
                    fs.unlinkSync(stateFilePath);
                    freshLog += "🧹 Estado anterior do robô descartado.\n";
                  } catch (unlinkErr: any) {
                    console.error("Erro ao limpar arquivo de estado do robô:", unlinkErr);
                    freshLog += `⚠️ [Aviso] Não foi possível limpar o estado anterior: ${unlinkErr.message}\n`;
                  }
                }

                // Deleta arquivo de resultados anteriores do maps
                const outputFilePath = path.join(__dirname, "scraped_restaurants_google.json");
                if (fs.existsSync(outputFilePath)) {
                  try {
                    fs.unlinkSync(outputFilePath);
                    freshLog += "🗑️ Arquivo de resultados anteriores (scraped_restaurants_google.json) removido.\n";
                  } catch (outputErr: any) {
                    console.error("Erro ao limpar arquivo de resultados do robô:", outputErr);
                    freshLog += `⚠️ [Aviso] Não foi possível limpar os resultados anteriores: ${outputErr.message}\n`;
                  }
                }

                // Deleta arquivo de cardápios anteriores
                const menusFilePath = path.join(__dirname, "scraped_menus.json");
                if (fs.existsSync(menusFilePath)) {
                  try {
                    fs.unlinkSync(menusFilePath);
                    freshLog += "🗑️ Arquivo de cardápios anteriores (scraped_menus.json) removido.\n";
                  } catch (menusErr: any) {
                    console.error("Erro ao limpar arquivo de cardápios do robô:", menusErr);
                  }
                }
              }
              
              logBuffer = freshLog + "🚀 Iniciando Coleta do Google Maps (Fase 1)...\n";
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

            if (urlPath === "/api/local-collector/run-logos" && req.method === "POST") {
              if (activeProcess) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Já existe uma coleta em execução." }));
                return;
              }
              
              logBuffer = "🚀 Iniciando Coleta de Logos (Fase 4)...\n";
              const proc = spawn("node", ["scratch/logo_scraper.cjs"], { shell: true });
              activeProcess = proc;
              
              proc.stdout.on("data", (data) => {
                logBuffer += data.toString("utf-8");
                if (logBuffer.length > 100000) logBuffer = logBuffer.slice(-100000);
              });
              
              proc.stderr.on("data", (data) => {
                logBuffer += `⚠️ [ERRO] ${data.toString("utf-8")}`;
              });
              
              proc.on("close", (code) => {
                logBuffer += `\n🏁 Coleta de Logos concluída com código de saída: ${code}\n`;
                activeProcess = null;
              });
              
              res.writeHead(200);
              res.end(JSON.stringify({ message: "Coleta de Logos iniciada." }));
              return;
            }
            
            if (urlPath === "/api/local-collector/re-search-social" && req.method === "POST") {
              if (activeProcess) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Já existe uma coleta em execução." }));
                return;
              }
              
              const restaurantId = urlParams.get("restaurantId");
              if (!restaurantId) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "ID do restaurante não fornecido." }));
                return;
              }

              logBuffer = `🚀 Iniciando rebusca de Instagram para o restaurante ID ${restaurantId}...\n`;
              const proc = spawn("node", ["scratch/social_enricher.cjs", "--single", "--id", restaurantId, "--field", "instagram"], { shell: true });
              activeProcess = proc;
              
              let resultJsonStr = "";
              proc.stdout.on("data", (data) => {
                const text = data.toString("utf-8");
                logBuffer += text;
                if (logBuffer.length > 100000) logBuffer = logBuffer.slice(-100000);
                
                const match = text.match(/RESULT:(.+)/);
                if (match) {
                  resultJsonStr = match[1].trim();
                }
              });
              
              proc.stderr.on("data", (data) => {
                logBuffer += `⚠️ [ERRO] ${data.toString("utf-8")}`;
              });
              
              proc.on("close", (code) => {
                logBuffer += `\n🏁 Rebusca concluída com código de saída: ${code}\n`;
                activeProcess = null;
                
                try {
                  const result = resultJsonStr ? JSON.parse(resultJsonStr) : { success: false };
                  res.writeHead(200);
                  res.end(JSON.stringify(result));
                } catch (err) {
                  res.writeHead(500);
                  res.end(JSON.stringify({ success: false, error: "Erro ao processar resultado do robô." }));
                }
              });
              return;
            }

            if (urlPath === "/api/local-collector/re-search-menu" && req.method === "POST") {
              if (activeProcess) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Já existe uma coleta em execução." }));
                return;
              }
              
              const restaurantId = urlParams.get("restaurantId");
              if (!restaurantId) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "ID do restaurante não fornecido." }));
                return;
              }

              logBuffer = `🚀 Iniciando rebusca de Cardápio para o restaurante ID ${restaurantId}...\n`;
              const proc = spawn("node", ["scratch/social_enricher.cjs", "--single", "--id", restaurantId, "--field", "menu"], { shell: true });
              activeProcess = proc;
              
              let resultJsonStr = "";
              proc.stdout.on("data", (data) => {
                const text = data.toString("utf-8");
                logBuffer += text;
                if (logBuffer.length > 100000) logBuffer = logBuffer.slice(-100000);
                
                const match = text.match(/RESULT:(.+)/);
                if (match) {
                  resultJsonStr = match[1].trim();
                }
              });
              
              proc.stderr.on("data", (data) => {
                logBuffer += `⚠️ [ERRO] ${data.toString("utf-8")}`;
              });
              
              proc.on("close", (code) => {
                logBuffer += `\n🏁 Rebusca concluída com código de saída: ${code}\n`;
                activeProcess = null;
                
                try {
                  const result = resultJsonStr ? JSON.parse(resultJsonStr) : { success: false };
                  res.writeHead(200);
                  res.end(JSON.stringify(result));
                } catch (err) {
                  res.writeHead(500);
                  res.end(JSON.stringify({ success: false, error: "Erro ao processar resultado do robô." }));
                }
              });
              return;
            }

            if (urlPath === "/api/local-collector/re-scrape-menu" && req.method === "POST") {
              if (activeProcess) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Já existe uma coleta em execução." }));
                return;
              }
              
              const restaurantId = urlParams.get("restaurantId");
              if (!restaurantId) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "ID do restaurante não fornecido." }));
                return;
              }

              logBuffer = `🚀 Iniciando extração de Cardápio (Fase 3) para o restaurante ID ${restaurantId}...\n`;
              const proc = spawn("node", ["scratch/menu_scraper.cjs", "--single", "--id", restaurantId], { shell: true });
              activeProcess = proc;
              
              let resultJsonStr = "";
              proc.stdout.on("data", (data) => {
                const text = data.toString("utf-8");
                logBuffer += text;
                if (logBuffer.length > 100000) logBuffer = logBuffer.slice(-100000);
                
                const match = text.match(/RESULT:(.+)/);
                if (match) {
                  resultJsonStr = match[1].trim();
                }
              });
              
              proc.stderr.on("data", (data) => {
                logBuffer += `⚠️ [ERRO] ${data.toString("utf-8")}`;
              });
              
              proc.on("close", (code) => {
                logBuffer += `\n🏁 Coleta de Cardápio concluída com código de saída: ${code}\n`;
                activeProcess = null;
                
                try {
                  const result = resultJsonStr ? JSON.parse(resultJsonStr) : { success: false };
                  res.writeHead(200);
                  res.end(JSON.stringify(result));
                } catch (err) {
                  res.writeHead(500);
                  res.end(JSON.stringify({ success: false, error: "Erro ao processar resultado do robô." }));
                }
              });
              return;
            }

            if (urlPath === "/api/local-collector/re-scrape-logo" && req.method === "POST") {
              if (activeProcess) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Já existe uma coleta em execução." }));
                return;
              }
              
              const restaurantId = urlParams.get("restaurantId");
              if (!restaurantId) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "ID do restaurante não fornecido." }));
                return;
              }

              logBuffer = `🚀 Iniciando extração de Logo (Fase 4) para o restaurante ID ${restaurantId}...\n`;
              const proc = spawn("node", ["scratch/logo_scraper.cjs", "--single", "--id", restaurantId], { shell: true });
              activeProcess = proc;
              
              let resultJsonStr = "";
              proc.stdout.on("data", (data) => {
                const text = data.toString("utf-8");
                logBuffer += text;
                if (logBuffer.length > 100000) logBuffer = logBuffer.slice(-100000);
                
                const match = text.match(/RESULT:(.+)/);
                if (match) {
                  resultJsonStr = match[1].trim();
                }
              });
              
              proc.stderr.on("data", (data) => {
                logBuffer += `⚠️ [ERRO] ${data.toString("utf-8")}`;
              });
              
              proc.on("close", (code) => {
                logBuffer += `\n🏁 Coleta de Logo concluída com código de saída: ${code}\n`;
                activeProcess = null;
                
                try {
                  const result = resultJsonStr ? JSON.parse(resultJsonStr) : { success: false };
                  res.writeHead(200);
                  res.end(JSON.stringify(result));
                } catch (err) {
                  res.writeHead(500);
                  res.end(JSON.stringify({ success: false, error: "Erro ao processar resultado do robô." }));
                }
              });
              return;
            }

            if (urlPath === "/api/local-collector/re-search-hours" && req.method === "POST") {
              if (activeProcess) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Já existe uma coleta em execução." }));
                return;
              }
              
              const restaurantId = urlParams.get("restaurantId");
              if (!restaurantId) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "ID do restaurante não fornecido." }));
                return;
              }

              logBuffer = `🚀 Iniciando rebusca de Horários para o restaurante ID ${restaurantId}...\n`;
              const proc = spawn("node", ["scratch/social_enricher.cjs", "--single", "--id", restaurantId, "--field", "hours"], { shell: true });
              activeProcess = proc;
              
              let resultJsonStr = "";
              proc.stdout.on("data", (data) => {
                const text = data.toString("utf-8");
                logBuffer += text;
                if (logBuffer.length > 100000) logBuffer = logBuffer.slice(-100000);
                
                const match = text.match(/RESULT:(.+)/);
                if (match) {
                  resultJsonStr = match[1].trim();
                }
              });
              
              proc.stderr.on("data", (data) => {
                logBuffer += `⚠️ [ERRO] ${data.toString("utf-8")}`;
              });
              
              proc.on("close", (code) => {
                logBuffer += `\n🏁 Rebusca concluída com código de saída: ${code}\n`;
                activeProcess = null;
                
                try {
                  const result = resultJsonStr ? JSON.parse(resultJsonStr) : { success: false };
                  res.writeHead(200);
                  res.end(JSON.stringify(result));
                } catch (err) {
                  res.writeHead(500);
                  res.end(JSON.stringify({ success: false, error: "Erro ao processar resultado do robô." }));
                }
              });
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
            }

            if (urlPath === "/api/local-collector/download-and-upload" && req.method === "POST") {
              const url = urlParams.get("url");
              const storagePath = urlParams.get("path");
              
              if (!url || !storagePath) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "URL ou path não fornecido." }));
                return;
              }
              
              const proc = spawn("node", ["scratch/download_upload_helper.cjs", url, storagePath], { shell: true });
              let resultJsonStr = "";
              
              proc.stdout.on("data", (data) => {
                const text = data.toString("utf-8");
                const match = text.match(/RESULT:(.+)/);
                if (match) {
                  resultJsonStr = match[1].trim();
                }
              });
              
              proc.on("close", (code) => {
                try {
                  const result = resultJsonStr ? JSON.parse(resultJsonStr) : { success: false, error: "Sem output" };
                  res.writeHead(200);
                  res.end(JSON.stringify(result));
                } catch (err) {
                  res.writeHead(500);
                  res.end(JSON.stringify({ success: false, error: "Falha ao processar helper." }));
                }
              });
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