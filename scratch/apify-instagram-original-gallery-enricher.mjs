import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const DEFAULT_IDS = [
  '8322d0f6-8e08-4de7-a73f-d71c57f0291d',
  '8bae41e4-1365-4def-9857-34e4abdbf329',
  'ecac91e3-52c0-4780-9867-6b3b1d096089',
];

const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(name);
const valueArg = (name, fallback = '') => {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};

const APPLY = hasFlag('--apply');
const FORCE_MEDIA = hasFlag('--force-media');
const FORCE_LOGO = hasFlag('--force-logo');
const PROMOTE = hasFlag('--promote');
const CITY = valueArg('--city', 'Cabedelo');
const STATE = valueArg('--state', 'PB');
const ONLY_ID = valueArg('--id', '');
const IDS = valueArg('--ids', '')
  ? valueArg('--ids', '').split(',').map((item) => item.trim()).filter(Boolean)
  : ONLY_ID
    ? [ONLY_ID]
    : DEFAULT_IDS;
const LIMIT = Math.max(1, Number(valueArg('--limit', String(IDS.length || 10))) || 10);
const CANDIDATE_LIMIT = Math.max(4, Math.min(24, Number(valueArg('--candidate-limit', '16')) || 16));
const RESULTS_LIMIT = Math.max(CANDIDATE_LIMIT, Math.min(32, Number(valueArg('--results-limit', '16')) || 16));
const MIN_GALLERY = Math.max(3, Number(valueArg('--min-gallery', '3')) || 3);
const MAX_GALLERY = Math.max(MIN_GALLERY, Math.min(8, Number(valueArg('--max-gallery', '8')) || 8));
const TARGET_GALLERY = Math.max(MIN_GALLERY, Math.min(MAX_GALLERY, Number(valueArg('--target-gallery', '4')) || 4));
const VISION_CONCURRENCY = Math.max(1, Math.min(4, Number(valueArg('--vision-concurrency', '3')) || 3));
const VISION_TIMEOUT_MS = Math.max(10000, Number(valueArg('--vision-timeout-ms', '35000')) || 35000);
const DOWNLOAD_TIMEOUT_MS = Math.max(10000, Number(valueArg('--download-timeout-ms', '30000')) || 30000);
const VISION_DETAIL = ['low', 'high', 'auto'].includes(valueArg('--vision-detail', 'low'))
  ? valueArg('--vision-detail', 'low')
  : 'low';
const GRID_VISION = !hasFlag('--individual-vision');
const GRID_COLUMNS = Math.max(3, Math.min(5, Number(valueArg('--grid-columns', '4')) || 4));
const GRID_TILE_SIZE = Math.max(140, Math.min(260, Number(valueArg('--grid-tile-size', '190')) || 190));
const GRID_GAP = 12;
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'apify-instagram-original-gallery', RUN_ID);

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

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalize(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function parseArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {}
  }
  return [];
}

function ensureOutDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function writeJson(name, value) {
  ensureOutDir();
  fs.writeFileSync(path.join(OUT_DIR, name), JSON.stringify(value, null, 2));
}

function parseUrl(value) {
  try {
    return new URL(clean(value));
  } catch {
    return null;
  }
}

function instagramUsername(value) {
  const raw = clean(value);
  if (!raw) return '';
  if (!raw.includes('instagram.com') && /^[a-z0-9._]{2,}$/i.test(raw.replace(/^@/, ''))) {
    return raw.replace(/^@/, '').toLowerCase();
  }
  const url = parseUrl(raw);
  if (!url || !url.hostname.toLowerCase().includes('instagram.com')) return '';
  const first = url.pathname.split('/').filter(Boolean)[0] || '';
  if (!first || ['p', 'reel', 'stories', 'explore', 'tv', 'accounts'].includes(first.toLowerCase())) return '';
  return first.toLowerCase();
}

function canonicalInstagram(username) {
  return username ? `https://www.instagram.com/${username}/` : '';
}

function mergeLogs(row, patch) {
  return {
    ...parseJson(row.coleta_logs),
    ...patch,
  };
}

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_ALIASES = {
  dom: 'sunday',
  domingo: 'sunday',
  sab: 'saturday',
  sabado: 'saturday',
  seg: 'monday',
  segunda: 'monday',
  ter: 'tuesday',
  terca: 'tuesday',
  qua: 'wednesday',
  quarta: 'wednesday',
  qui: 'thursday',
  quinta: 'thursday',
  sex: 'friday',
  sexta: 'friday',
};

function emptyWeek() {
  return Object.fromEntries(DAY_ORDER.map((key) => [key, { isOpen: false, slots: [] }]));
}

function dayKey(value) {
  return DAY_ALIASES[normalize(value).replace(/\s+feira\b/g, '').trim()] || '';
}

