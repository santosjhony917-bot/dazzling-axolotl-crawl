import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';

const args = process.argv.slice(2);
const argValue = (name, fallback = '') => {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'openai-vision-menu-ocr', RUN_ID);
const IMAGE_PATH = argValue('--image', '');
const IMAGE_URL = argValue('--url', '');
const RESTAURANT = argValue('--restaurant', '');
const MODEL = argValue('--model', 'gpt-4.1-mini');

fs.mkdirSync(OUT_DIR, { recursive: true });

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function findProjectRoot() {
  const starts = [process.cwd(), path.resolve(scriptDir, '..')];
  for (const start of starts) {
    let current = path.resolve(start);
    while (true) {
      if (fs.existsSync(path.join(current, '.env')) && fs.existsSync(path.join(current, 'package.json'))) {
        return current;
      }
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  return path.resolve(scriptDir, '..');
}

function parseEnvFile(envPath) {
  const env = {};
  const content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }
  return { ...process.env, ...env };
}

function mimeFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/png';
}

function imageInput() {
  if (IMAGE_URL) return IMAGE_URL;
  if (!IMAGE_PATH) throw new Error('Use --image=C:\\path\\menu.png or --url=https://...');
  const absolute = path.resolve(IMAGE_PATH);
  const buffer = fs.readFileSync(absolute);
  const mime = mimeFromPath(absolute);
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

function schema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      restaurantName: { type: 'string' },
      city: { type: 'string' },
      sourceConfidence: { type: 'string', enum: ['green', 'yellow', 'red'] },
      ocrText: { type: 'string' },
      categories: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  price: { type: 'string' },
                  size: { type: 'string' },
                  optionGroups: {
                    type: 'array',
                    items: {
                      type: 'object',
                      additionalProperties: false,
                      properties: {
                        name: { type: 'string' },
                        required: { type: 'boolean' },
                        min: { type: 'number' },
                        max: { type: 'number' },
                        options: {
                          type: 'array',
                          items: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                              name: { type: 'string' },
                              priceDelta: { type: 'string' },
                              isOperationalJunk: { type: 'boolean' },
                            },
                            required: ['name', 'priceDelta', 'isOperationalJunk'],
                          },
                        },
                      },
                      required: ['name', 'required', 'min', 'max', 'options'],
                    },
                  },
                  warnings: { type: 'array', items: { type: 'string' } },
                },
                required: ['name', 'description', 'price', 'size', 'optionGroups', 'warnings'],
              },
            },
          },
          required: ['name', 'items'],
        },
      },
      operationalJunkDetected: { type: 'array', items: { type: 'string' } },
      uncertainReads: { type: 'array', items: { type: 'string' } },
      warnings: { type: 'array', items: { type: 'string' } },
    },
    required: [
      'restaurantName',
      'city',
      'sourceConfidence',
      'ocrText',
      'categories',
      'operationalJunkDetected',
      'uncertainReads',
      'warnings',
    ],
  };
}

function buildPrompt() {
  return [
    'You are extracting a Brazilian restaurant menu from an image.',
    RESTAURANT ? `Expected restaurant: ${RESTAURANT}.` : '',
    'Return faithful OCR text and structured menu data.',
    'Preserve categories, items, descriptions, prices, sizes, flavors, borders, add-ons, required choices, min/max choices, and price deltas when visible.',
    'If an option is ketchup/catchup, cutlery/talher, napkin/guardanapo, bag/sacola, packaging/embalagem, disposable item/descartavel, CPF, change/troco, mark it as operational junk.',
    'Do not invent prices or options. Put unclear text in uncertainReads.',
    'If the image does not contain a menu, return sourceConfidence red and explain in warnings.',
  ].filter(Boolean).join(' ');
}

async function main() {
  const projectRoot = findProjectRoot();
  const env = parseEnvFile(path.join(projectRoot, '.env'));
  const apiKey = env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY in .env.');

  const openai = new OpenAI({ apiKey });
  const resultPath = path.join(OUT_DIR, 'result.json');
  const summaryPath = path.join(OUT_DIR, 'summary.json');

  const response = await openai.responses.create({
    model: MODEL,
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: buildPrompt() },
          { type: 'input_image', image_url: imageInput() },
        ],
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'menu_vision_ocr',
        strict: true,
        schema: schema(),
      },
    },
  });

  const outputText = response.output_text || '';
  let parsed = null;
  try {
    parsed = outputText ? JSON.parse(outputText) : null;
  } catch {
    parsed = null;
  }

  const summary = {
    runId: RUN_ID,
    model: MODEL,
    restaurant: clean(RESTAURANT),
    imagePath: IMAGE_PATH ? path.resolve(IMAGE_PATH) : null,
    imageUrl: IMAGE_URL || null,
    sourceConfidence: parsed?.sourceConfidence || 'red',
    categoryCount: parsed?.categories?.length || 0,
    itemCount: parsed?.categories?.reduce((sum, category) => sum + (category.items?.length || 0), 0) || 0,
    operationalJunkDetected: parsed?.operationalJunkDetected || [],
    uncertainReadCount: parsed?.uncertainReads?.length || 0,
    warnings: parsed?.warnings || [],
    files: { resultPath, summaryPath },
  };

  fs.writeFileSync(resultPath, JSON.stringify(parsed || { raw: outputText }, null, 2), 'utf8');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

  console.log(JSON.stringify({
    success: true,
    runId: RUN_ID,
    sourceConfidence: summary.sourceConfidence,
    categoryCount: summary.categoryCount,
    itemCount: summary.itemCount,
    operationalJunkDetected: summary.operationalJunkDetected,
    uncertainReadCount: summary.uncertainReadCount,
    outDir: OUT_DIR,
  }, null, 2));
}

main().catch((error) => {
  const summaryPath = path.join(OUT_DIR, 'summary.json');
  const summary = {
    runId: RUN_ID,
    success: false,
    message: error.message,
    quotaOrBillingLikely: /quota|billing|429|insufficient_quota/i.test(error.message),
  };
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
});
