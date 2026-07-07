import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const ALL_TARGETS = [
  { id: '8322d0f6-8e08-4de7-a73f-d71c57f0291d', name: 'Ilovepizzapb' },
  { id: '8bae41e4-1365-4def-9857-34e4abdbf329', name: 'Eu Quero Pizza' },
  { id: 'ecac91e3-52c0-4780-9867-6b3b1d096089', name: 'I love burguer' },
];

const TARGETS = process.env.TARGET_NAME
  ? ALL_TARGETS.filter((target) => target.name.toLowerCase() === process.env.TARGET_NAME.toLowerCase())
  : ALL_TARGETS;

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

async function clickByText(page, label) {
  return page.evaluate((needle) => {
    const normalize = (value) => String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    const target = normalize(needle);
    const controls = Array.from(document.querySelectorAll('button,[role="tab"],a'));
    const match = controls.find((element) => normalize(element.textContent).includes(target));
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

async function openRestaurantDialog(page, targetName) {
  const tabs = ['Prontos p/ App', 'Pendentes Validar IA', 'Revis', 'Sem Card', 'Rejeitados'];
  for (const tab of tabs) {
    await clickByText(page, tab).catch(() => false);
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

async function verifyDialogForTarget(page, targetName) {
  await page.waitForSelector('[data-testid="restaurant-details-dialog"]', { visible: true, timeout: 15000 });
  return page.evaluate((name) => {
    const dialog = document.querySelector('[data-testid="restaurant-details-dialog"]');
    if (!dialog) return false;
    return String(dialog.textContent || '').toLowerCase().includes(String(name).toLowerCase());
  }, targetName);
}

async function enterEditableTab(page) {
  await page.waitForSelector('[data-testid="restaurant-details-dialog"]', { timeout: 15000 });
  await wait(700);
  const editTabBox = await page.evaluate(() => {
    const editTab = document.querySelector('[data-testid="restaurant-dialog-edit-tab"]');
    if (!editTab) return null;
    const rect = editTab.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  });
  if (editTabBox) await page.mouse.click(editTabBox.x, editTabBox.y);
  await wait(900);
  const enableBox = await page.evaluate(() => {
    const normalize = (value) => String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    const enableButton =
      document.querySelector('[data-testid="restaurant-dialog-enable-edit"]')
      || Array.from(document.querySelectorAll('button,a')).find((element) => {
        const text = normalize(element.textContent || element.ariaLabel);
        return text === 'habilitar edicao' || text === 'editar';
      });
    if (!enableButton) return null;
    const rect = enableButton.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  });
  if (enableBox) await page.mouse.click(enableBox.x, enableBox.y);
  await wait(1200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await wait(400);
  await page.waitForFunction(() => {
    const text = document.body.innerText || '';
    return /Cadastro B.sico|Instagram URL|Link Google Maps|Nome do Restaurante/i.test(text);
  }, { timeout: 15000 }).catch(() => null);
}

async function findModalScrollInfo(page) {
  return page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('[data-testid="restaurant-details-dialog"], [data-testid="restaurant-details-dialog"] *'));
    const candidates = elements
      .map((element, index) => {
        const rect = element.getBoundingClientRect();
        const delta = element.scrollHeight - element.clientHeight;
        const text = String(element.textContent || '').slice(0, 180);
        return {
          index,
          delta,
          width: rect.width,
          height: rect.height,
          scrollHeight: element.scrollHeight,
          clientHeight: element.clientHeight,
          overflowY: getComputedStyle(element).overflowY,
          text,
        };
      })
      .filter((item) => item.width > 900 && item.height > 400 && item.delta > 120)
      .sort((a, b) => b.delta - a.delta);
    if (candidates[0]) return candidates[0];
    const documentElement = document.scrollingElement || document.documentElement;
    if (documentElement && documentElement.scrollHeight > documentElement.clientHeight + 120) {
      return {
        index: -1,
        delta: documentElement.scrollHeight - documentElement.clientHeight,
        width: window.innerWidth,
        height: window.innerHeight,
        scrollHeight: documentElement.scrollHeight,
        clientHeight: documentElement.clientHeight,
        overflowY: 'document',
        text: 'document.scrollingElement',
      };
    }
    return null;
  });
}

async function scrollModalElement(page, index, top) {
  return page.evaluate(({ index: targetIndex, top: scrollTop }) => {
    if (targetIndex === -1) {
      window.scrollTo(0, scrollTop);
      if (document.scrollingElement) document.scrollingElement.scrollTop = scrollTop;
      return true;
    }
    const elements = Array.from(document.querySelectorAll('[data-testid="restaurant-details-dialog"], [data-testid="restaurant-details-dialog"] *'));
    const element = elements[targetIndex];
    if (!element) return false;
    element.scrollTop = scrollTop;
    return true;
  }, { index, top });
}

async function captureEditModal(page, target) {
  const targetDir = path.join(OUT_DIR, `${slug(target.name)}-${target.id}`);
  fs.mkdirSync(targetDir, { recursive: true });

  const scrollInfo = await findModalScrollInfo(page);
  const manifest = { id: target.id, name: target.name, scrollInfo, screenshots: [] };

  if (!scrollInfo) {
    const file = path.join(targetDir, 'part-01-no-scroll-info.png');
    await page.screenshot({ path: file, fullPage: false });
    manifest.screenshots.push(file);
    return manifest;
  }

  const maxScroll = Math.max(0, scrollInfo.scrollHeight - scrollInfo.clientHeight);
  const step = Math.max(420, Math.floor(scrollInfo.clientHeight * 0.62));
  const positions = [];
  for (let top = 0; top < maxScroll; top += step) positions.push(top);
  if (!positions.includes(maxScroll)) positions.push(maxScroll);

  let part = 1;
  for (const top of positions) {
    await scrollModalElement(page, scrollInfo.index, top);
    await wait(500);
    const file = path.join(targetDir, `part-${String(part).padStart(2, '0')}-edit-scroll-${Math.round(top)}.png`);
    await page.screenshot({ path: file, fullPage: false });
    manifest.screenshots.push(file);
    part += 1;
  }
  return manifest;
}

async function closeDialog(page) {
  await page.keyboard.press('Escape');
  await wait(500);
  const stillOpen = await page.evaluate(() => Boolean(document.querySelector('[data-testid="restaurant-details-dialog"]')));
  if (!stillOpen) return;
  await page.evaluate(() => {
    const normalize = (value) => String(value || '').toLowerCase().trim();
    const controls = Array.from(document.querySelectorAll('button,a'));
    const close = controls.find((control) => /cancelar|fechar/.test(normalize(control.textContent || control.ariaLabel)));
    if (close) close.click();
  });
  await wait(500);
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

  const manifests = [];
  for (const target of TARGETS) {
    await page.goto(`${BASE_URL}/admin/expansion/cabedelo-pb?tab=validation`, { waitUntil: 'networkidle2', timeout: 60000 });
    await wait(1600);
    const opened = await openRestaurantDialog(page, target.name);
    if (!opened) {
      manifests.push({ id: target.id, name: target.name, error: 'edit_button_not_found' });
      continue;
    }
    const verified = await verifyDialogForTarget(page, target.name).catch(() => false);
    if (!verified) {
      manifests.push({ id: target.id, name: target.name, error: 'dialog_not_visible_for_target' });
      continue;
    }
    await enterEditableTab(page);
    manifests.push(await captureEditModal(page, target));
    await closeDialog(page);
  }

  await browser.close();
  const report = {
    runId: RUN_ID,
    outDir: OUT_DIR,
    baseUrl: BASE_URL,
    targets: manifests,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    outDir: OUT_DIR,
    targets: manifests.map((item) => ({
      name: item.name,
      screenshots: item.screenshots?.length || 0,
      error: item.error || null,
      scrollHeight: item.scrollInfo?.scrollHeight || null,
      clientHeight: item.scrollInfo?.clientHeight || null,
    })),
  }, null, 2));
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
