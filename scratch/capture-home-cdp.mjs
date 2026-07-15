import { writeFile } from 'node:fs/promises';

const port = Number(process.env.CDP_PORT || 9223);
const origin = process.env.APP_ORIGIN || 'http://localhost:8080';
const output = process.env.SCREENSHOT_PATH || 'scratch/home-visual-audit.png';
const viewportWidth = Number(process.env.VIEWPORT_WIDTH || 447);
const viewportHeight = Number(process.env.VIEWPORT_HEIGHT || 1000);

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
await send('Emulation.setDeviceMetricsOverride', {
  width: viewportWidth,
  height: viewportHeight,
  deviceScaleFactor: 1,
  mobile: true,
  screenWidth: viewportWidth,
  screenHeight: viewportHeight,
});
await send('Page.navigate', { url: origin });
await wait(1200);

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

await send('Runtime.evaluate', {
  expression: `localStorage.setItem('mockSession', ${JSON.stringify(JSON.stringify(mockSession))}); localStorage.setItem('filterfood_feature_tour_completed', 'true'); localStorage.removeItem('mock-search-location-mock-customer-user-id');`,
});
await send('Page.navigate', { url: `${origin}/home` });
await wait(3500);

const screenshot = await send('Page.captureScreenshot', {
  format: 'png',
  fromSurface: true,
  captureBeyondViewport: false,
});
await writeFile(output, Buffer.from(screenshot.data, 'base64'));
socket.close();

process.stdout.write(output);
