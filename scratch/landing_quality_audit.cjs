const puppeteer = require('puppeteer');
const path = require('path');

const outputDir = 'C:/Users/meuno/.codex/visualizations/2026/07/13/019f5cf1-0fa3-7c42-ae68-3dd7e31dbd59/landing';
const url = 'http://localhost:8080/landing';
const viewports = [
  { name: 'wide', width: 1918, height: 1080 },
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812, isMobile: true },
];

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function prepare(page) {
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await pause(750);
}

async function loadLazyContent(page) {
  await page.evaluate(async () => {
    const step = Math.max(500, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    window.scrollTo(0, 0);
  });
  await pause(300);
}

async function inspect(page, runtimeMessages) {
  return page.evaluate((messages) => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    };

    const controls = [...document.querySelectorAll('button, a, input, summary')]
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label: (element.getAttribute('aria-label') || element.textContent || element.getAttribute('placeholder') || element.tagName).trim().replace(/\s+/g, ' ').slice(0, 80),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          tag: element.tagName,
        };
      });

    const textSizes = [...document.querySelectorAll('body *')]
      .filter((element) => visible(element) && [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()))
      .map((element) => ({
        text: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 80),
        size: Number.parseFloat(getComputedStyle(element).fontSize),
      }));

    const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
    const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    const images = [...document.images].map((image) => ({ alt: image.alt, complete: image.complete, width: image.naturalWidth, height: image.naturalHeight }));

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      page: { scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight },
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      headings: [...document.querySelectorAll('h1,h2,h3')].map((heading) => ({ level: heading.tagName, text: heading.textContent.trim().replace(/\s+/g, ' ').slice(0, 100) })),
      h1Count: document.querySelectorAll('h1').length,
      duplicateIds,
      brokenImages: images.filter((image) => !image.complete || image.width === 0),
      emptyAltCount: images.filter((image) => !image.alt.trim()).length,
      smallestText: textSizes.sort((a, b) => a.size - b.size).slice(0, 8),
      undersizedControls: controls.filter((control) => control.height < 44 || control.width < 44),
      runtimeMessages: messages,
      hasSkipLink: !![...document.querySelectorAll('a')].find((link) => link.textContent.includes('Ir para o conteúdo')),
      mainLandmark: !!document.querySelector('main'),
      externalBlankWithoutRel: [...document.querySelectorAll('a[target="_blank"]')].filter((link) => !/noopener/.test(link.rel)).length,
    };
  }, runtimeMessages);
}

async function run() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const report = { viewports: {}, behavior: {} };

  for (const viewport of viewports) {
    const page = await browser.newPage();
    const messages = [];
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') messages.push(`${message.type()}: ${message.text()}`);
    });
    page.on('pageerror', (error) => messages.push(`pageerror: ${error.message}`));
    await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1, isMobile: !!viewport.isMobile, hasTouch: !!viewport.isMobile });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await prepare(page);
    await page.screenshot({ path: path.join(outputDir, `final30-${viewport.name}-hero.png`) });
    await loadLazyContent(page);
    await page.screenshot({ path: path.join(outputDir, `final30-${viewport.name}-full.png`), fullPage: true });
    report.viewports[viewport.name] = await inspect(page, messages);
    await page.close();
  }

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await prepare(page);

  const runSuggestion = async (label) => {
    await page.evaluate((text) => {
      const button = [...document.querySelectorAll('button')].find((candidate) => candidate.textContent.trim() === text);
      if (!button) throw new Error(`Suggestion not found: ${text}`);
      button.click();
    }, label);
    await pause(900);
    await page.waitForSelector('[data-demo-results]', { visible: true, timeout: 3000 });
    return page.$eval('[data-demo-results]', (element) => element.textContent.trim().replace(/\s+/g, ' '));
  };

  report.behavior.japanese = await runSuggestion('Japonês');
  report.behavior.pizza = await runSuggestion('Pizza para 4');

  await page.click('#landing-ai-question', { clickCount: 3 });
  await page.keyboard.press('Control+A');
  await page.type('#landing-ai-question', 'Quero comida vegana no bairro Bancarios por ate 60 reais');
  await page.$eval('#landing-ai-question', (input) => input.form.requestSubmit());
  await pause(900);
  await page.waitForSelector('[data-demo-results]', { visible: true, timeout: 3000 });
  report.behavior.custom = await page.$eval('[data-demo-results]', (element) => element.textContent.trim().replace(/\s+/g, ' '));
  report.behavior.events = await page.evaluate(() => window.dataLayer || []);

  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((candidate) => candidate.textContent.includes('Encontrar onde comer'));
    button.click();
  });
  await pause(500);
  report.behavior.cta = await page.evaluate(() => ({
    activeId: document.activeElement && document.activeElement.id,
    demoTop: Math.round(document.querySelector('#landing-ai-question').getBoundingClientRect().top),
    scrollY: Math.round(window.scrollY),
    events: window.dataLayer || [],
  }));

  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((candidate) => candidate.textContent.includes('Ver cardápio'));
    button.click();
  });
  await pause(500);
  report.behavior.resultDestination = page.url();

  await page.close();
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
