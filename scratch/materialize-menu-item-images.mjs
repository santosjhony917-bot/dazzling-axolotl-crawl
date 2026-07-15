import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
const ENV_FILE = path.resolve(ROOT, '.env');
const DEFAULT_LIMIT = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || 20) || 20;
const DEFAULT_OFFSET = Number(process.argv.find((arg) => arg.startsWith('--offset='))?.split('=')[1] || 0) || 0;
const MIN_WIDTH = Number(process.argv.find((arg) => arg.startsWith('--min-width='))?.split('=')[1] || 320) || 320;
const MIN_HEIGHT = Number(process.argv.find((arg) => arg.startsWith('--min-height='))?.split('=')[1] || 240) || 240;
const TIMEOUT_MS = Number(process.argv.find((arg) => arg.startsWith('--timeout-ms='))?.split('=')[1] || 20000) || 20000;
const DRY_RUN = process.argv.includes('--dry-run');

function loadDotEnv(filePath) {
  const loaded = {};
  if (!fs.existsSync(filePath)) return loaded;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    loaded[key] = value;
  }
  return loaded;
}

const fileEnv = loadDotEnv(ENV_FILE);
const env = {
  ...fileEnv,
  ...process.env,
};

const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL || 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
const STORAGE_BUCKET = 'restaurant-images';

if (!SUPABASE_KEY) {
  console.error('Missing Supabase key in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const PLACEHOLDER_URL_RE = /placeholder|via\.placeholder|placehold|dummyimage|picsum|loremflickr|poster/i;

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function areaOf(dimensions) {
  return (dimensions?.width || 0) * (dimensions?.height || 0);
}

function contentLooksLikeHtml(buffer) {
  const head = buffer.subarray(0, 256).toString('utf8').toLowerCase();
  return head.includes('<html') || head.includes('<!doctype html') || head.includes('<body') || head.includes('text/html');
}

function detectMimeFromBuffer(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buffer.length >= 6) {
    const sig = buffer.subarray(0, 6).toString('ascii');
    if (sig === 'GIF87a' || sig === 'GIF89a') return 'image/gif';
  }
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buffer.subarray(8, 12).toString('ascii').replace(/\0/g, '');
    if (/avif|avis/i.test(brand)) return 'image/avif';
  }
  return '';
}

function parsePngDimensions(buffer) {
  if (buffer.length < 24) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function parseGifDimensions(buffer) {
  if (buffer.length < 10) return null;
  return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
}

function parseWebpDimensions(buffer) {
  if (buffer.length < 30) return null;
  const chunk = buffer.subarray(12, 16).toString('ascii');
  if (chunk === 'VP8X') {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  if (chunk === 'VP8L' && buffer[20] === 0x2f) {
    const b1 = buffer[21];
    const b2 = buffer[22];
    const b3 = buffer[23];
    const b4 = buffer[24];
    return {
      width: 1 + (((b2 & 0x3f) << 8) | b1),
      height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6)),
    };
  }
  return null;
}

function parseJpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 1 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    if (offset + 3 >= buffer.length) return null;
    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2) return null;
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSof && offset + 8 < buffer.length) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + segmentLength;
  }
  return null;
}

function parseImageDimensions(buffer, mime) {
  if (mime === 'image/png') return parsePngDimensions(buffer);
  if (mime === 'image/gif') return parseGifDimensions(buffer);
  if (mime === 'image/webp') return parseWebpDimensions(buffer);
  if (mime === 'image/jpeg') return parseJpegDimensions(buffer);
  return null;
}

function extensionForMime(mime) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  if (mime === 'image/avif') return 'avif';
  return 'jpg';
}

function sortQueryParams(url) {
  const parsed = new URL(url);
  const entries = Array.from(parsed.searchParams.entries()).sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));
  parsed.search = '';
  for (const [key, value] of entries) parsed.searchParams.append(key, value);
  return parsed.toString();
}

