import puppeteer from 'puppeteer';

const BASE_URL = process.env.ADMIN_BASE_URL || 'http://127.0.0.1:8080';
const TARGET_NAME = process.env.TARGET_NAME || 'Ilovepizzapb';

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
    const input = Array.from(document.querySelectorAll('input')).find((item) => /pesquisar|buscar|nome|categoria|endere/i.test(item.placeholder || ''));
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, value);
}

async function openDialog(page) {
  for (const tab of ['Prontos p/ App', 'Pendentes Validar IA', 'Revis', 'Sem Card', 'Rejeitados']) {
    await clickByText(page, tab).catch(() => false);
    await wait(700);
    await setSearch(page, TARGET_NAME).catch(() => false);
    await wait(900);
    const clicked = await page.evaluate((name) => {
      const target = String(name).toLowerCase();
      const controls = Array.from(document.querySelectorAll('button,a'));
      for (const control of controls) {
        if (!String(control.textContent || '').toLowerCase().includes('editar')) continue;
        let cursor = control;
        for (let depth = 0; cursor && depth < 9; depth += 1) {
          if (String(cursor.textContent || '').toLowerCase().includes(target)) {
            control.click();
            return true;
          }
          cursor = cursor.parentElement;
        }
      }
      return false;
    }, TARGET_NAME);
    if (clicked) return true;
  }
  return false;
}

async function dump(page, label) {
  const data = await page.evaluate(() => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    return {
      hasDialog: Boolean(document.querySelector('[role="dialog"]')),
      hasEditTabTestId: Boolean(document.querySelector('[data-testid="restaurant-dialog-edit-tab"]')),
      hasEnableTestId: Boolean(document.querySelector('[data-testid="restaurant-dialog-enable-edit"]')),
      bodyHasCadastro: /Cadastro B.sico|Instagram URL|Nome do Restaurante/i.test(document.body.innerText || ''),
      activeish: Array.from(document.querySelectorAll('[role="dialog"] button,[role="dialog"] [role="tab"],[role="dialog"] a')).map((element) => ({
        text: normalize(element.textContent || element.ariaLabel),
        testid: element.getAttribute('data-testid'),
        role: element.getAttribute('role'),
        disabled: Boolean(element.disabled || element.getAttribute('aria-disabled') === 'true'),
        state: element.getAttribute('data-state'),
        rect: (() => {
          const rect = element.getBoundingClientRect();
          return { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) };
        })(),
      })),
    };
  });
  console.log(label, JSON.stringify(data, null, 2));
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await setAdminSession(page);
  await page.goto(`${BASE_URL}/admin/expansion/cabedelo-pb?tab=validation`, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1500);
  const opened = await openDialog(page);
  console.log('opened', opened);
  await page.waitForSelector('[role="dialog"]', { timeout: 15000 });
  await dump(page, 'before');
  const editTabHandle = await page.$('[data-testid="restaurant-dialog-edit-tab"]');
  if (editTabHandle) await editTabHandle.click();
  await wait(1000);
  await dump(page, 'after-edit-tab');
  await page.mouse.click(433, 173);
  await wait(1000);
  await dump(page, 'after-coordinate-edit-tab');
  const enableHandle = await page.$('[data-testid="restaurant-dialog-enable-edit"]');
  if (enableHandle) await enableHandle.click();
  await wait(1000);
  await dump(page, 'after-enable-testid');
  await browser.close();
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