function daysBetween(startKey, endKey) {
  const start = DAY_ORDER.indexOf(startKey);
  const end = DAY_ORDER.indexOf(endKey);
  if (start < 0 || end < 0) return [];
  const out = [];
  for (let i = start; ; i = (i + 1) % DAY_ORDER.length) {
    out.push(DAY_ORDER[i]);
    if (i === end) break;
  }
  return out;
}

function normalizeTime(hour, minute = '00') {
  const h = Math.max(0, Math.min(Number(hour) || 0, 23));
  const m = Math.max(0, Math.min(Number(minute) || 0, 59));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function hasCanonicalOpeningHours(value) {
  const parsed = parseJson(value, value);
  return parsed
    && typeof parsed === 'object'
    && DAY_ORDER.every((key) => typeof parsed[key]?.isOpen === 'boolean' && Array.isArray(parsed[key]?.slots));
}

function normalizeOpeningHoursFromInstagramBio(text) {
  const source = normalize(text)
    .replace(/\baberto\s+de\b/g, 'de')
    .replace(/\baberto\b/g, '')
    .replace(/[|;]/g, ' | ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!source) return null;

  const day = '(dom(?:ingo)?|seg(?:unda)?(?: feira)?|ter(?:ca)?(?: feira)?|qua(?:rta)?(?: feira)?|qui(?:nta)?(?: feira)?|sex(?:ta)?(?: feira)?|sab(?:ado)?)';
  const time = '(\\d{1,2})(?:(?:h|:)(\\d{2}))?\\s*(?:h)?';
  const connector = '(?:a|as|ate|-|\\u2013)';
  const rangeRegex = new RegExp(`(?:de\\s+)?${day}\\s*(?:a|ate)\\s*${day}.{0,70}?${time}\\s*${connector}\\s*${time}`, 'i');
  const range = source.match(rangeRegex);
  if (range) {
    const days = daysBetween(dayKey(range[1]), dayKey(range[2]));
    if (days.length) {
      const schedule = emptyWeek();
      const slot = { start: normalizeTime(range[3], range[4] || '00'), end: normalizeTime(range[5], range[6] || '00') };
      for (const key of days) schedule[key] = { isOpen: true, slots: [slot] };
      return { schedule, sourceText: text, parser: 'instagram_bio_day_range_v1' };
    }
  }

  const schedule = emptyWeek();
  let seen = false;
  const singleRegex = new RegExp(`${day}.{0,45}?${time}\\s*${connector}\\s*${time}`, 'gi');
  for (const match of source.matchAll(singleRegex)) {
    const key = dayKey(match[1]);
    if (!key) continue;
    schedule[key] = {
      isOpen: true,
      slots: [{ start: normalizeTime(match[2], match[3] || '00'), end: normalizeTime(match[4], match[5] || '00') }],
    };
    seen = true;
  }
  return seen ? { schedule, sourceText: text, parser: 'instagram_bio_single_days_v1' } : null;
}

async function withTimeout(promise, timeoutMs, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timeout ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
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
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {}
  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(`Apify ${actor} HTTP ${response.status}: ${payload?.error || text.slice(0, 300)}`);
  }
  return payload;
}

async function fetchProfile(token, username) {
  const profiles = await runApifyActor(token, 'apify~instagram-profile-scraper', {
    usernames: [username],
    resultsLimit: 1,
    addParentData: false,
  });
  return profiles.find((profile) => normalize(profile.username || '') === normalize(username)) || profiles[0] || null;
}

async function fetchPosts(token, username) {
  return runApifyActor(token, 'apify~instagram-scraper', {
    directUrls: [canonicalInstagram(username)],
    resultsType: 'posts',
    resultsLimit: RESULTS_LIMIT,
    addParentData: false,
  });
}

function hasVideoSignal(media) {
  const text = normalize([
    media?.type,
    media?.productType,
    media?.__typename,
    media?.media_type,
    media?.mediaType,
    media?.url,
  ].filter(Boolean).join(' '));
  return Boolean(
    media?.isVideo
      || media?.videoUrl
      || media?.videoDuration
      || media?.videoViewCount
      || media?.videoPlayCount
      || /\b(video|reel|clips|igtv|GraphVideo|XDTGraphVideo)\b/i.test(text),
  );
}

function extractImageUrls(media) {
  const urls = [];
  for (const key of ['displayUrl', 'imageUrl', 'image', 'thumbnailUrl']) {
    if (typeof media?.[key] === 'string') urls.push(media[key]);
  }
  if (Array.isArray(media?.images)) {
    for (const image of media.images) {
      if (typeof image === 'string') urls.push(image);
      else if (image && typeof image === 'object') {
        for (const key of ['url', 'src', 'displayUrl', 'imageUrl']) {
          if (typeof image[key] === 'string') urls.push(image[key]);
        }
      }
    }
  }
  return urls
    .map(clean)
    .filter(Boolean)
    .filter((url) => /^https?:\/\//i.test(url))
    .filter((url) => !/\.(mp4|mov|m4v)(?:\?|$)/i.test(url));
}

function bestImageUrl(media) {
  const urls = extractImageUrls(media);
  return urls.find((url) => /cdninstagram|fbcdn|scontent/i.test(url)) || urls[0] || '';
}

function postCaption(post) {
  return clean(post?.caption || post?.alt || post?.accessibilityCaption || '');
}

function extractPostCandidates(posts) {
  const candidates = [];
  const seen = new Set();
  for (const [postIndex, post] of posts.entries()) {
    const caption = postCaption(post);
    const postUrl = clean(post.url || (post.shortCode ? `https://www.instagram.com/p/${post.shortCode}/` : ''));
    const postBase = {
      postIndex,
      shortCode: clean(post.shortCode || ''),
      postUrl,
      caption,
      timestamp: post.timestamp || post.takenAt || post.takenAtTimestamp || '',
      isPinned: post.isPinned === true,
      sourceType: clean(post.type || post.productType || post.__typename || ''),
    };

    if (!hasVideoSignal(post)) {
      const url = bestImageUrl(post);
      if (url && !seen.has(url)) {
        seen.add(url);
        candidates.push({
          ...postBase,
          url,
          source: 'instagram_post_image_api',
          width: Number(post.originalWidth || post.width || 0) || null,
          height: Number(post.originalHeight || post.height || 0) || null,
        });
      }
    }

    if (Array.isArray(post.childPosts)) {
      for (const [childIndex, child] of post.childPosts.entries()) {
        if (hasVideoSignal(child)) continue;
        const url = bestImageUrl(child);
        if (!url || seen.has(url)) continue;
        seen.add(url);
        candidates.push({
          ...postBase,
          url,
          source: 'instagram_carousel_child_image_api',
          childIndex,
          width: Number(child.originalWidth || child.width || 0) || null,
          height: Number(child.originalHeight || child.height || 0) || null,
          sourceType: clean(child.type || child.productType || child.__typename || post.type || ''),
        });
      }
    }
  }
  return candidates.slice(0, CANDIDATE_LIMIT);
}

function heuristicScore(candidate) {
  let score = Math.max(0, 18 - Number(candidate.postIndex || 0));
  if (candidate.source === 'instagram_carousel_child_image_api') score -= 1;
  if (candidate.isPinned) score -= 3;
  if (candidate.width && candidate.height) {
    if (candidate.width >= 900 && candidate.height >= 900) score += 6;
    if (candidate.width < 500 || candidate.height < 500) score -= 20;
  }
  const caption = normalize(candidate.caption);
  if (/\b(cardapio|preco|promocao|sorteio|agenda|horario|contrata|delivery)\b/.test(caption)) score -= 4;
  if (/\b(pizza|burger|hamburg|lanche|massa|combo|sabor|forno|queijo|bacon|carne|batata|esfiha)\b/.test(caption)) score += 4;
  return score;
}

async function visionScoreImage(openai, candidate, restaurant) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const image = candidate._imageBuffer
        ? { buffer: candidate._imageBuffer, contentType: candidate._contentType || 'image/jpeg' }
        : await fetchImageBuffer(candidate.url);
      const imageDataUrl = `data:${image.contentType};base64,${image.buffer.toString('base64')}`;
      const response = await withTimeout(openai.chat.completions.create({
        model: process.env.OPENAI_VISION_MODEL || process.env.VITE_AI_MODEL || 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'Voce e um curador visual muito rigoroso para galeria premium de restaurante. Responda somente JSON valido.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: [
                  `Restaurante: ${restaurant.name}`,
                  `Categoria esperada: ${restaurant.category || ''}`,
                  `Cidade: ${restaurant.city}/${restaurant.state}`,
                  'Fonte: imagem original de post/carrossel do Instagram, obtida por API/actor. Mesmo assim voce deve rejeitar frames ruins.',
                  'Aprovar somente foto real, bonita e nítida de comida/prato/produto, fachada ou ambiente do restaurante, pronta para galeria publica.',
                  'Rejeite qualquer imagem com pessoa/rosto/cliente/equipe/influencer como assunto, selfie, pose, grupo de pessoas, familia, criança, meme, print, poster, arte, cardapio textual, promoção dominante, texto grande, montagem/colagem, mosaico, foto cortada ruim, baixa resolução, escura, borrada, logo isolada, capa de vídeo/reel, play icon ou frame de vídeo.',
                  'Mãos segurando comida podem ser aceitas apenas se não houver rosto/pessoa como assunto e a comida for claramente o foco.',
                  'Se a imagem parecer crop de tela, screenshot, grade do Instagram ou recorte de outra imagem, ok=false.',
                  'JSON: {"ok":boolean,"kind":"food|environment|facade|bad","score":0-100,"premium_quality":boolean,"app_gallery_ready":boolean,"food_visible":boolean,"has_people_or_faces":boolean,"only_hands":boolean,"text_or_poster_dominant":boolean,"video_or_reel_frame":boolean,"bad_crop_or_composite":boolean,"low_quality":boolean,"reason":"curto"}',
                ].join('\n'),
              },
              { type: 'image_url', image_url: { url: imageDataUrl, detail: VISION_DETAIL } },
            ],
          },
        ],
      }), VISION_TIMEOUT_MS, 'openai_vision');
      const raw = response.choices?.[0]?.message?.content || '{}';
      const json = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ''));
      const peopleBlocker = json.has_people_or_faces === true && json.only_hands !== true;
      const ok = json.ok === true
        && json.app_gallery_ready === true
        && json.premium_quality === true
        && ['food', 'environment', 'facade'].includes(String(json.kind || '').toLowerCase())
        && Number(json.score || 0) >= 85
        && peopleBlocker !== true
        && json.text_or_poster_dominant !== true
        && json.video_or_reel_frame !== true
        && json.bad_crop_or_composite !== true
        && json.low_quality !== true;
      return {
        ...candidate,
        _imageBuffer: image.buffer,
        _contentType: image.contentType,
        vision: { ...json, ok },
        score: heuristicScore(candidate) + (ok ? Number(json.score || 0) : -140),
      };
    } catch (err) {
      const message = String(err?.message || err);
      if ((err?.status === 429 || /rate limit/i.test(message)) && attempt < 6) {
        const retryMs = Number(message.match(/try again in ([\d.]+)s/i)?.[1] || 0) * 1000;
        await new Promise((resolve) => setTimeout(resolve, Math.max(retryMs + 1000, 2500 * attempt)));
        continue;
      }
      return {
        ...candidate,
        vision: { ok: false, reason: `vision_failed:${message}` },
        score: heuristicScore(candidate) - 140,
      };
    }
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function prepareCandidatesWithBuffers(candidates) {
  const prepared = [];
  for (const candidate of candidates) {
    try {
      const image = candidate._imageBuffer
        ? { buffer: candidate._imageBuffer, contentType: candidate._contentType || 'image/jpeg' }
        : await fetchImageBuffer(candidate.url);
      prepared.push({
        ...candidate,
        _imageBuffer: image.buffer,
        _contentType: image.contentType,
      });
    } catch (err) {
      prepared.push({
        ...candidate,
        vision: { ok: false, reason: `fetch_failed:${err.message}` },
        score: heuristicScore(candidate) - 140,
      });
    }
  }
  return prepared;
}

