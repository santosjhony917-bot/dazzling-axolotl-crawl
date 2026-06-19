const puppeteer = require('puppeteer');

async function run() {
  const url = 'https://acai83.my.canva.site/black-and-beige-modern-photographer-personal-bio-link-instagram-story?utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAZXh0bgNhZW0CMTEAc3J0YwZhcHBfaWQPOTM2NjE5NzQzMzkyNDU5AAGnPnY5lBQMvYgM2JDnACcGAzX7vtAf_-3CGrXTTbHtUVYQu3KEshF60K1GoSE_aem_ettR6KuuZ9M7UwSY_Max_A';
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  const text = await page.evaluate(() => document.body.innerText || '');
  console.log('--- Body Text ---');
  console.log(text);
  
  const images = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).map(img => img.src);
  });
  console.log('--- Images ---');
  console.log(JSON.stringify(images, null, 2));

  await browser.close();
}

run().catch(console.error);