function deriveVariantUrls(inputUrl) {
  const urls = new Set([inputUrl]);
  try {
    const parsed = new URL(inputUrl);
    const thumbnailKeys = ['w', 'width', 'h', 'height', 'size', 's', 'q', 'quality', 'fit', 'dpr', 'format', 'fm', 'crop', 'thumbnail', 'thumb', 'max', 'resize'];
    const cleaned = new URL(parsed.toString());
    let changed = false;
    for (const key of thumbnailKeys) {
      if (cleaned.searchParams.has(key)) {
        cleaned.searchParams.delete(key);
        changed = true;
      }
    }
    if (changed) {
      cleaned.hash = '';
      urls.add(sortQueryParams(cleaned.toString()));
    }
  } catch {
    return [...urls];
  }
  return [...urls];
}

function extractUrlsFromHtml(html, baseUrl) {
  const urls = new Set();
  const addUrl = (candidate) => {
    if (!candidate) return;
    try {
      urls.add(new URL(candidate, baseUrl).toString());
    } catch {}
  };
  const srcsetMatches = html.matchAll(/srcset\s*=\s*["']([^"']+)["']/gi);
  for (const match of srcsetMatches) {
    for (const part of String(match[1] || '').split(',')) {
      const raw = part.trim().split(/\s+/)[0];
      addUrl(raw);
    }
  }
  const srcMatches = html.matchAll(/\b(?:src|data-src|href|content)\s*=\s*["']([^"']+)["']/gi);
  for (const match of srcMatches) addUrl(match[1]);
  const jsonUrlMatches = html.matchAll(/https?:\/\/[^"'`\s<>]+/gi);
  for (const match of jsonUrlMatches) addUrl(match[0]);
  return [...urls];
}

async function fetchImageCandidate(candidateUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error('timeout')), TIMEOUT_MS);
  try {
    const response = await fetch(candidateUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });
    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    const buffer = Buffer.from(await response.arrayBuffer());
    return { response, contentType, buffer };
  } finally {
    clearTimeout(timeout);
  }
}

