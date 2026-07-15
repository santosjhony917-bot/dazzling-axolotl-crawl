import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const targets = [
  { id: 'e57ce880-43a7-4450-9c4e-6ec0823bb06f', name: 'Taiko Sushi', url: 'https://taikosushi.ola.click/products', platform: 'olaclick' },
  { id: '10f5b1f1-8653-4f1e-85b4-13bbeb74b157', name: 'Galetos Delivery', url: 'https://app.cardapioweb.com/galetos_restaurante', platform: 'cardapioweb' },
  { id: '37e08844-8bd7-49b3-b317-33bd6d9b05d3', name: 'Au Au Lanches', url: 'https://instadelivery.com.br/auaulanches', platform: 'instadelivery' },
  { id: '651ebfb8-5e6f-4ceb-9c5c-c28ae72d8bf0', name: 'O Leitão Lanches hambúrgueria', url: 'https://meucarrinho.delivery/oleitao', platform: 'meucarrinho' },
  { id: 'b1a809a9-06be-4af4-86c6-2832a580bf60', name: 'Restaurante Casa Guireli Manaira', url: 'https://instagram.com/casaguireli', platform: 'instagram' },
];

const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join('scratch', 'review-0850-0899', runId);
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
    const strong = /jo[aã]o pessoa|banc[aá]rios|mana[ií]ra|cabo branco|bairro|rua|avenida|telefone|whatsapp|perfil da loja|unidade|cnpj|\(83\)/i.test(data.text);
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
