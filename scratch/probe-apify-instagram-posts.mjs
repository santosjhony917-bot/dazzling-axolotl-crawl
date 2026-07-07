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

async function runActor(actor, input) {
  const env = readEnv();
  const url = new URL(`https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items`);
  url.searchParams.set('timeout', '180');
  url.searchParams.set('token', env.APIFY_TOKEN);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {}
  return { status: response.status, payload, text };
}

const username = process.argv[2] || 'ilovepizzapb';
const trials = [
  {
    actor: 'apify~instagram-post-scraper',
    input: { username, resultsLimit: 12 },
  },
  {
    actor: 'apify~instagram-post-scraper',
    input: { usernames: [username], resultsLimit: 12 },
  },
  {
    actor: 'apify~instagram-scraper',
    input: {
      directUrls: [`https://www.instagram.com/${username}/`],
      resultsType: 'posts',
      resultsLimit: 12,
      addParentData: false,
    },
  },
];

for (const trial of trials) {
  console.log(JSON.stringify({ trial: trial.actor, input: trial.input }));
  const result = await runActor(trial.actor, trial.input);
  const items = Array.isArray(result.payload) ? result.payload : [];
  console.log(JSON.stringify({
    status: result.status,
    count: items.length,
    error: !Array.isArray(result.payload) ? (result.payload?.error || result.text?.slice(0, 400)) : null,
    first: items.slice(0, 2).map((item) => ({
      keys: Object.keys(item),
      type: item.type || item.__typename || item.productType || item.media_type || null,
      isVideo: item.isVideo ?? item.videoUrl ? true : false,
      url: item.url || item.shortCode || item.inputUrl || null,
      displayUrl: item.displayUrl || item.imageUrl || item.image || item.thumbnailUrl || null,
      images: Array.isArray(item.images) ? item.images.slice(0, 2) : null,
      childPosts: Array.isArray(item.childPosts) ? item.childPosts.slice(0, 2).map((child) => ({
        keys: Object.keys(child),
        type: child.type || child.__typename || child.productType || child.media_type || null,
        isVideo: child.isVideo ?? child.videoUrl ? true : false,
        displayUrl: child.displayUrl || child.imageUrl || child.image || child.thumbnailUrl || null,
      })) : null,
      caption: String(item.caption || '').slice(0, 120),
    })),
  }, null, 2));
}
