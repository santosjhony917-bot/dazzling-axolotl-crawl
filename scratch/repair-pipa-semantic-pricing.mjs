import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const RESTAURANT_ID = '60d131e5-d7fb-4aa2-b3b0-83af50747ff2';
const mode = process.argv.includes('--apply') ? 'apply' : 'dry-run';
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join('scratch', 'pipa-semantic-pricing-repair', runId);
fs.mkdirSync(outDir, { recursive: true });

function readEnv() {
  const env = { ...process.env };
  for (const file of ['.env']) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const index = trimmed.indexOf('=');
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!env[key]) env[key] = value;
    }
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
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
}

function rawPrice(rawData) {
  const raw = typeof rawData === 'object' && rawData ? rawData : null;
  return money(raw?.option?.price ?? raw?.price ?? raw?.price_base ?? raw?.option?.price_base);
}

function itemSourcePrice(item) {
  const raw = typeof item.raw_data === 'object' && item.raw_data ? item.raw_data : null;
  return money(raw?.item?.price ?? raw?.price ?? raw?.item?.price_base ?? raw?.price_base);
}

function currentBase(item) {
  return money(item.display_price ?? item.price_min ?? item.price);
}

function currentOptionValue(option) {
  return money(option.price_delta ?? option.price);
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
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function loadMenu() {
  const restaurant = await supabase
    .from('restaurants')
    .select('id,name,menu_status,menu_status_reason')
    .eq('id', RESTAURANT_ID)
    .single();
  if (restaurant.error) throw restaurant.error;

  const categories = await fetchAll(() => supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', RESTAURANT_ID)
    .order('order_index')
    .order('id'));

  const items = await fetchAll(() => supabase
    .from('menu_items')
    .select('*')
    .in('category_id', categories.map((category) => category.id))
    .order('order_index')
    .order('id'));

  const groups = await fetchAll(() => supabase
    .from('menu_option_groups')
    .select('*')
    .in('menu_item_id', items.map((item) => item.id))
    .order('order_index')
    .order('id'));

  const options = await fetchAll(() => supabase
    .from('menu_item_options')
    .select('*')
    .in('menu_item_id', items.map((item) => item.id))
    .order('order_index')
    .order('id'));

  return { restaurant: restaurant.data, categories, items, groups, options };
}

function indexMenu(menu) {
  const categoryById = new Map(menu.categories.map((category) => [category.id, category]));
  const itemById = new Map(menu.items.map((item) => [item.id, item]));
  const groupsByItem = new Map();
  const optionsByGroup = new Map();
  const optionsByItem = new Map();
  for (const group of menu.groups) {
    if (!groupsByItem.has(group.menu_item_id)) groupsByItem.set(group.menu_item_id, []);
    groupsByItem.get(group.menu_item_id).push(group);
  }
  for (const option of menu.options) {
    if (!optionsByGroup.has(option.group_id)) optionsByGroup.set(option.group_id, []);
    optionsByGroup.get(option.group_id).push(option);
    if (!optionsByItem.has(option.menu_item_id)) optionsByItem.set(option.menu_item_id, []);
    optionsByItem.get(option.menu_item_id).push(option);
  }
  return { categoryById, itemById, groupsByItem, optionsByGroup, optionsByItem };
}

const operationalRe = /\b(ketchup|catchup|talher|talheres|guardanapo|guardanapos|embalagem|embalagens|sacola|sacolas|descartavel|descartaveis|cpf|troco|canudo|canudos|copo descartavel|copos descartaveis|prato descartavel|pratos descartaveis|hashi|hashis|porta shoyu|porta-shoyu|nosoki|nozoki|shoyu|shoyo|kit delivery|kit de delivery|kit entrega)\b/i;
const productChoiceRe = /\b(escolha|monte|sabor|temaki|poke|combinado|peca|pecas|sashimi|niguiri|uramaki|hossomaki|hot|jhoo|joe)\b/i;

function looksOperational(...parts) {
  return operationalRe.test(normalize(parts.join(' ')));
}

function shouldTreatAsFinalPriceGroup(item, group, activeOptions) {
  if (activeOptions.length < 2) return false;
  const base = currentBase(item);
  if (base === null || base < 0) return false;
  if (looksOperational(group.name)) return false;

  const optionPrices = activeOptions.map((option) => ({
    current: currentOptionValue(option),
    raw: rawPrice(option.raw_data),
  }));
  const usable = optionPrices.filter((entry) => entry.current !== null && entry.current > 0);
  if (usable.length < 2) return false;

  const text = normalize(`${item.name} ${item.description || ''} ${group.name}`);
  const sourceBase = itemSourcePrice(item);
  const required = Boolean(group.is_required) || Number(group.min_quantity || 0) > 0;
  const hasProductChoiceName = productChoiceRe.test(text);
  const sourceSaysNoBase = sourceBase === 0;
  const manyValuesAboveBase = base === 0
    ? usable.length >= 2
    : usable.filter((entry) => entry.current >= Math.max(10, base * 1.5)).length >= Math.ceil(usable.length * 0.5);
  const rawMatchesCurrent = usable.filter((entry) => entry.raw !== null && Math.abs(entry.raw - entry.current) < 0.01).length >= Math.ceil(usable.length * 0.5);

  return Boolean(
    required
    && hasProductChoiceName
    && rawMatchesCurrent
    && (sourceSaysNoBase || manyValuesAboveBase)
  );
}

function classify(menu) {
  const idx = indexMenu(menu);
  const finalPriceGroups = [];
  const builderBaseItems = [];
  const operationalOptions = [];
  const emptyOperationalGroups = [];
  const stillSuspicious = [];

  for (const item of menu.items) {
    const itemGroups = idx.groupsByItem.get(item.id) || [];
    const activeOptions = (idx.optionsByItem.get(item.id) || []).filter((option) => option.is_available !== false);
    const base = currentBase(item);
    const sourceBase = itemSourcePrice(item);
    const itemText = normalize(`${item.name} ${item.description || ''}`);
    const allGroupsOptional = itemGroups.length > 2 && itemGroups.every((group) => !group.is_required && Number(group.min_quantity || 0) === 0);
    const hasPricedComponents = activeOptions.filter((option) => (rawPrice(option.raw_data) ?? currentOptionValue(option) ?? 0) > 0).length >= 5;
    const hasMostlyAbsoluteComponents = activeOptions.filter((option) => option.price_behavior === 'absolute_price' && money(option.price) !== null).length >= 5;
    if (
      base !== null
      && base > 0
      && sourceBase === 0
      && /\bmonte\b/.test(itemText)
      && allGroupsOptional
      && hasPricedComponents
      && hasMostlyAbsoluteComponents
    ) {
      builderBaseItems.push({
        itemId: item.id,
        item: item.name,
        before: {
          price: item.price,
          display_price: item.display_price,
          price_min: item.price_min,
          price_max: item.price_max,
          price_type: item.price_type,
          commercial_type: item.commercial_type,
        },
        after: {
          price: null,
          display_price: null,
          price_min: null,
          price_max: null,
          price_type: 'option_only',
          commercial_type: 'combo_builder',
        },
        groupCount: itemGroups.length,
        activeOptionCount: activeOptions.length,
        examples: itemGroups.slice(0, 5).map((group) => ({
          group: group.name,
          min_quantity: group.min_quantity,
          max_quantity: group.max_quantity,
          sampleOptions: (idx.optionsByGroup.get(group.id) || [])
            .filter((option) => option.is_available !== false)
            .slice(0, 4)
            .map((option) => ({
              name: option.name,
              price: option.price,
              price_delta: option.price_delta,
              price_behavior: option.price_behavior,
              rawPrice: rawPrice(option.raw_data),
            })),
        })),
      });
    }
  }

  for (const group of menu.groups) {
    const item = idx.itemById.get(group.menu_item_id);
    const category = item ? idx.categoryById.get(item.category_id) : null;
    const groupOptions = idx.optionsByGroup.get(group.id) || [];
    const activeOptions = groupOptions.filter((option) => option.is_available !== false);

    for (const option of activeOptions) {
      if (looksOperational(option.name, option.description, option.group_name, group.name)) {
        operationalOptions.push({ item, group, option });
      }
    }

    if (looksOperational(group.name, group.description) && activeOptions.length === 0) {
      emptyOperationalGroups.push({ item, group, optionCount: groupOptions.length });
      continue;
    }

    if (shouldTreatAsFinalPriceGroup(item, group, activeOptions)) {
      const base = currentBase(item) ?? 0;
      const optionUpdates = activeOptions
        .map((option) => {
          const finalPrice = rawPrice(option.raw_data) ?? currentOptionValue(option);
          if (finalPrice === null) return null;
          return {
            id: option.id,
            name: option.name,
            before: {
              price: option.price,
              price_delta: option.price_delta,
              price_behavior: option.price_behavior,
            },
            after: {
              price: finalPrice,
              price_delta: Number((finalPrice - base).toFixed(2)),
              price_behavior: 'price_delta',
            },
          };
        })
        .filter(Boolean);

      const minDelta = Math.min(...optionUpdates.map((entry) => entry.after.price_delta));
      const hasNegativeDelta = optionUpdates.some((entry) => entry.after.price_delta < -0.001);
      if (!hasNegativeDelta) {
        finalPriceGroups.push({
          category: category?.name,
          itemId: item.id,
          item: item.name,
          base,
          sourceBase: itemSourcePrice(item),
          groupId: group.id,
          group: group.name,
          beforeGroup: {
            min_quantity: group.min_quantity,
            max_quantity: group.max_quantity,
            is_required: group.is_required,
            price_behavior: group.price_behavior,
            semantic_type: group.semantic_type,
          },
          afterGroup: {
            min_quantity: Math.max(1, Number(group.min_quantity || 0)),
            max_quantity: 1,
            is_required: true,
            price_behavior: 'price_delta',
            semantic_type: 'required_choice',
          },
          minDelta,
          optionCount: optionUpdates.length,
          options: optionUpdates,
        });
      } else {
        stillSuspicious.push({
          reason: 'negative_delta_if_converted',
          category: category?.name,
          itemId: item.id,
          item: item.name,
          base,
          sourceBase: itemSourcePrice(item),
          groupId: group.id,
          group: group.name,
          options: optionUpdates.slice(0, 10),
        });
      }
    }
  }

  return { finalPriceGroups, builderBaseItems, operationalOptions, emptyOperationalGroups, stillSuspicious };
}

async function applyCorrections(classification) {
  const applied = {
    finalPriceGroups: [],
    builderBaseItems: [],
    disabledOperationalOptions: [],
    removedEmptyOperationalGroups: [],
  };

  if (mode !== 'apply') return applied;

  for (const item of classification.builderBaseItems) {
    const { error } = await supabase
      .from('menu_items')
      .update({
        price: item.after.price,
        display_price: item.after.display_price,
        price_min: item.after.price_min,
        price_max: item.after.price_max,
        price_type: item.after.price_type,
        commercial_type: item.after.commercial_type,
        is_configurable: true,
        needs_review: false,
        import_notes: `Reparo ${runId}: builder com base 0 na fonte; removido preço base importado para evitar soma duplicada com componentes.`,
      })
      .eq('id', item.itemId);
    if (error) throw error;
    applied.builderBaseItems.push({
      item: item.item,
      before: item.before,
      after: item.after,
      groupCount: item.groupCount,
      activeOptionCount: item.activeOptionCount,
      examples: item.examples.slice(0, 3),
    });
  }

  for (const group of classification.finalPriceGroups) {
    const { error: groupError } = await supabase
      .from('menu_option_groups')
      .update({
        min_quantity: group.afterGroup.min_quantity,
        max_quantity: group.afterGroup.max_quantity,
        is_required: group.afterGroup.is_required,
        price_behavior: group.afterGroup.price_behavior,
        semantic_type: group.afterGroup.semantic_type,
        ai_confidence: 0.92,
        ai_reason: `Reparo ${runId}: opções eram preços finais da fonte; armazenadas como delta sobre base para evitar soma duplicada.`,
      })
      .eq('id', group.groupId);
    if (groupError) throw groupError;

    for (const option of group.options) {
      const { error: optionError } = await supabase
        .from('menu_item_options')
        .update({
          price: option.after.price,
          price_delta: option.after.price_delta,
          price_behavior: option.after.price_behavior,
          semantic_type: 'variant',
          is_searchable_variant: true,
          ai_confidence: 0.92,
          ai_reason: `Reparo ${runId}: price_delta recalculado como preço final da fonte menos preço base do item.`,
        })
        .eq('id', option.id);
      if (optionError) throw optionError;
    }
    applied.finalPriceGroups.push({
      item: group.item,
      group: group.group,
      optionCount: group.optionCount,
      examples: group.options.slice(0, 5),
    });
  }

  const opIds = classification.operationalOptions.map(({ option }) => option.id);
  if (opIds.length) {
    const { error } = await supabase
      .from('menu_item_options')
      .update({
        is_available: false,
        is_searchable_variant: false,
        semantic_type: 'operational',
        price_behavior: 'included',
        ai_confidence: 1,
        ai_reason: `Reparo ${runId}: opção operacional/descartável de sushi desativada.`,
      })
      .in('id', opIds);
    if (error) throw error;
    applied.disabledOperationalOptions = classification.operationalOptions.slice(0, 30).map(({ item, group, option }) => ({
      item: item.name,
      group: group.name,
      option: option.name,
    }));
  }

  const emptyGroupIds = classification.emptyOperationalGroups.map(({ group }) => group.id);
  if (emptyGroupIds.length) {
    const { error } = await supabase
      .from('menu_option_groups')
      .delete()
      .in('id', emptyGroupIds);
    if (error) throw error;
    applied.removedEmptyOperationalGroups = classification.emptyOperationalGroups.slice(0, 30).map(({ item, group, optionCount }) => ({
      item: item.name,
      group: group.name,
      optionCount,
    }));
  }

  return applied;
}

function compactClassification(classification) {
  return {
    finalPriceGroups: classification.finalPriceGroups.map((group) => ({
      category: group.category,
      itemId: group.itemId,
      item: group.item,
      base: group.base,
      sourceBase: group.sourceBase,
      groupId: group.groupId,
      group: group.group,
      beforeGroup: group.beforeGroup,
      afterGroup: group.afterGroup,
      optionCount: group.optionCount,
      examples: group.options.slice(0, 8),
    })),
    builderBaseItems: classification.builderBaseItems,
    operationalOptions: classification.operationalOptions.slice(0, 50).map(({ item, group, option }) => ({
      item: item.name,
      group: group.name,
      option: option.name,
    })),
    operationalOptionCount: classification.operationalOptions.length,
    emptyOperationalGroups: classification.emptyOperationalGroups.slice(0, 50).map(({ item, group, optionCount }) => ({
      item: item.name,
      group: group.name,
      optionCount,
    })),
    emptyOperationalGroupCount: classification.emptyOperationalGroups.length,
    stillSuspicious: classification.stillSuspicious,
  };
}

async function main() {
  const beforeMenu = await loadMenu();
  const before = classify(beforeMenu);
  const applied = await applyCorrections(before);
  const afterMenu = await loadMenu();
  const after = classify(afterMenu);

  const report = {
    runId,
    mode,
    outDir,
    countsBefore: {
      items: beforeMenu.items.length,
      groups: beforeMenu.groups.length,
      options: beforeMenu.options.length,
      availableOptions: beforeMenu.options.filter((option) => option.is_available !== false).length,
    },
    before: compactClassification(before),
    applied,
    countsAfter: {
      items: afterMenu.items.length,
      groups: afterMenu.groups.length,
      options: afterMenu.options.length,
      availableOptions: afterMenu.options.filter((option) => option.is_available !== false).length,
    },
    after: compactClassification(after),
  };

  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify({
    runId,
    mode,
    outDir,
    countsBefore: report.countsBefore,
    finalPriceGroupsBefore: report.before.finalPriceGroups.length,
    operationalOptionsBefore: report.before.operationalOptionCount,
    emptyOperationalGroupsBefore: report.before.emptyOperationalGroupCount,
    appliedCounts: {
      finalPriceGroups: applied.finalPriceGroups.length,
      builderBaseItems: applied.builderBaseItems.length,
      disabledOperationalOptionSamples: applied.disabledOperationalOptions.length,
      removedEmptyOperationalGroupSamples: applied.removedEmptyOperationalGroups.length,
    },
    countsAfter: report.countsAfter,
    finalPriceGroupsAfter: report.after.finalPriceGroups.length,
    builderBaseItemsBefore: report.before.builderBaseItems.length,
    builderBaseItemsAfter: report.after.builderBaseItems.length,
    operationalOptionsAfter: report.after.operationalOptionCount,
    emptyOperationalGroupsAfter: report.after.emptyOperationalGroupCount,
    stillSuspiciousAfter: report.after.stillSuspicious.length,
    examplesBefore: report.before.finalPriceGroups.slice(0, 8),
    builderExamplesBefore: report.before.builderBaseItems.slice(0, 5),
    examplesApplied: applied.finalPriceGroups.slice(0, 8),
    builderExamplesApplied: applied.builderBaseItems.slice(0, 5),
    stillSuspicious: report.after.stillSuspicious,
  }, null, 2));

  console.log(JSON.stringify(JSON.parse(fs.readFileSync(path.join(outDir, 'summary.json'), 'utf8')), null, 2));
}

await main();
