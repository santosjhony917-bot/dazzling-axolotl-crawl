const puppeteer = require('puppeteer');

async function run() {
  const url = 'https://acai83.my.canva.site/black-and-beige-modern-photographer-personal-bio-link-instagram-story?utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAZXh0bgNhZW0CMTEAc3J0YwZhcHBfaWQPOTM2NjE5NzQzMzkyNDU5AAGnPnY5lBQMvYgM2JDnACcGAzX7vtAf_-3CGrXTTbHtUVYQu3KEshF60K1GoSE_aem_ettR6KuuZ9M7UwSY_Max_A';
  
  console.log('Launching browser to inspect Canva link...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });

  const title = await page.title();
  console.log('Title:', title);

  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      text: (a.textContent || '').trim().replace(/\s+/g, ' '),
      href: a.href
    }));
  });

  console.log('Links found on the Canva page:');
  console.log(JSON.stringify(links, null, 2));

  await browser.close();
}

run().catch(console.error);
