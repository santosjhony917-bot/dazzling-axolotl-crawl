const puppeteer = require('puppeteer');
const path = require('path');
const http = require('http');

// Start a tiny local server so we have a valid externally_connectable origin
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<html><body><h1>Test</h1></body></html>');
});
server.listen(3000, async () => {
  console.log('Local server started on http://localhost:3000');

  const extPath = path.resolve(__dirname, '../dist/chrome-extension');

  try {
    console.log('Launching Puppeteer with extension...');
    const browser = await puppeteer.launch({
      headless: false, // Must be false for extensions to load properly
      args: [
        `--disable-extensions-except=${extPath}`,
        `--load-extension=${extPath}`,
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    // We need to find the extension ID.
    // In Manifest V3, we can find the background service worker target to get the ID.
    console.log('Waiting for extension to load...');
    let extensionId = '';
    for (let i = 0; i < 20; i++) {
      const targets = await browser.targets();
      const extTargets = targets.filter(t => t.url().startsWith('chrome-extension://'));
      if (extTargets.length > 0) {
        extensionId = new URL(extTargets[0].url()).hostname;
        console.log('Found Extension ID:', extensionId);
        break;
      }
      await new Promise(r => setTimeout(r, 500));
    }

    if (!extensionId) {
      throw new Error('Failed to retrieve extension ID');
    }

    console.log('Opening page...');
    const page = await browser.newPage();
    await page.goto('http://localhost:3000');

    console.log('Sending ping message...');
    const pingRes = await page.evaluate(async (extId) => {
      return new Promise(resolve => {
        chrome.runtime.sendMessage(extId, { action: "ping" }, (res) => {
          if (chrome.runtime.lastError) {
            resolve({ error: chrome.runtime.lastError.message });
          } else {
            resolve({ success: true, data: res });
          }
        });
      });
    }, extensionId);
    console.log('Ping Response:', pingRes);

    console.log('Sending scrapeMenuFromInstagram message...');
    const scrapeRes = await page.evaluate(async (extId) => {
      return new Promise(resolve => {
        try {
          const port = chrome.runtime.connect(extId, { name: "scrapeMenuFromInstagramPort" });
          port.onMessage.addListener((res) => {
            resolve({ success: true, data: res });
            port.disconnect();
          });
          port.onDisconnect.addListener(() => {
            const err = chrome.runtime.lastError;
            resolve({ error: err ? err.message : "Port disconnected" });
          });
          port.postMessage({ 
            action: "scrapeMenuFromInstagram", 
            instagramUrl: "https://www.instagram.com/alainesfiharia/", 
            restaurantName: "Alain Esfiharia" 
          });
        } catch (e) {
          resolve({ error: e.message });
        }
      });
    }, extensionId);
    console.log('Scrape Response:', scrapeRes);

    await browser.close();
  } catch (e) {
    console.error('Puppeteer Test Failed:', e);
  } finally {
    server.close();
  }
});
