const puppeteer = require('puppeteer');

async function run() {
  const url = 'https://www.google.com.br/maps/place/A%C3%A7a%C3%AD+83+-+Self+Service/@-7.1576605,-34.8396098,17z/data=!3m1!4b1!4m6!3m5!1s0x7acc3f034e31483:0x9ffdac876d33fa9c!8m2!3d-7.1576605!4d-34.8370349!16s%2Fg%2F11hz6v2zxj?entry=tts&g_ep=EgoyMDI0MTAwMi4xIPu8ASoASAFQAw%3D%3D';
  
  console.log('Launching browser to inspect Google Maps place...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  // Set user agent and view port to simulate desktop Google Maps
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  console.log('Google Maps loaded. Scraping website link and metadata...');

  const result = await page.evaluate(() => {
    // Look for website/menu links in the sidebar info
    const allLinks = Array.from(document.querySelectorAll('a')).map(a => ({
      href: a.href,
      ariaLabel: a.getAttribute('aria-label') || '',
      text: (a.textContent || '').trim()
    }));
    
    // Filter links that might be the business website
    const businessWebsites = allLinks.filter(l => {
      const href = l.href.toLowerCase();
      return (
        !href.includes('google.com') && 
        !href.includes('gstatic.com') &&
        href.startsWith('http')
      );
    });

    return {
      title: document.title,
      businessWebsites,
      allLinks: allLinks.slice(0, 100)
    };
  });

  console.log('Google Maps title:', result.title);
  console.log('Business websites found on Google Maps:');
  console.log(JSON.stringify(result.businessWebsites, null, 2));

  await browser.close();
}

run().catch(console.error);
