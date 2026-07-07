import fs from 'node:fs';

function readEnv() {
  const env = { ...process.env };
  if (!fs.existsSync('.env')) return env;
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!env[key]) env[key] = value;
  }
  return env;
}

const env = readEnv();
if (!env.APIFY_TOKEN) throw new Error('APIFY_TOKEN ausente');

const actors = [
  'apify~instagram-profile-scraper',
  'apify~instagram-scraper',
  'apify~instagram-post-scraper',
  'apify~instagram-reel-scraper',
];

for (const actor of actors) {
  const url = `https://api.apify.com/v2/acts/${actor}?token=${encodeURIComponent(env.APIFY_TOKEN)}`;
  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));
  console.log(JSON.stringify({
    actor,
    status: response.status,
    name: payload.data?.name,
    username: payload.data?.username,
    title: payload.data?.title,
    description: payload.data?.description?.slice(0, 240),
    isPublic: payload.data?.isPublic,
    defaultRunOptions: payload.data?.defaultRunOptions || null,
    inputSchemaKeys: payload.data?.inputSchema ? Object.keys(payload.data.inputSchema) : [],
    inputSchemaPreview: payload.data?.inputSchema ? JSON.stringify(payload.data.inputSchema).slice(0, 3000) : null,
    error: payload.error || null,
  }, null, 2));
}
