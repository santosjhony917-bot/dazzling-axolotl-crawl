import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const targets = [
  { id: '526fb034-0ea2-4971-b2bf-51d23bbfebb9', name: 'Vibe Beach Bar', url: 'https://fabio-beach-bar-e-restaurante.goomer.app', platform: 'goomer' },
  { id: 'd8efaa69-62de-4f55-b274-5a7fb9a197e3', name: 'China In Casa', url: 'https://china-in-casa-2.ola.click', platform: 'olaclick' },
  { id: '11bffeb0-284b-44ff-a5da-0da9fc8817de', name: 'Feijoada e Dobradinha do Baixinho', url: 'https://pedido.anota.ai/loja/cantinhodafeijoadajp', platform: 'anota_ai' },
  { id: '1856dd9a-78ca-43e1-9feb-3d028f5861e3', name: 'Restaurante Citron', url: 'https://instagram.com/citronrestaurante', platform: 'instagram' },
  { id: '508378d2-d372-4e88-84c7-4ee0791cfc5c', name: 'Mister Japa Sushi | Manaíra', url: 'https://instagram.com/mrjapasushijp', platform: 'instagram' },
];

const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join('scratch', 'review-0950', runId);
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
    const strong = /jo[aã]o pessoa|mana[ií]ra|bessa|cabo branco|bairro|rua|avenida|telefone|whatsapp|perfil da loja|card[aá]pio|menu|endereço|unidade|cnpj|\(83\)/i.test(data.text);
    record.finalUrl = data.finalUrl;
    record.title = data.title;
    record.textLength = data.text.length;
    record.confidence = strong && data.text.length > 200 ? 'high' : 'medium';
    record.evidence_text = data.text.slice(0, 1800);
    record.safe = strong && data.text.length > 300;
  } catch (error) {
    record.error = error.message || String(error);
  }
  results.push(record);
}

fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2));
await browser.disconnect();
console.log(JSON.stringify({ outDir, results }, null, 2));
