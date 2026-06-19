const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

// Carrega as variáveis de ambiente
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    });
  }
}
loadEnv();

const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const OPENROUTER_API_KEY = process.env.VITE_OPENROUTER_API_KEY;

let openai;
if (OPENROUTER_API_KEY) {
  openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
  });
} else {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
}

async function fetchJinaContext(query) {
  try {
    const url = `https://s.jina.ai/${encodeURIComponent(query)}`;
    const headers = {
      'Accept': 'application/json',
      'X-Retain-Images': 'none'
    };
    if (process.env.VITE_JINA_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.VITE_JINA_API_KEY}`;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) return null;
    const json = await response.json();
    return json.data ? JSON.stringify(json.data) : null;
  } catch (err) {
    console.error('Jina Error:', err.message);
    return null;
  }
}

async function run() {
  const name = "A Barca Cabo Branco";
  const city = "João Pessoa";
  const state = "PB";
  
  const query = `${name} ${city} ${state} cardapio instagram telefone`;
  console.log(`Jina Query: "${query}"`);
  
  const jinaCtx = await fetchJinaContext(query);
  console.log("\n--- Jina Context Output (first 1200 chars) ---");
  console.log(jinaCtx ? jinaCtx.substring(0, 1200) : "Vazio");
  
  // Let's also search with query containing horario/funcionamento
  const queryHours = `${name} ${city} ${state} horario funcionamento`;
  console.log(`\nJina Hours Query: "${queryHours}"`);
  const jinaHoursCtx = await fetchJinaContext(queryHours);
  console.log("\n--- Jina Hours Context Output (first 1200 chars) ---");
  console.log(jinaHoursCtx ? jinaHoursCtx.substring(0, 1200) : "Vazio");
}

run();
