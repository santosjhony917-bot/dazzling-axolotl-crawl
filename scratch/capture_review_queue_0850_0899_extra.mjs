import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const targets = [
  { id: 'ab8452f3-5574-462b-82fa-285bbcc7db4c', name: 'Carne e Brasa', url: 'https://app.anota.ai/boutique-da-carne-3', platform: 'anota_ai' },
  { id: 'd5665895-ea2e-4b8a-84dd-2f4fbfc62533', name: 'BobPub', url: 'https://pedido.anota.ai/loja/miguelbomb', platform: 'anota_ai' },
  { id: '6a77bbf9-c309-4018-86ae-a9344929e66a', name: 'Centrô Bar', url: 'https://pedido.anota.ai/loja/ponto-1-bar-e-restaurante', platform: 'anota_ai' },
  { id: '83c51ceb-490e-4619-91c4-df99830e7057', name: 'Cantinho do Rei', url: 'https://pedido.anota.ai/loja/cantinho-do-sabor-149', platform: 'anota_ai' },
  { id: '3b99a3a8-bd01-417d-be2c-4725313da515', name: 'Rancho Do Sertão', url: 'https://pedido.anota.ai/loja/rancho-goiano', platform: 'anota_ai' },
];

const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join('scratch', 'review-0850-0899-extra', runId);
fs.mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    await sleep(5000);
    const data = await page.evaluate(() => ({
      finalUrl: location.href,
      title: document.title,
      text: (document.body?.innerText || '').replace(/\s+/g, ' ').trim(),
      html: document.body?.innerHTML || '',
    }));
    fs.writeFileSync(path.join(dir, 'page.html'), data.html);
    fs.writeFileSync(path.join(dir, 'visible-text.txt'), data.text);
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ ...target, ...data }, null, 2));
    await page.screenshot({ path: path.join(dir, 'page.png'), fullPage: true });
    const strong = /jo[aã]o pessoa|banc[aá]rios|jaguaribe|mana[ií]ra|altiplano|bairro|rua|avenida|telefone|whatsapp|perfil da loja|unidade|cnpj|\(83\)/i.test(data.text);
    record.finalUrl = data.finalUrl;
    record.title = data.title;
    record.textLength = data.text.length;
    record.confidence = strong && data.text.length > 200 ? 'high' : 'medium';
    record.evidence_text = data.text.slice(0, 1600);
    record.safe = strong && data.text.length > 300;
  } catch (error) {
    record.error = error.message || String(error);
  }
  results.push(record);
}

fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2));
await browser.disconnect();
console.log(JSON.stringify({ outDir, results }, null, 2));
