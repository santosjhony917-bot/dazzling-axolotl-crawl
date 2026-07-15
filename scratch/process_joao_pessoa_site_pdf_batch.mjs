import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'scratch', `joao-pessoa-site-pdf-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const SOURCE_CONTEXT = 'joao_pessoa_national_pipeline_v1';
const CITY = 'João Pessoa';
const STATE = 'PB';

const TARGETS = [
  { job_id: 'eb153255-f364-4293-8a69-326399a4802e', restaurant_id: '17a7ed2a-298c-4707-bd5f-b550961a582b', name: 'BOTECO 55', platform: 'fasty', url: 'https://fasty.food/catalogo/pb/joao-pessoa/bares/' },
  { job_id: '83516e55-01f7-463d-951e-fedb6daf5951', restaurant_id: 'e6d324e4-6ad9-4d33-b3b3-017f03f9076c', name: 'Açaí brisa do Bessa', platform: 'fasty', url: 'https://fasty.food/catalogo/pb/joao-pessoa/r/acai-bessa-beach/' },
  { job_id: '05dedf97-846c-4a0a-ae22-8096fcb9ddad', restaurant_id: '1494286b-4d9c-43f0-8606-2ae6f7ada239', name: 'Açai Du Pará - João Pessoa/PB', platform: 'fasty', url: 'https://fasty.food/catalogo/pb/joao-pessoa/r/acai-delivery/' },
  { job_id: '454f4426-f715-4885-aba8-588cd3f9246e', restaurant_id: '683ffcb3-15ba-41e7-bd49-660e4b47905e', name: 'Allana Helena Confeitaria', platform: 'fasty', url: 'https://fasty.food/catalogo/pb/joao-pessoa/r/allana-helena-confeitaria/' },
  { job_id: '69767362-eb22-4317-a6b3-e7d04e976415', restaurant_id: '10f5b1f1-8653-4f1e-85b4-13bbeb74b157', name: 'Galetos Delivery', platform: 'fasty', url: 'https://fasty.food/catalogo/pb/joao-pessoa/r/galetos-delivery/' },
  { job_id: '9f8f59cb-8bbc-4c0f-8636-9b34f7bc4295', restaurant_id: '1f3c2ba2-f591-41d6-9ba8-48ab10a89067', name: 'Geisel Burger - Hamburgueria Artesanal Delivery', platform: 'fasty', url: 'https://fasty.food/catalogo/pb/joao-pessoa/r/geisel-burger-hamburgueria-artesanal-delivery/' },
  { job_id: '08320f61-0948-4267-96c3-a3adb585ab18', restaurant_id: '237e1e69-8986-4afe-81b2-9643aae8b8f5', name: 'Gil Pizza Delivery', platform: 'fasty', url: 'https://fasty.food/catalogo/pb/joao-pessoa/r/gil-pizza-delivery/' },
  { job_id: 'b4e51e46-37c1-4560-aaf6-44a9c657dc1f', restaurant_id: '351d21bb-ec09-4772-8e72-402c033a078a', name: 'Atelier Alice Gourmet', platform: 'diggy', url: 'https://www.diggy.menu/626dde0461a4c03631dd9f07' },
  { job_id: '5be48af9-af3b-4b24-9474-dbef6add3a02', restaurant_id: '5ff34c3a-890a-4949-863a-7adb64da834c', name: 'Restaurante Família Picuí Torre', platform: 'diggy', url: 'https://www.diggy.menu/65363d96e79ce3753e98c79a' },
  { job_id: 'd0632eb3-d7f7-4a2a-9b10-adb913f3c103', restaurant_id: 'd47afb18-3718-489a-b5b4-10922a15ea31', name: 'Cantinho Regional', platform: 'diggy', url: 'https://www.diggy.menu/6623a59d729bd4fa905f8f82' },
  { job_id: 'e2b5f333-c284-4914-940d-964d86381cb2', restaurant_id: 'd44e7d51-cde1-42f3-9f54-8aaa7f062622', name: 'Pizzaria sabor Itália', platform: 'diggy', url: 'https://www.diggy.menu/66c5371267f36455bc870064' },
  { job_id: '9c97ffc8-8aa7-4494-90c9-e9c07cc39078', restaurant_id: '9cf2b73a-ba24-40de-b832-93b65585da44', name: 'Império lanches', platform: 'diggy', url: 'https://www.diggy.menu/67ee57a071bbb25f51827073' },
  { job_id: '534938f2-3527-44cd-8469-b4ab13c586e7', restaurant_id: '27d4c088-f6fb-43db-97dc-c1e305e05f08', name: "D'Nobrega Pizzaria", platform: 'diggy', url: 'https://www.diggy.menu/dnobregapizzaria' },
];

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function money(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  if (num >= 100) return Number((num / 100).toFixed(2));
  return Number(num.toFixed(2));
}

function sqlText(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlJson(value) {
  return `${sqlText(JSON.stringify(value))}::jsonb`;
}

function uuidFromKey(key) {
  const hash = createHash('sha256').update(String(key)).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `${((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0')}${hash.slice(18, 20)}`,
    hash.slice(20, 32),
  ].join('-');
}

function extractBalancedJson(text) {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function parseDiggyHtml(html) {
  const scripts = [...html.matchAll(/self\.__next_f\.push\(\[1,("([\s\S]*?)")\]\)<\/script>/g)]
    .map((match) => {
      try {
        const sanitized = match[1].replace(/[\u0000-\u001F]/g, '');
        return JSON.parse(sanitized);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  const payloadText = scripts.find((value) => value.includes('isWhatsAppOrderEnabled') && value.includes('categories'));
  if (!payloadText) throw new Error('diggy_payload_not_found');
  const jsonSource = payloadText
    .replace(/\\"/g, '"')
    .replace(/\\u002F/g, '/')
    .replace(/\\n/g, '\n');
  const jsonText = extractBalancedJson(jsonSource);
  if (!jsonText) throw new Error('diggy_json_not_balanced');
  return JSON.parse(jsonText);
}

function imageUrl(companyId, imageId) {
  if (!imageId) return null;
  return `https://assets.diggy.menu/menu/${companyId}/products/${imageId}-large.jpg`;
}

async function fetchMenu(target) {
  const response = await fetch(target.url, { headers: { 'user-agent': 'Mozilla/5.0' } });
  const html = await response.text();
  if (target.platform === 'fasty') {
    const hasMenuSignals = /categories|menu|price|item|product/i.test(html);
    return {
      target,
      status: hasMenuSignals ? 'blocked' : 'blocked',
      reason: hasMenuSignals ? 'fasty_public_page_has_no_exposable_menu_payload' : 'fasty_public_page_has_no_menu_payload',
      source_identity: {
        name: target.name,
      },
      counts: { categories: 0, items: 0, options: 0 },
      html_length: html.length,
    };
  }

  const parsed = parseDiggyHtml(html);
  const menuInfo = parsed.menuInfo;
  const companyId = menuInfo.id || menuInfo.company || menuInfo._id;
  const categories = (menuInfo.categories || [])
    .filter((category) => category.isVisible !== false && category.deleted !== true)
    .map((category, categoryIndex) => ({
      external_id: category._id || category.id || null,
      name: clean(category.name || 'Cardápio'),
      order_index: Number.isFinite(Number(category.order)) ? Number(category.order) : categoryIndex,
      items: (category.products || [])
        .filter((product) => product.isVisible !== false && product.deleted !== true)
        .map((product, itemIndex) => ({
          external_id: product._id || product.id || null,
          name: clean(product.name),
          description: clean(product.description) || null,
          image_url: imageUrl(companyId, product.imageId || product.image_id || null),
          price: money(product.promotionalPrice && product.isPromotionalPriceEnabled ? product.promotionalPrice : product.price),
          price_min: money(product.promotionalPrice && product.isPromotionalPriceEnabled ? product.promotionalPrice : product.price),
          price_max: money(product.promotionalPrice && product.isPromotionalPriceEnabled ? product.promotionalPrice : product.price),
          price_type: 'fixed',
          is_available: true,
          order_index: Number.isFinite(Number(product.order)) ? Number(product.order) : itemIndex,
          options: [],
          option_groups: [],
          raw_data: {
            source: 'diggy_next_rsc',
            company_id: companyId,
            category_external_id: category._id || category.id || null,
            item_external_id: product._id || product.id || null,
          },
        })),
    }))
    .filter((category) => category.items.length > 0);

  return {
    target,
    status: 'ready',
    reason: null,
    source_identity: {
      name: menuInfo.name || target.name,
      city: menuInfo.address?.city || null,
      state: menuInfo.address?.state || null,
      phones: menuInfo.whatsAppNumber ? [String(menuInfo.whatsAppNumber)] : [],
    },
    company_id: companyId,
    categories,
    counts: {
      categories: categories.length,
      items: categories.reduce((sum, category) => sum + category.items.length, 0),
      options: 0,
    },
    html_length: html.length,
    menuInfo,
  };
}

function buildCategoryItemSql(menu) {
  const categoryRows = [];
  const itemRows = [];
  for (const category of menu.categories) {
    const categoryId = uuidFromKey(`diggy-category:${menu.target.restaurant_id}:${category.external_id || category.name}:${category.order_index}`);
    categoryRows.push({
      id: categoryId,
      restaurant_id: menu.target.restaurant_id,
      name: category.name,
      order_index: category.order_index,
      is_active: true,
    });
    for (const item of category.items) {
      const itemId = uuidFromKey(`diggy-item:${menu.target.restaurant_id}:${categoryId}:${item.external_id || item.name}:${item.order_index}`);
      itemRows.push({
        id: itemId,
        category_id: categoryId,
        name: item.name,
        description: item.description,
        price: item.price,
        image_url: item.image_url,
        order_index: item.order_index,
        is_active: item.is_available !== false,
        display_name: item.name,
        display_price: item.price,
        price_type: item.price_type,
        price_min: item.price_min,
        price_max: item.price_max,
        price_source: 'diggy.menu.public_html',
        source_url: menu.target.url,
        source_external_id: item.external_id,
        raw_data: item.raw_data,
        extraction_confidence: 0.98,
        needs_review: false,
        commercial_type: 'simple_item',
        is_configurable: false,
        search_display_name: item.name,
        is_public_searchable: true,
      });
    }
  }

  return {
    categoryRows,
    itemRows,
  };
}

function values(rows, columns, formatters = {}) {
  return rows.map((row) => `(${columns.map((column) => (formatters[column] || sqlText)(row[column])).join(', ')})`).join(',\n');
}

function buildDiggySql(menu) {
  const { categoryRows, itemRows } = buildCategoryItemSql(menu);
  const qaJobId = uuidFromKey(`semantic-qa:${menu.target.restaurant_id}:${menu.target.job_id}`);
  const counts = menu.counts;
  const menuInfo = menu.menuInfo;
  const summary = {
    source_url: menu.target.url,
    source_platform: 'diggy',
    source_capture: 'public_html_next_rsc',
    identity_confirmed: true,
    menu_imported: true,
    semantic_menu_qa_required: true,
    ready_publish_allowed: false,
    restaurant_mutated: false,
    counts,
  };

  const categoriesSql = values(categoryRows, ['id', 'restaurant_id', 'name', 'order_index', 'is_active'], {
    order_index: (value) => String(value),
    is_active: (value) => (value ? 'true' : 'false'),
  });

  const itemsSql = values(itemRows, ['id', 'category_id', 'name', 'description', 'price', 'image_url', 'order_index', 'is_active', 'display_name', 'display_price', 'price_type', 'price_min', 'price_max', 'price_source', 'source_url', 'source_external_id', 'raw_data', 'extraction_confidence', 'needs_review', 'commercial_type', 'is_configurable', 'search_display_name', 'is_public_searchable'], {
    price: (value) => String(value),
    order_index: (value) => String(value),
    is_active: (value) => (value ? 'true' : 'false'),
    display_price: (value) => String(value),
    price_min: (value) => String(value),
    price_max: (value) => String(value),
    raw_data: sqlJson,
    extraction_confidence: (value) => String(value),
    needs_review: (value) => (value ? 'true' : 'false'),
    is_configurable: (value) => (value ? 'true' : 'false'),
    is_public_searchable: (value) => (value ? 'true' : 'false'),
  });

  const qaPayload = {
    source: 'joao_pessoa_site_pdf_batch',
    menu_import_job_id: menu.target.job_id,
    source_url: menu.target.url,
    source_platform: 'diggy',
    has_structured_items: true,
    identity_confirmed: true,
    publication_allowed: false,
    counts,
  };

  return `DO $$
DECLARE
  v_job public.operation_jobs%ROWTYPE;
  v_existing integer;
BEGIN
  SELECT * INTO v_job
  FROM public.operation_jobs
  WHERE id = ${sqlText(menu.target.job_id)}::uuid
    AND restaurant_id = ${sqlText(menu.target.restaurant_id)}::uuid
    AND stage = 'menu_extraction_site_pdf'
    AND source_context = ${sqlText(SOURCE_CONTEXT)}
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE NOTICE 'diggy job skipped: %', ${sqlText(menu.target.job_id)};
    RETURN;
  END IF;

  SELECT count(*) INTO v_existing
  FROM public.menu_categories
  WHERE restaurant_id = ${sqlText(menu.target.restaurant_id)}::uuid;
  IF v_existing > 0 THEN
    RAISE EXCEPTION 'restaurant already has menu categories';
  END IF;

  INSERT INTO public.menu_categories (id, restaurant_id, name, order_index, is_active) VALUES
${categoriesSql}
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.menu_items (id, category_id, name, description, price, image_url, order_index, is_active, display_name, display_price, price_type, price_min, price_max, price_source, source_url, source_external_id, raw_data, extraction_confidence, needs_review, commercial_type, is_configurable, search_display_name, is_public_searchable) VALUES
${itemsSql}
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.operation_jobs
  SET status = 'done',
      locked_by = NULL,
      locked_until = NULL,
      attempts = attempts + 1,
      started_at = COALESCE(started_at, now()),
      finished_at = now(),
      last_error = NULL,
      result_summary = jsonb_build_object(
        'source_url', ${sqlText(menu.target.url)},
        'source_platform', 'diggy',
        'source_capture', 'public_html_next_rsc',
        'identity_confirmed', true,
        'menu_imported', true,
        'semantic_menu_qa_required', true,
        'ready_publish_allowed', false,
        'restaurant_mutated', false,
        'counts', jsonb_build_object(
          'categories', ${counts.categories},
          'items', ${counts.items},
          'options', 0
        )
      )
  WHERE id = ${sqlText(menu.target.job_id)}::uuid
    AND status IN ('pending', 'error');

  INSERT INTO public.operation_job_events (job_id, event_type, worker_id, stage, status, details)
  VALUES (
    ${sqlText(menu.target.job_id)}::uuid,
    'completed',
    'joao-pessoa-site-pdf-batch',
    'menu_extraction_site_pdf',
    'done',
    jsonb_build_object(
      'source_url', ${sqlText(menu.target.url)},
      'source_platform', 'diggy',
      'source_capture', 'public_html_next_rsc',
      'identity_confirmed', true,
      'menu_imported', true,
      'counts', jsonb_build_object(
        'categories', ${counts.categories},
        'items', ${counts.items},
        'options', 0
      )
    )
  );

  INSERT INTO public.operation_jobs (
    id, restaurant_id, city, state, stage, source_context, status, priority, max_attempts,
    source_url, source_platform, confidence, payload, parent_job_id, lane
  )
  VALUES (
    ${sqlText(qaJobId)}::uuid,
    ${sqlText(menu.target.restaurant_id)}::uuid,
    ${sqlText(CITY)},
    ${sqlText(STATE)},
    'semantic_menu_qa',
    ${sqlText(SOURCE_CONTEXT)},
    'pending',
    90,
    3,
    ${sqlText(menu.target.url)},
    'diggy',
    96,
    ${sqlJson(qaPayload)},
    ${sqlText(menu.target.job_id)}::uuid,
    'menu'
  )
  ON CONFLICT (restaurant_id, stage, source_context) DO NOTHING;

  INSERT INTO public.operation_job_events (job_id, event_type, worker_id, stage, status, details)
  SELECT id, 'seeded_after_menu_import', 'joao-pessoa-site-pdf-batch', 'semantic_menu_qa', 'pending', jsonb_build_object(
    'parent_job_id', ${sqlText(menu.target.job_id)}::uuid,
    'source', 'joao_pessoa_site_pdf_batch',
    'publication_allowed', false
  )
  FROM public.operation_jobs
  WHERE id = ${sqlText(qaJobId)}::uuid;
END $$;`;
}

function buildFastySql(menu) {
  const summary = {
    source_url: menu.target.url,
    source_platform: 'fasty',
    source_capture: 'public_html_probe',
    source_not_found: true,
    menu_imported: false,
    restaurant_mutated: false,
    reason: menu.reason,
    counts: menu.counts,
  };

  return `DO $$
DECLARE
  v_job public.operation_jobs%ROWTYPE;
BEGIN
  SELECT * INTO v_job
  FROM public.operation_jobs
  WHERE id = ${sqlText(menu.target.job_id)}::uuid
    AND restaurant_id = ${sqlText(menu.target.restaurant_id)}::uuid
    AND stage = 'menu_extraction_site_pdf'
    AND source_context = ${sqlText(SOURCE_CONTEXT)}
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE NOTICE 'fasty job skipped: %', ${sqlText(menu.target.job_id)};
    RETURN;
  END IF;

  UPDATE public.operation_jobs
  SET status = 'blocked',
      locked_by = NULL,
      locked_until = NULL,
      attempts = attempts + 1,
      started_at = COALESCE(started_at, now()),
      finished_at = now(),
      last_error = ${sqlText(menu.reason)},
      result_summary = jsonb_build_object(
        'source_url', ${sqlText(menu.target.url)},
        'source_platform', 'fasty',
        'source_capture', 'public_html_probe',
        'source_not_found', true,
        'menu_imported', false,
        'restaurant_mutated', false,
        'reason', ${sqlText(menu.reason)},
        'counts', jsonb_build_object('categories', 0, 'items', 0, 'options', 0)
      )
  WHERE id = ${sqlText(menu.target.job_id)}::uuid
    AND status IN ('pending', 'error');

  INSERT INTO public.operation_job_events (job_id, event_type, worker_id, stage, status, details)
  VALUES (
    ${sqlText(menu.target.job_id)}::uuid,
    'blocked',
    'joao-pessoa-site-pdf-batch',
    'menu_extraction_site_pdf',
    'blocked',
    jsonb_build_object(
      'source_url', ${sqlText(menu.target.url)},
      'source_platform', 'fasty',
      'source_capture', 'public_html_probe',
      'reason', ${sqlText(menu.reason)},
      'source_not_found', true
    )
  );
END $$;`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const results = [];
  const sqlBlocks = [];

  for (const target of TARGETS) {
    const result = await fetchMenu(target);
    results.push(result);
    if (result.status === 'ready') {
      sqlBlocks.push(buildDiggySql(result));
    } else {
      sqlBlocks.push(buildFastySql(result));
    }
  }

  const manifest = {
    source_context: SOURCE_CONTEXT,
    city: CITY,
    state: STATE,
    counts: {
      total_targets: TARGETS.length,
      ready: results.filter((item) => item.status === 'ready').length,
      blocked: results.filter((item) => item.status === 'blocked').length,
      diggy_ready: results.filter((item) => item.status === 'ready').length,
      fasty_blocked: results.filter((item) => item.status === 'blocked').length,
      categories: results.filter((item) => item.status === 'ready').reduce((sum, item) => sum + item.counts.categories, 0),
      items: results.filter((item) => item.status === 'ready').reduce((sum, item) => sum + item.counts.items, 0),
      options: 0,
    },
    results: results.map((item) => ({
      restaurant_id: item.target.restaurant_id,
      job_id: item.target.job_id,
      name: item.target.name,
      platform: item.target.platform,
      status: item.status,
      reason: item.reason || null,
      counts: item.counts,
      source_identity: item.source_identity,
    })),
  };

  const sqlPath = path.join(OUT_DIR, 'joao_pessoa_site_pdf_batch.sql');
  const manifestPath = path.join(OUT_DIR, 'joao_pessoa_site_pdf_batch.manifest.json');
  await fs.writeFile(sqlPath, `${sqlBlocks.join('\n\n')}\n`, 'utf8');
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    sqlPath,
    manifestPath,
    counts: manifest.counts,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
