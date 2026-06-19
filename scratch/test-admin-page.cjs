const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set viewport size
  await page.setViewport({ width: 1280, height: 800 });
  
  // Listen to browser console and errors
  page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.text()));
  page.on('pageerror', err => console.error('[BROWSER ERROR]', err.toString()));
  
  try {
    // Log all requests
    page.on('request', req => {
      const url = req.url();
      if (!url.includes('hot-update') && !url.includes('node_modules') && !url.includes('.vite')) {
        console.log('[REQUEST]', url);
      }
    });

    // Navigate to homepage first to establish origin
    console.log('Navigating to http://localhost:8081/ to set up session...');
    await page.goto('http://localhost:8081/', { waitUntil: 'load' });
    
    // Set mock admin session in localStorage
    console.log('Setting mock session in localStorage...');
    await page.evaluate(() => {
      localStorage.setItem('mockSession', JSON.stringify({
        user: { id: 'mock-admin-user-id', email: 'admin@restaurante.com' },
        profile: { id: 'mock-admin-user-id', email: 'admin@restaurante.com', first_name: 'Admin', last_name: 'Geral', role: 'admin' },
        restaurant: null
      }));
    });
    
    // Navigate to admin restaurants page
    console.log('Navigating to http://localhost:8081/admin/restaurants...');
    await page.goto('http://localhost:8081/admin/restaurants', { waitUntil: 'load' });
    
    // Wait a bit for queries to settle
    console.log('Waiting for 5 seconds for page rendering...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get page content details
    const contentInfo = await page.evaluate(() => {
      const html = document.body.innerHTML;
      const hasLoader = html.includes('animate-spin') || html.includes('Loader2') || document.querySelector('.animate-spin') !== null;
      const hasTable = document.querySelector('table') !== null;
      const textSample = document.body.innerText.substring(0, 500);
      return { hasLoader, hasTable, textSample };
    });
    
    console.log('Page state info:', contentInfo);
    
    // Capture screenshot
    const screenshotPath = path.join('C:\\Users\\meuno\\.gemini\\antigravity\\brain\\6186e84d-17fd-47d6-8cb2-9edea52bd9e6', 'admin_restaurants_test.png');
    console.log(`Taking screenshot to ${screenshotPath}...`);
    await page.screenshot({ path: screenshotPath });
    
  } catch (e) {
    console.error('Error during automation:', e);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

main();
