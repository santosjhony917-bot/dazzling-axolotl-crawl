const puppeteer = require('puppeteer');
const path = require('path');
const { OpenAI } = require('openai');
const fs = require('fs');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
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
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const MODEL_NAME = process.env.VITE_AI_MODEL || "gpt-4o-mini";

async function run() {
  console.log('Scraping top 12 photos from Google Maps for A Barca Cabo Branco...');
  const name = "A Barca Cabo Branco";
  const city = "João Pessoa";
  const query = `${name} ${city}`;
  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
  
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  await delay(5000);
  
  const isList = await page.evaluate(() => {
    return !!document.querySelector('a[href*="/maps/place/"]');
  });
  if (isList) {
    await page.click('a[href*="/maps/place/"]');
    await delay(5000);
  }
  
  // click photo gallery
  await page.evaluate(() => {
    const firstImage = document.querySelector('button[jsaction*="pane.heroHeaderImage"] img') || document.querySelector('img[src*="googleusercontent.com"]');
    if (firstImage) {
      const btn = firstImage.closest('button');
      if (btn) btn.click();
    }
  });
  await delay(5000);

  // Scroll to load photos
  console.log('Scrolling to load photos...');
  for (let s = 0; s < 3; s++) {
    await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div.m6QErb, div[role="grid"], div[jsaction*="scroll"]'));
      for (const div of divs) {
        if (div.scrollHeight > div.clientHeight) {
          div.scrollTop = div.scrollHeight;
        }
      }
    });
    await delay(1500);
  }
  
  // scrape urls
  const scrapedUrls = await page.evaluate(() => {
    const list = [];
    
    // 1. Tags IMG
    document.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src') || '';
      if (src.includes('googleusercontent.com') || src.includes('streetviewpixels')) {
        if (!list.includes(src)) list.push(src);
      }
    });
    
    // 2. Tags DIV com background-image
    document.querySelectorAll('div').forEach(div => {
      const style = div.getAttribute('style') || '';
      if (style.includes('background-image')) {
        const match = style.match(/url\("?([^"]+)"?\)/);
        if (match) {
          const url = match[1];
          if (url.includes('googleusercontent.com') || url.includes('streetviewpixels')) {
            if (!list.includes(url)) list.push(url);
          }
        }
      }
    });
    
    return list;
  });
  
  const uniqueHighRes = [];
  for (const url of scrapedUrls) {
    let clean = url.trim();
    if (clean.includes('=')) {
      clean = clean.split('=')[0] + '=w1000-h800-k-no';
    } else {
      clean = clean + '=w1000-h800-k-no';
    }
    if (clean.startsWith('http') && !uniqueHighRes.includes(clean)) {
      uniqueHighRes.push(clean);
    }
  }
  
  const top12 = uniqueHighRes.slice(0, 12);
  console.log(`Found ${top12.length} photos.`);
  
  // Let's ask OpenAI to describe each photo and say if it has people
  for (let idx = 0; idx < top12.length; idx++) {
    const url = top12[idx];
    try {
      const completion = await openai.chat.completions.create({
        model: MODEL_NAME,
        messages: [
          { role: "system", content: "Responda de forma curta se a imagem contém pessoas ou rostos humanos visíveis, e o que ela mostra." },
          {
            role: "user",
            content: [
              { type: "text", text: `Imagem índice ${idx}:` },
              { type: "image_url", image_url: { url } }
            ]
          }
        ],
        temperature: 0.1
      });
      console.log(`[Índice ${idx}] URL: ${url.substring(0, 80)}...`);
      console.log(`👉 Descrição: ${completion.choices[0].message.content.trim()}\n`);
    } catch (err) {
      console.error(`Error on index ${idx}:`, err.message);
    }
  }
  
  await browser.close();
}

run();
