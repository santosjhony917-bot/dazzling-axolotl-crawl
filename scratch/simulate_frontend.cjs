const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { createClient } = require('@supabase/supabase-js');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
if (!process.env.VITE_SUPABASE_URL) require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const targetId = process.argv[2] || '3677494e-6987-41e0-b239-debde2e2c40e';

async function runScript(scriptPath, args) {
  return new Promise((resolve) => {
    const proc = spawn('node', [scriptPath, ...args]);
    let result = null;
    proc.stdout.on('data', d => {
      const s = d.toString();
      console.log(s.trim());
      const match = s.match(/RESULT:(.+)/);
      if (match) {
        try { result = JSON.parse(match[1]); } catch(e){}
      }
    });
    proc.stderr.on('data', d => console.error(d.toString().trim()));
    proc.on('close', () => resolve(result));
  });
}

async function scrapePage(browser, url) {
  console.log(`[Puppeteer] Abrindo: ${url}`);
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    // Aguarda um pouco para renderização inicial
    await new Promise(r => setTimeout(r, 2000));
    
    const elementsWithAria = await page.$$('[aria-label]');
    for (let el of elementsWithAria) {
      try {
        const ariaLabel = await page.evaluate(e => e.getAttribute('aria-label'), el);
        if (ariaLabel && (ariaLabel.toLowerCase().includes('horário') || ariaLabel.toLowerCase().includes('horario') || ariaLabel.toLowerCase().includes('hours'))) {
          await el.click();
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch(e) {}
    }
    
    const text = await page.evaluate(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          let tablesText = '';
          try {
            const tables = document.querySelectorAll('table');
            tables.forEach(t => tablesText += "\\nTABLE: " + t.textContent);
          } catch(e) {}
          resolve(document.body.innerText + "\\n\\nHIDDEN TABLES:\\n" + tablesText);
        }, 1500);
      });
    });
    
    await page.close();
    return text;
  } catch(e) {
    console.error(`[Puppeteer] Erro ao abrir ${url}:`, e.message);
    await page.close();
    return '';
  }
}

async function main() {
  console.log(`Buscando restaurante ${targetId} no Supabase...`);
  const { data: rest } = await supabase.from('restaurants').select('*').eq('id', targetId).single();
  if (!rest) return console.log("Não encontrado.");

  console.log(`Restaurante: ${rest.name}`);
  let mapUrl = rest.googleMapsUrl;
  if (!mapUrl && rest.visit_notes) {
    const match = rest.visit_notes.match(/https:\/\/[^\s\n]*google[^\s\n]*\/maps[^\s\n]*/i) || rest.visit_notes.match(/https:\/\/[^\s\n]*maps\.app\.goo\.gl[^\s\n]*/i);
    if (match) mapUrl = match[0];
  }

  const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  // PASSO 1: Extrair Maps
  if (mapUrl) {
    const browserContext = await scrapePage(browser, mapUrl);
    if (browserContext) {
      const tempFile = path.join(__dirname, `temp_maps_${targetId}.txt`);
      fs.writeFileSync(tempFile, browserContext);
      console.log('--- Chamando extract_maps_data.cjs ---');
      await runScript('scratch/extract_maps_data.cjs', ['--id', targetId, '--browser-context-file', tempFile]);
    } else {
      console.log("Falha ao coletar Maps via Puppeteer.");
    }
  }

  // PASSO 2: Validar Instagram
  let currentInsta = null;
  if (rest.social_networks) {
    const sn = rest.social_networks.find(s => s.platform === 'instagram');
    if (sn) currentInsta = sn.url;
  }
  
  if (!currentInsta) {
    // Failsafe se não tiver, vamos forçar a URL do log
    currentInsta = 'https://www.instagram.com/lacasacafejp/';
  }

  if (currentInsta) {
    const instaContext = await scrapePage(browser, currentInsta);
    if (instaContext) {
      console.log('--- INSTAGRAM CONTEXT DUMP ---');
      console.log(instaContext.substring(0, 800));
      console.log('------------------------------');
      const tempFile = path.join(__dirname, `temp_insta_${targetId}.txt`);
      fs.writeFileSync(tempFile, instaContext);
      console.log('--- Chamando validate_instagram.cjs ---');
      const valRes = await runScript('scratch/validate_instagram.cjs', ['--id', targetId, '--instagram-url', currentInsta, '--instagram-context-file', tempFile]);
      if (valRes && valRes.isValid) {
        console.log("Validado com sucesso!");
      } else {
        console.log("Instagram reprovado. Motivo:", valRes?.reason);
      }
    } else {
      console.log("Falha ao coletar Insta via Puppeteer.");
    }
  }

  await browser.close();
}

main();
