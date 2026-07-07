import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const RESTAURANT_ID = '60d131e5-d7fb-4aa2-b3b0-83af50747ff2';
const USERNAME = 'pipatemaki';
const OUT_DIR = path.join('scratch', 'pipa-logo-apify');

function readEnv() {
  const env = { ...process.env };
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return env;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!env[key]) env[key] = value;
  }
  return env;
}

async function runApifyActor(token, actor, input, timeout = 180) {
  const url = new URL(`https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items`);
  url.searchParams.set('timeout', String(timeout));
  url.searchParams.set('token', token);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  const text = await response.text();
  const payload = JSON.parse(text);
  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(`Apify ${actor} HTTP ${response.status}: ${payload?.error || text.slice(0, 200)}`);
  }
  return payload;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const env = readEnv();
  if (!env.APIFY_TOKEN) throw new Error('APIFY_TOKEN ausente no .env');
  const supabase = createClient(
    env.VITE_SUPABASE_URL || env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
      || env.VITE_SUPABASE_SERVICE_ROLE_KEY
      || env.SERVICE_ROLE_KEY
      || env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );

  const profiles = await runApifyActor(env.APIFY_TOKEN, 'apify~instagram-profile-scraper', {
    usernames: [USERNAME],
    resultsLimit: 1,
    addParentData: false,
  });
  const profile = profiles[0];
  const sourceUrl = profile?.profilePicUrlHD || profile?.profilePicUrl;
  if (!sourceUrl) throw new Error('profile_pic_not_found');

  const response = await fetch(sourceUrl, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
      accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    },
  });
  if (!response.ok) throw new Error(`profile_pic_http_${response.status}`);
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const buffer = Buffer.from(await response.arrayBuffer());
  const localPath = path.join(OUT_DIR, 'pipatemaki-profile-logo.jpg');
  fs.writeFileSync(localPath, buffer);

  const storagePath = `logos/${RESTAURANT_ID}/instagram_profile_apify_${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('restaurant-images')
    .upload(storagePath, buffer, { contentType, upsert: true });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from('restaurant-images').getPublicUrl(storagePath);

  const { error: updateError } = await supabase
    .from('restaurants')
    .update({
      image_url: data.publicUrl,
      followers_override: Number(profile.followersCount || 0) || null,
      social_networks: [{
        platform: 'instagram',
        url: `https://www.instagram.com/${USERNAME}/`,
        followers: Number(profile.followersCount || 0) || null,
        posts: Number(profile.postsCount || 0) || null,
        biography: String(profile.biography || '').slice(0, 800),
        website: profile.externalUrl || profile.externalUrlShimmed || null,
        source: 'apify_instagram_profile_scraper',
        verifiedAt: new Date().toISOString(),
      }],
    })
    .eq('id', RESTAURANT_ID);
  if (updateError) throw updateError;

  console.log(JSON.stringify({
    localPath: path.resolve(localPath),
    publicUrl: data.publicUrl,
    bytes: buffer.length,
    contentType,
    followers: Number(profile.followersCount || 0) || null,
    posts: Number(profile.postsCount || 0) || null,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
