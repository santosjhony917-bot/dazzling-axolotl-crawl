const puppeteer = require('puppeteer');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  const query = 'Marvel Burguer PRIME João Pessoa instagram';
  console.log(`Searching DuckDuckGo for: "${query}"`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'pt-BR,pt;q=0.9'
  });

  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
  await delay(2000);

  const data = await page.evaluate(() => {
    const title = document.title;
    const bodyText = document.body.innerText.substring(0, 500);
    const links = Array.from(document.querySelectorAll('a')).slice(0, 30).map(a => ({
      text: a.textContent.trim(),
      href: a.getAttribute('href')
    }));
    return { title, bodyText, links };
  });

  console.log('Page Title:', data.title);
  console.log('Body Text snippet:', data.bodyText);
  console.log('Links found (first 30):');
  data.links.forEach((l, i) => {
    console.log(`- [Link ${i+1}] "${l.text}" -> ${l.href}`);
  });

  await browser.close();
}

run();
