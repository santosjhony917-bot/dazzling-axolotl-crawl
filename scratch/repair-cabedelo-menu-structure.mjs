import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const IDS = {
  espacoDoSushi: '3efd7101-b736-4135-9e5e-9787a854ec0e',
  iLoveBurguer: 'ecac91e3-52c0-4780-9867-6b3b1d096089',
  larys: 'c23b0422-4e34-43be-b07e-6a494804f6fc',
  pipa: '60d131e5-d7fb-4aa2-b3b0-83af50747ff2',
};

const TARGET_IDS = Object.values(IDS);
const mode = process.argv.includes('--apply') ? 'apply' : 'dry-run';
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join('scratch', 'cabedelo-menu-structure-repair', runId);
fs.mkdirSync(outDir, { recursive: true });

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

function money(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(/[^\d.,-]/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function safeJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

const operationalRe = /\b(ketchup|catchup|talher|talheres|guardanapo|guardanapos|embalagem|embalagens|sacola|sacolas|descartavel|descartaveis|descartáveis|cpf|troco|canudo|canudos|copo descartavel|copos descartaveis|prato descartavel|pratos descartaveis|hashi|hashis|porta shoyu|porta-shoyu|porta shoyo|nosoki|nozoki|shoyu|shoyo|kit delivery|kit de delivery|kit entrega)\b/i;
const instructionRe = /\b(escolha|clique|turbine|transforme|monte|observacao|observação)\b/i;

function isOperationalText(...values) {
  return operationalRe.test(normalize(values.join(' ')));
}

function isInstructionOption(...values) {
  return instructionRe.test(normalize(values.join(' ')));
}

function itemBasePrice(item) {
  return money(item.display_price ?? item.price_min ?? item.price);
}

function isConfigurable(item) {
  const commercialType = clean(item.commercial_type);
  const priceType = clean(item.price_type);
  return Boolean(item.is_configurable)
    || commercialType === 'configurable_item'
    || commercialType === 'simple_with_addons'
    || priceType === 'starting_at'
    || priceType === 'option_only'
    || priceType === 'range';
}

function rawText(value, max = 1500) {
  const text = JSON.stringify(value ?? null, null, 2);
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

const env = readEnv();
const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

async function fetchAll(buildQuery, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await buildQuery().range(from, to);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function loadMenu(ids = TARGET_IDS) {
  const restaurants = await fetchAll(() => supabase
    .from('restaurants')
    .select('id,name,menu_status,other_url,external_url')
    .in('id', ids)
    .order('name')
    .order('id'));

  const categories = await fetchAll(() => supabase
    .from('menu_categories')
    .select('*')
    .in('restaurant_id', ids)
    .order('order_index')
    .order('id'));

  const categoryIds = (categories || []).map((category) => category.id);
  const items = categoryIds.length
    ? await fetchAll(() => supabase
      .from('menu_items')
      .select('*')
      .in('category_id', categoryIds)
      .order('order_index')
      .order('id'))
    : [];

  const itemIds = (items || []).map((item) => item.id);
  const groups = itemIds.length
    ? await fetchAll(() => supabase
      .from('menu_option_groups')
      .select('*')
      .in('menu_item_id', itemIds)
      .order('order_index')
      .order('id'))
    : [];

  const options = itemIds.length
    ? await fetchAll(() => supabase
      .from('menu_item_options')
      .select('*')
      .in('menu_item_id', itemIds)
      .order('order_index')
      .order('id'))
    : [];

  return { restaurants: restaurants || [], categories: categories || [], items: items || [], groups: groups || [], options: options || [] };
}

function indexMenu(menu) {
  const categoriesByRestaurant = new Map();
  const itemsByCategory = new Map();
  const groupsByItem = new Map();
  const optionsByItem = new Map();
  const optionsByGroup = new Map();
  const itemById = new Map();
  const categoryById = new Map();

  for (const category of menu.categories) {
    categoryById.set(category.id, category);
    if (!categoriesByRestaurant.has(category.restaurant_id)) categoriesByRestaurant.set(category.restaurant_id, []);
    categoriesByRestaurant.get(category.restaurant_id).push(category);
  }
  for (const item of menu.items) {
    itemById.set(item.id, item);
    if (!itemsByCategory.has(item.category_id)) itemsByCategory.set(item.category_id, []);
    itemsByCategory.get(item.category_id).push(item);
  }
  for (const group of menu.groups) {
    if (!groupsByItem.has(group.menu_item_id)) groupsByItem.set(group.menu_item_id, []);
    groupsByItem.get(group.menu_item_id).push(group);
  }
  for (const option of menu.options) {
    if (!optionsByItem.has(option.menu_item_id)) optionsByItem.set(option.menu_item_id, []);
    optionsByItem.get(option.menu_item_id).push(option);
    if (option.group_id) {
      if (!optionsByGroup.has(option.group_id)) optionsByGroup.set(option.group_id, []);
      optionsByGroup.get(option.group_id).push(option);
    }
  }
  return { categoriesByRestaurant, itemsByCategory, groupsByItem, optionsByItem, optionsByGroup, itemById, categoryById };
}

function audit(menu) {
  const idx = indexMenu(menu);
  const audits = [];
  for (const restaurant of menu.restaurants) {
    const categories = idx.categoriesByRestaurant.get(restaurant.id) || [];
    const issues = [];
    let itemCount = 0;
    let groupCount = 0;
    let optionCount = 0;
    let availableOptionCount = 0;

    for (const category of categories) {
      for (const item of idx.itemsByCategory.get(category.id) || []) {
        itemCount += 1;
        const groups = idx.groupsByItem.get(item.id) || [];
        const options = idx.optionsByItem.get(item.id) || [];
        groupCount += groups.length;
        optionCount += options.length;
        availableOptionCount += options.filter((option) => option.is_available !== false).length;

        const availableOptions = options.filter((option) => option.is_available !== false);
        if (isConfigurable(item) && groups.length === 0 && availableOptions.length === 0) {
          issues.push({
            code: 'configurable_without_options',
            itemId: item.id,
            item: item.name,
            priceType: item.price_type,
            commercialType: item.commercial_type,
            rawHint: rawText(safeJson(item.raw_data), 600),
          });
        }

        const itemPrice = itemBasePrice(item);
        for (const group of groups) {
          const groupOptions = idx.optionsByGroup.get(group.id) || [];
          if (isOperationalText(group.name, group.description)) {
            issues.push({ code: 'operational_group', itemId: item.id, item: item.name, groupId: group.id, group: group.name, optionCount: groupOptions.length });
          }
          if (isInstructionOption(group.name) && groupOptions.length === 0) {
            issues.push({ code: 'instruction_group_without_options', itemId: item.id, item: item.name, groupId: group.id, group: group.name });
          }
        }

        for (const option of options) {
          const group = option.group_id ? menu.groups.find((candidate) => candidate.id === option.group_id) : null;
          if (option.is_available !== false && isOperationalText(option.name, option.description, option.group_name, group?.name)) {
            issues.push({ code: 'operational_option', itemId: item.id, item: item.name, groupId: option.group_id, optionId: option.id, group: group?.name || option.group_name, option: option.name });
          }
          if (option.is_available !== false && isInstructionOption(option.name) && !money(option.price_delta) && !money(option.price)) {
            issues.push({ code: 'instruction_option', itemId: item.id, item: item.name, groupId: option.group_id, optionId: option.id, group: group?.name || option.group_name, option: option.name });
          }
          const delta = money(option.price_delta);
          if (option.is_available !== false && itemPrice !== null && delta !== null && delta > 0 && Math.abs(delta - itemPrice) < 0.001) {
            issues.push({ code: 'delta_equals_item_base', itemId: item.id, item: item.name, itemPrice, groupId: option.group_id, optionId: option.id, group: group?.name || option.group_name, option: option.name, delta });
          }
        }
      }
    }

    audits.push({
      id: restaurant.id,
      name: restaurant.name,
      counts: { categories: categories.length, items: itemCount, groups: groupCount, options: optionCount, availableOptions: availableOptionCount },
      issues,
    });
  }
  return audits;
}

function findInteresting(menu) {
  const idx = indexMenu(menu);
  const records = [];
  for (const item of menu.items) {
    const category = idx.categoryById.get(item.category_id);
    if (!category || !TARGET_IDS.includes(category.restaurant_id)) continue;
    const restaurant = menu.restaurants.find((candidate) => candidate.id === category.restaurant_id);
    const itemText = normalize(`${item.name} ${item.display_name} ${item.description}`);
    const options = idx.optionsByItem.get(item.id) || [];
    const groups = idx.groupsByItem.get(item.id) || [];
    const relevant = (
      itemText.includes('hossomaki camarao natural')
      || itemText.includes('camarao')
      || itemText.includes('carne de sol')
      || category.restaurant_id === IDS.pipa && options.some((option) => isOperationalText(option.name, option.description, option.group_name))
    );
    if (!relevant) continue;
    records.push({
      restaurant: restaurant?.name,
      restaurantId: category.restaurant_id,
      category: category.name,
      item: {
        id: item.id,
        name: item.name,
        display_name: item.display_name,
        price: item.price,
        display_price: item.display_price,
        price_min: item.price_min,
        price_max: item.price_max,
        price_type: item.price_type,
        commercial_type: item.commercial_type,
        is_configurable: item.is_configurable,
        raw_data: safeJson(item.raw_data),
      },
      groups: groups.map((group) => ({
        id: group.id,
        name: group.name,
        min_quantity: group.min_quantity,
        max_quantity: group.max_quantity,
        is_required: group.is_required,
        semantic_type: group.semantic_type,
        price_behavior: group.price_behavior,
        raw_data: safeJson(group.raw_data),
        options: (idx.optionsByGroup.get(group.id) || []).map((option) => ({
          id: option.id,
          name: option.name,
          group_name: option.group_name,
          price: option.price,
          price_delta: option.price_delta,
          price_behavior: option.price_behavior,
          semantic_type: option.semantic_type,
          is_available: option.is_available,
          is_searchable_variant: option.is_searchable_variant,
          raw_data: safeJson(option.raw_data),
        })),
      })),
      legacyOptions: options.filter((option) => !option.group_id).map((option) => ({
        id: option.id,
        name: option.name,
        group_name: option.group_name,
        price: option.price,
        price_delta: option.price_delta,
        price_behavior: option.price_behavior,
        semantic_type: option.semantic_type,
        is_available: option.is_available,
        raw_data: safeJson(option.raw_data),
      })),
    });
  }
  return records;
}

async function maybeCreateHossomakiOptions(menu, changes) {
  const idx = indexMenu(menu);
  const category = menu.categories.find((candidate) => candidate.restaurant_id === IDS.espacoDoSushi);
  const candidates = menu.items.filter((item) => {
    const itemCategory = idx.categoryById.get(item.category_id);
    return itemCategory?.restaurant_id === IDS.espacoDoSushi
      && normalize(item.name).includes('hossomaki camarao natural');
  });
  for (const item of candidates) {
    const groups = idx.groupsByItem.get(item.id) || [];
    const options = idx.optionsByItem.get(item.id) || [];
    const raw = safeJson(item.raw_data);
    const rawString = normalize(rawText(raw, 3000));
    const hasRealChoice = /\b(5|05)\s*(uni|unid|unidade|unidades)\b/.test(rawString)
      && /\b10\s*(uni|unid|unidade|unidades)\b/.test(rawString);
    if (groups.length > 0 || options.length > 0 || !hasRealChoice) {
      changes.espacoDoSushi.push({
        action: 'no_change',
        itemId: item.id,
        item: item.name,
        reason: groups.length || options.length ? 'item_already_has_options' : 'raw_data_without_two_structured_quantities',
      });
      continue;
    }

    const base = itemBasePrice(item);
    const rawPrice = money(raw?.price ?? raw?.valor ?? raw?.preco);
    const quantityOptions = [
      { name: '5 Uni', units: 5, price: null, delta: 0 },
      { name: '10 Uni', units: 10, price: null, delta: null },
    ];

    const rawOptions = Array.isArray(raw?.options) ? raw.options
      : Array.isArray(raw?.opcoes) ? raw.opcoes
        : Array.isArray(raw?.variations) ? raw.variations
          : [];
    for (const option of rawOptions) {
      const name = clean(option?.name ?? option?.title ?? option?.label);
      const optionPrice = money(option?.price ?? option?.valor ?? option?.preco ?? option?.amount);
      if (/\b5\s*(uni|unid|unidade|unidades)\b/i.test(name)) quantityOptions[0].price = optionPrice;
      if (/\b10\s*(uni|unid|unidade|unidades)\b/i.test(name)) quantityOptions[1].price = optionPrice;
    }

    if (base !== null && quantityOptions[1].price !== null) {
      quantityOptions[1].delta = Number((quantityOptions[1].price - base).toFixed(2));
    } else {
      changes.espacoDoSushi.push({
        action: 'no_change',
        itemId: item.id,
        item: item.name,
        reason: 'raw_data_mentions_5_10_but_lacks_structured_prices_for_safe_delta',
        base,
        rawPrice,
        rawData: raw,
      });
      continue;
    }

    if (mode === 'apply') {
      const { data: group, error: groupError } = await supabase
        .from('menu_option_groups')
        .insert({
          menu_item_id: item.id,
          name: 'Quantidade',
          min_quantity: 1,
          max_quantity: 1,
          is_required: true,
          order_index: 0,
          semantic_type: 'variant',
          price_behavior: 'price_delta',
          ai_confidence: 0.95,
          ai_reason: 'Reparo estrutural: raw_data do item indica escolha real 5 ou 10 Uni.',
          raw_data: { repair_run_id: runId, source: raw },
        })
        .select('*')
        .single();
      if (groupError) throw groupError;

      const rows = quantityOptions.map((option, index) => ({
        menu_item_id: item.id,
        group_id: group.id,
        group_name: 'Quantidade',
        name: option.name,
        price: option.price,
        price_delta: option.delta,
        min_quantity: 0,
        max_quantity: 1,
        is_required: true,
        is_available: true,
        order_index: index,
        semantic_type: 'variant',
        price_behavior: 'price_delta',
        is_searchable_variant: true,
        search_label: `${item.name} ${option.name}`,
        ai_confidence: 0.95,
        ai_reason: 'Reparo estrutural: opção real de quantidade no raw_data.',
        raw_data: { repair_run_id: runId, units: option.units, source: raw },
      }));
      const { error: optionError } = await supabase.from('menu_item_options').insert(rows);
      if (optionError) throw optionError;

      changes.espacoDoSushi.push({ action: 'created_group_options', itemId: item.id, item: item.name, groupId: group.id, options: rows.map((row) => ({ name: row.name, price_delta: row.price_delta, price: row.price })) });
    } else {
      changes.espacoDoSushi.push({ action: 'would_create_group_options', itemId: item.id, item: item.name, options: quantityOptions });
    }
  }
  if (!candidates.length) {
    changes.espacoDoSushi.push({ action: 'no_change', reason: 'target_item_not_found' });
  }
}

async function inspectSuspiciousDeltas(menu, changes) {
  const idx = indexMenu(menu);
  for (const restaurantId of [IDS.iLoveBurguer, IDS.larys]) {
    const key = restaurantId === IDS.iLoveBurguer ? 'iLoveBurguer' : 'larys';
    const suspicious = [];
    for (const option of menu.options) {
      if (option.is_available === false) continue;
      const item = idx.itemById.get(option.menu_item_id);
      const category = item ? idx.categoryById.get(item.category_id) : null;
      if (category?.restaurant_id !== restaurantId) continue;
      const itemPrice = itemBasePrice(item);
      const delta = money(option.price_delta);
      const optionName = normalize(option.name);
      const targetName = restaurantId === IDS.iLoveBurguer ? optionName.includes('camarao') : optionName.includes('carne de sol');
      if (targetName && itemPrice !== null && delta !== null && Math.abs(delta - itemPrice) < 0.001) {
        suspicious.push({
          itemId: item.id,
          item: item.name,
          itemPrice,
          optionId: option.id,
          option: option.name,
          group: option.group_name || menu.groups.find((group) => group.id === option.group_id)?.name || null,
          delta,
          price: option.price,
          price_behavior: option.price_behavior,
          optionRawData: safeJson(option.raw_data),
          itemRawData: safeJson(item.raw_data),
        });
      }
    }

    changes[key].push(...suspicious.map((entry) => ({
      action: 'no_change',
      reason: 'semantic_addon_price_confirmed_or_insufficient_evidence_for_duplication',
      ...entry,
    })));
    if (!suspicious.length) changes[key].push({ action: 'no_change', reason: 'no_matching_suspicious_delta_found' });
  }
}

async function removePipaOperationalOptions(menu, changes) {
  const idx = indexMenu(menu);
  const operationalOptions = [];
  const touchedGroups = new Set();
  for (const option of menu.options) {
    const item = idx.itemById.get(option.menu_item_id);
    const category = item ? idx.categoryById.get(item.category_id) : null;
    if (category?.restaurant_id !== IDS.pipa) continue;
    const group = option.group_id ? menu.groups.find((candidate) => candidate.id === option.group_id) : null;
    if (option.is_available !== false && isOperationalText(option.name, option.description, option.group_name, group?.name)) {
      operationalOptions.push({ option, item, group });
      if (option.group_id) touchedGroups.add(option.group_id);
    }
  }

  if (mode === 'apply') {
    const optionIds = operationalOptions.map(({ option }) => option.id);
    if (optionIds.length) {
      const { error } = await supabase
        .from('menu_item_options')
        .update({
          is_available: false,
          is_searchable_variant: false,
          semantic_type: 'operational',
          price_behavior: 'included',
          ai_confidence: 1,
          ai_reason: `Reparo estrutural ${runId}: opção operacional/descartável desativada.`,
        })
        .in('id', optionIds);
      if (error) throw error;
    }
  }

  const samples = operationalOptions.slice(0, 30).map(({ option, item, group }) => ({
    itemId: item.id,
    item: item.name,
    groupId: group?.id || option.group_id,
    group: group?.name || option.group_name,
    optionId: option.id,
    option: option.name,
  }));

  if (operationalOptions.length) {
    changes.pipa.push({
      action: mode === 'apply' ? 'disabled_operational_options' : 'would_disable_operational_options',
      optionCount: operationalOptions.length,
      groupCount: touchedGroups.size,
      samples,
    });
  }

  const emptyOperationalGroups = [];
  for (const group of menu.groups) {
    const item = idx.itemById.get(group.menu_item_id);
    const category = item ? idx.categoryById.get(item.category_id) : null;
    if (category?.restaurant_id !== IDS.pipa) continue;
    if (!isOperationalText(group.name, group.description)) continue;
    const groupOptions = idx.optionsByGroup.get(group.id) || [];
    const activeOptions = groupOptions.filter((option) => option.is_available !== false);
    if (activeOptions.length === 0) emptyOperationalGroups.push({ group, item, optionCount: groupOptions.length });
  }

  if (emptyOperationalGroups.length) {
    if (mode === 'apply') {
      const { error } = await supabase
        .from('menu_option_groups')
        .delete()
        .in('id', emptyOperationalGroups.map(({ group }) => group.id));
      if (error) throw error;
    }
    changes.pipa.push({
      action: mode === 'apply' ? 'removed_empty_operational_groups' : 'would_remove_empty_operational_groups',
      groupCount: emptyOperationalGroups.length,
      optionCount: emptyOperationalGroups.reduce((sum, entry) => sum + entry.optionCount, 0),
      samples: emptyOperationalGroups.slice(0, 30).map(({ group, item, optionCount }) => ({
        itemId: item.id,
        item: item.name,
        groupId: group.id,
        group: group.name,
        optionCount,
      })),
    });
  }

  if (!operationalOptions.length && !emptyOperationalGroups.length) {
    changes.pipa.push({ action: 'no_change', reason: 'no_active_operational_options_or_empty_operational_groups_found' });
  }
}

async function main() {
  const beforeMenu = await loadMenu();
  const beforeAudit = audit(beforeMenu);
  const interestingBefore = findInteresting(beforeMenu);
  const changes = { espacoDoSushi: [], iLoveBurguer: [], larys: [], pipa: [] };

  await maybeCreateHossomakiOptions(beforeMenu, changes);
  await inspectSuspiciousDeltas(beforeMenu, changes);
  await removePipaOperationalOptions(beforeMenu, changes);

  const afterMenu = await loadMenu();
  const afterAudit = audit(afterMenu);
  const interestingAfter = findInteresting(afterMenu);
  const report = {
    runId,
    mode,
    outDir,
    beforeAudit,
    changes,
    afterAudit,
    interestingBefore,
    interestingAfter,
  };

  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify({
    runId,
    mode,
    outDir,
    before: beforeAudit.map((entry) => ({ id: entry.id, name: entry.name, counts: entry.counts, issueCounts: entry.issues.reduce((acc, issue) => ({ ...acc, [issue.code]: (acc[issue.code] || 0) + 1 }), {}) })),
    changes,
    after: afterAudit.map((entry) => ({ id: entry.id, name: entry.name, counts: entry.counts, issueCounts: entry.issues.reduce((acc, issue) => ({ ...acc, [issue.code]: (acc[issue.code] || 0) + 1 }), {}) })),
  }, null, 2));
  console.log(JSON.stringify({
    runId,
    mode,
    outDir,
    before: beforeAudit.map((entry) => ({ id: entry.id, name: entry.name, counts: entry.counts, issueCounts: entry.issues.reduce((acc, issue) => ({ ...acc, [issue.code]: (acc[issue.code] || 0) + 1 }), {}) })),
    changes,
    after: afterAudit.map((entry) => ({ id: entry.id, name: entry.name, counts: entry.counts, issueCounts: entry.issues.reduce((acc, issue) => ({ ...acc, [issue.code]: (acc[issue.code] || 0) + 1 }), {}) })),
  }, null, 2));
}

await main();
