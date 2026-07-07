import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const TARGETS = [
  { id: '8322d0f6-8e08-4de7-a73f-d71c57f0291d', name: 'Ilovepizzapb' },
  { id: '8bae41e4-1365-4def-9857-34e4abdbf329', name: 'Eu Quero Pizza' },
  { id: 'ecac91e3-52c0-4780-9867-6b3b1d096089', name: 'I love burguer' },
];

const BASE_URL = process.env.ADMIN_BASE_URL || 'http://127.0.0.1:8080';
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'cabedelo-three-edit-visual-qa', RUN_ID);

function ensureOutDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function slug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function setAdminSession(page) {
  const mockSession = {
    user: { id: 'mock-admin-user-id', email: 'admin@restaurante.com' },
    profile: { id: 'mock-admin-user-id', email: 'admin@restaurante.com', first_name: 'Admin', last_name: 'Geral', role: 'admin' },
    restaurant: null,
  };
  await page.evaluateOnNewDocument((session) => {
    localStorage.setItem('mockSession', JSON.stringify(session));
  }, mockSession);
}

async function clickTab(page, label) {
  return page.evaluate((needle) => {
    const normalizedNeedle = String(needle).toLowerCase();
    const candidates = Array.from(document.querySelectorAll('button,[role="tab"],a'));
    const match = candidates.find((element) => String(element.textContent || '').toLowerCase().includes(normalizedNeedle));
    if (!match) return false;
    match.click();
    return true;
  }, label);
}

async function setSearch(page, value) {
  return page.evaluate((text) => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const input = inputs.find((item) => /pesquisar|buscar|nome|categoria|endere/i.test(item.placeholder || ''));
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, value);
}

async function clickEditForRestaurant(page, targetName) {
  const tabs = ['Prontos p/ App', 'Pendentes Validar IA', 'Revis', 'Sem Card', 'Rejeitados'];
  for (const tab of tabs) {
    await clickTab(page, tab).catch(() => false);
    await wait(700);
    await setSearch(page, targetName).catch(() => false);
    await wait(900);
    const clicked = await page.evaluate((name) => {
      const target = String(name).toLowerCase();
      const controls = Array.from(document.querySelectorAll('button,a'));
      for (const control of controls) {
        const text = String(control.textContent || '').toLowerCase();
        if (!text.includes('editar')) continue;
        let cursor = control;
        for (let depth = 0; cursor && depth < 9; depth += 1) {
          const blockText = String(cursor.textContent || '').toLowerCase();
          if (blockText.includes(target)) {
            control.click();
            return true;
          }
          cursor = cursor.parentElement;
        }
      }
      return false;
    }, targetName);
    if (clicked) return true;
  }
  return false;
}

async function ensureEditTab(page) {
  await wait(800);
  await page.evaluate(() => {
    const normalize = (value) => String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    const controls = Array.from(document.querySelectorAll('button,[role="tab"],a'));
    const editionTab = controls.find((element) => normalize(element.textContent) === 'edicao');
    const editButton = controls.find((element) => normalize(element.textContent) === 'editar');
    const edit = editionTab || editButton;
    if (edit) edit.click();
  });
  await wait(1200);
  await page.waitForFunction(() => /cadastro basico|cadastro básico|instagram url|link google maps/i.test(document.body.innerText), { timeout: 12000 }).catch(() => null);
}

async function findScrollInfo(page) {
  return page.evaluate(() => {
    const documentElement = document.scrollingElement || document.documentElement;
    if (documentElement && documentElement.scrollHeight > documentElement.clientHeight + 80) {
      return {
        index: -1,
        width: window.innerWidth,
        height: window.innerHeight,
        scrollHeight: documentElement.scrollHeight,
        clientHeight: documentElement.clientHeight,
        overflowY: 'document',
        text: 'document.scrollingElement',
      };
    }
    const candidates = Array.from(document.querySelectorAll('div,section,[role="dialog"]'))
      .map((element, index) => {
        const rect = element.getBoundingClientRect();
        return {
          index,
          width: rect.width,
          height: rect.height,
          scrollHeight: element.scrollHeight,
          clientHeight: element.clientHeight,
          overflowY: getComputedStyle(element).overflowY,
          text: String(element.textContent || '').slice(0, 120),
        };
      })
      .filter((item) => item.width > 800 && item.height > 350 && item.scrollHeight > item.clientHeight + 80)
      .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));
    return candidates[0] || null;
  });
}

