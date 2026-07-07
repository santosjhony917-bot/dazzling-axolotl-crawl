import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const ALLOW_SCREENSHOT_IMPORT = args.includes('--allow-screenshot-import');
const RESTAURANT_ID = valueArg('--id', '');
const CROPS_DIR = valueArg('--crops-dir', '');
const MAX_GALLERY = Math.min(8, Number(valueArg('--max-gallery', '8')) || 8);
const MIN_SCORE = Number(valueArg('--min-score', '70')) || 70;

function valueArg(name, fallback = '') {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
}

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

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
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

function mergeLogs(row, patch) {
  return {
    ...parseJson(row.coleta_logs),
    ...patch,
  };
}

function imageDataUrl(file) {
  const ext = path.extname(file).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  const buffer = fs.readFileSync(file);
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

async function visionScore(openai, restaurant, crop) {
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_VISION_MODEL || process.env.VITE_AI_MODEL || 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'Voce e um auditor visual rigoroso para galeria publica de restaurante. Responda somente JSON valido.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: [
              `Restaurante: ${restaurant.name}`,
              `Categoria: ${restaurant.category || ''}`,
              `Cidade: ${restaurant.city}/${restaurant.state}`,
              'O recorte veio do grid do Instagram do proprio restaurante.',
              'Aprove apenas se for foto real bonita de comida/produto, fachada ou ambiente.',
              'Rejeite pessoas em destaque/posando, rostos grandes, equipe, influencer, cliente segurando comida, selfie, banner/cardapio/promocao com texto dominante, logo isolada, meme, print, baixa qualidade.',
              'Maos pequenas segurando pizza/comida podem ser aceitas se a comida for o assunto principal e nao houver rosto/pessoa em destaque.',
              'JSON: {"ok":boolean,"kind":"food|environment|facade|bad","score":0-100,"has_person":boolean,"person_is_prominent":boolean,"people_count":number,"food_visible":boolean,"text_or_poster_dominant":boolean,"reason":"curto"}',
            ].join('\n'),
          },
          { type: 'image_url', image_url: { url: imageDataUrl(crop.file) } },
        ],
      },
    ],
  });
  const json = JSON.parse((response.choices?.[0]?.message?.content || '{}').replace(/^```json\s*|\s*```$/g, ''));
  const ok = json.ok === true
    && ['food', 'environment', 'facade'].includes(String(json.kind || '').toLowerCase())
    && json.person_is_prominent !== true
    && json.text_or_poster_dominant !== true
    && Number(json.score || 0) >= MIN_SCORE;
  return {
    ...crop,
    vision: { ...json, ok },
    score: (ok ? Number(json.score || 0) : -100) + Math.max(0, 20 - Number(crop.index || 0)),
  };
}

