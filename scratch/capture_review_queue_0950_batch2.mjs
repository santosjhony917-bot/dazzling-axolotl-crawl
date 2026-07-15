import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const targets = [
  { id: 'd8efaa69-62de-4f55-b274-5a7fb9a197e3', name: 'China In Casa', url: 'https://china-in-casa-2.ola.click', platform: 'olaclick' },
  { id: '11bffeb0-284b-44ff-a5da-0da9fc8817de', name: 'Feijoada e Dobradinha do Baixinho', url: 'https://pedido.anota.ai/loja/cantinhodafeijoadajp', platform: 'anota_ai' },
  { id: 'b636d36a-8eb0-4971-b717-12bf16315289', name: 'ESPETINHO E BRASA', url: 'https://pedido.anota.ai/loja/brasa-espetos-e-petiscos-manaira', platform: 'anota_ai' },
  { id: '86ccdfc8-3877-4b68-b74f-19bac0645e9e', name: 'Sabor do Nordeste', url: 'https://pedido.anota.ai/loja/sabor-nordestino-95', platform: 'anota_ai' },
  { id: '0399d447-91c0-4d91-9253-8a85716e7c62', name: 'Restaurante Tempero Nosso', url: 'https://pedido.anota.ai/loja/tempero-da-raquel', platform: 'anota_ai' },
  { id: '5f690224-9493-4d69-853a-8b0709dae1df', name: 'Tambiá Chef', url: 'https://pedido.anota.ai/loja/pizzaria-refgio-2', platform: 'anota_ai' },
  { id: '526fb034-0ea2-4971-b2bf-51d23bbfebb9', name: 'Vibe Beach Bar', url: 'https://fabio-beach-bar-e-restaurante.goomer.app', platform: 'goomer' },
  { id: 'd73fd6c6-d3cc-449c-b061-6d749ced314b', name: 'Subway', url: 'https://instadelivery.com.br/subwaypb', platform: 'instadelivery' },
  { id: '5114d4c2-166c-4925-81bc-6074dcafacb0', name: 'LoucosporCookies', url: 'https://instadelivery.com.br/LoucosporCookies', platform: 'instadelivery' },
  { id: '30d08e36-7a4e-4102-8ea3-671a9ae6ed0c', name: 'Bar da Gente - Pub e Petiscaria - Unidade Geisel', url: 'https://pedido.anota.ai/loja/amendoeiras-bar', platform: 'anota_ai' },
];

const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join('scratch', 'review-0950-batch2', runId);
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
    await sleep(4500);
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
    const strong = /jo[aã]o pessoa|mana[ií]ra|geisel|banc[aá]rios|rua|avenida|telefone|whatsapp|perfil da loja|card[aá]pio|menu|endereço|unidade|cnpj|\(83\)/i.test(data.text);
    record.finalUrl = data.finalUrl;
    record.title = data.title;
    record.textLength = data.text.length;
    record.confidence = strong && data.text.length > 200 ? 'high' : 'medium';
    record.evidence_text = data.text.slice(0, 1600);
    record.verdict = strong && data.text.length > 300 ? 'green' : 'yellow';
  } catch (error) {
    record.error = error.message || String(error);
    record.verdict = 'rejected';
  }
  results.push(record);
}

fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2));
await browser.disconnect();
console.log(JSON.stringify({ outDir, results }, null, 2));
