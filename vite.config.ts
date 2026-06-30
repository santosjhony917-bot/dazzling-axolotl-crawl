import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { spawn } from "child_process";
import fs from "fs";

let activeProcess: any = null;
let validationProcess: any = null;
let logBuffer = "";
const extensionTelemetryBuffer: any[] = [];
const EXTENSION_TELEMETRY_LIMIT = 500;
const extensionCommandQueue: any[] = [];
const extensionCommandResults: any[] = [];
const EXTENSION_COMMAND_LIMIT = 100;
const EXTENSION_COMMAND_RESULT_LIMIT = 200;
const extensionMonitorDir = path.join(__dirname, ".tmp", "extension-monitor");
const extensionSnapshotDir = path.join(extensionMonitorDir, "snapshots");

function readRequestBody(req: any, maxBytes = 1024 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer | string) => {
      body += chunk.toString();
      if (body.length > maxBytes) {
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function createExtensionCommandId() {
  return `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function ensureExtensionSnapshotDir() {
  fs.mkdirSync(extensionSnapshotDir, { recursive: true });
}

function saveExtensionSnapshot(commandId: string, dataUrl: string) {
  const match = String(dataUrl || "").match(/^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  ensureExtensionSnapshotDir();
  const ext = match[1].replace("jpeg", "jpg");
  const fileName = `${commandId}.${ext}`;
  const filePath = path.join(extensionSnapshotDir, fileName);
  const buffer = Buffer.from(match[2], "base64");
  fs.writeFileSync(filePath, buffer);
  return {
    snapshotFile: fileName,
    snapshotPath: filePath,
    bytes: buffer.length
  };
}

function storeExtensionCommandResult(entry: any) {
  extensionCommandResults.push(entry);
  if (extensionCommandResults.length > EXTENSION_COMMAND_RESULT_LIMIT) {
    extensionCommandResults.splice(0, extensionCommandResults.length - EXTENSION_COMMAND_RESULT_LIMIT);
  }
}

function loadLocalDotEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return;
    const envText = fs.readFileSync(envPath, 'utf8');
    for (const rawLine of envText.split(/\n/)) {
      const line = rawLine.replace(/\r$/, '');
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const key = match[1];
      let value = match[2] || '';
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch (err: any) {
    console.warn('[local-collector] Não foi possível carregar .env:', err?.message || err);
  }
}

loadLocalDotEnv();

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    watch: {
      ignored: [
        "**/.tmp/**",
        "**/.agents/**",
        "**/scratch/**",
        "**/dist/**",
        "**/node_modules/**"
      ]
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

            if (urlPath === "/api/local-collector/extension-telemetry") {
              if (req.method === "GET") {
                res.writeHead(200);
                res.end(JSON.stringify({
                  success: true,
                  count: extensionTelemetryBuffer.length,
                  events: extensionTelemetryBuffer.slice(-200)
                }));
                return;
              }

              if (req.method === "DELETE") {
                extensionTelemetryBuffer.length = 0;
                res.writeHead(200);
                res.end(JSON.stringify({ success: true }));
                return;
              }

              if (req.method === "POST") {
                readRequestBody(req)
                  .then((body) => {
                    const parsed = body ? JSON.parse(body) : {};
                    const event = {
                      receivedAt: new Date().toISOString(),
                      ...parsed
                    };
                    extensionTelemetryBuffer.push(event);
                    if (extensionTelemetryBuffer.length > EXTENSION_TELEMETRY_LIMIT) {
                      extensionTelemetryBuffer.splice(0, extensionTelemetryBuffer.length - EXTENSION_TELEMETRY_LIMIT);
                    }
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true }));
                  })
                  .catch((error) => {
                    res.writeHead(400);
                    res.end(JSON.stringify({
                      success: false,
                      error: error instanceof Error ? error.message : String(error)
                    }));
                  });
                return;
              }

              res.writeHead(405);
              res.end(JSON.stringify({ success: false, error: "Method not allowed" }));
              return;
            }

            if (urlPath === "/api/local-collector/extension-command") {
              if (req.method === "GET") {
                const command = extensionCommandQueue.shift() || null;
                res.writeHead(200);
                res.end(JSON.stringify({
                  success: true,
                  command,
                  queued: extensionCommandQueue.length
                }));
                return;
              }

              if (req.method === "DELETE") {
                extensionCommandQueue.length = 0;
                extensionCommandResults.length = 0;
                res.writeHead(200);
                res.end(JSON.stringify({ success: true }));
                return;
              }

              if (req.method === "POST") {
                readRequestBody(req)
                  .then((body) => {
                    const parsed = body ? JSON.parse(body) : {};
                    const type = String(parsed.type || parsed.action || "").trim();
                    if (!type) {
                      res.writeHead(400);
                      res.end(JSON.stringify({ success: false, error: "Missing command type" }));
                      return;
                    }
                    const command = {
                      ...parsed,
                      id: parsed.id || createExtensionCommandId(),
                      type,
                      queuedAt: new Date().toISOString()
                    };
                    extensionCommandQueue.push(command);
                    if (extensionCommandQueue.length > EXTENSION_COMMAND_LIMIT) {
                      extensionCommandQueue.splice(0, extensionCommandQueue.length - EXTENSION_COMMAND_LIMIT);
                    }
                    res.writeHead(200);
                    res.end(JSON.stringify({
                      success: true,
                      command,
                      queued: extensionCommandQueue.length
                    }));
                  })
                  .catch((error) => {
                    res.writeHead(400);
                    res.end(JSON.stringify({
                      success: false,
                      error: error instanceof Error ? error.message : String(error)
                    }));
                  });
                return;
              }

              res.writeHead(405);
              res.end(JSON.stringify({ success: false, error: "Method not allowed" }));
              return;
            }

            if (urlPath === "/api/local-collector/extension-command-result") {
              if (req.method === "GET") {
                res.writeHead(200);
                res.end(JSON.stringify({
                  success: true,
                  queued: extensionCommandQueue.length,
                  count: extensionCommandResults.length,
                  results: extensionCommandResults.slice(-100)
                }));
                return;
              }

              if (req.method === "DELETE") {
                extensionCommandResults.length = 0;
                res.writeHead(200);
                res.end(JSON.stringify({ success: true }));
                return;
              }

              if (req.method === "POST") {
                readRequestBody(req, 12 * 1024 * 1024)
                  .then((body) => {
                    const parsed = body ? JSON.parse(body) : {};
                    const commandId = String(parsed.commandId || parsed.command?.id || createExtensionCommandId());
                    const result = parsed.result || {};
                    let snapshot: any = null;
                    if (typeof result.dataUrl === "string") {
                      snapshot = saveExtensionSnapshot(commandId, result.dataUrl);
                      delete result.dataUrl;
                    }
                    storeExtensionCommandResult({
                      receivedAt: new Date().toISOString(),
                      commandId,
                      command: parsed.command || null,
                      success: parsed.success !== false,
                      error: parsed.error || null,
                      result,
                      snapshot
                    });
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, snapshot }));
                  })
                  .catch((error) => {
                    res.writeHead(400);
                    res.end(JSON.stringify({
                      success: false,
                      error: error instanceof Error ? error.message : String(error)
                    }));
                  });
                return;
              }

              res.writeHead(405);
              res.end(JSON.stringify({ success: false, error: "Method not allowed" }));
              return;
            }

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
              const city = urlParams.get("city") || "João Pessoa";
              const state = urlParams.get("state") || "PB";
              const cityId = urlParams.get("cityId") || "";
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
              
              logBuffer = freshLog + `🚀 Iniciando Coleta do Google Maps (Fase 1) em ${city} - ${state}...\n`;
              const proc = spawn("node", ["scratch/google_maps_scraper.cjs", "--city", city, "--state", state, "--cityId", cityId]);
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
              const proc = spawn("node", ["scratch/social_enricher.cjs"]);
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
              const proc = spawn("node", ["scratch/menu_scraper.cjs"]);
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
              const proc = spawn("node", ["scratch/social_enricher.cjs", "--single", "--id", restaurantId, "--field", "instagram"]);
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

            if (urlPath === "/api/local-collector/ai-chat" && req.method === "POST") {
              let bodyData = '';
              req.on('data', chunk => { bodyData += chunk.toString(); });
              req.on('end', async () => {
                try {
                  const parsed = JSON.parse(bodyData);
                  const message = parsed.message || '';
                  const systemContext = parsed.systemContext || '';
                  const jsonMode = parsed.jsonMode === true;
                  
                  // Chamar OpenAI diretamente daqui do servidor node local.
                  // Preferimos a chave OpenAI/GPT do projeto; OpenRouter fica como fallback
                  // configurável. O modelo "openrouter/free" quebrava a navegação com HTTP 500.
                  const { OpenAI } = await import('openai');
                  const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
                  const openRouterKey = process.env.VITE_OPENROUTER_API_KEY || '';
                  
                  let openai;
                  let model = process.env.VITE_OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
                  if (apiKey) {
                    openai = new OpenAI({ apiKey });
                  } else if (openRouterKey) {
                    openai = new OpenAI({
                      baseURL: "https://openrouter.ai/api/v1",
                      apiKey: openRouterKey,
                      defaultHeaders: { "HTTP-Referer": "http://localhost:8080", "X-Title": "Admin Dashboard" }
                    });
                    model = process.env.VITE_OPENROUTER_MODEL || process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
                  } else {
                    throw new Error('Chave de API não configurada no .env');
                  }

                  const createChatCompletionWithRetry = async () => {
                    let lastError: any = null;
                    for (let attempt = 0; attempt < 8; attempt++) {
                      try {
                        const completionPayload: any = {
                          model: model,
                          messages: [
                            { role: 'system', content: systemContext },
                            { role: 'user', content: message }
                          ],
                          temperature: 0.1
                        };
                        if (jsonMode && apiKey) {
                          completionPayload.response_format = { type: 'json_object' };
                        }
                        return await openai.chat.completions.create(completionPayload);
                      } catch (retryErr: any) {
                        lastError = retryErr;
                        const status = retryErr?.status || retryErr?.code;
                        const text = String(retryErr?.message || retryErr || '');
                        const isRateLimit = status === 429 || text.includes('429') || /rate limit/i.test(text);
                        if (!isRateLimit || attempt === 7) break;
                        const secondsMatch = text.match(/try again in ([0-9.]+)s/i);
                        const hintedMs = secondsMatch ? Math.ceil(Number(secondsMatch[1]) * 1000) : 0;
                        const usedAtLimit = /Used\s+\d+/.test(text) && /Limit\s+\d+/.test(text);
                        const delayMs = Math.min(60000, Math.max(hintedMs, usedAtLimit ? 12000 + attempt * 6000 : 1000 * Math.pow(2, attempt)) + 500);
                        console.warn('[local-collector/ai-chat] Rate limit; tentando novamente em', delayMs, 'ms');
                        await new Promise(resolve => setTimeout(resolve, delayMs));
                      }
                    }
                    throw lastError;
                  };

                  const response = await createChatCompletionWithRetry();

                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ reply: response.choices[0].message.content || '' }));
                } catch (err: any) {
                  console.error('[local-collector/ai-chat] Erro:', err?.message || err);
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: err?.message || 'Erro desconhecido na IA' }));
                }
              });
              return;
            }

            if (urlPath === "/api/local-collector/filter-instagram-gallery" && req.method === "POST") {
              let bodyData = '';
              req.on('data', chunk => { bodyData += chunk.toString(); });
              req.on('end', async () => {
                try {
                  const parsed = JSON.parse(bodyData);
                  const maxImages = Math.max(1, Math.min(8, Number(parsed.maxImages || 8)));
                  const source = String(parsed.source || 'galeria').trim();
                  const images: string[] = (parsed.images || [])
                    .map((item: any) => typeof item === 'string' ? item : item?.image || item?.url)
                    .filter((item: any) => typeof item === 'string' && item.trim())
                    .map((item: string) => item.trim())
                    .filter((item: string) => !/^data:video\//i.test(item) && !/\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(item))
                    .slice(0, 24);
                  
                  if (images.length === 0) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, filteredImages: [] }));
                    return;
                  }
                  
                  const { OpenAI } = await import('openai');
                  const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
                  const openRouterKey = process.env.VITE_OPENROUTER_API_KEY || '';
                  
                  let openai;
                  let model = 'gpt-4o-mini';
                  if (openRouterKey) {
                    openai = new OpenAI({
                      baseURL: "https://openrouter.ai/api/v1",
                      apiKey: openRouterKey,
                      defaultHeaders: { "HTTP-Referer": "http://localhost:8080", "X-Title": "Admin Dashboard" }
                    });
                    model = 'openrouter/free';
                  } else if (apiKey) {
                    openai = new OpenAI({ apiKey });
                  } else {
                    throw new Error('Chave de API não configurada no .env');
                  }

                  // Executar a IA Vision em paralelo para cada imagem
                  const promises = images.map(async (img) => {
                    try {
                      const response = await openai.chat.completions.create({
                        model: model,
                        messages: [
                          {
                            role: 'system',
                            content: 'Voce e um assistente de IA que escolhe fotos para a galeria publica de um restaurante. Responda apenas com a palavra "APROVADO" ou "REJEITADO". APROVADO: foto real, bonita e util de comida, bebida, sobremesa, prato servido, fachada limpa, salao/ambiente limpo ou vitrine/balcao apresentavel do proprio restaurante. REJEITADO: video, thumbnail com play, cardapio impresso/digital, print de app, panfleto, flyer, arte promocional, logo isolado, meme, texto como foco principal, pessoas/rostos como foco, funcionario ou cliente posando, mesa vazia ou suja, lixo, embalagem sem comida, imagem borrada, escura, cortada demais, generica ou que nao pareca pertencer ao restaurante.'
                          },
                          {
                            role: 'system',
                            content: 'Regra obrigatoria e conservadora: priorize fotos de comida; use fotos de ambiente/fachada apenas quando forem limpas, bem enquadradas e ajudarem o usuario a reconhecer o restaurante. Fotos de cardapio nao pertencem a galeria; elas sao evidencias para extracao de cardapio. Na duvida, responda REJEITADO.'
                          },
                          {
                            role: 'user',
                            content: [
                              { type: 'text', text: `Origem: ${source}. Analise esta imagem e responda apenas APROVADO ou REJEITADO:` },
                              { type: 'image_url', image_url: { url: img } }
                            ]
                          }
                        ],
                        temperature: 0.1
                      });
                      
                      const classification = response.choices[0].message.content?.trim().toUpperCase() || '';
                      const isApproved = classification.includes('APROVADO') && !classification.includes('REJEITADO');
                      return { img, isApproved };
                    } catch (err: any) {
                      console.error('Erro na classificação de imagem via IA:', err.message);
                      return { img, isApproved: false };
                    }
                  });

                  const results = await Promise.all(promises);
                  const approvedImages = results.filter(r => r.isApproved).map(r => r.img).slice(0, maxImages);

                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, filteredImages: approvedImages }));
                } catch (err: any) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: false, error: err.message }));
                }
              });
              return;
            }

            if (urlPath === "/api/local-collector/extract-menu-from-images" && req.method === "POST") {
              let bodyData = '';
              req.on('data', chunk => { bodyData += chunk.toString(); });
              req.on('end', async () => {
                try {
                  const parsed = JSON.parse(bodyData || '{}');
                  const images: string[] = (parsed.images || [])
                    .map((item: any) => typeof item === 'string' ? item : item?.image || item?.url)
                    .filter(Boolean)
                    .slice(0, 10);

                  if (images.length === 0) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Nenhuma imagem candidata enviada.' }));
                    return;
                  }

                  const { OpenAI } = await import('openai');
                  const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
                  if (!apiKey) throw new Error('Chave OpenAI não configurada no .env');
                  const openai = new OpenAI({ apiKey, timeout: 20000, maxRetries: 1 });

                  const accepted: any[] = [];
                  for (const image of images) {
                    try {
                      const response = await openai.chat.completions.create({
                        model: process.env.MENU_IMAGE_MODEL || 'gpt-4o-mini',
                        temperature: 0,
                        response_format: { type: 'json_object' },
                        messages: [
                          {
                            role: 'system',
                            content: [
                              'Você analisa imagens públicas de restaurante.',
                              'Determine se a imagem contém cardápio, tabela de preços, lista de pratos, placa de menu ou print legível de delivery.',
                              'Extraia somente texto visível relacionado a itens/preços; não invente.',
                              'Responda JSON: {"is_menu":true|false,"confidence":0_a_1,"raw_text":"texto extraído","reason":"curto"}.'
                            ].join(' ')
                          },
                          {
                            role: 'user',
                            content: [
                              { type: 'text', text: 'Esta imagem contém cardápio/preços? Extraia o texto se houver.' },
                              { type: 'image_url', image_url: { url: image } }
                            ]
                          }
                        ]
                      });
                      const content = response.choices[0]?.message?.content || '{}';
                      const result = JSON.parse(String(content).match(/\{[\s\S]*\}/)?.[0] || '{}');
                      if (result.is_menu === true && Number(result.confidence || 0) >= 0.55 && String(result.raw_text || '').trim().length >= 20) {
                        accepted.push({
                          image,
                          confidence: Number(result.confidence || 0),
                          rawText: String(result.raw_text || ''),
                          reason: String(result.reason || '')
                        });
                      }
                    } catch (imageError: any) {
                      console.warn('[extract-menu-from-images] Falha em imagem:', imageError?.message || imageError);
                    }
                  }

                  if (!accepted.length) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Nenhuma imagem foi classificada como cardápio com confiança suficiente.' }));
                    return;
                  }

                  const rawText = accepted.map((item, index) => `--- IMAGEM ${index + 1} (${Math.round(item.confidence * 100)}%) ---\n${item.rawText}`).join('\n\n');
                  const avgConfidence = accepted.reduce((sum, item) => sum + item.confidence, 0) / accepted.length;
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({
                    success: true,
                    menuEvidence: {
                      success: true,
                      platform: parsed.source || 'image_menu',
                      sourceUrl: parsed.sourceUrl || '',
                      discoveryMethod: parsed.discoveryMethod || 'menu_image_vision',
                      confidence: Math.min(0.88, Math.max(0.62, avgConfidence)),
                      rawText,
                      textBlocks: accepted.map(item => item.rawText),
                      screenshots: accepted.map(item => item.image),
                      imageMenuCandidates: accepted
                    }
                  }));
                } catch (err: any) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: false, error: err.message }));
                }
              });
              return;
            }

            if (urlPath === "/api/local-collector/audit-menu-visual-structure" && req.method === "POST") {
              let bodyData = '';
              req.on('data', chunk => { bodyData += chunk.toString(); });
              req.on('end', async () => {
                try {
                  const parsed = JSON.parse(bodyData || '{}');
                  const images: string[] = (parsed.images || [])
                    .map((item: any) => typeof item === 'string' ? item : item?.image || item?.url)
                    .filter((value: any) => typeof value === 'string' && value.startsWith('data:image'))
                    .slice(0, 4);
                  const structuredMenu = parsed.structuredMenu || [];
                  const sourceUrl = parsed.sourceUrl || '';

                  if (images.length === 0) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                      success: false,
                      visualAudit: {
                        usable: false,
                        recommendation: 'needs_more_screenshots',
                        reason: 'Nenhum screenshot visual do cardápio foi enviado.'
                      }
                    }));
                    return;
                  }

                  const { OpenAI } = await import('openai');
                  const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
                  if (!apiKey) throw new Error('Chave OpenAI não configurada no .env');
                  const openai = new OpenAI({ apiKey, timeout: 45000, maxRetries: 1 });

                  const compactMenu = (Array.isArray(structuredMenu) ? structuredMenu : [])
                    .slice(0, 30)
                    .map((category: any) => ({
                      name: category?.name,
                      items: (category?.items || category?.menu_items || [])
                        .slice(0, 40)
                        .map((item: any) => ({
                          name: item?.name,
                          description: String(item?.description || '').slice(0, 180),
                          image_url: item?.image_url || item?.imageUrl || null,
                          price: item?.price ?? item?.display_price ?? item?.price_min ?? null,
                          commercial_type: item?.commercial_type || null,
                          option_groups: item?.option_groups || item?.options || [],
                          combo_components: item?.combo_components || item?.comboComponents || []
                        }))
                    }));

                  const response = await openai.chat.completions.create({
                    model: process.env.MENU_VISUAL_AUDIT_MODEL || process.env.MENU_IMAGE_MODEL || 'gpt-4o-mini',
                    temperature: 0,
                    response_format: { type: 'json_object' },
                    messages: [
                      {
                        role: 'system',
                        content: [
                          'Você é auditor visual de cardápios para um app público de restaurantes.',
                          'Compare screenshots reais do cardápio com o JSON estruturado proposto.',
                          'Procure sinais de categorias, abas, subcategorias, combos, escolhas obrigatórias e adicionais que sumiram ou foram transformados em itens/categorias erradas.',
                          'Não exija extrair o cardápio completo pelo print: a tarefa é detectar inconsistências estruturais evidentes.',
                          'Se o print mostra abas/categorias/subcategorias que não aparecem no JSON, marque needs_restructure.',
                          'Se o JSON colocou adicionais/escolhas como itens principais, marque needs_restructure.',
                          'Se a estrutura parece coerente com o que está visível, marque ready.',
                          'Responda somente JSON: {"usable":true,"confidence":0.0,"structure_matches":true,"recommendation":"ready|needs_restructure|needs_more_screenshots","visual_summary":"curto","missing_categories":[],"missing_subcategories":[],"missing_options_or_addons":[],"wrongly_promoted_items":[],"warnings":[],"reason":"curto"}.'
                        ].join(' ')
                      },
                      {
                        role: 'user',
                        content: [
                          {
                            type: 'text',
                            text: `Fonte: ${sourceUrl}\n\nMenu estruturado proposto:\n${JSON.stringify(compactMenu).slice(0, 24000)}`
                          },
                          ...images.map((image) => ({ type: 'image_url', image_url: { url: image } }))
                        ]
                      }
                    ]
                  });

                  const content = response.choices[0]?.message?.content || '{}';
                  const visualAudit = JSON.parse(String(content).match(/\{[\s\S]*\}/)?.[0] || '{}');
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, visualAudit }));
                } catch (err: any) {
                  console.error('[audit-menu-visual-structure] Erro:', err?.message || err);
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: false, error: err?.message || 'Erro desconhecido na auditoria visual' }));
                }
              });
              return;
            }

            if (urlPath === "/api/local-collector/audit-menu-consistency" && req.method === "POST") {
              let bodyData = '';
              req.on('data', chunk => { bodyData += chunk.toString(); });
              req.on('end', async () => {
                try {
                  const parsed = JSON.parse(bodyData || '{}');
                  const proposedMenu = Array.isArray(parsed.proposedMenu) ? parsed.proposedMenu : [];
                  const sourceMenu = Array.isArray(parsed.sourceMenu) ? parsed.sourceMenu : [];
                  const sourceText = String(parsed.sourceText || '').slice(0, 70000);
                  const sourceUrl = String(parsed.sourceUrl || '');
                  const visualAudit = parsed.visualAudit || null;
                  const images: string[] = (parsed.images || [])
                    .map((item: any) => typeof item === 'string' ? item : item?.image || item?.url)
                    .filter((value: any) => typeof value === 'string' && value.startsWith('data:image'))
                    .slice(0, 3);

                  if (!proposedMenu.length) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                      success: true,
                      consistencyAudit: {
                        verdict: 'block',
                        confidence: 1,
                        reason: 'Menu proposto vazio.',
                        errors: [{ type: 'empty_menu', severity: 'blocking', message: 'Menu proposto vazio.' }],
                        correctedMenu: []
                      }
                    }));
                    return;
                  }

                  const { OpenAI } = await import('openai');
                  const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
                  if (!apiKey) throw new Error('Chave OpenAI não configurada no .env');
                  const openai = new OpenAI({ apiKey, timeout: 60000, maxRetries: 1 });

                  const compactMenu = (menu: any[]) => menu.slice(0, 35).map((category: any) => ({
                    name: category?.name,
                    items: (category?.items || category?.menu_items || []).slice(0, 60).map((item: any) => ({
                      name: item?.name,
                      description: String(item?.description || '').slice(0, 240),
                      image_url: item?.image_url || item?.imageUrl || null,
                      price: item?.price ?? item?.display_price ?? item?.price_min ?? null,
                      price_type: item?.price_type || null,
                      commercial_type: item?.commercial_type || null,
                      combo_components: item?.combo_components || item?.comboComponents || [],
                      option_groups: item?.option_groups || item?.options || []
                    }))
                  }));

                  const response = await openai.chat.completions.create({
                    model: process.env.MENU_CONSISTENCY_AUDIT_MODEL || process.env.MENU_VISUAL_AUDIT_MODEL || 'gpt-4o-mini',
                    temperature: 0,
                    response_format: { type: 'json_object' },
                    messages: [
                      {
                        role: 'system',
                        content: [
                          'A IA nao e redatora. Ela so pode classificar/posicionar textos existentes: categoria, subcategoria, item, combo, escolha, adicional, preco e horario.',
                          'Nao crie nomes amigaveis, nao renomeie combo, nao crie categoria por interpretacao e nao escreva descricoes de marketing. Se nao estiver literalmente ou claramente no texto/print, remova ou bloqueie.',
                          'correctedMenu deve ser um subconjunto/reorganizacao fiel da fonte. Nao acrescente nenhum texto novo exceto campos tecnicos vazios/nulos.',
                          'Você é o AGENTE AUDITOR do Validar IA. Sua função é fiscalizar a IA curadora, não agradar.',
                          'Compare o cardápio estruturado proposto contra a fonte original: texto bruto, itens brutos do extrator, auditoria visual e prints.',
                          'Regra principal: NUNCA permita invenção. Item, preço, categoria, descrição, combo, adicional e opção precisam estar apoiados na fonte.',
                          'Descrições genéricas inventadas como "deliciosa", "perfeita", "item montável", "valor final conforme escolhas", "combinação perfeita" devem ser removidas, salvo se aparecerem literalmente na fonte.',
                          'Se o item existe mas a descrição foi inventada, mantenha o item e deixe descrição vazia ou factual somente com palavras da fonte.',
                          'Se categoria pública está errada/duplicada, corrija. Ex: massa não deve ficar em Pratos Principais se já há Massas.',
                          'Se combo estiver como combo_builder, ele deve ter combo_components/option_groups apoiados na fonte. Combo sem componentes claros deve bloquear ou virar item simples somente se a fonte vender como item fechado.',
                          'Se adicional/escolha foi promovido a item principal, corrija para option_groups/combo_components ou bloqueie.',
                          'Se uma subcategoria/aba aparece na fonte visual/textual e sumiu no proposto, corrija ou bloqueie.',
                          'Você pode retornar correctedMenu limpo. Se corrigir, preserve apenas dados apoiados na fonte.',
                          'Responda somente JSON. Em reason e message, explique objetivamente o que foi corrigido ou por que bloqueou; nunca responda com placeholder. Formato: {"verdict":"pass|corrected|block","confidence":0.0,"reason":"ex: removi descricoes inventadas e mantive itens com nome/preco comprovados","errors":[{"type":"invented_description|invented_item|wrong_category|missing_category|combo_without_components|addon_promoted|price_mismatch|unsupported_data","severity":"warning|blocking","item":"nome","message":"ex: descricao nao aparece literalmente na fonte"}],"correctedMenu":[{"name":"Categoria","items":[{"name":"Item","description":"","price":35.9,"display_price":35.9,"price_type":"fixed|starting_at|range|option_only","commercial_type":"simple_item|configurable_item|combo_builder|simple_with_addons","search_display_name":"", "search_keywords":"", "combo_rules":null, "combo_components":[], "option_groups":[]}]}]}'
                        ].join(' ')
                      },
                      {
                        role: 'user',
                        content: [
                          {
                            type: 'text',
                            text: [
                              `Fonte: ${sourceUrl}`,
                              `Auditoria visual: ${JSON.stringify(visualAudit || {}).slice(0, 5000)}`,
                              `Itens/categorias brutos do extrator: ${JSON.stringify(compactMenu(sourceMenu)).slice(0, 18000)}`,
                              `Texto bruto original: ${sourceText.slice(0, 24000)}`,
                              `Menu proposto pela IA curadora: ${JSON.stringify(compactMenu(proposedMenu)).slice(0, 24000)}`
                            ].join('\n\n')
                          },
                          ...images.map((image) => ({ type: 'image_url', image_url: { url: image } }))
                        ]
                      }
                    ]
                  });

                  const content = response.choices[0]?.message?.content || '{}';
                  const consistencyAudit = JSON.parse(String(content).match(/\{[\s\S]*\}/)?.[0] || '{}');
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, consistencyAudit }));
                } catch (err: any) {
                  console.error('[audit-menu-consistency] Erro:', err?.message || err);
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: false, error: err?.message || 'Erro desconhecido na auditoria de consistência' }));
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
              const proc = spawn("node", ["scratch/social_enricher.cjs", "--single", "--id", restaurantId, "--field", "menu"]);
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

              let bodyData = '';
              req.on('data', chunk => { bodyData += chunk.toString(); });
              req.on('end', () => {
                let xmlContent = '';
                let parsedMenu = null;
                try {
                  if (bodyData) {
                    const parsedBody = JSON.parse(bodyData);
                    xmlContent = parsedBody.xmlContent || '';
                    parsedMenu = parsedBody.parsedMenu || null;
                  }
                } catch(e) {}

                logBuffer = `🚀 Iniciando extração de Cardápio (Fase 3) para o restaurante ID ${restaurantId}...\n`;
                
                const valArgs = ["scratch/menu_scraper.cjs", "--single", "--id", restaurantId];
                
                if (parsedMenu) {
                  const tempJsonFile = path.join(process.cwd(), 'scratch', `temp_menu_json_${restaurantId}.json`);
                  fs.writeFileSync(tempJsonFile, JSON.stringify(parsedMenu));
                  valArgs.push("--menu-json-file", tempJsonFile);
                } else if (xmlContent) {
                  const tempXmlFile = path.join(process.cwd(), 'scratch', `temp_menu_xml_${restaurantId}.txt`);
                  fs.writeFileSync(tempXmlFile, xmlContent);
                  valArgs.push("--menu-context-file", tempXmlFile);
                }

                const proc = spawn("node", valArgs);
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
                  
                  // Limpa arquivos temporários
                  if (parsedMenu) {
                    const tempJsonFile = path.join(process.cwd(), 'scratch', `temp_menu_json_${restaurantId}.json`);
                    try { fs.unlinkSync(tempJsonFile); } catch(e) {}
                  } else if (xmlContent) {
                    const tempXmlFile = path.join(process.cwd(), 'scratch', `temp_menu_xml_${restaurantId}.txt`);
                    try { fs.unlinkSync(tempXmlFile); } catch(e) {}
                  }

                  try {
                    const result = resultJsonStr ? JSON.parse(resultJsonStr) : { success: false };
                    res.writeHead(200);
                    res.end(JSON.stringify(result));
                  } catch (err) {
                    res.writeHead(500);
                    res.end(JSON.stringify({ success: false, error: "Erro ao processar resultado do robô." }));
                  }
                });
              });
              return;
            }


            if (urlPath === "/api/local-collector/extract-maps" && req.method === "POST") {
              if (activeProcess) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Já existe uma coleta em execução." }));
                return;
              }
              const urlParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
              const restaurantId = urlParams.get("restaurantId");
              if (!restaurantId) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "ID do restaurante não fornecido." }));
                return;
              }

              let bodyData = '';
              req.on('data', chunk => { bodyData += chunk.toString(); });
              req.on('end', () => {
                let browserContext = '';
                try {
                  if (bodyData) {
                    const parsed = JSON.parse(bodyData);
                    browserContext = parsed.browserContext || '';
                  }
                } catch(e) {}
              
                logBuffer += `\n🚀 Iniciando Extração Maps via IA para ID: ${restaurantId}...\n`;
                const valArgs = ["scratch/extract_maps_data.cjs", "--id", restaurantId];
                if (browserContext) {
                  const tempFile = path.join(process.cwd(), 'scratch', `temp_maps_${restaurantId}.txt`);
                  fs.writeFileSync(tempFile, browserContext);
                  valArgs.push("--browser-context-file", tempFile);
                }
                
                const valProc = spawn("node", valArgs);
                activeProcess = valProc;
                let jsonResult = null;

                valProc.stdout.on("data", (data) => {
                  const str = data.toString();
                  const match = str.match(/RESULT:(.+)/);
                  if (match) {
                    try { jsonResult = JSON.parse(match[1]); } catch(e) {}
                  } else {
                    logBuffer += str;
                  }
                });

                valProc.stderr.on("data", (data) => { logBuffer += data.toString(); });

                valProc.on("close", (code) => {
                  activeProcess = null;
                  logBuffer += `\n🏁 Extração Maps concluída.\n`;
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify(jsonResult || { success: false, error: "Nenhum resultado recebido" }));
                });
              });
              return;
            }

            if (urlPath === "/api/local-collector/agentic-step" && req.method === "POST") {
              if (activeProcess) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Já existe uma coleta em execução." }));
                return;
              }
              const urlParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
              const restaurantId = urlParams.get("restaurantId");
              
              let bodyData = '';
              req.on('data', chunk => { bodyData += chunk.toString(); });
              req.on('end', () => {
                let snapshot = '';
                try {
                  const parsed = JSON.parse(bodyData);
                  snapshot = parsed.snapshot || '';
                } catch(e) {}
              
                logBuffer += `\n🤖 Agente IA analisando tela...\n`;
                const valArgs = ["scratch/agentic_step.cjs"];
                if (restaurantId) valArgs.push("--id", restaurantId);
                
                if (snapshot) {
                  const tempFile = path.join(process.cwd(), 'scratch', `temp_agent_${Date.now()}.txt`);
                  fs.writeFileSync(tempFile, snapshot);
                  valArgs.push("--snapshot-file", tempFile);
                }
                
                const valProc = spawn("node", valArgs);
                activeProcess = valProc;
                let jsonResult = null;

                valProc.stdout.on("data", (data) => {
                  const str = data.toString();
                  const match = str.match(/RESULT:(.+)/);
                  if (match) {
                    try { jsonResult = JSON.parse(match[1]); } catch(e) {}
                  } else {
                    logBuffer += str;
                  }
                });

                valProc.stderr.on("data", (data) => { logBuffer += data.toString(); });

                valProc.on("close", (code) => {
                  activeProcess = null;
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify(jsonResult || { success: false, error: "Nenhum resultado recebido" }));
                });
              });
              return;
            }

            if (urlPath === "/api/local-collector/validate-instagram" && req.method === "POST") {
              if (validationProcess) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Já existe uma validação em execução." }));
                return;
              }
              const urlParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
              const restaurantId = urlParams.get("restaurantId");
              if (!restaurantId) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "ID do restaurante não fornecido." }));
                return;
              }

              let bodyData = '';
              req.on('data', chunk => { bodyData += chunk.toString(); });
              req.on('end', () => {
                let instagramContext = '';
                let instagramUrl = '';
                let candidates: any[] = [];
                let restaurantName = '';
                let restaurantCity = '';
                let restaurantAddress = '';
                try {
                  if (bodyData) {
                    const parsed = JSON.parse(bodyData);
                    instagramContext = parsed.instagramContext || '';
                    instagramUrl = parsed.instagramUrl || '';
                    candidates = parsed.candidates || [];
                    restaurantName = parsed.restaurantName || '';
                    restaurantCity = parsed.restaurantCity || '';
                    restaurantAddress = parsed.restaurantAddress || '';
                  }
                } catch(e) {}
              
                logBuffer += `\n🤖 Iniciando Validação de Instagram para ID: ${restaurantId}...\n`;
                
                // Se recebeu múltiplos candidatos, usa o novo script de seleção
                if (candidates.length > 0) {
                  logBuffer += `📋 ${candidates.length} candidato(s) recebido(s) para validação:\n`;
                  candidates.forEach((c: any, i: number) => {
                    logBuffer += `  ${i+1}. ${c.url} (${c.followers} seguidores) - Bio: ${(c.bio || '').substring(0, 80)}...\n`;
                  });
                  
                  // Salva candidatos em arquivo temporário para o script processar
                  const tempCandidatesFile = path.join(process.cwd(), 'scratch', `temp_candidates_${restaurantId}.json`);
                  fs.writeFileSync(tempCandidatesFile, JSON.stringify({
                    candidates,
                    restaurantName,
                    restaurantCity,
                    restaurantAddress
                  }));
                  
                  const valArgs = ["scratch/validate_instagram.cjs", "--id", restaurantId, "--candidates-file", tempCandidatesFile];
                  const valProc = spawn("node", valArgs);
                  validationProcess = valProc;
                  let jsonResult: any = null;

                  valProc.stdout.on("data", (data: any) => {
                    const str = data.toString();
                    const match = str.match(/RESULT:(.+)/);
                    if (match) {
                      try { jsonResult = JSON.parse(match[1]); } catch(e) {}
                    } else {
                      logBuffer += str;
                    }
                  });

                  valProc.stderr.on("data", (data: any) => { logBuffer += data.toString(); });

                  valProc.on("close", (code: any) => {
                    validationProcess = null;
                    logBuffer += `\n🏁 Validação Instagram concluída.\n`;
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(jsonResult || { success: false, error: "Nenhum resultado recebido" }));
                  });
                } else {
                  // Modo legado: um único candidato
                  const valArgs = ["scratch/validate_instagram.cjs", "--id", restaurantId, "--instagram-url", instagramUrl];
                  if (instagramContext) {
                    const tempInstaFile = path.join(process.cwd(), 'scratch', `temp_insta_${restaurantId}.txt`);
                    fs.writeFileSync(tempInstaFile, instagramContext);
                    valArgs.push("--instagram-context-file", tempInstaFile);
                  }
                  
                  const valProc = spawn("node", valArgs);
                  validationProcess = valProc;
                  let jsonResult: any = null;

                  valProc.stdout.on("data", (data: any) => {
                    const str = data.toString();
                    const match = str.match(/RESULT:(.+)/);
                    if (match) {
                      try { jsonResult = JSON.parse(match[1]); } catch(e) {}
                    } else {
                      logBuffer += str;
                    }
                  });

                  valProc.stderr.on("data", (data: any) => { logBuffer += data.toString(); });

                  valProc.on("close", (code: any) => {
                    validationProcess = null;
                    logBuffer += `\n🏁 Validação Instagram concluída.\n`;
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(jsonResult || { success: false, error: "Nenhum resultado recebido" }));
                  });
                }
              });
              return;
            }

            if (urlPath === "/api/local-collector/re-ai-validation" && req.method === "POST") {
              if (validationProcess) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Já existe uma validação individual em execução. Aguarde." }));
                return;
              }
              
              const restaurantId = urlParams.get("restaurantId");
              if (!restaurantId) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "ID do restaurante não fornecido." }));
                return;
              }
              
              let bodyData = '';
              req.on('data', chunk => {
                bodyData += chunk.toString();
              });
              
              req.on('end', () => {
                let browserContext = '';
                let instagramContext = '';
                let googleSearchResults = null;
                let instagramHighlights = null;
                let mapsData = null;
                try {
                  if (bodyData) {
                    const parsed = JSON.parse(bodyData);
                    if (parsed.browserContext) {
                      browserContext = parsed.browserContext;
                    }
                    if (parsed.instagramContext) {
                      instagramContext = parsed.instagramContext;
                    }
                    if (parsed.googleSearchResults) {
                      googleSearchResults = parsed.googleSearchResults;
                    }
                    if (parsed.instagramHighlights) {
                      instagramHighlights = parsed.instagramHighlights;
                    }
                    if (parsed.mapsData) {
                      mapsData = parsed.mapsData;
                    }
                  }
                } catch(e) {}
              
                // Horários já foram coletados pelo frontend via extensão Chrome.
                // Vamos direto para a Validação IA (Fase 5).
                logBuffer += `\n🤖 Iniciando Validação IA (Fase 5) para ID: ${restaurantId}...\n`;
                
                const valArgs = ["scratch/hybrid_restaurant_validator.cjs", "--single", "--id", restaurantId];
                if (browserContext) {
                  const tempFile = path.join(process.cwd(), 'scratch', `temp_context_${restaurantId}.txt`);
                  fs.writeFileSync(tempFile, browserContext);
                  valArgs.push("--browser-context-file", tempFile);
                }
                if (instagramContext) {
                  const tempInstaFile = path.join(process.cwd(), 'scratch', `temp_insta_context_${restaurantId}.txt`);
                  fs.writeFileSync(tempInstaFile, instagramContext);
                  valArgs.push("--instagram-context-file", tempInstaFile);
                }
                if (googleSearchResults && googleSearchResults.length > 0) {
                  const tempGoogleFile = path.join(process.cwd(), 'scratch', `temp_google_${restaurantId}.json`);
                  fs.writeFileSync(tempGoogleFile, JSON.stringify(googleSearchResults));
                  valArgs.push("--google-context-file", tempGoogleFile);
                }
                if (mapsData) {
                  const tempMapsFile = path.join(process.cwd(), 'scratch', `temp_maps_${restaurantId}.json`);
                  fs.writeFileSync(tempMapsFile, JSON.stringify(mapsData));
                  valArgs.push("--maps-data-file", tempMapsFile);
                }
                
                {
                // Bloco de escopo para evitar conflito de variáveis
                  
                  const valProc = spawn("node", valArgs);
                  validationProcess = valProc;

                  let resultJsonStr = "";
                  valProc.stdout.on("data", (data) => {
                    const str = data.toString();
                    logBuffer += str;
                    const match = str.match(/RESULT:(.+)/);
                    if (match) resultJsonStr = match[1].trim();
                  });
                  
                  valProc.stderr.on("data", (data) => {
                    logBuffer += data.toString();
                  });

                  valProc.on("close", (valCode) => {
                    logBuffer += `\n🏁 Validação IA concluída com código de saída: ${valCode}\n`;
                    
                    if (!validationProcess) {
                      res.writeHead(200);
                      res.end(JSON.stringify({ success: false, error: "Processo interrompido." }));
                      return;
                    }

                    logBuffer += `\n📸 Iniciando Curadoria de Galeria de Fotos (Fase 6) para ID: ${restaurantId}...\n`;
                    const galleryArgs = ["scratch/gallery_enricher.cjs", "--single", "--id", restaurantId];
                    if (instagramHighlights && instagramHighlights.length > 0) {
                      const tempHighlightsFile = path.join(process.cwd(), 'scratch', `temp_highlights_${restaurantId}.json`);
                      fs.writeFileSync(tempHighlightsFile, JSON.stringify(instagramHighlights));
                      galleryArgs.push("--instagram-highlights-file", tempHighlightsFile);
                    }
                    const galleryProc = spawn("node", galleryArgs);
                    validationProcess = galleryProc;

                    galleryProc.stdout.on("data", (data) => {
                      logBuffer += data.toString();
                    });

                    galleryProc.stderr.on("data", (data) => {
                      logBuffer += data.toString();
                    });

                    galleryProc.on("close", (galleryCode) => {
                      logBuffer += `\n🏁 Curadoria de Galeria concluída com código: ${galleryCode}\n`;
                      
                      // Logo Scraper e Screenshot removidos daqui
                      // Logo é feita pelo frontend no PASSO 4 via extensão
                      // Screenshot pode ser gerado manualmente se necessário
                      validationProcess = null;

                      try {
                        const result = resultJsonStr ? JSON.parse(resultJsonStr) : { success: false };
                        res.writeHead(200);
                        res.end(JSON.stringify(result));
                      } catch (err) {
                        res.writeHead(500);
                        res.end(JSON.stringify({ success: false, error: "Erro ao processar resultado do robô." }));
                      }
                    });
                  });
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

            if (urlPath === "/api/local-collector/extract-menu" && req.method === "POST") {
              if (validationProcess) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Já existe um processo de validação em execução." }));
                return;
              }

              let body = "";
              req.on("data", (chunk) => { body += chunk.toString(); });
              req.on("end", () => {
                let parsed: any = {};
                try { parsed = JSON.parse(body); } catch (e) {}

                const restaurantId = parsed.restaurantId;
                if (!restaurantId) {
                  res.writeHead(400);
                  res.end(JSON.stringify({ error: "restaurantId não fornecido." }));
                  return;
                }

                logBuffer += `\n🍽️ Iniciando extração de cardápio para restaurante ID ${restaurantId}...\n`;

                const args = ["scratch/hybrid_menu_extractor_v2.cjs", "--id", restaurantId];
                if (parsed.menuEvidence) {
                  const evidenceFile = path.join(process.cwd(), "scratch", `temp_menu_evidence_${restaurantId}.json`);
                  fs.writeFileSync(evidenceFile, JSON.stringify(parsed.menuEvidence));
                  args.push("--evidence-file", evidenceFile);
                }
                if (parsed.dryRun || parsed.previewOnly) {
                  args.push("--dry-run");
                  logBuffer += `ðŸ§ª Modo prÃ©via: cardÃ¡pio serÃ¡ auditado antes de salvar.\n`;
                }
                const proc = spawn("node", args, { shell: true });
                validationProcess = proc;

                let resultJsonStr = "";
                let stdoutBuffer = "";
                proc.stdout.on("data", (data) => {
                  const text = data.toString("utf-8");
                  stdoutBuffer += text;
                  if (stdoutBuffer.length > 2000000) stdoutBuffer = stdoutBuffer.slice(-2000000);
                  logBuffer += text;
                  if (logBuffer.length > 100000) logBuffer = logBuffer.slice(-100000);
                  const markerIndex = stdoutBuffer.lastIndexOf("RESULT:");
                  if (markerIndex >= 0) {
                    const resultTail = stdoutBuffer.slice(markerIndex + "RESULT:".length);
                    const firstLine = resultTail.split(/\r?\n/)[0]?.trim();
                    if (firstLine) resultJsonStr = firstLine;
                  }
                });

                proc.stderr.on("data", (data) => {
                  logBuffer += `⚠️ [ERRO] ${data.toString("utf-8")}`;
                });

                proc.on("close", (code) => {
                  logBuffer += `\n🏁 Extração de cardápio concluída com código: ${code}\n`;
                  validationProcess = null;
                  try {
                    const result = resultJsonStr ? JSON.parse(resultJsonStr) : { success: false, message: "Nenhum resultado retornado." };
                    res.writeHead(200);
                    res.end(JSON.stringify(result));
                  } catch (err) {
                    res.writeHead(500);
                    res.end(JSON.stringify({ success: false, error: "Erro ao processar resultado da extração de cardápio." }));
                  }
                });
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
              
              const proc = spawn("node", ["scratch/download_upload_helper.cjs", url, storagePath], { shell: false });
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

            if (urlPath === "/api/local-collector/ocr" && req.method === "POST") {
              let bodyData = '';
              req.on('data', chunk => { bodyData += chunk.toString(); });
              req.on('end', async () => {
                try {
                  const parsed = JSON.parse(bodyData);
                  const image = parsed.image;
                  if (!image) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: "O parâmetro 'image' (base64) é obrigatório." }));
                    return;
                  }
                  
                  const { createWorker } = await import('tesseract.js');
                  const worker = await createWorker('por');
                  const { data: { text } } = await worker.recognize(image);
                  await worker.terminate();
                  
                  res.writeHead(200);
                  res.end(JSON.stringify({ success: true, text }));
                } catch (err: any) {
                  res.writeHead(500);
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
              return;
            }

            if (urlPath === "/api/local-collector/screenshot" && (req.method === "POST" || req.method === "GET")) {
              const restaurantId = urlParams.get("id");
              const origin = urlParams.get("origin") || "http://localhost:8080";
              
              if (!restaurantId) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "O parâmetro 'id' (Restaurant ID) é obrigatório." }));
                return;
              }

              console.log(`[API] Solicitando screenshot em tempo real para restaurante: ${restaurantId}`);
              
              const screenshotProc = spawn("node", ["scratch/capture_screenshot.cjs", "--id", restaurantId, "--origin", origin], { shell: true });
              let stdoutData = "";
              let stderrData = "";

              screenshotProc.stdout.on("data", (data) => {
                stdoutData += data.toString();
              });

              screenshotProc.stderr.on("data", (data) => {
                stderrData += data.toString();
              });

              screenshotProc.on("close", (code) => {
                if (code === 0) {
                  const resultMatch = stdoutData.match(/RESULT:(\{.*\})/);
                  if (resultMatch) {
                    try {
                      const result = JSON.parse(resultMatch[1]);
                      res.writeHead(200);
                      res.end(JSON.stringify(result));
                      return;
                    } catch (e) {
                      // ignore parse err
                    }
                  }
                  res.writeHead(200);
                  res.end(JSON.stringify({ success: true, message: "Print gerado com sucesso.", stdout: stdoutData }));
                } else {
                  console.error(`[API] Erro ao gerar print. Código: ${code}. Stderr: ${stderrData}`);
                  res.writeHead(500);
                  res.end(JSON.stringify({ success: false, error: `Processo finalizou com código ${code}`, stderr: stderrData }));
                }
              });
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
