const port = Number(process.env.CDP_PORT || 9223);
const origin = process.env.APP_ORIGIN || 'http://localhost:8080';
const widths = [320, 375, 390, 448];

const targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json());
const target = targets.find((entry) => entry.type === 'page');
if (!target?.webSocketDebuggerUrl) throw new Error('Chrome CDP page target was not found.');

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let nextId = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(String(event.data));
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

function send(method, params = {}) {
  const id = ++nextId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

await send('Page.enable');
await send('Runtime.enable');

const mockSession = {
  user: { id: 'mock-customer-user-id', email: 'cliente@teste.com' },
  profile: {
    id: 'mock-customer-user-id',
    email: 'cliente@teste.com',
    first_name: 'Gabriel',
    last_name: 'Silva',
    role: 'authenticated',
  },
  restaurant: null,
};

const audit = [];
for (const width of widths) {
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height: width === 320 ? 720 : 900,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: width,
    screenHeight: width === 320 ? 720 : 900,
  });
  await send('Page.navigate', { url: origin });
  await wait(500);
  await send('Runtime.evaluate', {
    expression: `localStorage.setItem('mockSession', ${JSON.stringify(JSON.stringify(mockSession))}); localStorage.setItem('filterfood_feature_tour_completed', 'true'); localStorage.removeItem('mock-search-location-mock-customer-user-id');`,
  });
  await send('Page.navigate', { url: `${origin}/home` });
  await wait(1800);

  const result = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `JSON.stringify((() => {
      const controls = [...document.querySelectorAll('button, a, textarea, input')]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        })
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            name: element.getAttribute('aria-label') || element.textContent?.trim().replace(/\\s+/g, ' ').slice(0, 40) || element.tagName,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        });
      const smallTargets = controls.filter((control) => control.width < 44 || control.height < 44);
      const composer = document.querySelector('[data-menu-composer="true"]');
      return {
        viewport: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        composerFontSize: composer ? getComputedStyle(composer).fontSize : null,
        visibleControlCount: controls.length,
        smallTargets,
      };
    })())`,
  });

  audit.push({ width, ...JSON.parse(result.result.value) });
}

socket.close();
process.stdout.write(`${JSON.stringify(audit, null, 2)}\n`);
