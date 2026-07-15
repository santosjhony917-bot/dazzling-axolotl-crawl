import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const targets = [
  { id: 'fba56fdb-fa5b-4889-87b6-bed0946f1466', name: 'Califórnia Lanches', url: 'https://california-lanches-3.ola.click/info', platform: 'olaclick' },
  { id: '02a7b45d-ccb0-4100-8e21-d9c0c6f8649e', name: 'Santa Cana Bar e Restaurante João Pessoa', url: 'https://linktr.ee/santacanabar', platform: 'linktree' },
  { id: '33c6f87f-d9f1-4283-93c2-d60708214755', name: 'Chez Nanny', url: 'https://livemenu.app/menu/698c7a361909443c72ee81c6?origin=channels', platform: 'livemenu' },
  { id: '17f3aecd-a7f8-4e2f-91f9-a1bffc403f25', name: 'Cacau Show - Chocolates', url: 'https://pedido.anota.ai/loja/cacau-show-chocolates-ptioaltiplano', platform: 'anota_ai' },
  { id: '142d722f-4b9a-48c7-880f-b3fc1832cc76', name: 'Skina Lanches', url: 'https://pedido.anota.ai/loja/skina-lanches-13-de-maio?f=msa', platform: 'anota_ai' },
];

const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join('scratch', 'review-0800-0849', runId);
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
    const strong = /jo[aã]o pessoa|banc[aá]rios|tambi[aá]|altiplano|bessa|jaguaribe|telefone|whatsapp|rua|avenida|bairro|unidade|cnpj|\(83\)/i.test(data.text);
    record.finalUrl = data.finalUrl;
    record.title = data.title;
    record.textLength = data.text.length;
    record.confidence = strong && data.text.length > 200 ? 'high' : 'medium';
    record.evidence_text = data.text.slice(0, 1400);
    record.safe = strong && data.text.length > 300;
  } catch (error) {
    record.error = error.message || String(error);
  }
  results.push(record);
}

fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2));
await browser.disconnect();
console.log(JSON.stringify({ outDir, results }, null, 2));