async function setScrollByIndex(page, index, top) {
  return page.evaluate(({ index: targetIndex, top: scrollTop }) => {
    if (targetIndex === -1) {
      window.scrollTo(0, scrollTop);
      if (document.scrollingElement) document.scrollingElement.scrollTop = scrollTop;
      return true;
    }
    const elements = Array.from(document.querySelectorAll('div,section,[role="dialog"]'));
    const element = elements[targetIndex];
    if (!element) return false;
    element.scrollTop = scrollTop;
    return true;
  }, { index, top });
}

async function captureModal(page, target) {
  const targetDir = path.join(OUT_DIR, `${slug(target.name)}-${target.id}`);
  fs.mkdirSync(targetDir, { recursive: true });

  const scrollInfo = await findScrollInfo(page);
  const manifest = {
    id: target.id,
    name: target.name,
    scrollInfo,
    screenshots: [],
  };

  if (!scrollInfo) {
    const file = path.join(targetDir, 'part-01-no-scroll-info.png');
    await page.screenshot({ path: file, fullPage: false });
    manifest.screenshots.push(file);
    return manifest;
  }

  const maxScroll = Math.max(0, scrollInfo.scrollHeight - scrollInfo.clientHeight);
  const step = Math.max(320, Math.floor(scrollInfo.clientHeight * 0.72));
  const positions = [];
  for (let top = 0; top < maxScroll; top += step) positions.push(top);
  if (!positions.includes(maxScroll)) positions.push(maxScroll);

  let part = 1;
  for (const top of positions) {
    await setScrollByIndex(page, scrollInfo.index, top);
    await wait(450);
    const file = path.join(targetDir, `part-${String(part).padStart(2, '0')}-scroll-${Math.round(top)}.png`);
    await page.screenshot({ path: file, fullPage: false });
    manifest.screenshots.push(file);
    part += 1;
  }
  return manifest;
}

async function closeModal(page) {
  await page.keyboard.press('Escape');
  await wait(500);
  const stillOpen = await page.evaluate(() => Boolean(document.querySelector('[role="dialog"]')));
  if (stillOpen) {
    await page.evaluate(() => {
      const controls = Array.from(document.querySelectorAll('button'));
      const close = controls.find((button) => /fechar|cancelar|×|x/i.test(String(button.textContent || button.ariaLabel || '')));
      if (close) close.click();
    });
    await wait(500);
  }
}

async function main() {
  ensureOutDir();
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await setAdminSession(page);
  await page.goto(`${BASE_URL}/admin/expansion/cabedelo-pb?tab=validation`, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(2000);

  const manifests = [];
  for (const target of TARGETS) {
    await page.goto(`${BASE_URL}/admin/expansion/cabedelo-pb?tab=validation`, { waitUntil: 'networkidle2', timeout: 60000 });
    await wait(1200);
    const opened = await clickEditForRestaurant(page, target.name);
    if (!opened) {
      manifests.push({ id: target.id, name: target.name, error: 'edit_button_not_found' });
      continue;
    }
    await page.waitForSelector('[role="dialog"]', { timeout: 15000 });
    await ensureEditTab(page);
    manifests.push(await captureModal(page, target));
    await closeModal(page);
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify({
    runId: RUN_ID,
    outDir: OUT_DIR,
    baseUrl: BASE_URL,
    targets: manifests,
  }, null, 2));
  console.log(JSON.stringify({ outDir: OUT_DIR, targets: manifests.map((item) => ({ name: item.name, screenshots: item.screenshots?.length || 0, error: item.error || null })) }, null, 2));
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
