import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const targets = [
  { id: '8313c496-1cdb-4fae-ada7-309aced8b349', name: 'Brothers in law burger', url: 'https://instadelivery.com.br/brothersinlawburger', platform: 'instadelivery' },
  { id: 'e1f12fc0-d879-4476-8b20-d0a2143c63e0', name: 'Recanto Argentino | Hamburgueria, sanduicheria | Culinária Argentina', url: 'https://instadelivery.com.br/recantoargentinoo', platform: 'instadelivery' },
  { id: 'd5dc8f61-3dda-4b80-8869-54bad6516483', name: 'La Panela Restaurante', url: 'https://lapanelajp.ola.click', platform: 'olaclick' },
  { id: '3b5a19bc-e756-42e6-9f51-a3bbccc4ed2d', name: 'Pinto no Balde bessa', url: 'https://instadelivery.com.br/pintonobalde', platform: 'instadelivery' },
  { id: 'd9cbfff8-2d2a-42c3-89a7-1b057ef74e1b', name: 'Bom Sabor (Marmitas e Quentinhas)', url: 'https://instadelivery.com.br/bomsaborrestaurantejp', platform: 'instadelivery' },
];

const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join('scratch', 'review-0700-0749', runId);
fs.mkdirSync(outDir, { recursive: true });

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
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
    await sleep(4000);
    const data = await page.evaluate(() => {
      const text = document.body?.innerText || '';
      const anchors = Array.from(document.querySelectorAll('a[href]')).slice(0, 100).map((a) => ({ text: a.innerText, href: a.href }));
      return {
        finalUrl: location.href,
        title: document.title,
        text: text.replace(/\s+/g, ' ').trim(),
        html: document.body?.innerHTML || '',
        anchors,
      };
    });
    fs.writeFileSync(path.join(dir, 'page.html'), data.html);
    fs.writeFileSync(path.join(dir, 'visible-text.txt'), data.text);
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ ...target, ...data }, null, 2));
    await page.screenshot({ path: path.join(dir, 'page.png'), fullPage: true });
    record.finalUrl = data.finalUrl;
    record.title = data.title;
    record.textLength = data.text.length;
    record.safe = /jo[aã]o pessoa|banc[aá]rios|bairro|rua|avenida|telefone|cnpj|delivery/i.test(data.text);
    record.sample = data.text.slice(0, 500);
  } catch (error) {
    record.error = error.message || String(error);
  }
  results.push(record);
}

fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2));
await browser.disconnect();
console.log(JSON.stringify({ outDir, results }, null, 2));