async function uploadLocalImage(supabase, file, storagePath) {
  const buffer = fs.readFileSync(file);
  const contentType = path.extname(file).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
  const { error } = await supabase.storage
    .from('restaurant-images')
    .upload(storagePath, buffer, { contentType, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('restaurant-images').getPublicUrl(storagePath);
  return data.publicUrl;
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
  return {
    hasLogo: Boolean(clean(restaurant?.image_url)),
    hasCover: Boolean(clean(restaurant?.cover_image_url)),
    galleryCount: galleryRows?.length || 0,
    galleryRows: galleryRows || [],
  };
}

async function hasStructuredMenu(supabase, restaurantId) {
  const { count, error } = await supabase
    .from('menu_categories')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId);
  return !error && Number(count || 0) > 0;
}

async function main() {
  if (!RESTAURANT_ID) throw new Error('--id obrigatorio');
  if (!CROPS_DIR) throw new Error('--crops-dir obrigatorio');
  const cropsJson = path.join(CROPS_DIR, 'crops.json');
  if (!fs.existsSync(cropsJson)) throw new Error(`crops.json nao encontrado em ${CROPS_DIR}`);

  const env = readEnv();
  const openaiKey = env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY;
  if (!openaiKey) throw new Error('OPENAI_API_KEY ausente');
  const supabase = createClient(
    env.VITE_SUPABASE_URL || env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
      || env.VITE_SUPABASE_SERVICE_ROLE_KEY
      || env.SERVICE_ROLE_KEY
      || env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
  const openai = new OpenAI({ apiKey: openaiKey });

  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .select('id,name,category,city,state,coleta_logs')
    .eq('id', RESTAURANT_ID)
    .single();
  if (error) throw error;

  const cropsPayload = JSON.parse(fs.readFileSync(cropsJson, 'utf8'));
  const crops = cropsPayload.crops
    .slice(0, 16)
    .map((crop) => ({
      ...crop,
      file: path.resolve(crop.file),
    }))
    .filter((crop) => fs.existsSync(crop.file));

  const scored = [];
  for (const crop of crops) {
    try {
      scored.push(await visionScore(openai, restaurant, crop));
    } catch (err) {
      scored.push({ ...crop, vision: { ok: false, reason: `vision_failed:${err.message}` }, score: -100 });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  const approved = scored.filter((crop) => crop.vision?.ok === true).slice(0, MAX_GALLERY);

  const before = await mediaStatus(supabase, RESTAURANT_ID);
  const result = {
    id: RESTAURANT_ID,
    name: restaurant.name,
    applied: APPLY,
    before,
    cropCount: crops.length,
    approvedCount: approved.length,
    candidates: scored.map((crop) => ({
      file: crop.file,
      index: crop.index,
      row: crop.row,
      col: crop.col,
      score: crop.score,
      vision: crop.vision,
    })),
    uploads: [],
  };

  if (APPLY && !ALLOW_SCREENSHOT_IMPORT) {
    throw new Error('Importacao direta de recorte/screenshot bloqueada. Use apenas para auditoria ou passe --allow-screenshot-import conscientemente.');
  }

  if (APPLY && approved.length) {
    let orderIndex = before.galleryCount;
    const slots = Math.max(0, MAX_GALLERY - before.galleryCount);
    for (const [index, crop] of approved.slice(0, slots).entries()) {
      const publicUrl = await uploadLocalImage(
        supabase,
        crop.file,
        `gallery/${RESTAURANT_ID}/instagram_screenshot_${Date.now()}_${index + 1}.jpg`,
      );
      const { error: galleryError } = await supabase.from('restaurant_gallery').insert([{
        restaurant_id: RESTAURANT_ID,
        image_url: publicUrl,
        caption: `Foto Instagram (${crop.vision.kind})`,
        order_index: orderIndex++,
      }]);
      if (galleryError) throw galleryError;
      result.uploads.push({ url: publicUrl, vision: crop.vision, sourceFile: crop.file });
    }
    if (!before.hasCover && result.uploads[0]?.url) {
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({
          cover_image_url: result.uploads[0].url,
          coleta_logs: mergeLogs(restaurant, {
            instagram_screenshot_gallery_v1: {
              checkedAt: new Date().toISOString(),
              source: cropsPayload.source,
              cropCount: crops.length,
              approvedCount: approved.length,
              uploadedCount: result.uploads.length,
            },
          }),
        })
        .eq('id', RESTAURANT_ID);
      if (updateError) throw updateError;
    }
    const after = await mediaStatus(supabase, RESTAURANT_ID);
    const menuReady = await hasStructuredMenu(supabase, RESTAURANT_ID);
    if (menuReady && after.hasLogo && after.hasCover && after.galleryCount >= 3) {
      await supabase.from('restaurants').update({
        ai_validated: true,
        menu_status: 'found',
        menu_status_reason: `Cardapio estruturado e midia minima completa via screenshot Instagram + OpenAI Vision: logo, capa e ${after.galleryCount} fotos.`,
        menu_last_checked_at: new Date().toISOString(),
      }).eq('id', RESTAURANT_ID);
    }
    result.after = after;
  }

  const outDir = path.join('scratch', 'instagram-screenshot-gallery-import', new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${RESTAURANT_ID}.json`), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({
    outDir,
    id: RESTAURANT_ID,
    name: restaurant.name,
    applied: APPLY,
    cropCount: crops.length,
    approvedCount: approved.length,
    uploads: result.uploads.length,
    before,
    after: result.after || null,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
