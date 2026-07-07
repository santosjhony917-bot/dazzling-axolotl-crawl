import fs from 'node:fs';

function readEnv() {
  const env = { ...process.env };
  const text = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!env[key]) env[key] = value;
  }
  return env;
}

const key = readEnv().FIRECRAWL_API_KEY;
if (!key) throw new Error('FIRECRAWL_API_KEY ausente.');

const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: process.argv[2] || 'https://pizzariabomsaborpb.com.br',
    formats: ['markdown', 'links'],
    onlyMainContent: true,
  }),
});

const text = await response.text();
console.log(JSON.stringify({
  status: response.status,
  ok: response.ok,
  sample: text.slice(0, 1000),
}, null, 2));
