import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'restaurant-structural-ready-audit', RUN_ID);

function argValue(name, fallback = '') {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const TARGET_CITY = argValue('city', process.env.CITY_NAME || 'Cabedelo').trim();
const TARGET_STATE = argValue('state', process.env.STATE || 'PB').trim();
const IDS = argValue('ids', process.env.RESTAURANT_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);
const LIMIT = Number(argValue('limit', process.env.LIMIT || '0')) || 0;
const INCLUDE_PUBLISHED = process.argv.includes('--include-published');
const ONLY_WITH_MENU = !process.argv.includes('--include-without-menu');
const DETAILS = process.argv.includes('--details');
const APPLY_BLOCKERS = process.argv.includes('--apply-blockers');

fs.mkdirSync(OUT_DIR, { recursive: true });

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

function money(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function hasValue(value) {
  return clean(value).length > 0;
}

function issue(severity, code, data = {}) {
  return { severity, code, ...data };
}

function pushUnique(issues, next) {
  const key = JSON.stringify(next);
  if (!issues.some((item) => JSON.stringify(item) === key)) issues.push(next);
}

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function hasCanonicalOpeningHours(value) {
  const parsed = parseJson(value, value);
  return parsed
    && typeof parsed === 'object'
    && DAY_ORDER.every((key) => typeof parsed[key]?.isOpen === 'boolean' && Array.isArray(parsed[key]?.slots));
}

const BAD_MENU_SOURCE_RE = /\b(ifood\.com\.br|deliverymuch\.com\.br)\b/i;
const OPERATIONAL_RE = /\b(ketchup|catchup|cat.?chup|maionese sache|mostarda|talher(?:es)?|guardanapo(?:s)?|descart[aá]vel(?:is)?|sacola|embalagem|cpf|troco|canudo|colher|garfo|faca|palito|copo descartavel|prato descartavel)\b/i;
const PLACEHOLDER_ITEM_RE = /\b(click|clique|escolha|selecione|monte|montar)\b.{0,80}\b(sabor|sabores|op[cç][aã]o|op[cç][oõ]es)\b/i;
const PLACEHOLDER_OPTION_RE = /\b(sabor|op[cç][aã]o|item|produto)\s+(nao|não|nÃ£o)\s+especificad[oa]|\b(nao|não|nÃ£o)\s+especificad[oa]\b/i;
const INSTRUCTION_OPTION_RE = /\b(transforme|turbine|adicione|inclua|escolha|selecione|clique|click)\b.{0,80}\b(combo|lanche|sabor|op[cç][aã]o|op[cç][oõ]es)\b/i;
const GROUP_INSTRUCTION_REVIEW_RE = /\b(click|clique)\b.{0,80}\b(sabor|op[cç][aã]o|op[cç][oõ]es)\b|\b(transforme|turbine)\b.{0,80}\b(combo|lanche)\b/i;
const BAD_CATEGORY_RE = /\b(a[cç][aã]o|button|bot[aã]o|categoria sem nome|sem categoria)\b/i;
const BAD_ITEM_NAME_RE = /\b(descri[cç][aã]o dos ingredientes|acompanhamentos\.\.\.|url da imagem|novo item|item sem nome)\b/i;
const ITEM_INSTRUCTION_NAME_RE = /^\s*(click|clique|escolha|selecione|selecionar|monte|montar|configure|personalize)\b/i;
const STANDALONE_ADDON_CATEGORY_RE = /\b(adicionais|acrescimos|acr[eÃ©]scimos|extras|complementos|incrementos|molhos)\b/i;
const ADDON_ITEM_RE = /\b(ovo|bacon|queijo|cheddar|catupiry|calabresa|cebola|salada|picles|geleia|maionese|molho|barbecue|alho|carne extra|hamb[uÃº]rguer extra|blend extra|adicional)\b/i;
const SMALL_STANDALONE_ITEM_RE = /\b([aÃ¡]gua|refrigerante|refri|coca|guaran[aÃ¡]|suco|caf[eÃ©]|bebida|cerveja|energ[eÃ©]tico|ch[aÃ¡]|coxinha|pastel|salgado|doce|sobremesa|tapioca|picol[eÃ©]|sorvete)\b/i;
const BAD_GALLERY_RE = /\.(mp4|mov|webm)(?:$|\?)/i;
const BAD_GALLERY_HINT_RE = /\b(video|reel|story|print|screenshot|pessoa|people|face|poster|cardapio textual|menu textual)\b/i;
const MOJIBAKE_RE = /\u00c3[\u0080-\u00bf\u0192\u2020-\u2021]|\u00c2[\u0080-\u00bf]|\ufffd|\u00f0\u0178|\u00e2[\u0080-\u2122]/;
const CEP_RE = /^\d{5}-?\d{3}$/;
const ADDRESS_ENDS_WITH_NUMBER_RE = /\b(?:n[ºo.]?\s*)?\d+[a-z]?\s*$/i;

function groupLooksLikeFlavor(name) {
  const n = normalize(name);
  return /\b(sabor|sabores|escolha.*sabor|pizza|montavel)\b/i.test(n);
}

function groupLooksLikeRequiredSelection(option) {
  const minimum = money(option.min_selections ?? option.min_selection ?? option.minimum ?? option.min);
  const requiredFlag = option.required ?? option.is_required ?? option.obrigatorio;
  return minimum > 0 || requiredFlag === true || String(requiredFlag).toLowerCase() === 'true';
}

function optionPriceDelta(option) {
  const delta = money(option.price_delta);
  if (delta !== null) return delta;
  const additional = money(option.additional_price);
  if (additional !== null) return additional;
  return money(option.price);
}

function itemBasePrice(item) {
  return money(item.price ?? item.display_price ?? item.price_min ?? item.original_price);
}

function relatedBy(rows, key) {
  const map = new Map();
  for (const row of rows || []) {
    const value = row[key];
    if (!map.has(value)) map.set(value, []);
    map.get(value).push(row);
  }
  return map;
}

function classifyReadiness(audit) {
  if (audit.redCount > 0) return 'blocked';
  if (audit.yellowCount > 0) return 'needs_review';
  return 'ready';
}

function auditRestaurant(restaurant, relations) {
  const issues = [];
  const categories = (relations.categoriesByRestaurant.get(restaurant.id) || [])
    .filter((category) => category.is_active !== false);
  const gallery = relations.galleryByRestaurant.get(restaurant.id) || [];
  const logs = parseJson(restaurant.coleta_logs);

  for (const [field, value] of [
    ['name', restaurant.name],
    ['category', restaurant.category],
    ['address', restaurant.address],
    ['neighborhood', restaurant.neighborhood],
    ['city', restaurant.city],
    ['state', restaurant.state],
  ]) {
    if (MOJIBAKE_RE.test(clean(value))) {
      issues.push(issue('red', 'texto_com_mojibake', { field, value: clean(value) }));
    }
  }

  if (TARGET_CITY && normalize(restaurant.city) !== normalize(TARGET_CITY)) {
    issues.push(issue('red', 'cidade_incorreta', { value: restaurant.city, expected: TARGET_CITY }));
  }
  if (TARGET_STATE && normalize(restaurant.state) !== normalize(TARGET_STATE)) {
    issues.push(issue('red', 'estado_incorreto', { value: restaurant.state, expected: TARGET_STATE }));
  }
  if (!hasValue(restaurant.address)) {
    issues.push(issue('red', 'logradouro_vazio'));
  } else {
    const address = clean(restaurant.address);
    if (/\s-\s/.test(address)) issues.push(issue('red', 'logradouro_com_bairro_embutido', { value: address }));
    if (new RegExp(`\\b${TARGET_CITY}\\b`, 'i').test(address)) issues.push(issue('red', 'logradouro_com_cidade_embutida', { value: address }));
    if (/\b[A-Z]{2}\b/.test(address) || /\b\d{5}-?\d{3}\b/.test(address)) {
      issues.push(issue('red', 'logradouro_com_estado_ou_cep_embutido', { value: address }));
    }
    if (!hasValue(restaurant.number) && ADDRESS_ENDS_WITH_NUMBER_RE.test(address)) {
      issues.push(issue('red', 'numero_embutido_no_logradouro', { value: address }));
    }
  }
  if (!hasValue(restaurant.number)) {
    issues.push(issue('red', 'numero_vazio'));
  }
  if (!hasValue(restaurant.neighborhood)) {
    issues.push(issue('red', 'bairro_vazio'));
  } else if (TARGET_CITY && normalize(restaurant.neighborhood) === normalize(TARGET_CITY)) {
    issues.push(issue('red', 'bairro_igual_cidade', { value: restaurant.neighborhood }));
  }
  if (!CEP_RE.test(clean(restaurant.cep))) {
    issues.push(issue('red', 'cep_ausente_ou_invalido', { value: clean(restaurant.cep) || null }));
  }
  if (!hasValue(restaurant.phone) && !hasValue(restaurant.whatsapp_url)) {
    issues.push(issue('yellow', 'telefone_ausente'));
  }
  if (!restaurant.latitude || !restaurant.longitude) {
    issues.push(issue('yellow', 'latitude_longitude_ausente'));
  }
  if (!hasCanonicalOpeningHours(restaurant.opening_hours)) {
    issues.push(issue('red', 'horario_nao_canonico'));
  }
  if (hasValue(restaurant.instagram) && !Number.isFinite(Number(restaurant.followers_override))) {
    issues.push(issue('yellow', 'instagram_sem_numero_de_seguidores'));
  }
  if (!hasValue(restaurant.image_url)) issues.push(issue('red', 'sem_logo'));
  if (!hasValue(restaurant.cover_image_url)) issues.push(issue('red', 'sem_capa'));
  if (gallery.length < 3) issues.push(issue('red', 'galeria_menor_que_3', { count: gallery.length }));
  if (gallery.length > 8) issues.push(issue('yellow', 'galeria_maior_que_8', { count: gallery.length }));

  for (const image of gallery) {
    const url = clean(image.image_url);
    const caption = clean(image.caption);
    if (!url) {
      issues.push(issue('red', 'galeria_url_vazia', { imageId: image.id }));
    } else if (BAD_GALLERY_RE.test(url)) {
      issues.push(issue('red', 'galeria_video_detectado', { imageId: image.id, url }));
    }
    if (BAD_GALLERY_HINT_RE.test(caption)) {
      issues.push(issue('red', 'galeria_caption_indica_imagem_ruim', { imageId: image.id, caption }));
    }
  }

  const trustedMediaLog = logs.apify_instagram_original_gallery_v1
    || logs.serpapi_google_photos_enrichment_v1
    || logs.google_photos_enrichment_v1
    || null;
  const legacyMediaLog = logs.apify_instagram_media_enrichment || null;
  const mediaLog = trustedMediaLog || legacyMediaLog || null;
  if (gallery.length >= 3 && !trustedMediaLog) {
    issues.push(issue('red', legacyMediaLog ? 'galeria_sem_evidencia_visual_forte' : 'galeria_sem_log_de_curadoria'));
  }

  const menuSource = clean(restaurant.other_url || restaurant.external_url || restaurant.ifood_url);
  if (BAD_MENU_SOURCE_RE.test(menuSource)) {
    issues.push(issue('red', 'fonte_cardapio_proibida', { value: menuSource }));
  }

  let itemCount = 0;
  let optionCount = 0;
  let categoryCount = categories.length;
  const categoriesWithoutItems = [];

  for (const category of categories) {
    const categoryName = clean(category.name);
    if (MOJIBAKE_RE.test(categoryName)) {
      issues.push(issue('red', 'texto_com_mojibake', { field: 'category.name', value: categoryName }));
    }
    if (!categoryName || BAD_CATEGORY_RE.test(categoryName)) {
      issues.push(issue('red', 'categoria_invalida', { category: categoryName || category.id }));
    }

    const items = relations.itemsByCategory.get(category.id) || [];
    if (!items.length) categoriesWithoutItems.push(categoryName || category.id);

    for (const item of items) {
      itemCount += 1;
      const itemName = clean(item.name);
      const displayName = clean(item.display_name);
      const itemPrice = itemBasePrice(item);
      const commercialType = normalize(item.commercial_type || item.price_type || '');

      if (MOJIBAKE_RE.test(itemName)) {
        issues.push(issue('red', 'texto_com_mojibake', { field: 'item.name', itemId: item.id, value: itemName }));
      }
      if (MOJIBAKE_RE.test(displayName)) {
        issues.push(issue('red', 'texto_com_mojibake', { field: 'item.display_name', itemId: item.id, value: displayName }));
      }

      if (!itemName) issues.push(issue('red', 'item_sem_nome', { itemId: item.id, category: categoryName }));
      if (PLACEHOLDER_ITEM_RE.test(itemName) || BAD_ITEM_NAME_RE.test(itemName)) {
        issues.push(issue('red', 'item_placeholder_interface', { itemId: item.id, item: itemName }));
      }
      if (ITEM_INSTRUCTION_NAME_RE.test(itemName)) {
        issues.push(issue('red', 'item_nome_instrucao_interface', { itemId: item.id, item: itemName }));
      }
      if (displayName && (PLACEHOLDER_ITEM_RE.test(displayName) || BAD_ITEM_NAME_RE.test(displayName))) {
        issues.push(issue('red', 'display_name_placeholder_interface', { itemId: item.id, displayName }));
      }
      if (displayName && ITEM_INSTRUCTION_NAME_RE.test(displayName)) {
        issues.push(issue('red', 'display_name_instrucao_interface', { itemId: item.id, displayName }));
      }
      if (OPERATIONAL_RE.test(itemName)) {
        issues.push(issue('red', 'item_operacional', { itemId: item.id, item: itemName }));
      }
      if (itemPrice !== null && itemPrice < 0) {
        issues.push(issue('red', 'item_preco_negativo', { itemId: item.id, item: itemName, price: itemPrice }));
      }
      if (
        itemPrice !== null
        && itemPrice > 0
        && itemPrice < 6
        && STANDALONE_ADDON_CATEGORY_RE.test(categoryName)
        && ADDON_ITEM_RE.test(`${categoryName} ${itemName}`)
        && !SMALL_STANDALONE_ITEM_RE.test(`${categoryName} ${itemName}`)
      ) {
        issues.push(issue('red', 'adicional_salvo_como_item_avulso', {
          itemId: item.id,
          category: categoryName,
          item: itemName,
          price: itemPrice,
        }));
      }

      const options = relations.optionsByItem.get(item.id) || [];
      optionCount += options.length;

      const optionsByGroupName = relatedBy(options, 'group_name');
      for (const [groupNameRaw, groupOptions] of optionsByGroupName.entries()) {
        const groupName = clean(groupNameRaw);
        if (!groupName) {
          issues.push(issue('red', 'grupo_opcoes_sem_nome', { itemId: item.id, item: itemName }));
        }
        if (OPERATIONAL_RE.test(groupName)) {
          issues.push(issue('red', 'grupo_operacional', { itemId: item.id, item: itemName, group: groupName }));
        }
        if (PLACEHOLDER_OPTION_RE.test(groupName)) {
          issues.push(issue('red', 'grupo_placeholder', { itemId: item.id, item: itemName, group: groupName }));
        } else if (GROUP_INSTRUCTION_REVIEW_RE.test(groupName)) {
          issues.push(issue('yellow', 'grupo_instrucao_revisar', { itemId: item.id, item: itemName, group: groupName }));
        }
        if (MOJIBAKE_RE.test(groupName)) {
          issues.push(issue('red', 'texto_com_mojibake', { field: 'option.group_name', itemId: item.id, value: groupName }));
        }

        const groupHasIncludedBaseOption = groupOptions.some((groupOption) => {
          const behavior = normalize(groupOption.price_behavior);
          const delta = optionPriceDelta(groupOption);
          return behavior === 'included' || delta === 0;
        });
        const normalizedNames = new Set();
        for (const option of groupOptions) {
          const optionName = clean(option.name);
          const normalizedOptionName = normalize(optionName);
          const delta = optionPriceDelta(option);
          const storedOptionPrice = money(option.price);
          const storedOptionDelta = money(option.price_delta);
          const optionBehavior = normalize(option.price_behavior);
          if (MOJIBAKE_RE.test(optionName)) {
            issues.push(issue('red', 'texto_com_mojibake', { field: 'option.name', optionId: option.id, value: optionName }));
          }
          if (!optionName) {
            issues.push(issue('red', 'opcao_sem_nome', { optionId: option.id, item: itemName, group: groupName }));
          }
          if (normalizedNames.has(normalizedOptionName)) {
            issues.push(issue('yellow', 'opcao_duplicada_no_mesmo_grupo', { item: itemName, group: groupName, option: optionName }));
          }
          normalizedNames.add(normalizedOptionName);

          if (OPERATIONAL_RE.test(optionName) || OPERATIONAL_RE.test(groupName)) {
            issues.push(issue('red', 'opcao_operacional', { item: itemName, group: groupName, option: optionName }));
          }
          if (PLACEHOLDER_OPTION_RE.test(optionName) || PLACEHOLDER_OPTION_RE.test(groupName)) {
            issues.push(issue('red', 'opcao_placeholder', { item: itemName, group: groupName, option: optionName }));
          }
          if (INSTRUCTION_OPTION_RE.test(optionName)) {
            issues.push(issue('red', 'opcao_instrucao_salva_como_adicional', { item: itemName, group: groupName, option: optionName, delta }));
          }
          if (delta !== null && delta < 0) {
            issues.push(issue('red', 'opcao_delta_negativo', { item: itemName, group: groupName, option: optionName, delta }));
          }
          if (optionBehavior === 'price_delta' && storedOptionPrice !== null) {
            issues.push(issue('red', 'opcao_price_delta_com_price_preenchido', {
              item: itemName,
              group: groupName,
              option: optionName,
              price: storedOptionPrice,
              priceDelta: storedOptionDelta,
            }));
          }
          if (optionBehavior === 'price_delta' && storedOptionDelta === null) {
            issues.push(issue('red', 'opcao_price_delta_ausente', {
              item: itemName,
              group: groupName,
              option: optionName,
              priceDelta: storedOptionDelta,
            }));
          }

          const requiredFlavor = groupLooksLikeFlavor(groupName) || groupLooksLikeRequiredSelection(option);
          const isPizzaLike = /\bpizza|pizzaria|calzone|esfiha\b/i.test(normalize(`${restaurant.category} ${categoryName} ${itemName} ${groupName}`));
          const looksConfigurable = commercialType.includes('config') || commercialType.includes('mont') || item.is_configurable === true || options.length > 0;
          if (
            isPizzaLike
            && looksConfigurable
            && itemPrice !== null
            && itemPrice >= 20
            && delta !== null
            && delta > 0
            && requiredFlavor
            && !groupHasIncludedBaseOption
            && delta >= itemPrice * 0.45
          ) {
            issues.push(issue('red', 'delta_sabor_parece_preco_cheio', {
              item: itemName,
              itemPrice,
              group: groupName,
              option: optionName,
              delta,
            }));
          }
        }
      }
    }
  }

  if (!categoryCount) issues.push(issue('red', 'sem_categorias_cardapio'));
  if (!itemCount) issues.push(issue('red', 'sem_itens_cardapio'));
  for (const categoryName of categoriesWithoutItems.slice(0, 10)) {
    pushUnique(issues, issue('yellow', 'categoria_sem_itens', { category: categoryName }));
  }

  const redCount = issues.filter((entry) => entry.severity === 'red').length;
  const yellowCount = issues.filter((entry) => entry.severity === 'yellow').length;
  return {
    id: restaurant.id,
    name: restaurant.name,
    readiness: classifyReadiness({ redCount, yellowCount }),
    redCount,
    yellowCount,
    issueCount: issues.length,
    categoryCount,
    itemCount,
    optionCount,
    galleryCount: gallery.length,
    aiValidated: restaurant.ai_validated,
    menuStatus: restaurant.menu_status,
    menuStatusReason: restaurant.menu_status_reason,
    source: {
      menu: restaurant.other_url || restaurant.external_url || restaurant.ifood_url || null,
      instagram: restaurant.instagram || null,
      mediaLog,
    },
    fields: {
      address: restaurant.address,
      number: restaurant.number,
      neighborhood: restaurant.neighborhood,
      city: restaurant.city,
      state: restaurant.state,
      cep: restaurant.cep,
      phone: restaurant.phone,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      followers: restaurant.followers_override,
    },
    issues,
  };
}

const env = readEnv();
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY
  || env.VITE_SUPABASE_SERVICE_ROLE_KEY
  || env.SERVICE_ROLE_KEY
  || env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL/key ausentes no .env');
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

async function fetchByChunks(table, selectColumns, column, values, orderColumn = '') {
  if (!values?.length) return [];
  const rows = [];
  const chunkSize = 75;
  for (let index = 0; index < values.length; index += chunkSize) {
    const chunk = values.slice(index, index + chunkSize);
    let query = supabase.from(table).select(selectColumns).in(column, chunk);
    if (orderColumn) query = query.order(orderColumn);
    const { data, error } = await query;
    if (error) {
      throw new Error(`${table}.${column} chunk ${Math.floor(index / chunkSize) + 1} failed: ${error.message || JSON.stringify(error)}`);
    }
    rows.push(...(data || []));
  }
  return rows;
}

let query = supabase
  .from('restaurants')
  .select([
    'id',
    'name',
    'category',
    'address',
    'number',
    'neighborhood',
    'city',
    'state',
    'cep',
    'phone',
    'whatsapp_url',
    'instagram',
    'followers_override',
    'latitude',
    'longitude',
    'opening_hours',
    'image_url',
    'cover_image_url',
    'menu_status',
    'menu_status_reason',
    'ai_validated',
    'other_url',
    'external_url',
    'ifood_url',
    'coleta_logs',
    'is_deleted',
    'is_published',
  ].join(','))
  .order('name');

if (IDS.length) {
  query = query.in('id', IDS);
} else if (TARGET_CITY) {
  query = query.eq('city', TARGET_CITY);
  if (TARGET_STATE) query = query.eq('state', TARGET_STATE);
}
if (!INCLUDE_PUBLISHED) query = query.or('is_published.is.null,is_published.eq.false');
if (ONLY_WITH_MENU) query = query.eq('menu_status', 'found');
if (LIMIT > 0) query = query.limit(LIMIT);

const { data: restaurants, error: restaurantError } = await query;
if (restaurantError) throw restaurantError;

const restaurantIds = (restaurants || []).map((restaurant) => restaurant.id);

const categories = await fetchByChunks('menu_categories', '*', 'restaurant_id', restaurantIds, 'order_index');

const categoryIds = (categories || []).map((category) => category.id);
const items = await fetchByChunks('menu_items', '*', 'category_id', categoryIds, 'order_index');

const itemIds = (items || []).map((item) => item.id);
const options = await fetchByChunks('menu_item_options', '*', 'menu_item_id', itemIds, 'order_index');

const gallery = await fetchByChunks('restaurant_gallery', 'id,restaurant_id,image_url,caption,order_index', 'restaurant_id', restaurantIds, 'order_index');

const relations = {
  categoriesByRestaurant: relatedBy(categories || [], 'restaurant_id'),
  itemsByCategory: relatedBy(items || [], 'category_id'),
  optionsByItem: relatedBy(options || [], 'menu_item_id'),
  galleryByRestaurant: relatedBy(gallery || [], 'restaurant_id'),
};

const audits = (restaurants || []).map((restaurant) => auditRestaurant(restaurant, relations));
const issueCounts = {};
for (const audit of audits) {
  for (const entry of audit.issues) {
    issueCounts[entry.code] = (issueCounts[entry.code] || 0) + 1;
  }
}

const blocked = audits.filter((audit) => audit.readiness === 'blocked');
const needsReview = audits.filter((audit) => audit.readiness === 'needs_review');
const ready = audits.filter((audit) => audit.readiness === 'ready');

if (APPLY_BLOCKERS && blocked.length) {
  for (const audit of blocked) {
    const topCodes = [...new Set(audit.issues.filter((entry) => entry.severity === 'red').map((entry) => entry.code))]
      .slice(0, 5)
      .join(', ');
    const { error } = await supabase
      .from('restaurants')
      .update({
        ai_validated: false,
        menu_status: 'manual_required',
        menu_status_reason: `QA estrutural bloqueou: ${topCodes}`,
      })
      .eq('id', audit.id);
    if (error) throw error;
  }
}

const summary = {
  runId: RUN_ID,
  outDir: OUT_DIR,
  scope: IDS.length ? { ids: IDS } : { city: TARGET_CITY, state: TARGET_STATE },
  options: {
    includePublished: INCLUDE_PUBLISHED,
    onlyWithMenu: ONLY_WITH_MENU,
    limit: LIMIT || null,
    applyBlockers: APPLY_BLOCKERS,
  },
  restaurants: audits.length,
  ready: ready.length,
  needsReview: needsReview.length,
  blocked: blocked.length,
  issueCounts,
  audits,
};

fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
fs.writeFileSync(
  path.join(OUT_DIR, 'blocked.json'),
  JSON.stringify(blocked.map((audit) => ({
    id: audit.id,
    name: audit.name,
    redCount: audit.redCount,
    issueCodes: [...new Set(audit.issues.filter((entry) => entry.severity === 'red').map((entry) => entry.code))],
    firstIssues: audit.issues.filter((entry) => entry.severity === 'red').slice(0, 10),
  })), null, 2),
);

const consoleSummary = {
  runId: RUN_ID,
  outDir: path.resolve(OUT_DIR),
  restaurants: summary.restaurants,
  ready: summary.ready,
  needsReview: summary.needsReview,
  blocked: summary.blocked,
  issueCounts: summary.issueCounts,
  blockedSample: blocked.slice(0, 12).map((audit) => ({
    name: audit.name,
    id: audit.id,
    redCodes: [...new Set(audit.issues.filter((entry) => entry.severity === 'red').map((entry) => entry.code))].slice(0, 8),
  })),
};

console.log(JSON.stringify(DETAILS ? summary : consoleSummary, null, 2));
