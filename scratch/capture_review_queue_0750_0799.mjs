import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const targets = [
  { id: 'aa93f955-87e0-4810-a4f2-b7e5e67975a3', name: 'Confraria Lima Bar & Lanchonete', url: 'https://pedido.anota.ai/loja/confrariadapizza', platform: 'anota_ai' },
  { id: 'e9a5f85d-7f12-48bc-809c-40fe04f8795d', name: 'Zeny Bessa', url: 'https://deliverydireto.com.br/sonhodocedoceria/sonhodocedoceria', platform: 'deliverydireto' },
  { id: '5b9c1239-6adf-45eb-af7d-e6139d81c177', name: 'Restaurante Sabores Poéticos', url: 'https://app.cardapioweb.com/maissabores', platform: 'cardapioweb' },
  { id: 'e71b86f6-340e-4a32-b6f7-d27c5d848a41', name: 'Jaguaribe Espetos', url: 'https://pedido.anota.ai/loja/casa-do-espetos', platform: 'anota_ai' },
  { id: '1d5a0bae-d18b-4b58-854b-07c9be802ab5', name: 'Supremo Oriente', url: 'https://pedido.anota.ai/loja/novooriente-bancarios', platform: 'anota_ai' },
];

const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join('scratch', 'review-0750-0799', runId);
fs.mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9224' });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1200 });

const results = [];
for (const target of targets) {
  const slug = `${target.platform}-${target.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
  const dir = path.join(outDir, slug);
  fs.mkdirSync(dir, { recursive: true });
  const record = { ...target, slug, dir };
  try {
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(4000);
    const data = await page.evaluate(() => {
      const text = document.body?.innerText || '';
      return {
        finalUrl: location.href,
        title: document.title,
        text: text.replace(/\s+/g, ' ').trim(),
        html: document.body?.innerHTML || '',
      };
    });
    fs.writeFileSync(path.join(dir, 'page.html'), data.html);
    fs.writeFileSync(path.join(dir, 'visible-text.txt'), data.text);
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ ...target, ...data }, null, 2));
    await page.screenshot({ path: path.join(dir, 'page.png'), fullPage: true });
    const strong = /jo[aã]o pessoa|banc[aá]rios|jaguaribe|tamb[aá]u|rua|avenida|telefone|cnpj|\(83\)|bairro/i.test(data.text);
    record.finalUrl = data.finalUrl;
    record.title = data.title;
    record.textLength = data.text.length;
    record.confidence = strong ? 'high' : 'medium';
    record.evidence_text = data.text.slice(0, 1200);
    record.safe = strong && data.text.length > 200;
  } catch (error) {
    record.error = error.message || String(error);
  }
  results.push(record);
}

fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2));
await browser.disconnect();
console.log(JSON.stringify({ outDir, results }, null, 2));