function isAnotaSourceUrl(value) {
  return /(?:^|[./])anota\.ai(?:$|[/?#])/i.test(String(value || ''));
}

async function resolveBestImageSource(inputUrl, pageUrl = '') {
  const candidateUrls = new Set(deriveVariantUrls(inputUrl));
  if (pageUrl && pageUrl !== inputUrl) candidateUrls.add(pageUrl);
  const scored = [];
  const visited = new Set();
  const sourceLooksLikeThumbnail = PLACEHOLDER_URL_RE.test(inputUrl) || /(?:thumb|thumbnail|preview|small|medium|poster)/i.test(inputUrl);

  for (const candidateUrl of candidateUrls) {
    if (visited.has(candidateUrl)) continue;
    visited.add(candidateUrl);
    try {
      const { response, contentType, buffer } = await fetchImageCandidate(candidateUrl);
      if (!response.ok) continue;
      if (contentType.startsWith('text/html') || contentLooksLikeHtml(buffer)) {
        const html = buffer.toString('utf8');
        const htmlUrls = extractUrlsFromHtml(html, candidateUrl)
          .filter((url) => url !== candidateUrl)
          .slice(0, 40);
        for (const htmlUrl of htmlUrls) candidateUrls.add(htmlUrl);
        continue;
      }
      if (!contentType.startsWith('image/')) continue;
      const detectedMime = detectMimeFromBuffer(buffer);
      if (!detectedMime) continue;
      const dimensions = parseImageDimensions(buffer, detectedMime);
      if (!dimensions?.width || !dimensions?.height) continue;
      scored.push({
        url: candidateUrl,
        responseContentType: contentType,
        mime: detectedMime,
        buffer,
        dimensions,
        bytes: buffer.length,
        hash: sha256(buffer),
      });
    } catch {}
  }

  if (!scored.length) return null;
  scored.sort((left, right) => {
    const areaDelta = areaOf(right.dimensions) - areaOf(left.dimensions);
    if (areaDelta !== 0) return areaDelta;
    const widthDelta = (right.dimensions.width || 0) - (left.dimensions.width || 0);
    if (widthDelta !== 0) return widthDelta;
    const heightDelta = (right.dimensions.height || 0) - (left.dimensions.height || 0);
    if (heightDelta !== 0) return heightDelta;
    return (right.bytes || 0) - (left.bytes || 0);
  });

  const baseline = scored[0];
  if (!sourceLooksLikeThumbnail && scored.length === 1) return baseline;
  return baseline;
}

function sanitizeNotes(notes) {
  return String(notes || '').trim();
}

function appendNote(existing, note) {
  const current = sanitizeNotes(existing);
  if (!current) return note;
  if (current.includes(note)) return current;
  return `${current}\n${note}`;
}

async function fetchRecentCandidates(limit, offset) {
  const { data, error } = await supabase
    .from('menu_items')
    .select(`
      id,
      name,
      image_url,
      source_url,
      created_at,
      raw_data,
      import_notes,
      category_id,
      menu_categories!inner (
        restaurant_id,
        restaurants!inner (
          id,
          name,
          external_url,
          other_url
        )
      )
    `)
    .not('image_url', 'is', null)
    .neq('image_url', '')
    .not('image_url', 'ilike', '%/storage/v1/object/public/%')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data || [];
}

async function ensureStorageUpload(pathName, buffer, contentType) {
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(pathName, buffer, {
    contentType,
    cacheControl: '31536000',
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(pathName);
  return data.publicUrl;
}

async function materializeItem(row) {
  const inputUrl = String(row.image_url || '').trim();
  const result = {
    item_id: row.id,
    restaurant_id: row.menu_categories?.restaurants?.id || row.menu_categories?.restaurant_id || null,
    restaurant_name: row.menu_categories?.restaurants?.name || null,
    item_name: row.name,
    input_url: inputUrl,
    source_page_url: String(row.source_url || row.menu_categories?.restaurants?.external_url || row.menu_categories?.restaurants?.other_url || '').trim(),
    source_original_url: '',
    status: 'pending',
    reason: '',
    width: null,
    height: null,
    bytes: null,
    mime: '',
    hash: '',
    storage_path: '',
    public_url: '',
    elapsed_ms: 0,
  };

  const startedAt = Date.now();
  try {
    if (!inputUrl) {
      result.status = 'invalid';
      result.reason = 'empty_url';
      return result;
    }
    if (PLACEHOLDER_URL_RE.test(inputUrl)) {
      result.status = 'invalid';
      result.reason = 'placeholder_url';
      return result;
    }

    const resolved = await resolveBestImageSource(inputUrl, result.source_page_url);
    if (!resolved) {
      result.status = 'invalid';
      result.reason = 'no_valid_image_variant';
      return result;
    }
    const { url: sourceOriginalUrl, mime, buffer, dimensions, bytes, hash } = resolved;
    if (!dimensions?.width || !dimensions?.height) {
      result.status = 'invalid';
      result.reason = 'dimensions_unavailable';
      return result;
    }
    if (dimensions.width < MIN_WIDTH || dimensions.height < MIN_HEIGHT) {
      result.status = 'invalid';
      result.reason = `too_small_${dimensions.width}x${dimensions.height}`;
      result.width = dimensions.width;
      result.height = dimensions.height;
      result.bytes = bytes;
      result.mime = mime;
      result.source_original_url = sourceOriginalUrl;
      return result;
    }

    const ext = extensionForMime(mime);
    const restaurantId = result.restaurant_id || 'unknown-restaurant';
    const itemId = row.id;
    const storagePath = `menu-items/${restaurantId}/${itemId}/${hash}.${ext}`;

    result.width = dimensions.width;
    result.height = dimensions.height;
    result.bytes = bytes;
    result.mime = mime;
    result.hash = hash;
    result.storage_path = storagePath;
    result.source_original_url = sourceOriginalUrl;

    if (!DRY_RUN) {
      const publicUrl = await ensureStorageUpload(storagePath, buffer, mime);
      result.public_url = publicUrl;

      const materializationNote = [
        `image_materialized_at=${new Date().toISOString()}`,
        `input_image_url=${inputUrl}`,
        `source_original_url=${sourceOriginalUrl}`,
        `storage_path=${storagePath}`,
        `sha256=${hash}`,
        `dimensions=${dimensions.width}x${dimensions.height}`,
        `bytes=${bytes}`,
        `content_type=${mime}`,
      ].join(' | ');

      const nextRawData =
        row.raw_data && typeof row.raw_data === 'object' && !Array.isArray(row.raw_data)
          ? {
              ...row.raw_data,
              original_image_url: inputUrl,
              source_original_url: sourceOriginalUrl,
              image_materialization: {
                input_url: inputUrl,
                source_original_url: sourceOriginalUrl,
                storage_path: storagePath,
                sha256: hash,
                content_type: mime,
                width: dimensions.width,
                height: dimensions.height,
                bytes,
                materialized_at: new Date().toISOString(),
              },
            }
          : row.raw_data;

      const updatePayload = {
        image_url: publicUrl,
        import_notes: appendNote(row.import_notes, materializationNote),
      };
      if (nextRawData && typeof nextRawData === 'object' && !Array.isArray(nextRawData)) {
        updatePayload.raw_data = nextRawData;
      }

      const { error: updateError } = await supabase
        .from('menu_items')
        .update(updatePayload)
        .eq('id', row.id);
      if (updateError) throw updateError;
    }

    result.status = DRY_RUN ? 'dry_run_valid' : 'saved';
    return result;
  } catch (error) {
    result.status = 'invalid';
    result.reason = String(error?.message || error);
    return result;
  } finally {
    result.elapsed_ms = Date.now() - startedAt;
  }
}

async function main() {
  const recentRows = await fetchRecentCandidates(Math.max(DEFAULT_LIMIT * 10, 200), DEFAULT_OFFSET);
  const candidates = recentRows.filter((row) => {
    const sourceUrl = String(row.source_url || row.menu_categories?.restaurants?.external_url || row.menu_categories?.restaurants?.other_url || '').trim();
    if (sourceUrl && isAnotaSourceUrl(sourceUrl)) return false;
    return true;
  }).slice(0, DEFAULT_LIMIT);
  const results = [];
  const startedAt = Date.now();
  let saved = 0;
  let invalid = 0;

  for (const row of candidates) {
    const outcome = await materializeItem(row);
    results.push(outcome);
    if (outcome.status === 'saved' || outcome.status === 'dry_run_valid') saved += 1;
    else invalid += 1;
    console.log(
      JSON.stringify(
        {
          item_id: outcome.item_id,
          restaurant_id: outcome.restaurant_id,
          status: outcome.status,
          reason: outcome.reason || null,
          width: outcome.width,
          height: outcome.height,
          mime: outcome.mime || null,
          hash: outcome.hash || null,
          storage_path: outcome.storage_path || null,
          elapsed_ms: outcome.elapsed_ms,
        },
      ),
    );
  }

  const summary = {
    attempted: candidates.length,
    saved,
    invalid,
    dry_run: DRY_RUN,
    total_elapsed_ms: Date.now() - startedAt,
    min_width: MIN_WIDTH,
    min_height: MIN_HEIGHT,
    timeout_ms: TIMEOUT_MS,
  };

  console.log(`SUMMARY:${JSON.stringify(summary)}`);
  if (!DRY_RUN) {
    const outDir = path.resolve(ROOT, 'scratch', 'materialization-runs');
    fs.mkdirSync(outDir, { recursive: true });
    const filePath = path.join(outDir, `menu-item-images-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(filePath, JSON.stringify({ summary, results }, null, 2));
    console.log(`REPORT_FILE:${filePath}`);
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ success: false, error: String(error?.message || error) }));
  process.exitCode = 1;
});
