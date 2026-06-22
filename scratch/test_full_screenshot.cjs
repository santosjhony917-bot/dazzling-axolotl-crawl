const puppeteer = require('puppeteer');
const path = require('path');

async function run() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });
  
  const page = await browser.newPage();
  
  // Set high density viewport (deviceScaleFactor: 3 makes it extremely high definition!)
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  
  // Bypass paywall before navigation
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('acesso_vitalicio', 'true');
    localStorage.setItem('has_unlocked_limit', 'true');
  });

  const url = 'http://localhost:8081/restaurant/011bf190-2262-4407-812d-b0a900e6b445';
  console.log(`Navigating to ${url}...`);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  
  console.log('Waiting for content to load...');
  await new Promise(r => setTimeout(r, 4500));

  // Let's remove the sticky header
  await page.evaluate(() => {
    const header = document.querySelector('header');
    if (header) header.style.display = 'none';
  });

  // Let's scroll to the bottom of the page to trigger any lazy loading or rendering
  console.log('Scrolling to bottom...');
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.documentElement.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });

  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 1000));

  const dest = path.join(__dirname, 'test_scroll_screenshot.jpg');
  console.log(`Taking screenshot to ${dest}...`);
  await page.screenshot({ path: dest, type: 'jpeg', quality: 95, fullPage: true });

  console.log('Done!');
  await browser.close();
}

run().catch(console.error);
