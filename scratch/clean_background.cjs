const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../public/chrome-extension/background.js');
let content = fs.readFileSync(filePath, 'utf8');

// Remover listeners
const listenersToRemove = [
  "if (message.action === \"scrapeInstagramPost\") {",
  "if (message.action === \"searchGoogleForMenu\") {",
  "if (message.action === \"scrapeWebContext\") {",
  "if (message.action === \"getAgentSnapshot\") {",
  "if (message.action === \"clickAgentElement\") {",
  "if (message.action === \"closeAgentTab\") {",
  "if (message.action === \"searchGoogleNative\") {"
];

let lines = content.split('\n');
let newLines = [];
let skip = false;
let braceCount = 0;

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  let isListenerStart = listenersToRemove.some(l => line.includes(l));
  
  if (isListenerStart && !skip) {
    skip = true;
    braceCount = 0;
  }
  
  if (skip) {
    braceCount += (line.match(/\{/g) || []).length;
    braceCount -= (line.match(/\}/g) || []).length;
    if (braceCount === 0) {
      skip = false;
    }
    continue;
  }
  
  newLines.push(line);
}

content = newLines.join('\n');

// Funções para remover
const funcsToRemove = [
  "async function handleInstagramPostScrape",
  "async function handleSearchGoogleForMenu",
  "async function handleWebContextScrape",
  "async function handleSearchGoogleNative",
  "async function handleAgentSnapshot",
  "async function handleClickAgentElement",
  "async function handleAgentClose"
];

newLines = [];
skip = false;
braceCount = 0;

lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  let isFuncStart = funcsToRemove.some(f => line.startsWith(f));
  
  if (isFuncStart && !skip) {
    skip = true;
    braceCount = 0;
  }
  
  if (skip) {
    braceCount += (line.match(/\{/g) || []).length;
    braceCount -= (line.match(/\}/g) || []).length;
    if (braceCount === 0) {
      skip = false;
    }
    continue;
  }
  
  newLines.push(line);
}

// Remover Variáveis Globais do Agente
content = newLines.join('\n');

const agentGlobalStart = content.indexOf("// ==========================================\n// AGENTE DE NAVEGAÇÃO");
if (agentGlobalStart !== -1) {
  let before = content.substring(0, agentGlobalStart);
  let afterAgent = content.substring(agentGlobalStart);
  // Remove the block roughly ending with the last handleAgentClose or similar if it wasn't caught.
  // We can just use string replace.
  
  // As the user said: Remover Agente de Cliques (linhas ~1853-1989)
  // Let's find "// ==========================================" that marks the start
  // and remove until we hit the next major block or EOF.
  const nextBlock = afterAgent.indexOf("// ==========================================\n", 100);
  if (nextBlock !== -1) {
    afterAgent = afterAgent.substring(nextBlock);
    content = before + afterAgent;
  } else {
    content = before;
  }
}

fs.writeFileSync(filePath, content.replace(/\n{3,}/g, '\n\n'));
console.log("background.js limpo com sucesso!");