async function renderCandidateGrid(candidates, restaurant) {
  const usable = candidates.filter((candidate) => candidate._imageBuffer);
  if (!usable.length) throw new Error('no_images_for_grid');
  const { default: puppeteer } = await import('puppeteer');
  const rows = Math.ceil(usable.length / GRID_COLUMNS);
  const width = GRID_COLUMNS * GRID_TILE_SIZE + (GRID_COLUMNS + 1) * GRID_GAP;
  const titleHeight = 54;
  const height = titleHeight + rows * GRID_TILE_SIZE + (rows + 1) * GRID_GAP;
  const tiles = usable.map((candidate, index) => {
    const dataUrl = `data:${candidate._contentType || 'image/jpeg'};base64,${candidate._imageBuffer.toString('base64')}`;
    const label = index + 1;
    return `
      <div class="tile">
        <img src="${dataUrl}" alt="candidate-${label}">
        <div class="badge">${label}</div>
      </div>
    `;
  }).join('');
  const html = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; }
          body {
            width: ${width}px;
            margin: 0;
            background: #f7f7f8;
            font-family: Arial, sans-serif;
            color: #111827;
          }
          .title {
            height: ${titleHeight}px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 8px 12px;
            font-size: 16px;
            font-weight: 700;
          }
          .subtitle {
            font-size: 11px;
            font-weight: 400;
            color: #4b5563;
            margin-top: 2px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(${GRID_COLUMNS}, ${GRID_TILE_SIZE}px);
            gap: ${GRID_GAP}px;
            padding: 0 ${GRID_GAP}px ${GRID_GAP}px ${GRID_GAP}px;
          }
          .tile {
            width: ${GRID_TILE_SIZE}px;
            height: ${GRID_TILE_SIZE}px;
            position: relative;
            overflow: hidden;
            border-radius: 8px;
            background: #ffffff;
            border: 1px solid #d1d5db;
          }
          .tile img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
            background: #ffffff;
          }
          .badge {
            position: absolute;
            top: 6px;
            left: 6px;
            min-width: 30px;
            height: 30px;
            border-radius: 999px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 8px;
            font-size: 16px;
            line-height: 1;
            font-weight: 800;
            background: #111827;
            color: #ffffff;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          }
        </style>
      </head>
      <body>
        <div class="title">
          ${escapeHtml(restaurant.name)} - candidatos Instagram API
          <div class="subtitle">Escolher somente fotos premium de comida, fachada ou ambiente. Evitar pessoas, videos, posters e cortes ruins.</div>
        </div>
        <div class="grid">${tiles}</div>
      </body>
    </html>`;
  const screenshotPath = path.join(OUT_DIR, `${restaurant.id}-instagram-candidate-grid.png`);
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load' });
    await page.screenshot({ path: screenshotPath, fullPage: true, type: 'png' });
  } finally {
    if (browser) await browser.close();
  }
  return {
    screenshotPath,
    buffer: fs.readFileSync(screenshotPath),
    contentType: 'image/png',
    candidates: usable,
  };
}

async function gridScoreCandidates(openai, candidates, restaurant) {
  const enriched = candidates
    .map((candidate) => ({ ...candidate, score: heuristicScore(candidate) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, CANDIDATE_LIMIT);
  const prepared = await prepareCandidatesWithBuffers(enriched);
  const grid = await renderCandidateGrid(prepared, restaurant);
  const imageDataUrl = `data:${grid.contentType};base64,${grid.buffer.toString('base64')}`;

  const response = await withTimeout(openai.chat.completions.create({
    model: process.env.OPENAI_VISION_MODEL || process.env.VITE_AI_MODEL || 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'Voce e um curador visual rigoroso para galeria premium de restaurante. Responda somente JSON valido.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: [
              `Restaurante: ${restaurant.name}`,
              `Categoria esperada: ${restaurant.category || ''}`,
              `Cidade: ${restaurant.city}/${restaurant.state}`,
              `A imagem anexa e uma grade numerada de candidatos vindos da API do Instagram. Escolha de ${MIN_GALLERY} a ${TARGET_GALLERY} numeros.`,
              'Aprovar somente foto real, bonita e nítida de comida/prato/produto, fachada ou ambiente do restaurante, pronta para galeria publica.',
              'Rejeite qualquer numero com pessoa/rosto/cliente/equipe/influencer como assunto, selfie, pose, grupo, crianca, meme, print, poster, arte, cardapio textual, promocao dominante, texto grande, montagem/colagem, mosaico, foto cortada ruim, baixa resolucao, escura, borrada, logo isolada, capa de video/reel, play icon ou frame de video.',
              'Maos segurando comida podem ser aceitas apenas se nao houver rosto/pessoa como assunto e a comida for claramente o foco.',
              'Prefira variedade visual, comida grande/apetitosa, boa luz, pouco texto e sem pessoas.',
              'JSON: {"approved_numbers":[1,2,3],"decisions":[{"number":1,"ok":true,"kind":"food|environment|facade|bad","score":0-100,"reason":"curto"}],"summary":"curto"}',
            ].join('\n'),
          },
          { type: 'image_url', image_url: { url: imageDataUrl, detail: VISION_DETAIL } },
        ],
      },
    ],
  }), VISION_TIMEOUT_MS, 'openai_grid_vision');

  const raw = response.choices?.[0]?.message?.content || '{}';
  const json = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ''));
  const decisionsByNumber = new Map((Array.isArray(json.decisions) ? json.decisions : [])
    .map((decision) => [Number(decision.number), decision]));
  const approvedNumbers = new Set((Array.isArray(json.approved_numbers) ? json.approved_numbers : [])
    .map(Number)
    .filter((number) => number >= 1 && number <= grid.candidates.length));

  const scored = grid.candidates.map((candidate, index) => {
    const number = index + 1;
    const decision = decisionsByNumber.get(number) || {};
    const approved = approvedNumbers.has(number) || decision.ok === true;
    const score = Number(decision.score || (approved ? 90 : 0));
    const ok = approved && score >= 80;
    return {
      ...candidate,
      gridNumber: number,
      vision: {
        ok,
        gridNumber: number,
        kind: decision.kind || (ok ? 'food' : 'bad'),
        score,
        reason: decision.reason || (ok ? 'aprovado_pela_grade' : 'rejeitado_pela_grade'),
        gridSummary: json.summary || '',
        gridPath: grid.screenshotPath,
        gridMode: true,
      },
      score: heuristicScore(candidate) + (ok ? score : -120),
    };
  });

  return scored.sort((a, b) => b.score - a.score);
}

async function scoreCandidates(openai, candidates, restaurant) {
  if (GRID_VISION) return gridScoreCandidates(openai, candidates, restaurant);
  const enriched = candidates
    .map((candidate) => ({ ...candidate, score: heuristicScore(candidate) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, CANDIDATE_LIMIT);
  const scored = [];
  for (let offset = 0; offset < enriched.length; offset += VISION_CONCURRENCY) {
    const chunk = enriched.slice(offset, offset + VISION_CONCURRENCY);
    scored.push(...await Promise.all(chunk.map((candidate) => visionScoreImage(openai, candidate, restaurant))));
    if (scored.filter((candidate) => candidate.vision?.ok === true).length >= TARGET_GALLERY) break;
  }
  return scored.sort((a, b) => b.score - a.score);
}

async function fetchImageBuffer(url, timeoutMs = DOWNLOAD_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        Referer: 'https://www.instagram.com/',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 30000) throw new Error('imagem_muito_pequena_ou_baixa_qualidade');
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return { buffer, contentType };
  } finally {
    clearTimeout(timer);
  }
}

async function downloadAndUploadImage(supabase, url, filePath) {
  const image = await fetchImageBuffer(url);
  return uploadImageBuffer(supabase, image.buffer, image.contentType, filePath);
}

async function uploadImageBuffer(supabase, buffer, contentType, filePath) {
  const { error } = await supabase.storage
    .from('restaurant-images')
    .upload(filePath, buffer, { contentType, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('restaurant-images').getPublicUrl(filePath);
  return data.publicUrl;
}

async function uploadCandidateImage(supabase, candidate, filePath) {
  if (candidate._imageBuffer) {
    return uploadImageBuffer(supabase, candidate._imageBuffer, candidate._contentType || 'image/jpeg', filePath);
  }
  return downloadAndUploadImage(supabase, candidate.url, filePath);
}

async function mediaStatus(supabase, restaurantId) {
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('image_url, cover_image_url')
    .eq('id', restaurantId)
    .single();
  const { data: galleryRows } = await supabase
    .from('restaurant_gallery')
    .select('id,image_url,order_index')
    .eq('restaurant_id', restaurantId)
    .order('order_index', { ascending: true });
  const galleryCount = galleryRows?.length || 0;
  const missing = [];
  if (!clean(restaurant?.image_url)) missing.push('logo');
  if (!clean(restaurant?.cover_image_url)) missing.push('capa');
  if (galleryCount < MIN_GALLERY) missing.push('galeria_min_3');
  return {
    hasLogo: Boolean(clean(restaurant?.image_url)),
    hasCover: Boolean(clean(restaurant?.cover_image_url)),
    galleryCount,
    galleryRows: galleryRows || [],
    complete: missing.length === 0,
    missing,
  };
}

async function hasStructuredMenu(supabase, restaurantId) {
  const { count, error } = await supabase
    .from('menu_categories')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId);
  return !error && Number(count || 0) > 0;
}

async function promoteIfComplete(supabase, restaurantId) {
  const status = await mediaStatus(supabase, restaurantId);
  const menuReady = await hasStructuredMenu(supabase, restaurantId);
  if (!menuReady || !status.complete) return { promoted: false, menuReady, mediaStatus: status };
  const { error } = await supabase
    .from('restaurants')
    .update({
      ai_validated: true,
      menu_status: 'found',
      menu_status_reason: `Cardapio estruturado e midia completa via Instagram API + OpenAI Vision: logo, capa e ${status.galleryCount} fotos premium.`,
      menu_last_checked_at: new Date().toISOString(),
    })
    .eq('id', restaurantId);
  return { promoted: !error, error: error?.message || null, menuReady, mediaStatus: status };
}

async function selectRestaurants(supabase) {
  let query = supabase
    .from('restaurants')
    .select('id,name,google_maps_name,category,city,state,phone,instagram,social_networks,coleta_logs,image_url,cover_image_url,followers_override,is_deleted,menu_status,other_url,other_url_label,opening_hours')
    .eq('state', STATE)
    .eq('is_deleted', false)
    .not('instagram', 'is', null)
    .neq('instagram', '');

  if (IDS.length) query = query.in('id', IDS);
  else query = query.eq('city', CITY).limit(LIMIT);

  const { data, error } = await query;
  if (error) throw error;
  return (data || [])
    .map((row) => ({ ...row, username: instagramUsername(row.instagram) }))
    .filter((row) => row.username)
    .slice(0, LIMIT);
}

function mergeSocialNetworks(row, profile) {
  const username = clean(profile?.username || row.username || instagramUsername(row.instagram));
  const social = parseArray(row.social_networks)
    .filter((item) => String(item?.platform || '').toLowerCase() !== 'instagram');
  social.push({
    platform: 'instagram',
    url: canonicalInstagram(username),
    followers: Number(profile?.followersCount || 0),
    posts: Number(profile?.postsCount || 0),
    biography: clean(profile?.biography || '').slice(0, 800),
    website: clean(profile?.externalUrl || profile?.externalUrlShimmed || ''),
    source: 'apify_instagram_profile_scraper',
    verifiedAt: new Date().toISOString(),
  });
  return social;
}

async function enrichOne({ supabase, openai, apifyToken, restaurant }) {
  const now = new Date().toISOString();
  const before = await mediaStatus(supabase, restaurant.id);
  const evidence = {
    id: restaurant.id,
    name: restaurant.name,
    username: restaurant.username,
    instagram: canonicalInstagram(restaurant.username),
    applied: APPLY,
    forceMedia: FORCE_MEDIA,
    before,
    uploads: [],
    skipped: [],
  };

  const [profile, posts] = await Promise.all([
    fetchProfile(apifyToken, restaurant.username).catch((err) => {
      evidence.skipped.push({ kind: 'profile', reason: err.message });
      return null;
    }),
    fetchPosts(apifyToken, restaurant.username),
  ]);
  evidence.profile = profile ? {
    username: profile.username || null,
    followers: Number(profile.followersCount || 0) || null,
    posts: Number(profile.postsCount || 0) || null,
    profilePic: Boolean(profile.profilePicUrlHD || profile.profilePicUrl),
    biography: clean(profile.biography || '').slice(0, 500),
  } : null;
  evidence.postCount = posts.length;

  const bioHours = !hasCanonicalOpeningHours(restaurant.opening_hours) && profile?.biography
    ? normalizeOpeningHoursFromInstagramBio(profile.biography)
    : null;

  const candidates = extractPostCandidates(posts);
  const scored = await scoreCandidates(openai, candidates, restaurant);
  const approved = scored
    .filter((candidate) => candidate.vision?.ok === true)
    .slice(0, TARGET_GALLERY);
  evidence.candidates = scored.map((candidate) => ({
    source: candidate.source,
    score: candidate.score,
    postIndex: candidate.postIndex,
    childIndex: candidate.childIndex ?? null,
    postUrl: candidate.postUrl || null,
    sourceType: candidate.sourceType || null,
    width: candidate.width,
    height: candidate.height,
    vision: candidate.vision,
  }));
  evidence.approvedCount = approved.length;

  const updates = {
    instagram: canonicalInstagram(restaurant.username),
    followers_override: Number(profile?.followersCount || 0) || restaurant.followers_override || null,
    social_networks: profile ? mergeSocialNetworks(restaurant, profile) : restaurant.social_networks,
    coleta_logs: mergeLogs(restaurant, {
      apify_instagram_original_gallery_v1: {
        checkedAt: now,
        source: 'apify/instagram-scraper posts + apify/instagram-profile-scraper profile + openai_vision',
        username: restaurant.username,
        postCount: posts.length,
        candidateCount: candidates.length,
        approvedCount: approved.length,
        forceMedia: FORCE_MEDIA,
        applied: APPLY,
        rejects: evidence.candidates
          .filter((item) => item.vision?.ok !== true)
          .slice(0, 10)
          .map((item) => ({ reason: item.vision?.reason || null, score: item.vision?.score || 0 })),
      },
      ...(bioHours ? {
        instagram_bio_hours_v1: {
          checkedAt: now,
          source: 'apify/instagram-profile-scraper.biography',
          parser: bioHours.parser,
          sourceText: bioHours.sourceText,
          opening_hours: bioHours.schedule,
        },
      } : {}),
    }),
  };

  if (bioHours) {
    updates.opening_hours = bioHours.schedule;
    evidence.uploads.push({ kind: 'opening_hours_from_instagram_bio', parser: bioHours.parser });
  }

  if ((FORCE_LOGO || !before.hasLogo) && (profile?.profilePicUrlHD || profile?.profilePicUrl)) {
    const logoSource = profile.profilePicUrlHD || profile.profilePicUrl;
    if (APPLY) {
      try {
        const logoUrl = await downloadAndUploadImage(
          supabase,
          logoSource,
          `logos/${restaurant.id}/instagram_profile_api_${Date.now()}.jpg`,
        );
        updates.image_url = logoUrl;
        evidence.uploads.push({ kind: 'logo', url: logoUrl, source: 'instagram_profile_api' });
      } catch (err) {
        evidence.skipped.push({ kind: 'logo', reason: err.message });
      }
    } else {
      evidence.uploads.push({ kind: 'logo_dry_run', source: 'instagram_profile_api' });
    }
  }

  if (APPLY && FORCE_MEDIA) {
    const { error } = await supabase.from('restaurant_gallery').delete().eq('restaurant_id', restaurant.id);
    if (error) evidence.skipped.push({ kind: 'gallery_delete', reason: error.message });
  }

  const galleryBeforeCount = FORCE_MEDIA ? 0 : before.galleryCount;
  const slots = Math.max(0, MAX_GALLERY - galleryBeforeCount);
  const selectedForUpload = approved.slice(0, slots);
  const uploadedGallery = [];
  if (APPLY) {
    let orderIndex = galleryBeforeCount;
    for (const [index, candidate] of selectedForUpload.entries()) {
      try {
        const publicUrl = await uploadCandidateImage(
          supabase,
          candidate,
          `gallery/${restaurant.id}/instagram_original_${Date.now()}_${index + 1}.jpg`,
        );
        const { error } = await supabase.from('restaurant_gallery').insert([{
          restaurant_id: restaurant.id,
          image_url: publicUrl,
          caption: `Instagram API (${candidate.vision.kind})`,
          order_index: orderIndex++,
        }]);
        if (error) throw error;
        uploadedGallery.push(publicUrl);
        evidence.uploads.push({
          kind: 'gallery',
          url: publicUrl,
          source: candidate.source,
          gridNumber: candidate.gridNumber || candidate.vision?.gridNumber || null,
          postUrl: candidate.postUrl || null,
          vision: candidate.vision,
        });
      } catch (err) {
        evidence.skipped.push({
          kind: 'gallery',
          source: candidate.source,
          postUrl: candidate.postUrl || null,
          reason: err.message,
          vision: candidate.vision,
        });
      }
    }
  } else {
    for (const candidate of selectedForUpload) {
      evidence.uploads.push({
        kind: 'gallery_dry_run',
        source: candidate.source,
        gridNumber: candidate.gridNumber || candidate.vision?.gridNumber || null,
        postUrl: candidate.postUrl || null,
        vision: candidate.vision,
      });
    }
  }

  if ((FORCE_MEDIA || !before.hasCover) && uploadedGallery[0]) {
    updates.cover_image_url = uploadedGallery[0];
    evidence.uploads.push({ kind: 'cover', url: uploadedGallery[0], source: 'best_approved_instagram_api_image' });
  }

  if (APPLY) {
    const { error } = await supabase
      .from('restaurants')
      .update(updates)
      .eq('id', restaurant.id);
    if (error) {
      evidence.status = 'restaurant_update_failed';
      evidence.reason = error.message;
      return evidence;
    }
  }

  const after = APPLY ? await mediaStatus(supabase, restaurant.id) : before;
  const promotion = APPLY && PROMOTE ? await promoteIfComplete(supabase, restaurant.id) : null;
  evidence.after = after;
  evidence.promotion = promotion;
  evidence.status = after.complete ? 'media_complete' : 'media_incomplete';
  return evidence;
}

async function main() {
  ensureOutDir();
  const env = readEnv();
  const apifyToken = env.APIFY_TOKEN;
  const openaiKey = env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY;
  if (!apifyToken) throw new Error('APIFY_TOKEN ausente no .env');
  if (!openaiKey) throw new Error('OPENAI_API_KEY ausente no .env');

  const supabase = createClient(
    env.VITE_SUPABASE_URL || env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
      || env.VITE_SUPABASE_SERVICE_ROLE_KEY
      || env.SERVICE_ROLE_KEY
      || env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
  const openai = new OpenAI({ apiKey: openaiKey });
  const restaurants = await selectRestaurants(supabase);
  writeJson('target-restaurants.json', restaurants.map((row) => ({
    id: row.id,
    name: row.name,
    instagram: row.instagram,
    username: row.username,
  })));

  const results = [];
  console.log(JSON.stringify({
    apply: APPLY,
    forceMedia: FORCE_MEDIA,
    promote: PROMOTE,
    ids: restaurants.map((row) => row.id),
    candidateLimit: CANDIDATE_LIMIT,
    resultsLimit: RESULTS_LIMIT,
    targetGallery: TARGET_GALLERY,
    visionDetail: VISION_DETAIL,
    minGallery: MIN_GALLERY,
    maxGallery: MAX_GALLERY,
    outDir: OUT_DIR,
  }, null, 2));

  for (const restaurant of restaurants) {
    console.log(JSON.stringify({ processing: restaurant.name, id: restaurant.id, username: restaurant.username }));
    try {
      const evidence = await enrichOne({ supabase, openai, apifyToken, restaurant });
      results.push(evidence);
      writeJson(`${restaurant.id}.json`, evidence);
      console.log(JSON.stringify({
        name: restaurant.name,
        status: evidence.status,
        posts: evidence.postCount,
        approved: evidence.approvedCount,
        uploads: evidence.uploads.length,
        after: evidence.after,
      }));
    } catch (err) {
      const failed = { id: restaurant.id, name: restaurant.name, status: 'failed', reason: err.message };
      results.push(failed);
      writeJson(`${restaurant.id}.json`, failed);
      console.log(JSON.stringify(failed));
    }
  }

  const summary = {
    runId: RUN_ID,
    outDir: OUT_DIR,
    apply: APPLY,
    forceMedia: FORCE_MEDIA,
    promote: PROMOTE,
    processed: results.length,
    mediaComplete: results.filter((item) => item.status === 'media_complete').length,
    mediaIncomplete: results.filter((item) => item.status === 'media_incomplete').length,
    failed: results.filter((item) => item.status === 'failed').length,
    promoted: results.filter((item) => item.promotion?.promoted).length,
    results: results.map((item) => ({
      id: item.id,
      name: item.name,
      status: item.status,
      posts: item.postCount || 0,
      approved: item.approvedCount || 0,
      uploads: item.uploads?.length || 0,
      after: item.after || null,
      reason: item.reason || null,
    })),
  };
  writeJson('summary.json', summary);
  console.log(`SUMMARY:${JSON.stringify(summary)}`);
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
