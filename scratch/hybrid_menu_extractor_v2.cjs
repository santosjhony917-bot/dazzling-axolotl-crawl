'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const { extractItemsFromText, mergeCategories, runLocalOcr } = require('./hybrid_menu_pipeline.cjs');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  let lastAssignedKey = null;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (!match) {
      if (lastAssignedKey && line.trim() && !line.trim().startsWith('#')) {
        process.env[lastAssignedKey] = `${process.env[lastAssignedKey] || ''}${line.trim()}`;
      }
      continue;
    }
    lastAssignedKey = null;
    if (process.env[match[1]]) continue;
    let value = match[2] || '';
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
    lastAssignedKey = match[1];
  }
}

const args = process.argv.slice(2);
const arg = flag => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : null; };
const hasFlag = flag => args.includes(flag);
const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
const finite = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
const roundMoneyNumber = value => finite(value) == null ? null : Number(Number(value).toFixed(2));
const money = value => finite(value) == null ? '' : `R$ ${Number(value).toFixed(2).replace('.', ',')}`;
const OPERATIONAL_STANDALONE_ITEM_RE = /^(embalagens?|sacolas?|talheres?|guardanapos?|descartaveis?|canudos?|palitos?|cpf|troco|ketchup|catchup|copo descartavel|prato descartavel|kit talheres?|sache ketchup|sache catchup)$/;
const MENU_INTERFACE_NOISE_RE = /pedido\s*m[ií]n|cupom|cupons?|taxa\s+de\s+entrega|subtotal|sacola|carrinho|aberto\s+at[eé]|loja\s+fechada|calcular\s+taxa|buscar\s+no\s+card[aá]pio|visualiza[cç][aã]o\s+r[aá]pida|in[ií]cio|perfil|pedidos/i;
const OPENING_HOURS_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function parseJson(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

function hasCanonicalOpeningHours(value) {
  const parsed = parseJson(value, value);
  return Boolean(parsed
    && typeof parsed === 'object'
    && OPENING_HOURS_DAYS.every(day => typeof parsed[day]?.isOpen === 'boolean' && Array.isArray(parsed[day]?.slots)));
}

function normalizeWhatsappUrl(phone) {
  const digits = String(phone || '').replace(/\D+/g, '');
  if (digits.length < 10) return null;
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

function trustedRestaurantFieldPatch(current = {}, evidenceRestaurant = {}) {
  const patch = {};
  const normalized = value => clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const fillWhenBlank = (field) => {
    const value = clean(evidenceRestaurant[field]);
    if (value && !clean(current[field])) patch[field] = value;
  };

  for (const field of ['number', 'city', 'state', 'cep', 'phone']) {
    fillWhenBlank(field);
  }

  const evidenceAddress = clean(evidenceRestaurant.address);
  const currentAddress = clean(current.address);
  const cityName = clean(evidenceRestaurant.city || current.city);
  const addressLooksContaminated = /\s-\s/.test(currentAddress)
    || /\b[A-Z]{2}\b/.test(currentAddress)
    || /\b\d{5}-?\d{3}\b/.test(currentAddress)
    || (cityName && normalized(currentAddress).includes(normalized(cityName)));
  if (evidenceAddress && (!currentAddress || addressLooksContaminated)) patch.address = evidenceAddress;

  const evidenceNeighborhood = clean(evidenceRestaurant.neighborhood);
  const currentNeighborhood = clean(current.neighborhood);
  const neighborhoodEqualsCity = cityName && normalized(currentNeighborhood) === normalized(cityName);
  const neighborhoodLooksAddress = /\d|,|\s-\s|\b(rua|r\.|avenida|av\.|rodovia|travessa|praca|pra[cç]a)\b/i.test(currentNeighborhood);
  if (evidenceNeighborhood && (!currentNeighborhood || neighborhoodEqualsCity || neighborhoodLooksAddress)) {
    patch.neighborhood = evidenceNeighborhood;
  }

  const latitude = finite(evidenceRestaurant.latitude);
  const longitude = finite(evidenceRestaurant.longitude);
  if ((finite(current.latitude) == null || finite(current.longitude) == null) && latitude != null && longitude != null) {
    patch.latitude = latitude;
    patch.longitude = longitude;
  }

  if (!clean(current.whatsapp_url)) {
    const whatsapp = normalizeWhatsappUrl(patch.phone || evidenceRestaurant.phone);
    if (whatsapp) patch.whatsapp_url = whatsapp;
  }

  if (!hasCanonicalOpeningHours(current.opening_hours) && hasCanonicalOpeningHours(evidenceRestaurant.opening_hours)) {
    patch.opening_hours = evidenceRestaurant.opening_hours;
  }

  for (const field of ['image_url', 'cover_image_url']) {
    const value = clean(evidenceRestaurant[field]);
    const currentValue = clean(current[field]);
    if (value && (!currentValue || /\.(mp4|mov|webm)(?:$|\?)/i.test(currentValue))) patch[field] = value;
  }

  return patch;
}

function isMenuInterfaceNoiseItem(item) {
  const name = clean(item?.name || item?.nome);
  const description = clean(item?.description || item?.descricao);
  const haystack = `${name} ${description}`.toLowerCase();
  if (!name) return true;
  if (isInstructionalConfigItemName(name)) return true;
  if (isOperationalServiceMenuItem(item)) return true;
  if (/^(entrega|taxa de entrega|adicional|adicionais)$/i.test(name) && !description && !(item.options || []).length) return true;
  if (MENU_INTERFACE_NOISE_RE.test(haystack)) return true;
  if (/^(adicionar|comprar|pedido|minha conta|buscar|voltar|fechar|aceitar|cookies?|subtotal|total|sacola|carrinho)$/i.test(name)) return true;
  return false;
}

function rawSourceOf(value) {
  return value?.raw_data?.item || value?.raw_data || value?.item || value || {};
}

function isUnavailableSource(value) {
  const raw = rawSourceOf(value);
  const status = normalizeKeywordText(raw.status || raw.availability_status || value?.availability_status || '');
  if (/sold_out|soldout|esgotado|indisponivel|fora de estoque/.test(status)) return true;
  if (status && !/^(active|available|ativo|disponivel)$/.test(status) && /inactive|disabled|unavailable|blocked/.test(status)) return true;
  const activeStockControl = raw.active_stock_control === true || value?.active_stock_control === true;
  const stock = finite(raw.stock ?? value?.stock);
  return activeStockControl && stock != null && stock < 0;
}

function isFakeOrTokenPrice(value) {
  const price = finite(value);
  return price != null && price > 0 && price < 0.05;
}

function looksLikePlaceholderBasePrice(value, options = []) {
  const price = finite(value);
  if (price == null || price > 1) return false;
  const optionPrices = (options || [])
    .map(option => finite(option.price ?? option.price_delta))
    .filter(optionPrice => optionPrice != null && !isFakeOrTokenPrice(optionPrice));
  if (price === 0 && optionPrices.some(optionPrice => optionPrice > 0)) return true;
  const meaningfulOptionPrices = optionPrices.filter(optionPrice => optionPrice >= 5);
  if (!meaningfulOptionPrices.length) return false;
  return Math.min(...meaningfulOptionPrices) >= price * 5;
}

const CARDAPIO_WEB_PROMO_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const CARDAPIO_WEB_PROMO_DAY_ALIASES = {
  domingo: 'sunday',
  segunda: 'monday',
  'segunda-feira': 'monday',
  terca: 'tuesday',
  'terca-feira': 'tuesday',
  quarta: 'wednesday',
  'quarta-feira': 'wednesday',
  quinta: 'thursday',
  'quinta-feira': 'thursday',
  sexta: 'friday',
  'sexta-feira': 'friday',
  sabado: 'saturday',
};

function normalizeCardapioWebPromoDay(value) {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  return CARDAPIO_WEB_PROMO_DAYS.includes(normalized) ? normalized : CARDAPIO_WEB_PROMO_DAY_ALIASES[normalized] || '';
}

function cardapioWebMinutesOfDay(value) {
  const match = String(value || '').match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function cardapioWebScheduleActiveNow(schedule, now = new Date()) {
  const start = cardapioWebMinutesOfDay(schedule?.start || schedule?.start_at || schedule?.starts_at);
  const end = cardapioWebMinutesOfDay(schedule?.end || schedule?.end_at || schedule?.ends_at);
  if (start == null && end == null) return true;
  const current = now.getHours() * 60 + now.getMinutes();
  if (start != null && end != null) {
    return start <= end ? current >= start && current <= end : current >= start || current <= end;
  }
  if (start != null) return current >= start;
  return current <= end;
}

function isCardapioWebPromoActiveNow(rawItem, now = new Date()) {
  if (!rawItem?.promotional_price_active || finite(rawItem.promotional_price) == null) return false;
  const today = CARDAPIO_WEB_PROMO_DAYS[now.getDay()];
  const schedules = Array.isArray(rawItem.promotional_price_schedules) ? rawItem.promotional_price_schedules : [];
  const matchingSchedules = schedules.filter(schedule => {
    const day = normalizeCardapioWebPromoDay(schedule?.day || schedule?.weekday || schedule?.week_day || schedule?.day_of_week);
    return !day || day === today;
  });
  if (schedules.length) return matchingSchedules.some(schedule => cardapioWebScheduleActiveNow(schedule, now));
  const availability = Array.isArray(rawItem.promotional_price_availability) ? rawItem.promotional_price_availability : [];
  const availableDays = availability.map(normalizeCardapioWebPromoDay).filter(Boolean);
  return !availableDays.length || availableDays.includes(today);
}

function effectiveCardapioWebDirectPrice(item, rawSourceItem, parsedPrice) {
  const rawPrice = finite(rawSourceItem?.price);
  const promotionalPrice = finite(rawSourceItem?.promotional_price);
  if (rawPrice == null || promotionalPrice == null || !rawSourceItem?.promotional_price_active) return parsedPrice;
  const price = finite(parsedPrice);
  const promotionIsSelected = price == null || Math.abs(price - promotionalPrice) < 0.005;
  if (promotionIsSelected && !isCardapioWebPromoActiveNow(rawSourceItem)) return rawPrice;
  if (isCardapioWebPromoActiveNow(rawSourceItem)) return promotionalPrice;
  return parsedPrice;
}

function optionLooksLikeAddon(option) {
  const group = clean(option.group_name).toLowerCase();
  const name = clean(option.name).toLowerCase();
  return /adicional|extra|acrescimo|acréscimo|borda|azeitona|molho|observa/.test(`${group} ${name}`);
}

function optionLooksLikeSecondaryChoice(option) {
  const group = clean(option.group_name).toLowerCase();
  const name = clean(option.name).toLowerCase();
  return /suco|bebida|refrigerante|acompanhamento|complemento|adicional|extra|leite|azeitona|molho/.test(`${group} ${name}`);
}

function optionLooksLikeChoice(option) {
  const group = clean(option.group_name).toLowerCase();
  const name = clean(option.name).toLowerCase();
  if (!option.price || isFakeOrTokenPrice(option.price)) return false;
  if (optionLooksLikeAddon(option)) return false;
  if (/varia[cç][oõ]es/.test(group) && /^(unico|único)$/i.test(clean(option.name))) return false;
  return /escolha|sabor|pizza|calzone|omelete|suco|refrigerante|prote[ií]na|massa|salada|combo|beirute|marmita/.test(`${group} ${name}`) || option.price >= 3;
}

function optionLooksLikeAddon(option) {
  const group = clean(option.group_name).toLowerCase();
  const name = clean(option.name).toLowerCase();
  return /adicional|adicione|add|extra|acrescimo|acr[eÃ©]scimo|borda|azeitona|molho|observa/.test(`${group} ${name}`);
}

function optionLooksLikeSecondaryChoice(option) {
  const group = clean(option.group_name).toLowerCase();
  const name = clean(option.name).toLowerCase();
  return /suco|bebida|refrigerante|acompanhamento|complemento|adicional|adicione|add|extra|leite|azeitona|molho/.test(`${group} ${name}`);
}

function isOperationalServiceOption(option) {
  const text = normalizeKeywordText(`${option?.group_name || ''} ${option?.name || ''} ${option?.description || ''}`);
  const price = finite(option?.price ?? option?.price_delta);
  if (/\b(descartavel|descartaveis|talher|talheres|colher|colheres|garfo|garfos|faca|facas|palito|palitos|guardanapo|canudo|prato descartavel|embalagem|sacola|cpf|troco)\b/.test(text)) return true;
  if (/\b(ketchup|catchup)\b/.test(text)) return true;
  if (/^(copos?\s*){1,2}$/.test(text) && (price == null || price === 0)) return true;
  if (/\bsache\b/.test(text) && /\b(maionese|mostarda|ketchup|catchup)\b/.test(text)) return true;

  const operationalContext = /\b(deseja|quer|precisa|enviar|envia|mandar|mandamos|inclui|incluir|colocar|acompanha|acompanhar|sem|com|condimento|utensilio|utensilios|descartavel|descartaveis|talher|colher|garfo|faca|guardanapo|sacola|embalagem)\b/.test(text);
  if (/\bcopo\b/.test(text)) return (price == null || price === 0) && operationalContext;
  if (/\b(maionese|mostarda)\b/.test(text)) return price == null || price === 0 || isFakeOrTokenPrice(price) || operationalContext;
  return false;
}

function isOperationalServiceMenuItem(item) {
  const name = normalizeKeywordText(item?.name || item?.nome || '');
  const description = normalizeKeywordText(item?.description || item?.descricao || '');
  const text = `${name} ${description}`;
  const price = finite(item?.display_price ?? item?.price ?? item?.price_min);
  const optionCount = (item?.options || []).length
    + (item?.option_groups || []).reduce((sum, group) => sum + (group?.items || []).length, 0);
  if (OPERATIONAL_STANDALONE_ITEM_RE.test(name)) return true;
  if (/\b(embalagem|sacola|talher|talheres|guardanapo|descartavel|descartaveis|cpf|troco|canudo|palito)\b/.test(text) && (optionCount === 0 || price == null || price <= 5)) return true;
  if (/\b(ketchup|catchup)\b/.test(text) && (optionCount === 0 || price == null || price <= 2)) return true;
  return false;
}

function isDisposableOption(option) {
  return isOperationalServiceOption(option);
}

function optionLooksLikeComboUpsell(option) {
  const text = normalizeKeywordText(`${option?.group_name || ''} ${option?.name || ''} ${option?.description || ''}`);
  if (!/\b(combo|combos)\b/.test(text)) return false;
  return /\b(transforme|transformar|vira|virar|upgrade|complete|completar|adicione|adicionar)\b/.test(text)
    || /\b(combo)\b.*\b(batata|fritas|refri|refrigerante|bebida|suco|guarana|coca)\b/.test(text)
    || /\b(batata|fritas|refri|refrigerante|bebida|suco|guarana|coca)\b.*\b(combo)\b/.test(text);
}

function optionLooksLikeInstructionalComboTitle(option, siblings = []) {
  const name = normalizeKeywordText(option?.name || '');
  if (!/\b(transforme|transformar|turbine|turbinar|upgrade|complete|completar)\b/.test(name)) return false;
  if (!/\b(lanche|combo|pedido|hamburguer|burger|sanduiche)\b/.test(name)) return false;
  return siblings.some((sibling) => {
    if (sibling === option) return false;
    const siblingName = normalizeKeywordText(sibling?.name || '');
    return siblingName && siblingName !== name && !/\b(transforme|transformar|turbine|turbinar|upgrade|complete|completar)\b/.test(siblingName);
  });
}

function optionLooksLikeAddon(option) {
  const group = clean(option.group_name).toLowerCase();
  const name = clean(option.name).toLowerCase();
  if (isDisposableOption(option)) return false;
  if (optionLooksLikeComboUpsell(option)) return false;
  if (/turbin/.test(`${group} ${name}`)) return true;
  if (/adiciona/.test(`${group} ${name}`)) return true;
  if (/trocar|substituir|substituicao/.test(`${group} ${name}`)) return true;
  return /adicional|adicione|add|extra|acrescimo|acr[eÃƒÂ©]scimo|borda|azeitona|molho|observa/.test(`${group} ${name}`);
}

function optionLooksLikeSecondaryChoice(option) {
  const group = clean(option.group_name).toLowerCase();
  const name = clean(option.name).toLowerCase();
  if (isDisposableOption(option)) return true;
  if (/adiciona/.test(`${group} ${name}`)) return true;
  if (/trocar|substituir|substituicao/.test(`${group} ${name}`)) return true;
  return /suco|bebida|refrigerante|acompanhamento|complemento|adicional|adicione|add|extra|leite|azeitona|molho|sobremesa|doce|dessert|pudim|brownie/.test(`${group} ${name}`);
}

function optionLooksLikeChoice(option) {
  const group = clean(option.group_name).toLowerCase();
  const name = clean(option.name).toLowerCase();
  if (isDisposableOption(option)) return false;
  if (optionLooksLikeComboUpsell(option)) return false;
  if (!option.price || isFakeOrTokenPrice(option.price)) return false;
  if (optionLooksLikeAddon(option)) return false;
  if (/varia[cÃ§][oÃµ]es/.test(group) && /^(unico|Ãºnico)$/i.test(clean(option.name))) return false;
  return /escolha|sabor|pizza|calzone|omelete|prote[iÃ­]na|massa|salada|combo|beirute|marmita/.test(`${group} ${name}`) || (!optionLooksLikeSecondaryChoice(option) && option.price >= 3);
}

function looksLikeBuildYourOwnSingleProduct(item, categoryName) {
  const text = normalizeKeywordText(`${categoryName || ''} ${item?.name || ''} ${item?.description || ''}`);
  if (!/(monte|montar|crie|criar|personalize|personalizar|escolha)/.test(text)) return false;
  if (/(combo|pague\s*\d|leve\s*\d|duas\s+pizzas|pizza\s+individual\s*\+|pizza\s+grande.*\+|\+\s*(batata|refri|refrigerante|coca|guarana|suco))/.test(text)) return false;
  return /(snack|sanduiche|sanduba|burger|hamburguer|pizza|massa|salada|marmita|prato|omelete|beirute|acai|bowl)/.test(text);
}

function inferBetterOptionGroupName(groupName, options = [], item = {}) {
  const original = clean(groupName || 'Opcoes');
  const normalizedGroup = normalizeKeywordText(original);
  const optionText = normalizeKeywordText(options.map(option => option.name).join(' '));
  const itemText = normalizeKeywordText(`${item.name || ''} ${item.description || ''}`);
  const haystack = `${normalizedGroup} ${optionText} ${itemText}`;
  const snackFlavorGroup = /^escolha seu sabor/.test(normalizedGroup) && /(snack|sanduiche|sanduba|burger|hamburguer|beirute)/.test(itemText);
  const isGeneric = !original
    || /^(opcoes|opcao|escolhas?|escolhas obrigatorias|obrigatorias|variacoes|selecione|selecione uma opcao|escolha uma opcao|escolha 1 opcoes?|escolha 1 opcao|escolha ate \d+ opcoes?)$/.test(normalizedGroup)
    || /^escolha\s+\d+\s+opcoes?$/.test(normalizedGroup)
    || snackFlavorGroup;
  if (!isGeneric) return original;

  if (/(borda|massa tradicional|massa fina|requeijao|cream cheese|gorgonzola)/.test(haystack) && /pizza/.test(itemText)) return 'Massas & Bordas';
  if (/(sabor|mussarela|marguerita|calabresa|toscana|pepperoni|frango|camarao|quatro queijos)/.test(haystack) && /pizza/.test(itemText)) return 'Sabores';
  if (/(frango|camarao|lombinho|pepperoni|presunto|carne|file|bacon|costela|linguica|proteina)/.test(haystack) && /(snack|sanduiche|sanduba|burger|hamburguer|beirute|salada|marmita|prato)/.test(itemText)) return 'Escolha a proteina';
  if (/(queijo|mussarela|cheddar|coalho|prato|gorgonzola|requeijao|cream cheese|catupiry)/.test(haystack)) return 'Escolha o queijo';
  if (/(molho|maionese|ketchup|barbecue|mostarda|rose|alho|picante|pesto)/.test(haystack)) return 'Escolha o molho';
  if (/(alface|tomate|cebola|rucula|milho|picles|vinagrete|salada)/.test(haystack)) return 'Escolha a salada';
  if (/(coca|guarana|sprite|fanta|refrigerante|suco|agua|bebida)/.test(haystack)) return 'Escolha a bebida';
  if (/(adicional|extra|add|acrescimo)/.test(haystack)) return 'Adicionais';
  return original;
}

function normalizeOptionGroupNames(options = [], item = {}) {
  const byGroup = new Map();
  for (const option of options) {
    const key = clean(option.group_name || 'Opcoes');
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key).push(option);
  }
  const betterNames = new Map();
  for (const [groupName, groupOptions] of byGroup.entries()) {
    betterNames.set(groupName, inferBetterOptionGroupName(groupName, groupOptions, item));
  }
  return options.map(option => ({
    ...option,
    group_name: optionLooksLikeComboUpsell(option) && Number(option.min_quantity || 0) <= 0
      ? 'Transforme em combo'
      : betterNames.get(clean(option.group_name || 'Opcoes')) || option.group_name
  }));
}

function summarizeOptionGroup(options, groupName, max = 6) {
  const items = options.filter(option => clean(option.group_name) === groupName);
  if (!items.length) return '';
  const sample = items.slice(0, max).map(option => {
    const price = finite(option.price);
    return `${clean(option.name)}${price != null && !isFakeOrTokenPrice(price) ? ` (${money(price)})` : ''}`;
  }).join(', ');
  const suffix = items.length > max ? ` e mais ${items.length - max}` : '';
  return `${groupName}: ${sample}${suffix}`;
}

function comboRuleFromText(value) {
  const text = clean(value);
  const promo = text.match(/pague\s*(\d+)\s*(?:e|,)?\s*leve\s*(\d+)/i);
  if (!promo) return null;
  return {
    summary: `Pague ${promo[1]}, leve ${promo[2]}`,
    paid_quantity: Number(promo[1]),
    received_quantity: Number(promo[2])
  };
}

function splitComboFixedPieces(item) {
  const name = clean(item.name);
  const description = clean(item.description);
  const text = `${name} ${description}`;
  const sourceText = /[+]/.test(name) ? name : (/[+]/.test(description) ? description : description);
  const normalized = normalizeKeywordText(text);
  if (!/[+]|combo|pague|leve/i.test(text) && !/(duas|dois|2)\s+pizzas/.test(normalized)) return [];
  if (!/[+]/.test(sourceText) && /(duas|dois|2)\s+pizzas/.test(normalized)) return ['Duas Pizzas Grandes'];
  return sourceText
    .split(/\s+\+\s+|\s*\+\s*/g)
    .map(piece => clean(piece)
      .replace(/\b(combo|promocao|promo[cç][aã]o|oferta)\b/ig, '')
      .replace(/\bpor\s+r?\$?\s*[\d.,]+$/i, '')
      .trim())
    .map(piece => /^refri$/i.test(piece) ? 'Refrigerante' : piece)
    .filter(piece => piece.length >= 3 && !/^\d+[,\.]?\d*$/.test(piece))
    .slice(0, 8);
}

function buildComboComponentsDraft(item, kind, choiceOptions, addonOptions) {
  if (kind !== 'combo_builder') return [];
  const components = [];
  const fixedPieces = splitComboFixedPieces(item);
  const groupedChoiceOptions = new Map();
  const groupedAddonOptions = new Map();

  for (const option of choiceOptions || []) {
    const key = clean(option.group_name) || 'Escolhas do combo';
    if (!groupedChoiceOptions.has(key)) groupedChoiceOptions.set(key, []);
    groupedChoiceOptions.get(key).push(option);
  }
  for (const option of addonOptions || []) {
    const key = clean(option.group_name) || 'Adicionais do combo';
    if (!groupedAddonOptions.has(key)) groupedAddonOptions.set(key, []);
    groupedAddonOptions.get(key).push(option);
  }

  if (fixedPieces.length) {
    components.push({
      type: 'fixed_item',
      name: 'Itens inclusos',
      min_quantity: 0,
      max_quantity: null,
      is_required: false,
      price_behavior: 'included',
      items: fixedPieces.map((name, orderIndex) => ({
        name,
        price: null,
        price_delta: null,
        price_behavior: 'included',
        is_searchable_variant: true,
        order_index: orderIndex
      }))
    });
  }

  return components;

  for (const [groupName, options] of groupedChoiceOptions.entries()) {
    components.push({
      type: 'choice_group',
      name: groupName,
      min_quantity: 1,
      max_quantity: /escolha\s*(\d+)/i.test(groupName) ? Number(groupName.match(/escolha\s*(\d+)/i)[1]) : 1,
      is_required: true,
      price_behavior: 'included',
      items: options.slice(0, 40).map((option, orderIndex) => ({
        name: clean(option.name),
        description: clean(option.description) || null,
        price: finite(option.price),
        price_delta: null,
        price_behavior: 'included',
        is_searchable_variant: true,
        search_label: clean(option.search_label) || null,
        search_aliases: clean(option.search_aliases) || null,
        order_index: orderIndex
      }))
    });
  }

  for (const [groupName, options] of groupedAddonOptions.entries()) {
    components.push({
      type: 'addon_group',
      name: groupName,
      min_quantity: 0,
      max_quantity: null,
      is_required: false,
      price_behavior: 'price_delta',
      items: options.slice(0, 40).map((option, orderIndex) => ({
        name: clean(option.name),
        description: clean(option.description) || null,
        price: null,
        price_delta: finite(option.price),
        price_behavior: 'price_delta',
        is_searchable_variant: false,
        order_index: orderIndex
      }))
    });
  }

  return components;
}

function buildCommercialPresentation(item, categoryName) {
  const baseDescription = clean(item.description);
  const options = item.options || [];
  const name = clean(item.name).toLowerCase();
  const category = clean(categoryName).toLowerCase();
  const haystack = `${category} ${name}`;
  const choiceOptions = options.filter(optionLooksLikeChoice);
  const addonOptions = options.filter(optionLooksLikeAddon).filter(option => finite(option.price) != null && !isFakeOrTokenPrice(option.price));
  const choicePrices = choiceOptions.map(option => finite(option.price)).filter(value => value != null && !isFakeOrTokenPrice(value));
  const quarterFlavorPrices = choiceOptions
    .filter(option => /\b1\/4\b/.test(normalizeKeywordText(option.name)) && /sabor/.test(normalizeKeywordText(option.group_name)))
    .map(option => finite(option.price))
    .filter(value => value != null && !isFakeOrTokenPrice(value));
  const mainChoicePrices = choiceOptions
    .filter(option => !optionLooksLikeSecondaryChoice(option))
    .map(option => finite(option.price))
    .filter(value => value != null && !isFakeOrTokenPrice(value));
  const primarySizeChoicePrices = options
    .filter(option => {
      if (isDisposableOption(option) || optionLooksLikeAddon(option) || optionLooksLikeSecondaryChoice(option)) return false;
      const text = normalizeKeywordText(`${option.group_name || ''} ${option.name || ''}`);
      return /tamanho|pessoas|p\s*\/\s*\d|serve|porcao|porcoes/.test(text);
    })
    .map(option => finite(option.price))
    .filter(value => value != null && !isFakeOrTokenPrice(value));
  const allRealOptionPrices = options
    .map(option => finite(option.price))
    .filter(value => value != null && !isFakeOrTokenPrice(value));
  const directPrice = finite(item.price);
  const directPriceIsPlaceholder = looksLikePlaceholderBasePrice(directPrice, options);
  const explicitCombo = /combo|pague\s*\d+|leve\s*\d+|duas\s+pizzas|pizza\s+individual\s*\+|pizza\s+grande.*\+|\+\s*(batata|refri|refrigerante|coca|guaran[aá]|suco)/i.test(`${haystack} ${clean(item.description)}`);
  const buildYourOwnSingleProduct = looksLikeBuildYourOwnSingleProduct(item, categoryName);
  const quarterPizzaBuilder = /pizza/.test(haystack) && quarterFlavorPrices.length >= 4;
  let kind = directPrice != null && !isFakeOrTokenPrice(directPrice) && !directPriceIsPlaceholder ? 'simple_item' : 'from_price_item';
  if (quarterPizzaBuilder) kind = 'configurable_item';
  else if (buildYourOwnSingleProduct) kind = 'configurable_item';
  else if (/meio\s*a\s*meio|1\/2/.test(haystack)) kind = 'half_half_pizza';
  else if (explicitCombo) kind = 'combo_builder';
  else if (/combo|pague|leve/.test(haystack) && choiceOptions.length >= 2) kind = 'combo_builder';
  else if (/marmita|pratos executivos|salada/.test(haystack) && choiceOptions.length >= 2) kind = 'configurable_item';
  else if (choiceOptions.length >= 4 && item.price_type !== 'fixed') kind = 'configurable_item';
  else if (addonOptions.length && directPrice != null) kind = 'simple_with_addons';

  let displayPrice = directPrice != null && !isFakeOrTokenPrice(directPrice) && !directPriceIsPlaceholder ? directPrice : null;
  const hasReliableDirectPrice = directPrice != null && !isFakeOrTokenPrice(directPrice) && !directPriceIsPlaceholder;
  const needsOptionDerivedDisplayPrice = !hasReliableDirectPrice;
  if (needsOptionDerivedDisplayPrice && quarterPizzaBuilder && quarterFlavorPrices.length) {
    displayPrice = Math.min(...quarterFlavorPrices) * 4;
  } else if ((kind !== 'simple_item' && kind !== 'simple_with_addons') && needsOptionDerivedDisplayPrice && (primarySizeChoicePrices.length || mainChoicePrices.length || choicePrices.length)) {
    displayPrice = Math.min(...(primarySizeChoicePrices.length ? primarySizeChoicePrices : (mainChoicePrices.length ? mainChoicePrices : choicePrices)));
  }
  if ((displayPrice == null || isFakeOrTokenPrice(displayPrice)) && allRealOptionPrices.length) {
    displayPrice = Math.min(...allRealOptionPrices);
  }
  if (
    !/pizza/.test(haystack) &&
    /prote[ií]na|carne/.test(haystack) &&
    allRealOptionPrices.some(value => value >= 5) &&
    !primarySizeChoicePrices.length &&
    !mainChoicePrices.length &&
    (directPrice == null || isFakeOrTokenPrice(directPrice))
  ) {
    displayPrice = Math.min(...allRealOptionPrices.filter(value => value >= 5));
  }
  if (displayPrice == null || isFakeOrTokenPrice(displayPrice)) displayPrice = 0;

  const descriptionParts = [];
  if (baseDescription) descriptionParts.push(baseDescription);
  if (kind === 'half_half_pizza') descriptionParts.push(`Meio a meio: escolha sabores. A partir de ${money(displayPrice)}; valor final conforme sabores.`);
  else if (kind === 'combo_builder') descriptionParts.push(`Item montável. A partir de ${money(displayPrice)}; valor final conforme escolhas.`);
  else if (kind === 'configurable_item' || kind === 'from_price_item') descriptionParts.push(`A partir de ${money(displayPrice)}. Opções/variações disponíveis.`);
  else if (kind === 'simple_with_addons') descriptionParts.push('Adicionais disponíveis.');

  for (const group of [...new Set(choiceOptions.map(option => clean(option.group_name)).filter(Boolean))].slice(0, 3)) {
    const summary = summarizeOptionGroup(choiceOptions, group, 5);
    if (summary) descriptionParts.push(summary);
  }
  for (const group of [...new Set(addonOptions.map(option => clean(option.group_name)).filter(Boolean))].slice(0, 2)) {
    const summary = summarizeOptionGroup(addonOptions, group, 5);
    if (summary) descriptionParts.push(summary);
  }

  return {
    commercial_kind: kind,
    display_price: Number(displayPrice.toFixed(2)),
    // Nunca inventar texto publicavel: a descricao exibida deve ser somente literal da fonte.
    display_description: baseDescription.slice(0, 900),
    combo_components: buildComboComponentsDraft(item, kind, choiceOptions, addonOptions),
    combo_rules: comboRuleFromText(`${item.name} ${item.description}`)
  };
}

function normalizeKeywordText(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function categoryLooksLikeStandaloneAddons(category) {
  const categoryName = normalizeKeywordText(category?.name);
  if (!/\b(adicionais|acrescimos|extras|complementos|incrementos|molhos)\b/.test(categoryName)) return false;
  const items = (category?.items || []).filter(Boolean);
  if (items.length < 3) return false;
  const addonLike = items.filter(item => {
    const text = normalizeKeywordText(`${item.name} ${item.description}`);
    const price = finite(item.display_price ?? item.price ?? item.price_min);
    const hasAddonTerm = /\b(ovo|bacon|queijo|cheddar|catupiry|calabresa|cebola|salada|picles|geleia|maionese|molho|barbecue|cream cheese|adicional)\b/.test(text);
    const looksStandalone = /\b(coxinha|pastel|porcao|porcoes|batata|nuggets|camarao|suco|refrigerante|agua|bebida|sobremesa|milkshake|acai|petisco)\b/.test(text);
    return hasAddonTerm && !looksStandalone && price != null && price > 0 && price < 10 && !(item.options || []).length;
  }).length;
  return addonLike >= Math.max(3, Math.ceil(items.length * 0.5));
}

function isInstructionalConfigItemName(value) {
  const key = normalizeKeywordText(value);
  return /^(?:click|clique)\s+aqui\b/.test(key)
    || /^(?:click|clique)\s+aqui.*(?:escolha|monte|selecione)/.test(key)
    || /^escolha\s+(?:ate\s+)?\d+\s+sabores?$/.test(key)
    || /^selecione\s+(?:ate\s+)?\d+\s+sabores?$/.test(key)
    || /^monte\s+sua\s+pizza$/.test(key);
}

function cleanOperationalSuffix(value) {
  return clean(value)
    .replace(/\s*\/\s*(viagem|delivery)\b\.?\s*$/i, '')
    .replace(/\s+\b(viagem|delivery)\b\.?\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanMenuItemName(value) {
  return cleanOperationalSuffix(value);
}

function cleanMenuCategoryName(value) {
  return cleanOperationalSuffix(value);
}

function canonicalVisualCategoryName(cleaned, normalized) {
  if (/^bebidas?$/.test(normalized)) return 'Bebidas';
  if (/^refrigerantes?$/.test(normalized)) return 'Refrigerantes';
  if (/^outras bebidas$/.test(normalized)) return 'Outras Bebidas';
  if (/^sobremesas?$/.test(normalized)) return 'Sobremesas';
  if (/^sucos?$/.test(normalized)) return 'Sucos';
  if (/^bebidas diversas$/.test(normalized)) return 'Bebidas diversas';
  if (/^salgados? e doces?$/.test(normalized)) return 'Salgados e Doces';
  if (/^fritas?$/.test(normalized)) return 'FRITAS';
  if (/^almoco$/.test(normalized)) return 'Almoço';
  if (/^jantar$/.test(normalized)) return 'Jantar';
  if (/^petiscos?$/.test(normalized)) return 'Petiscos';
  if (/^(pocoes|porcoes) extras?$/.test(normalized)) return 'Porções Extras';
  return cleaned;
}

function buildSearchKeywords(item, categoryName) {
  const words = new Set();
  const push = value => {
    const normalized = normalizeKeywordText(value);
    if (!normalized) return;
    words.add(normalized);
    normalized.split(/[^a-z0-9]+/i).filter(part => part.length >= 3).forEach(part => words.add(part));
  };
  push(item.name);
  push(item.description);
  push(item.display_description);
  push(categoryName);
  push(item.commercial_kind);
  push(JSON.stringify(item.combo_components || []));
  push(JSON.stringify(item.combo_rules || {}));
  for (const option of item.options || []) {
    push(option.group_name);
    push(option.name);
  }
  return [...words].slice(0, 120).join(' ');
}

function isGenericPizzaBase(item) {
  const name = normalizeKeywordText(item.name);
  return (
    /^pizzas?$/.test(name)
    || /^(grande|pequena|media|broto|familia|individual|mini)$/.test(name)
    || /^pizzas?\s*(\(|-)?\s*(p|m|g|media|grande|pequena|broto|\d+)\s*(\)|fatias|$)/.test(name)
    || /pizza com \d+\s+sabores?/.test(name)
    || name.includes('monte sua pizza')
  );
}

function stripAddonPrefix(name) {
  return clean(name).replace(/^(adicional|add|extra)\s+/i, '').trim();
}

function inferOptionSemantic(category, item, option) {
  const group = normalizeKeywordText(option.group_name);
  const optionName = normalizeKeywordText(option.name);
  const itemName = normalizeKeywordText(item.name);
  const categoryName = normalizeKeywordText(category.name);
  const basePrice = finite(item.display_price ?? item.price ?? item.price_min);
  const optionPrice = finite(option.price_delta ?? option.price);
  const isOperationalOption = isDisposableOption(option);
  const isComboUpsell = optionLooksLikeComboUpsell(option);
  const isOptional = Number(option.min_quantity || 0) === 0;
  const dessertAddonContext = /(acai|sobremesa|sorvete|creme|copo)/.test(`${categoryName} ${itemName}`)
    && /(fruta|calda|cobertura|topping|adicional|extra|granola|amendoim|pacoca|chocolate|confete|leite|banana|morango|kiwi|mel|jujuba|kit kat|ovomaltine|prestigio)/.test(`${group} ${optionName}`);
  const isOptionalPaidDessertAddon = !isOperationalOption && isOptional && optionPrice != null && dessertAddonContext;
  const isLowValueOptionalDelta = isOptional && basePrice != null && optionPrice != null && optionPrice > 0 && optionPrice < basePrice * 0.45;
  const isAddon = !isOperationalOption && !isComboUpsell && (/adicional|adicione|adiciona|adicionar|add|acrescimo|extra|borda|azeitona|molho|leite|trocar|substituir|substituicao|turbin/.test(`${group} ${optionName}`) || isOptionalPaidDessertAddon || isLowValueOptionalDelta);
  const isPizzaContext = /pizza/.test(`${categoryName} ${itemName} ${group} ${optionName}`);
  const genericPizza = isGenericPizzaBase(item);
  const isChoiceGroup = !/adicione|adiciona|adicionar|add|adicional|extra/.test(group) && /sabor|pizza|calzone|omelete|escolha|prato|proteina|proteina|salada|marmita|beirute|suco|refrigerante|bebida|combo/.test(group);
  const isNotSearchable = isOperationalOption || /observa/.test(`${group} ${optionName}`) || (/embalagem/.test(`${group} ${optionName}`) && (optionPrice == null || optionPrice === 0));

  let semanticType = 'required_choice';
  let priceBehavior = optionPrice && basePrice && optionPrice < basePrice && isAddon ? 'price_delta' : 'absolute_price';
  let searchable = Boolean(isChoiceGroup && !isNotSearchable && optionPrice != null);
  let searchLabel = option.name;
  let aliases = `${option.name} ${item.name} ${category.name}`;
  let confidence = 0.78;
  let reason = 'heuristic_choice_group';

  if (isNotSearchable) {
    semanticType = 'not_searchable';
    priceBehavior = 'unknown';
    searchable = false;
    confidence = 0.92;
    reason = 'non_commercial_modifier';
  } else if (isComboUpsell) {
    semanticType = 'upsell_group';
    priceBehavior = 'price_delta';
    searchable = false;
    confidence = 0.93;
    reason = 'optional_combo_upgrade';
  } else if (optionPrice == null || optionPrice === 0) {
    semanticType = /combo|suco|refrigerante|bebida/.test(group) ? 'combo_component' : 'required_choice';
    priceBehavior = 'included';
    searchable = false;
    confidence = 0.82;
    reason = 'included_zero_or_unpriced_choice';
  } else if (isAddon && genericPizza && isPizzaContext) {
    semanticType = 'flavor';
    priceBehavior = 'price_delta';
    searchable = true;
    const flavor = stripAddonPrefix(option.name);
    searchLabel = /^pizza/i.test(flavor) ? flavor : `Pizza ${flavor}`;
    aliases = `${searchLabel} ${flavor} ${item.name} ${category.name}`;
    confidence = 0.88;
    reason = 'generic_pizza_base_plus_addon_flavor';
  } else if (isAddon) {
    semanticType = 'addon';
    priceBehavior = 'price_delta';
    searchable = false;
    confidence = 0.88;
    reason = 'addon_modifier';
  } else if (isPizzaContext && isChoiceGroup) {
    semanticType = 'flavor';
    priceBehavior = basePrice != null && optionPrice != null && optionPrice < basePrice * 0.45 ? 'price_delta' : 'absolute_price';
    searchable = optionPrice != null;
    searchLabel = option.name;
    aliases = `${option.name} pizza ${item.name} ${category.name}`;
    confidence = 0.84;
    reason = 'pizza_flavor_choice';
  } else if (/combo|prato|marmita|salada|beirute|proteina/.test(group)) {
    semanticType = /combo/.test(group) ? 'combo_component' : 'required_choice';
    priceBehavior = basePrice != null && optionPrice != null && optionPrice < basePrice * 0.45 ? 'price_delta' : 'absolute_price';
    searchable = optionPrice != null && !/complemento|acompanhamento/.test(group);
    confidence = 0.78;
    reason = 'meal_choice_component';
  } else if (/(suco|refrigerante|bebida|agua|aguas|h2o)/.test(itemName) && /(escolha|suco|refrigerante|bebida|agua|refri)/.test(group)) {
    semanticType = 'required_choice';
    priceBehavior = 'absolute_price';
    searchable = optionPrice != null;
    searchLabel = option.name;
    aliases = `${option.name} ${item.name} ${category.name}`;
    confidence = 0.86;
    reason = 'beverage_variant_absolute_price';
  } else if (/suco|refrigerante|bebida/.test(group)) {
    semanticType = 'combo_component';
    priceBehavior = basePrice != null ? 'price_delta' : 'absolute_price';
    searchable = false;
    confidence = 0.82;
    reason = 'drink_component_not_primary_search';
  }

  return {
    semantic_type: semanticType,
    price_behavior: priceBehavior,
    search_label: searchable ? searchLabel : null,
    search_aliases: searchable ? aliases : null,
    is_searchable_variant: searchable,
    ai_confidence: confidence,
    ai_reason: reason
  };
}

function applyDeterministicOptionSemantics(categories) {
  for (const category of categories) {
    for (const item of category.items || []) {
      for (const option of item.options || []) {
        Object.assign(option, inferOptionSemantic(category, item, option));
      }
    }
  }
}

function normalizeAbsoluteFlavorOptionDeltas(categories) {
  let changed = 0;
  for (const category of categories || []) {
    for (const item of category.items || []) {
      const categoryName = normalizeKeywordText(category.name);
      const itemName = normalizeKeywordText(item.name);
      const byGroup = new Map();
      for (const option of item.options || []) {
        const key = clean(option.group_name || 'Opcoes');
        if (!byGroup.has(key)) byGroup.set(key, []);
        byGroup.get(key).push(option);
      }

      for (const [groupName, options] of byGroup.entries()) {
        const groupKey = normalizeKeywordText(groupName);
        const isFlavorGroup = /sabor|sabores|escolha.*sabor/.test(groupKey)
          || options.some(option => option.semantic_type === 'flavor');
        const optionText = options.slice(0, 20).map(option => normalizeKeywordText(option.name)).join(' ');
        const isPizzaContext = /pizza/.test(`${categoryName} ${itemName} ${groupKey} ${optionText}`) || isGenericPizzaBase(item);
        if (!isFlavorGroup || !isPizzaContext) continue;

        const prices = options
          .map(option => roundMoneyNumber(option.price))
          .filter(value => value != null && value > 0)
          .sort((left, right) => left - right);
        if (!prices.length) continue;

        const explicitBase = roundMoneyNumber(item.display_price ?? item.price ?? item.price_min);
        if (explicitBase == null && prices[0] < 8) continue;
        const reference = explicitBase != null && explicitBase > 0 ? explicitBase : prices[0];
        if (reference == null || reference <= 0) continue;

        const absoluteLikeCount = prices.filter(value => value >= reference * 0.8 && value <= reference * 3).length;
        if (absoluteLikeCount < Math.ceil(prices.length * 0.55)) continue;

        for (const option of options) {
          const absolutePrice = roundMoneyNumber(option.price);
          if (absolutePrice == null || absolutePrice <= 0) continue;
          const delta = roundMoneyNumber(Math.max(0, absolutePrice - reference));
          option.price_delta = delta;
          option.price = null;
          option.price_behavior = 'price_delta';
          option.semantic_type = 'flavor';
          option.is_searchable_variant = true;
          option.search_label = option.search_label || (/^pizza/i.test(option.name) ? option.name : `Pizza ${stripAddonPrefix(option.name)}`);
          option.search_aliases = option.search_aliases || `${option.search_label} ${option.name} ${item.name} ${category.name}`;
          option.raw_data = {
            ...(option.raw_data || {}),
            absolute_price: absolutePrice,
            delta_reference_price: reference,
            normalized_price_behavior: 'absolute_flavor_price_to_delta'
          };
          changed += 1;
        }
      }
    }
  }
  return changed;
}

function normalizeOptionPriceStorage(categories) {
  let changed = 0;
  for (const category of categories || []) {
    for (const item of category.items || []) {
      for (const option of item.options || []) {
        const behavior = clean(option.price_behavior).toLowerCase();
        const price = roundMoneyNumber(option.price);
        const delta = roundMoneyNumber(option.price_delta);

        if (behavior === 'price_delta') {
          const normalizedDelta = delta != null ? delta : price;
          if (normalizedDelta == null || normalizedDelta <= 0) {
            if (option.price_behavior !== 'included' || option.price !== null || option.price_delta !== null) changed += 1;
            option.price_behavior = 'included';
            option.price = null;
            option.price_delta = null;
          } else {
            if (option.price !== null || option.price_delta !== normalizedDelta) changed += 1;
            option.price = null;
            option.price_delta = normalizedDelta;
          }
        } else if (behavior === 'included') {
          if (price != null || (delta != null && delta !== 0)) changed += 1;
          option.price = null;
          option.price_delta = null;
        } else if (behavior === 'absolute_price') {
          const absolutePrice = price != null ? price : delta;
          if (option.price !== absolutePrice || option.price_delta !== null) changed += 1;
          option.price = absolutePrice;
          option.price_delta = null;
        }
      }
    }
  }
  return changed;
}

function applyOptionSemanticGuards(categories) {
  let changed = 0;
  const addonGroupRe = /\b(borda|bordas|adicional|adicionais|acrescimo|acrescimos|extra|extras|molho|molhos|recheio|recheios|cobertura|coberturas)\b/i;
  for (const category of categories || []) {
    for (const item of category.items || []) {
      for (const option of item.options || []) {
        const groupName = clean(option.group_name || '');
        const min = finite(option.min_quantity);
        const isOptional = min == null || min <= 0;
        if (!addonGroupRe.test(groupName) || !isOptional) continue;
        const price = roundMoneyNumber(option.price_delta ?? option.price);
        if (option.semantic_type !== 'addon') changed += 1;
        if (option.is_searchable_variant || option.search_label || option.search_aliases) changed += 1;
        option.semantic_type = 'addon';
        option.price_behavior = price != null && price > 0 ? 'price_delta' : 'included';
        option.price = null;
        option.price_delta = price != null && price > 0 ? price : null;
        option.is_searchable_variant = false;
        option.search_label = null;
        option.search_aliases = null;
      }
    }
  }
  return changed;
}

function representativeOptionGroups(categories) {
  const groups = [];
  for (const category of categories) {
    for (const item of category.items || []) {
      const byGroup = new Map();
      for (const option of item.options || []) {
        const key = `${category.name}::${item.name}::${option.group_name}`;
        if (!byGroup.has(key)) byGroup.set(key, []);
        byGroup.get(key).push(option);
      }
      for (const [key, options] of byGroup.entries()) {
        groups.push({
          key,
          category: category.name,
          item: item.name,
          item_kind: item.commercial_kind,
          base_price: item.display_price ?? item.price ?? item.price_min,
          group_name: options[0]?.group_name || 'Opções',
          samples: options.slice(0, 12).map(option => ({
            name: option.name,
            price: option.price,
            current_semantic_type: option.semantic_type,
            current_price_behavior: option.price_behavior,
            current_searchable: option.is_searchable_variant
          }))
        });
      }
    }
  }
  return groups;
}

async function classifyOptionGroupsWithAI(categories) {
  const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey || hasFlag('--no-ai-option-semantics') || process.env.MENU_OPTION_AI_DISABLED === '1') {
    return { used: false, reason: apiKey ? 'disabled' : 'missing_key' };
  }
  const groups = representativeOptionGroups(categories).filter(group => group.samples.length);
  if (!groups.length) return { used: false, reason: 'no_groups' };

  let OpenAI;
  try {
    ({ OpenAI } = require('openai'));
  } catch (error) {
    return { used: false, reason: `openai_unavailable:${error.message}` };
  }

  const client = new OpenAI({
    apiKey,
    timeout: Number(process.env.MENU_OPTION_SEMANTICS_TIMEOUT_MS || 15000),
    maxRetries: Number(process.env.MENU_OPTION_SEMANTICS_RETRIES || 1)
  });
  const model = process.env.MENU_OPTION_SEMANTICS_MODEL || process.env.VITE_AI_MODEL || 'gpt-4o-mini';
  const decisions = new Map();
  const batches = [];
  for (let i = 0; i < groups.length; i += 35) batches.push(groups.slice(i, i + 35));

  for (const batch of batches) {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'Você classifica grupos de opções de cardápios brasileiros para busca e preço.',
            'Retorne JSON estrito: {"groups":[{"key":"...","semantic_type":"flavor|addon|required_choice|included_choice|combo_component|not_searchable","price_behavior":"absolute_price|price_delta|included|unknown","is_searchable_variant":true|false,"confidence":0.0,"reason":"curto"}]}.',
            'flavor = sabor/variação principal pesquisável. addon = extra opcional. price_delta = soma ao preço base. absolute_price = preço final da opção. included = incluso no preço base.',
            'Se for adicional de sabor em produto genérico tipo Pizza P/Pizza G/Monte sua pizza, classifique como flavor + price_delta + searchable.',
            'Se for adicional em item específico tipo Pizza 4 Queijos, classifique como addon + price_delta + not searchable.',
            'Embalagem, observação, azeitona, molho, leite e borda normalmente não são pesquisáveis.'
          ].join('\n')
        },
        { role: 'user', content: JSON.stringify({ groups: batch }) }
      ]
    });
    const text = completion.choices?.[0]?.message?.content || '{}';
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = {}; }
    for (const decision of parsed.groups || []) {
      if (decision && decision.key) decisions.set(decision.key, decision);
    }
  }

  for (const category of categories) {
    for (const item of category.items || []) {
      for (const option of item.options || []) {
        const key = `${category.name}::${item.name}::${option.group_name}`;
        const decision = decisions.get(key);
        if (!decision) continue;
        const semantic = clean(decision.semantic_type);
        const behavior = clean(decision.price_behavior);
        if (semantic) option.semantic_type = semantic;
        if (behavior) option.price_behavior = behavior;
        option.is_searchable_variant = Boolean(decision.is_searchable_variant);
        option.ai_confidence = finite(decision.confidence) ?? option.ai_confidence;
        option.ai_reason = clean(decision.reason) || option.ai_reason;
        if (option.is_searchable_variant && !option.search_label) {
          if (semantic === 'flavor' && behavior === 'price_delta' && isGenericPizzaBase(item)) {
            const flavor = stripAddonPrefix(option.name);
            option.search_label = /^pizza/i.test(flavor) ? flavor : `Pizza ${flavor}`;
          } else {
            option.search_label = option.name;
          }
        }
        if (option.is_searchable_variant && !option.search_aliases) {
          option.search_aliases = `${option.search_label || option.name} ${option.name} ${item.name} ${category.name}`;
        }
      }
    }
  }
  return { used: true, groups: decisions.size, model };
}

async function enrichOptionSemantics(categories) {
  applyDeterministicOptionSemantics(categories);
  let guardFixes = applyOptionSemanticGuards(categories);
  let deltaFixes = normalizeAbsoluteFlavorOptionDeltas(categories);
  let storageFixes = normalizeOptionPriceStorage(categories);
  try {
    const ai = await classifyOptionGroupsWithAI(categories);
    guardFixes += applyOptionSemanticGuards(categories);
    deltaFixes += normalizeAbsoluteFlavorOptionDeltas(categories);
    storageFixes += normalizeOptionPriceStorage(categories);
    if (ai.used) console.log(`[Menu V2] IA classificou semântica de opções: ${ai.groups} grupos via ${ai.model}.`);
    else console.log(`[Menu V2] Semântica de opções via heurística (${ai.reason}).`);
    if (guardFixes) console.log(`[Menu V2] Protegeu ${guardFixes} opcoes de borda/adicionais contra classificacao como sabor principal.`);
    if (deltaFixes) console.log(`[Menu V2] Normalizou ${deltaFixes} precos absolutos de sabores como delta sobre a base.`);
    if (storageFixes) console.log(`[Menu V2] Normalizou ${storageFixes} campos de preco de opcoes para evitar price cheio em price_delta.`);
    return { ...ai, deltaFixes, storageFixes, guardFixes };
  } catch (error) {
    console.warn(`[Menu V2] IA de semântica falhou; mantendo heurística: ${error.message}`);
    guardFixes += applyOptionSemanticGuards(categories);
    deltaFixes += normalizeAbsoluteFlavorOptionDeltas(categories);
    if (guardFixes) console.log(`[Menu V2] Protegeu ${guardFixes} opcoes de borda/adicionais contra classificacao como sabor principal.`);
    if (deltaFixes) console.log(`[Menu V2] Normalizou ${deltaFixes} precos absolutos de sabores como delta sobre a base.`);
    storageFixes += normalizeOptionPriceStorage(categories);
    if (storageFixes) console.log(`[Menu V2] Normalizou ${storageFixes} campos de preco de opcoes para evitar price cheio em price_delta.`);
    return { used: false, reason: error.message, deltaFixes, storageFixes, guardFixes };
  }
}

function normalizeOption(option, index) {
  return {
    external_id: clean(option.external_id || option.id) || null,
    group_name: clean(option.group_name || option.groupName || 'Opções'),
    name: clean(option.name),
    description: clean(option.description) || null,
    price: finite(option.price),
    price_delta: finite(option.price_delta),
    min_quantity: Number(option.min_quantity || 0),
    max_quantity: finite(option.max_quantity),
    is_required: Boolean(option.is_required),
    is_available: option.is_available !== false && !isUnavailableSource(option),
    order_index: Number(option.order_index ?? index),
    raw_data: option.raw_data || option
  };
}

function isTrivialSingleVariant(option) {
  const group = normalizeKeywordText(option.group_name);
  const name = normalizeKeywordText(option.name);
  return /variac|variant|opcoes/.test(group) && /^(unico|unica|padrao|default)$/.test(name);
}

function parseEmbeddedDescriptionOptions(rawDescription) {
  const original = clean(rawDescription);
  if (!original || !original.startsWith('{') || !/"options"|\"opcoes\"|\"opções\"/i.test(original)) {
    return { description: original, options: [] };
  }
  try {
    const parsed = JSON.parse(original);
    const groups = Array.isArray(parsed.options)
      ? parsed.options
      : Array.isArray(parsed.opcoes)
        ? parsed.opcoes
        : Array.isArray(parsed['opções'])
          ? parsed['opções']
          : [];
    const options = [];
    for (const group of groups) {
      const groupName = clean(group.title || group.name || group.nome || group.group_name || 'Opções');
      const groupItems = Array.isArray(group.itens)
        ? group.itens
        : Array.isArray(group.items)
          ? group.items
          : Array.isArray(group.options)
            ? group.options
            : [];
      groupItems.forEach((option, index) => {
        const optionName = clean(option.name || option.nome || option.title || option.label);
        if (!optionName) return;
        options.push({
          external_id: clean(option.external_id || option.id) || null,
          group_name: groupName,
          name: optionName,
          description: clean(option.description || option.descricao) || null,
          price: finite(option.price ?? option.preco ?? option.value),
          price_delta: finite(option.price_delta ?? option.delta),
          min_quantity: Number(option.min_quantity ?? option.min ?? 0),
          max_quantity: finite(option.max_quantity ?? option.max),
          is_required: Boolean(group.required || group.is_required || option.is_required),
          is_available: option.is_available !== false && option.available !== false && !isUnavailableSource(option),
          order_index: Number(option.order_index ?? index),
          raw_data: option
        });
      });
    }
    return {
      description: clean(parsed.description || parsed.descricao || parsed.text || ''),
      options
    };
  } catch (_) {
    return { description: original, options: [] };
  }
}

function normalizeItem(item, index, sourceUrl) {
  const embedded = parseEmbeddedDescriptionOptions(item.description || item.descricao || '');
  const rawSourceItem = item?.raw_data?.item || item?.raw_data || item?.item || {};
  const groupedOptions = Array.isArray(item.option_groups)
    ? item.option_groups.flatMap(group => {
      const children = Array.isArray(group.items) ? group.items : Array.isArray(group.options) ? group.options : [];
      return children.map(option => ({
        ...option,
        group_name: option.group_name || group.name || group.group_name,
        min_quantity: option.min_quantity ?? group.min_quantity,
        max_quantity: option.max_quantity ?? group.max_quantity,
        is_required: option.is_required ?? group.is_required
      }));
    })
    : [];
  const rawOptions = [
    ...(Array.isArray(item.options) ? item.options : []),
    ...groupedOptions,
    ...(Array.isArray(item.variants) ? item.variants : []),
    ...embedded.options
  ];
  const normalizedRawOptions = rawOptions.map(normalizeOption);
  const siblingsByGroup = new Map();
  for (const option of normalizedRawOptions) {
    const groupKey = normalizeKeywordText(option.group_name || 'Opcoes');
    if (!siblingsByGroup.has(groupKey)) siblingsByGroup.set(groupKey, []);
    siblingsByGroup.get(groupKey).push(option);
  }
  const seenOptions = new Set();
  const dedupedOptions = normalizedRawOptions
    .filter(option => {
      const groupSiblings = siblingsByGroup.get(normalizeKeywordText(option.group_name || 'Opcoes')) || [];
      if (optionLooksLikeInstructionalComboTitle(option, groupSiblings)) return false;
      if (isDisposableOption(option)) return false;
      if (option.is_available === false) return false;
      if (!option.name || isTrivialSingleVariant(option)) return false;
      const key = `${normalizeKeywordText(option.group_name)}::${normalizeKeywordText(option.name)}::${finite(option.price) ?? ''}`;
      if (seenOptions.has(key)) return false;
      seenOptions.add(key);
      return true;
    });
  const itemIdentityForGroups = {
    name: clean(item.name || item.nome),
    description: embedded.description || clean(item.description || item.descricao) || null
  };
  const normalizedOptions = normalizeOptionGroupNames(dedupedOptions, itemIdentityForGroups);
  const optionsByGroup = new Map();
  for (const option of normalizedOptions) {
    const key = clean(option.group_name || 'Opcoes');
    if (!optionsByGroup.has(key)) optionsByGroup.set(key, []);
    optionsByGroup.get(key).push(option);
  }
  const redundantSingleChoiceGroups = new Set();
  for (const [groupName, groupItems] of optionsByGroup.entries()) {
    if (groupItems.length !== 1) continue;
    const only = groupItems[0];
    const min = Number(only.min_quantity || 0);
    const max = Number(only.max_quantity || 0);
    const optionPrice = finite(only.price ?? only.price_delta);
    if (min === 1 && max === 1 && (optionPrice == null || optionPrice === 0 || isFakeOrTokenPrice(optionPrice))) {
      redundantSingleChoiceGroups.add(groupName);
    }
  }
  const options = normalizedOptions.filter(option => !redundantSingleChoiceGroups.has(clean(option.group_name || 'Opcoes')));
  const optionPrices = options.map(option => option.price).filter(value => value != null);
  const primaryOptionPrices = options
    .filter(optionLooksLikeChoice)
    .map(option => option.price)
    .filter(value => value != null);
  const pricingOptionPrices = primaryOptionPrices.length ? primaryOptionPrices : optionPrices;
  let price = finite(item.price ?? item.preco ?? item.display_price ?? item.price_base ?? rawSourceItem.price ?? rawSourceItem.price_base);
  price = effectiveCardapioWebDirectPrice(item, rawSourceItem, price);
  if (looksLikePlaceholderBasePrice(price, options)) price = null;
  let priceMin = finite(item.price_min);
  let priceMax = finite(item.price_max);
  if (looksLikePlaceholderBasePrice(priceMin, options)) priceMin = null;
  if (priceMin == null && price != null) priceMin = price;
  if (priceMax == null && price != null) priceMax = price;
  if (priceMin == null && pricingOptionPrices.length) priceMin = Math.min(...pricingOptionPrices);
  if (priceMax == null && pricingOptionPrices.length) priceMax = Math.max(...pricingOptionPrices);
  if (price != null) {
    priceMin = price;
    if (priceMax == null || priceMax < price) priceMax = price;
  }
  let priceType = clean(item.price_type);
  if (!priceType) priceType = price != null ? 'fixed' : optionPrices.length ? (priceMin === priceMax ? 'option_only' : 'range') : 'unknown';
  const validTypes = new Set(['fixed', 'starting_at', 'range', 'option_only', 'inherited', 'included', 'free', 'unknown']);
  if (!validTypes.has(priceType)) priceType = 'unknown';
  if (priceType === 'unknown' && pricingOptionPrices.length && priceMin != null) {
    priceType = priceMin === priceMax ? 'option_only' : 'range';
  }
  const needsReview = Boolean(item.needs_review) && priceType === 'unknown';
  return {
    external_id: clean(item.external_id || item.source_external_id || item.id) || null,
    name: cleanMenuItemName(item.name || item.nome),
    description: embedded.description || clean(item.description || item.descricao) || null,
    image_url: item.image_url || item.foto_url || null,
    price,
    price_min: priceMin,
    price_max: priceMax,
    original_price: finite(item.original_price),
    promotional_price: finite(item.promotional_price),
    price_type: priceType,
    price_source: clean(item.price_source) || null,
    source_url: item.source_url || sourceUrl || null,
    raw_data: item.raw_data || item,
    extraction_confidence: finite(item.extraction_confidence) ?? 0.9,
    needs_review: needsReview,
    is_available: item.is_available !== false && !isUnavailableSource(item),
    order_index: Number(item.order_index ?? index),
    options
  };
}

function normalizeCategoryName(name) {
  const cleaned = cleanMenuCategoryName(name);
  const normalized = normalizeKeywordText(cleaned);
  const canonical = canonicalVisualCategoryName(cleaned, normalized);
  if (/(30cm|gigantao|queridinhos|tradicionais|gourmet)/.test(normalized)
    && !/(pizza|bebida|refrigerante|suco|sobremesa|doce|combo|promoc|oferta)/.test(normalized)) {
    return canonical || 'Cardapio';
  }
  if (/(^| )(smash|sr\.?|senhor)?\s*(burguers?|burgers?|hamburgueres?)\b/.test(normalized)) return canonical || 'Sanduiches';
  if (/^(almoco|jantar|petiscos?|pocoes extras?|porcoes extras?|sucos?|bebidas diversas|bebidas|refrigerantes?|outras bebidas|salgados? e doces?|fritas?|sobremesas?)$/.test(normalized)) return canonical || 'Cardapio';
  if (/cheguei|novidade|destaque|oferta|promocao do dia|mais pedidos|queridinhos/.test(normalized)) return 'Pratos Principais';
  if (/bebida|refrigerante|suco|drink|agua|cerveja|vinho/.test(normalized)) return 'Bebidas';
  if (/salgados? e doces?/.test(normalized)) return canonical || 'Salgados e Doces';
  if (/fritas?|batatas? fritas?/.test(normalized)) return canonical || 'FRITAS';
  if (/pastel|pasteis/.test(normalized)) return /doce|doces|chocolate|banana|romeu/.test(normalized) ? 'Sobremesas' : 'Pastéis Salgados';
  if (/pizza/.test(normalized)) return 'Pizzas';
  if (/massa|macarrao|penne|espaguete|fettuccine|talharim|lasanha/.test(normalized)) return 'Massas';
  if (/hamb|sanduiche|sanduba|burger|lanche|snack|hot dog/.test(normalized)) return 'Sanduíches';
  if (/sobremesa|doce|cake|bolo|acai|sorvete|\bcremes?\b/.test(normalized)) return 'Sobremesas';
  if (/combo|promoc|oferta/.test(normalized)) return 'Combos';
  if (/almoco|executivo|prato|principal|refeicao/.test(normalized)) return 'Pratos Principais';
  return canonical || 'Cardapio';
}

function isGenericAggregateCategoryName(name) {
  const normalized = normalizeKeywordText(name);
  return /^(cardapio|menu|geral|todos|todos os itens|catalogo|produtos)$/.test(normalized);
}

function inferBetterCategoryForItem(item, currentCategoryName) {
  const text = normalizeKeywordText(`${item.name || ''} ${item.description || ''}`);
  const currentCategory = normalizeKeywordText(currentCategoryName);
  if (/pizza|calzone|broto/.test(text) || (/\bfatias?\b/.test(text) && /sabor/.test(text))) return 'Pizzas';
  if (/(30cm|gigantao|queridinhos|tradicionais|gourmet)/.test(currentCategory)
    && !/(pizza|bebida|refrigerante|suco|sobremesa|doce|combo|promoc|oferta)/.test(currentCategory)) {
    return normalizeCategoryName(currentCategoryName);
  }
  if (/sobremesa|doce|doces|chocolate|banana|romeu/.test(currentCategory)) return normalizeCategoryName(currentCategoryName);
  if (/(^| )(smash|sr\.?|senhor)?\s*(burguers?|burgers?|hamburgueres?)\b/.test(currentCategory)) return normalizeCategoryName(currentCategoryName);
  if (/almoco|jantar|pocoes extras|porcoes extras|sucos|bebidas diversas|bebidas?|refrigerantes?|outras bebidas|fritas/.test(currentCategory)) return normalizeCategoryName(currentCategoryName);
  if (/salgados? e doces?/.test(currentCategory)) return normalizeCategoryName(currentCategoryName);
  if (/salgado|salgados|salgadinho|salgadinhos/.test(currentCategory)) return normalizeCategoryName(currentCategoryName);
  if (/pastel|pasteis/.test(currentCategory) && !/oferta|promoc|destaque|mais pedidos|dia/.test(currentCategory)) return normalizeCategoryName(currentCategoryName);
  if (/hamb|burger|sanduiche|sanduba|lanche|hot dog/.test(currentCategory)) return normalizeCategoryName(currentCategoryName);
  if (/porc(?:ao|oes)|petisco|refeicao|prato executivo|quentinha/.test(currentCategory)) return normalizeCategoryName(currentCategoryName);
  if (/combo|duas pizzas|pizza individual \+|pizza grande .*\+|\+ coca|\+ refri|refrigerante incluso/.test(text)) {
    return 'Combos';
  }
  if (/\bsuco\b|vitamina|smoothie/.test(text)) return 'Bebidas';
  if (/brownie|bolo|cake|acai|sorvete|pudim|sobremesa|brigadeiro|pacoca|torta|rocambole|doce|\bcremes?\b/.test(text)) return 'Sobremesas';
  if (/pizza|calzone|broto/.test(text) || (/\bfatias?\b/.test(text) && /pizza/.test(text))) return 'Pizzas';
  if (/(^|[^a-z0-9])coca([^a-z0-9]|$)|coca-cola|guarana|sprite|fanta|schweppes|refrigerante|agua|suco|lata|garrafa|pack|cerveja|heineken|brahma|skol|drink/.test(text)) {
    return 'Bebidas';
  }
  if (/penne|macarrao|massa|espaguete|fettuccine|talharim|lasanha/.test(text)) return 'Massas';
  if (/hamburguer|burger|sanduiche|sanduba|snack|hot dog/.test(text)) return 'Sanduíches';
  if (/parmegiana|strogonoff|frango|carne|alcatra|medalhao|medalhao|camarao|salmao|tilapia|galeto|arroz|feijao|grelhado|piamontese|pomodoro/.test(text)) return 'Pratos Principais';
  if (/combo|promoc/.test(text)) return 'Combos';
  return normalizeCategoryName(currentCategoryName);
}

function itemLooksLikeBadAggregateFragment(item) {
  const name = clean(item.name);
  const description = clean(item.description);
  const normalized = normalizeKeywordText(`${name} ${description}`);
  if (!name) return true;
  if (isOperationalServiceMenuItem(item)) return true;
  if (/^(ultimo update:?|último update:?|para o menu|cardapio|cardápio|destaques|almoco|almoço|criancas|crianças|zero lactose)$/i.test(name)) return true;
  if (/pedido min|pedido minimo|cupom|sacola|subtotal|taxa de entrega|buscar no cardapio/.test(normalized)) return true;
  if (name.length > 150 && !description && !(item.options || []).length) return true;
  return false;
}

function isStandaloneUnpricedPlaceholder(item) {
  if ((item.options || []).length) return false;
  const price = finite(item.display_price ?? item.price ?? item.price_min);
  if (item.price_type === 'unknown' && (price == null || price === 0)) return true;
  return false;
}

function sanitizeNormalizedCategories(categories, options = {}) {
  const preserveSourceCategories = options.preserveSourceCategories === true;
  const hasSpecificCategories = (categories || []).some(category => !isGenericAggregateCategoryName(category.name));
  const byCategory = new Map();
  const seen = new Set();

  const pushItem = (categoryName, item) => {
    if (!item || itemLooksLikeBadAggregateFragment(item) || isStandaloneUnpricedPlaceholder(item)) return;
    if (item.is_available === false) return;
    const shouldPreserveCategory = preserveSourceCategories
      && !isGenericAggregateCategoryName(categoryName)
      && !categoryLooksLikeStandaloneAddons({ name: categoryName, items: [item] });
    const targetName = shouldPreserveCategory ? clean(categoryName) : inferBetterCategoryForItem(item, categoryName);
    const priceKey = finite(item.display_price ?? item.price ?? item.price_min);
    const key = `${normalizeKeywordText(targetName)}::${normalizeKeywordText(item.name)}::${priceKey ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (!byCategory.has(targetName)) byCategory.set(targetName, []);
    byCategory.get(targetName).push(item);
  };

  for (const category of categories || []) {
    if (hasSpecificCategories && isGenericAggregateCategoryName(category.name) && (category.items || []).length >= 6) {
      continue;
    }
    if (hasSpecificCategories && categoryLooksLikeStandaloneAddons(category)) {
      continue;
    }
    for (const item of category.items || []) pushItem(category.name, item);
  }

  return [...byCategory.entries()].map(([name, items], index) => ({
    external_id: null,
    name,
    order_index: index,
    items: items.map((item, itemIndex) => ({ ...item, order_index: itemIndex }))
  })).filter(category => category.items.length);
}

function normalizeCategories(categories, sourceUrl, options = {}) {
  const normalized = (categories || []).map((category, categoryIndex) => ({
    external_id: clean(category.external_id || category.id) || null,
    name: clean(category.name || category.nome || category.category_name) || 'Cardápio',
    order_index: Number(category.order_index ?? categoryIndex),
    items: (category.items || category.itens || [])
      .filter(item => !isMenuInterfaceNoiseItem(item))
      .map((item, index) => normalizeItem(item, index, sourceUrl))
      .filter(item => item.name && item.is_available !== false && !isMenuInterfaceNoiseItem(item))
      .map(item => {
      const presentation = buildCommercialPresentation(item, clean(category.name || category.nome || category.category_name));
      return { ...item, ...presentation };
    })
  })).filter(category => category.items.length);
  return sanitizeNormalizedCategories(normalized, options);
}

function readJsonFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(content);
}

function findFullPriceDeltaAnomalies(categories) {
  const anomalies = [];
  for (const category of categories || []) {
    for (const item of category.items || []) {
      const base = finite(item.display_price ?? item.price ?? item.price_min);
      if (base == null || base <= 0) continue;
      const optionsByGroup = new Map();
      for (const option of item.options || []) {
        const key = clean(option.group_name || 'Opcoes');
        if (!optionsByGroup.has(key)) optionsByGroup.set(key, []);
        optionsByGroup.get(key).push(option);
      }
      for (const option of item.options || []) {
        const delta = finite(option.price_delta);
        if (delta == null || delta <= 0) continue;
        const isFlavor = option.semantic_type === 'flavor' || /sabor|sabores|escolha.*pizza/.test(normalizeKeywordText(option.group_name));
        if (!isFlavor) continue;
        const siblings = optionsByGroup.get(clean(option.group_name || 'Opcoes')) || [];
        const hasIncludedBaseFlavor = siblings.some((sibling) => {
          const siblingDelta = finite(sibling.price_delta);
          const siblingPrice = finite(sibling.price);
          return sibling !== option
            && (sibling.semantic_type === 'flavor' || /sabor|sabores|escolha.*pizza/.test(normalizeKeywordText(sibling.group_name)))
            && (siblingDelta == null || siblingDelta === 0)
            && (siblingPrice == null || siblingPrice === 0);
        });
        if (hasIncludedBaseFlavor) continue;
        if (delta >= base * 0.7) {
          anomalies.push({
            category: category.name,
            item: item.name,
            option: option.name,
            base,
            delta,
            group: option.group_name
          });
        }
      }
    }
  }
  return anomalies;
}

function audit(categories, evidence) {
  const items = categories.flatMap(category => category.items);
  const uniqueKeys = new Set(items.map(item => item.external_id || `${item.name.toLowerCase()}::${item.description || ''}`));
  const unresolved = items.filter(item => item.price_type === 'unknown');
  const optionOnly = items.filter(item => ['option_only', 'range'].includes(item.price_type));
  const interfaceNoise = items.filter(isMenuInterfaceNoiseItem);
  const suspicious = items.filter(item => item.name.length < 2 || item.name.length > 180);
  const priced = items.filter(item => finite(item.display_price ?? item.price_min ?? item.price) != null && finite(item.display_price ?? item.price_min ?? item.price) > 0);
  const implausiblePrices = priced.filter(item => {
    const value = finite(item.display_price ?? item.price_min ?? item.price);
    return value != null && (isFakeOrTokenPrice(value) || value > 1000);
  });
  const fullPriceDeltaAnomalies = findFullPriceDeltaAnomalies(categories);
  const duplicates = Math.max(0, items.length - uniqueKeys.size);
  const issues = [];
  if (!categories.length) issues.push('sem_categorias');
  if (!items.length) issues.push('sem_itens');
  if (duplicates) issues.push('itens_duplicados');
  if (interfaceNoise.length) issues.push('lixo_de_interface');
  if (suspicious.length) issues.push('nomes_suspeitos');
  if (unresolved.length) issues.push('precos_para_revisao');
  if (implausiblePrices.length) issues.push('precos_implausiveis');
  if (fullPriceDeltaAnomalies.length) issues.push('delta_de_sabor_parece_preco_cheio');
  const sourceConfidence = finite(evidence?.confidence) ?? (evidence?.platform && evidence.platform !== 'generic' ? 0.97 : 0.75);
  const platform = clean(evidence?.platform || '');
  const nativePlatforms = new Set([
    'saipos',
    'livemenu_tagme',
    'anota_ai',
    'anota_ai_network',
    'anota_ai_deep',
    'cardapio_web',
    'menuintegrado_native_api',
    'restaurantlogin_native_api',
    'whatsmenu',
    'whatsmenu_native_api',
    'yooga_native_api',
    'brendi_nuxt_payload',
    'cardapiodigital_html_payload',
    'instadelivery_native_api',
    'meucarrinho_native_api',
  ]);
  const isNativePlatform = nativePlatforms.has(platform);
  const routeLevel = Number(evidence?.routeLevel ?? evidence?.extractionLevel ?? (isNativePlatform ? 0 : 3));
  const pricedRatio = items.length ? priced.length / items.length : 0;
  const weakGenericCollection = !isNativePlatform && (routeLevel >= 2 || platform === 'generic') && (items.length < 6 || pricedRatio < 0.55);
  if (weakGenericCollection) issues.push('coleta_generica_fraca');
  if (!isNativePlatform && items.length > 0 && categories.length === 1 && items.length < 4) issues.push('baixa_densidade_cardapio');
  let confidence = sourceConfidence;
  if (duplicates) confidence -= Math.min(0.25, duplicates / Math.max(1, items.length));
  if (interfaceNoise.length) confidence -= Math.min(0.35, interfaceNoise.length / Math.max(1, items.length));
  if (suspicious.length) confidence -= Math.min(0.25, suspicious.length / Math.max(1, items.length));
  if (unresolved.length) confidence -= Math.min(0.3, unresolved.length / Math.max(1, items.length) * 0.45);
  if (implausiblePrices.length) confidence -= Math.min(0.3, implausiblePrices.length / Math.max(1, priced.length || 1) * 0.4);
  if (fullPriceDeltaAnomalies.length) confidence -= 0.35;
  if (weakGenericCollection) confidence -= 0.25;
  confidence = Math.max(0, Math.min(1, confidence));
  const approved = items.length > 0
    && categories.length > 0
    && duplicates === 0
    && interfaceNoise.length === 0
    && suspicious.length === 0
    && unresolved.length === 0
    && implausiblePrices.length === 0
    && fullPriceDeltaAnomalies.length === 0
    && !weakGenericCollection
    && confidence >= 0.85;
  return {
    approved,
    confidence: Number(confidence.toFixed(3)),
    categoryCount: categories.length,
    itemCount: items.length,
    resolvedPriceCount: items.length - unresolved.length,
    unresolvedPriceCount: unresolved.length,
    fullPriceDeltaAnomalyCount: fullPriceDeltaAnomalies.length,
    fullPriceDeltaAnomalies: fullPriceDeltaAnomalies.slice(0, 12),
    optionPriceCount: optionOnly.length,
    pricedRatio: Number(pricedRatio.toFixed(3)),
    issues
  };
}

function runFallback() {
  return new Promise(resolve => {
    console.log('[Menu V2] Evidência estruturada indisponível; seguindo para DOM/OCR/LLM/visão progressivamente.');
    const child = spawn(process.execPath, [path.join(__dirname, 'hybrid_menu_extractor.cjs'), ...args, '--extension-only'], { stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', chunk => process.stdout.write(chunk));
    child.stderr.on('data', chunk => process.stderr.write(chunk));
    child.on('close', code => resolve(code || 0));
  });
}

async function categoriesFromTextOrImageEvidence(evidence) {
  const rawPieces = [];
  if (evidence.rawText) rawPieces.push(evidence.rawText);
  if (evidence.raw_text) rawPieces.push(evidence.raw_text);
  if (Array.isArray(evidence.textBlocks)) rawPieces.push(...evidence.textBlocks.filter(Boolean));
  if (Array.isArray(evidence.text_blocks)) rawPieces.push(...evidence.text_blocks.filter(Boolean));

  const screenshots = [
    ...(Array.isArray(evidence.screenshots) ? evidence.screenshots : []),
    ...(Array.isArray(evidence.imageMenuCandidates)
      ? evidence.imageMenuCandidates.map(candidate => candidate && (candidate.url || candidate.src || candidate.dataUrl || candidate.dataURL))
      : [])
  ].filter(Boolean).slice(0, 6);

  if (screenshots.length) {
    try {
      const ocr = await runLocalOcr(screenshots, { maxImages: 6, logger: () => {} });
      if (ocr.text) rawPieces.push(ocr.text);
      if (!evidence.ocr) evidence.ocr = { available: ocr.available, pages: ocr.pages || [], error: ocr.error || null };
    } catch (error) {
      evidence.ocr = { available: false, error: error.message };
    }
  }

  const combinedText = rawPieces
    .map(value => String(value || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim())
    .filter(Boolean)
    .join('\n');
  if (!combinedText || combinedText.length < 20) return [];

  const extracted = extractItemsFromText(combinedText);
  const categories = normalizeCategories(mergeCategories([extracted]), evidence.sourceUrl || evidence.finalUrl);
  const pricedItems = categories.flatMap(category => category.items || []).filter(item => finite(item.price) != null).length;
  if (categories.length && pricedItems >= 3) {
    evidence.rawText = combinedText;
    evidence.platform = evidence.platform || 'text_or_image_menu';
    evidence.discoveryMethod = evidence.discoveryMethod || evidence.discovery_method || 'text_or_image_menu_extraction';
    evidence.confidence = Math.max(finite(evidence.confidence) || 0, pricedItems >= 5 ? 0.88 : 0.82);
  }
  return categories;
}

async function createStaging(supabase, restaurantId, evidence, categories, resultAudit) {
  const runPayload = {
    restaurant_id: restaurantId,
    source_url: evidence.sourceUrl || null,
    platform: evidence.platform || 'generic',
    status: resultAudit.approved ? 'approved' : 'rejected',
    extraction_level: Number(evidence.extractionLevel ?? 0),
    confidence: resultAudit.confidence,
    item_count: resultAudit.itemCount,
    priced_item_count: resultAudit.resolvedPriceCount,
    unresolved_item_count: resultAudit.unresolvedPriceCount,
    issues: resultAudit.issues,
    evidence: { platform: evidence.platform, sourceUrl: evidence.sourceUrl, strategy: evidence.strategy, networkEntries: evidence.networkEntries || [] }
  };
  const { data: run, error } = await supabase.from('menu_import_runs').insert(runPayload).select().single();
  if (error) {
    console.warn(`[Menu V2] Staging indisponível (aplique a migration 0038): ${error.message}`);
    return null;
  }
  const rows = categories.flatMap((category, categoryOrder) => category.items.map((item, itemOrder) => ({ run_id: run.id, category_name: category.name, category_order: categoryOrder, item_order: itemOrder, payload: item })));
  if (rows.length) {
    const { error: stagingError } = await supabase.from('menu_import_staging_items').insert(rows);
    if (stagingError) throw stagingError;
  }
  return run;
}

async function snapshotExisting(supabase, restaurantId) {
  const { data: categories } = await supabase.from('menu_categories').select('*').eq('restaurant_id', restaurantId).order('order_index');
  const ids = (categories || []).map(category => category.id);
  if (!ids.length) return { categories: [], items: [], options: [] };
  const { data: items } = await supabase.from('menu_items').select('*').in('category_id', ids).order('order_index');
  const itemIds = (items || []).map(item => item.id);
  let options = [];
  if (itemIds.length) {
    const result = await supabase.from('menu_item_options').select('*').in('menu_item_id', itemIds).order('order_index');
    if (!result.error) options = result.data || [];
  }
  return { categories: categories || [], items: items || [], options };
}

async function restoreSnapshot(supabase, restaurantId, snapshot) {
  if (!snapshot.categories.length) return;
  const categoryMap = new Map();
  for (const oldCategory of snapshot.categories) {
    const { id, ...payload } = oldCategory;
    const { data } = await supabase.from('menu_categories').insert({ ...payload, restaurant_id: restaurantId }).select().single();
    if (data) categoryMap.set(id, data.id);
  }
  const itemMap = new Map();
  for (const oldItem of snapshot.items) {
    const { id, category_id, ...payload } = oldItem;
    const newCategoryId = categoryMap.get(category_id);
    if (!newCategoryId) continue;
    const { data } = await supabase.from('menu_items').insert({ ...payload, category_id: newCategoryId }).select().single();
    if (data) itemMap.set(id, data.id);
  }
  for (const oldOption of snapshot.options) {
    const { id, menu_item_id, ...payload } = oldOption;
    const newItemId = itemMap.get(menu_item_id);
    if (newItemId) await supabase.from('menu_item_options').insert({ ...payload, menu_item_id: newItemId });
  }
}

function buildBasicItemPayload(item, categoryId) {
  return {
    category_id: categoryId,
    name: item.name,
    description: item.description || item.display_description,
    price: item.display_price ?? item.price ?? item.price_min ?? 0,
    image_url: item.image_url,
    order_index: item.order_index,
    is_active: item.is_available !== false
  };
}

function getPublicVisibleOptions(item) {
  return (item.options || []).filter(option => {
    if (isDisposableOption(option)) return false;
    const group = normalizeKeywordText(option.group_name);
    const isDrinkUpsell = /bebida|refrigerante|suco|agua/.test(group);
    const isOptional = Number(option.min_quantity || 0) === 0;
    if (item.commercial_kind !== 'combo_builder' && isDrinkUpsell && isOptional) return false;
    return true;
  });
}

function buildCommercialItemPayload(item, categoryId, categoryName) {
  const isCombo = item.commercial_kind === 'combo_builder';
  const visibleOptions = getPublicVisibleOptions(item);
  const isConfigurable = visibleOptions.length > 0 || (item.combo_components || []).length > 0 || !['simple_item'].includes(item.commercial_kind);
  const hasFixedSourcePrice = finite(item.price) != null && item.price_type === 'fixed';
  return {
    ...buildBasicItemPayload(item, categoryId),
    display_name: item.name,
    display_price: item.display_price ?? item.price ?? item.price_min,
    price_type: (isCombo && finite(item.price) != null) || hasFixedSourcePrice ? 'fixed' : (isConfigurable ? 'starting_at' : (item.price_type || 'fixed')),
    price_min: item.display_price ?? item.price_min ?? item.price,
    price_max: item.price_max ?? item.display_price ?? item.price,
    original_price: item.original_price,
    promotional_price: item.promotional_price,
    price_source: item.price_source || (visibleOptions.length ? 'options' : 'item'),
    source_url: item.source_url,
    source_external_id: item.external_id,
    raw_data: item.raw_data,
    extraction_confidence: item.extraction_confidence,
    needs_review: item.needs_review,
    commercial_type: item.commercial_kind,
    is_configurable: isConfigurable,
    search_display_name: item.name,
    search_keywords: buildSearchKeywords(item, categoryName),
    combo_components: (item.combo_components || []).length ? item.combo_components : null,
    combo_rules: item.combo_rules || null,
    combo_display_mode: isCombo ? 'combo_card' : null,
    import_notes: isConfigurable ? 'Importado como produto configurável: edite sabores, escolhas e adicionais nos grupos de opções.' : null
  };
}

async function insertMenuItemWithSchemaFallback(supabase, item, categoryId, categoryName) {
  const commercialPayload = buildCommercialItemPayload(item, categoryId, categoryName);
  const commercialResult = await supabase.from('menu_items').insert(commercialPayload).select().single();
  if (!commercialResult.error) return commercialResult.data;

  const message = commercialResult.error.message || '';
  if (!/column|schema cache|price_type|display_price|commercial_type|search_display_name|combo_components|combo_rules|combo_display_mode/i.test(message)) {
    throw commercialResult.error;
  }

  const basicPayload = buildBasicItemPayload(item, categoryId);
  const basicResult = await supabase.from('menu_items').insert(basicPayload).select().single();
  if (basicResult.error) throw basicResult.error;
  return basicResult.data;
}

async function resolveCommittedMenuItemId(supabase, insertedItem, sourceItem, restaurantId) {
  const directId = insertedItem?.id;
  if (directId) return directId;

  const sourceExternalId = clean(sourceItem?.external_id || sourceItem?.source_external_id || sourceItem?.id);
  if (sourceExternalId) {
    const { data, error } = await supabase
      .from('menu_items')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('source_external_id', sourceExternalId)
      .maybeSingle();
    if (!error && data?.id) return data.id;
  }

  throw new Error(`Nao foi possivel resolver o menu_item_id persistido para "${sourceItem?.name || 'item sem nome'}".`);
}

function groupOptions(options) {
  const groups = new Map();
  for (const option of options || []) {
    const key = option.group_name || 'Opções';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(option);
  }
  return [...groups.entries()].map(([name, items], index) => {
    const required = items.some(option => option.is_required);
    const minQuantity = Math.max(0, ...items.map(option => Number(option.min_quantity || 0)));
    const maxCandidates = items.map(option => option.max_quantity).filter(value => value != null);
    const semanticCounts = items.reduce((acc, option) => {
      const semantic = option.semantic_type || 'unknown';
      acc[semantic] = (acc[semantic] || 0) + 1;
      return acc;
    }, {});
    const dominantSemantic = Object.entries(semanticCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const dominantBehavior = items.find(option => option.price_behavior)?.price_behavior || null;
    const averageConfidence = items.length
      ? items.reduce((sum, option) => sum + (finite(option.ai_confidence) ?? 0), 0) / items.length
      : null;
    return {
      name,
      items,
      payload: {
        name,
        min_quantity: required ? Math.max(1, minQuantity) : minQuantity,
        max_quantity: maxCandidates.length ? Math.max(...maxCandidates) : null,
        is_required: required,
        order_index: index,
        semantic_type: dominantSemantic,
        price_behavior: dominantBehavior,
        ai_confidence: averageConfidence != null ? Number(averageConfidence.toFixed(3)) : null,
        ai_reason: items.find(option => option.ai_reason)?.ai_reason || null,
        raw_data: { options: items.map(option => option.raw_data || option) }
      }
    };
  });
}

async function insertOptionsWithSchemaFallback(supabase, menuItemId, item) {
  if (!item.options.length) return;
  const visibleOptions = (item.options || []).filter(option => {
    if (isDisposableOption(option)) return false;
    const group = normalizeKeywordText(option.group_name);
    const isDrinkUpsell = /bebida|refrigerante|suco|agua/.test(group);
    const isOptional = Number(option.min_quantity || 0) === 0;
    if (item.commercial_kind !== 'combo_builder' && isDrinkUpsell && isOptional) return false;
    return true;
  });
  const groups = groupOptions(visibleOptions).filter(group => {
    if (!group.items.length) return false;
    if (group.items.every(isDisposableOption)) return false;
    if (group.items.length === 1) {
      const only = group.items[0];
      const min = Number(only.min_quantity || 0);
      const max = Number(only.max_quantity || 0);
      const optionPrice = finite(only.price ?? only.price_delta);
      if (min === 1 && max === 1 && (optionPrice == null || optionPrice === 0 || isFakeOrTokenPrice(optionPrice))) return false;
    }
    return true;
  });
  if (!groups.length) return;
  let groupTableAvailable = true;
  let optionTableAvailable = true;

  for (const group of groups) {
    let insertedGroupId = null;
    if (groupTableAvailable) {
      const groupPayload = {
        menu_item_id: menuItemId,
        external_id: group.items.find(option => option.external_id)?.external_id || null,
        ...group.payload
      };
      let groupResult = await supabase.from('menu_option_groups').insert(groupPayload).select().single();
      if (groupResult.error && /semantic_type|price_behavior|ai_confidence|ai_reason|schema cache|column/i.test(groupResult.error.message || '')) {
        const { semantic_type, price_behavior, ai_confidence, ai_reason, ...legacyGroupPayload } = groupPayload;
        groupResult = await supabase.from('menu_option_groups').insert(legacyGroupPayload).select().single();
      }
      if (groupResult.error) {
        groupTableAvailable = false;
      } else {
        insertedGroupId = groupResult.data.id;
      }
    }

    if (!optionTableAvailable) continue;
    const optionRows = group.items.map(option => ({
      menu_item_id: menuItemId,
      group_id: insertedGroupId,
      external_id: option.external_id,
      group_name: option.group_name,
      name: option.name,
      description: option.description,
      price: option.price,
      price_delta: option.price_delta,
      min_quantity: option.min_quantity,
      max_quantity: option.max_quantity,
      is_required: option.is_required,
      is_available: option.is_available,
      order_index: option.order_index,
      semantic_type: option.semantic_type,
      price_behavior: option.price_behavior,
      search_label: option.search_label,
      search_aliases: option.search_aliases,
      is_searchable_variant: option.is_searchable_variant,
      ai_confidence: option.ai_confidence,
      ai_reason: option.ai_reason,
      raw_data: option.raw_data
    }));
    let optionResult = await supabase.from('menu_item_options').insert(optionRows);
    if (optionResult.error && /group_id|semantic_type|price_behavior|search_label|search_aliases|is_searchable_variant|ai_confidence|ai_reason|schema cache|column/i.test(optionResult.error.message || '')) {
      const legacyRows = optionRows.map(({ group_id, semantic_type, price_behavior, search_label, search_aliases, is_searchable_variant, ai_confidence, ai_reason, ...row }) => row);
      optionResult = await supabase.from('menu_item_options').insert(legacyRows);
    }
    if (optionResult.error) {
      if (/does not exist|schema cache|relation/i.test(optionResult.error.message || '')) optionTableAvailable = false;
      else throw optionResult.error;
    }
  }
}

function splitCategoryHierarchy(categoryName) {
  const parts = String(categoryName || '')
    .split(/\s+\/\s+/)
    .map(part => clean(part))
    .filter(Boolean);
  if (parts.length < 2) return { sectionName: null, categoryName: clean(categoryName) || 'Cardápio' };
  return {
    sectionName: parts.slice(0, -1).join(' / '),
    categoryName: parts[parts.length - 1]
  };
}

async function resolveMenuSectionId(supabase, restaurantId, sectionName, orderIndex, cache) {
  const cleanName = clean(sectionName);
  if (!cleanName) return null;
  if (cache.has(cleanName)) return cache.get(cleanName);

  const existing = await supabase
    .from('menu_sections')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('name', cleanName)
    .maybeSingle();

  if (!existing.error && existing.data?.id) {
    cache.set(cleanName, existing.data.id);
    return existing.data.id;
  }
  if (existing.error && /does not exist|schema cache|relation/i.test(existing.error.message || '')) {
    cache.set(cleanName, null);
    return null;
  }
  if (existing.error) throw existing.error;

  const created = await supabase
    .from('menu_sections')
    .insert({ restaurant_id: restaurantId, name: cleanName, order_index: orderIndex })
    .select('id')
    .single();

  if (created.error && /does not exist|schema cache|relation/i.test(created.error.message || '')) {
    cache.set(cleanName, null);
    return null;
  }
  if (created.error) throw created.error;
  cache.set(cleanName, created.data.id);
  return created.data.id;
}

async function restaurantMediaStatus(supabase, restaurantId) {
  const restaurantResult = await supabase
    .from('restaurants')
    .select('image_url, cover_image_url')
    .eq('id', restaurantId)
    .single();
  const restaurant = restaurantResult.error ? {} : restaurantResult.data || {};
  let galleryCount = 0;
  const galleryResult = await supabase
    .from('restaurant_gallery')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId);
  if (!galleryResult.error) galleryCount = Number(galleryResult.count || 0);

  const missing = [];
  if (!clean(restaurant.image_url)) missing.push('logo');
  if (!clean(restaurant.cover_image_url)) missing.push('capa');
  if (galleryCount < 3) missing.push('galeria_min_3');

  return {
    complete: missing.length === 0,
    missing,
    galleryCount,
    hasLogo: Boolean(clean(restaurant.image_url)),
    hasCover: Boolean(clean(restaurant.cover_image_url)),
  };
}

async function commit(supabase, restaurantId, categories, evidence, resultAudit, run) {
  const snapshot = await snapshotExisting(supabase, restaurantId);
  const { error: deleteError } = await supabase.from('menu_categories').delete().eq('restaurant_id', restaurantId);
  if (deleteError) throw deleteError;
  try {
    const sectionCache = new Map();
    for (const category of categories) {
      const hierarchy = splitCategoryHierarchy(category.name);
      const sectionId = await resolveMenuSectionId(supabase, restaurantId, hierarchy.sectionName, category.order_index, sectionCache);
      const categoryPayload = {
        restaurant_id: restaurantId,
        name: hierarchy.categoryName,
        order_index: category.order_index,
        ...(sectionId ? { section_id: sectionId } : {})
      };
      const { data: insertedCategory, error: categoryError } = await supabase.from('menu_categories').insert(categoryPayload).select().single();
      if (categoryError) throw categoryError;
      for (const item of category.items) {
        const insertedItem = await insertMenuItemWithSchemaFallback(supabase, item, insertedCategory.id, category.name);
        const committedMenuItemId = await resolveCommittedMenuItemId(supabase, insertedItem, item, restaurantId);
        await insertOptionsWithSchemaFallback(supabase, committedMenuItemId, item);
      }
    }
    const currentRestaurantResult = await supabase
      .from('restaurants')
      .select('address,number,neighborhood,city,state,cep,phone,whatsapp_url,latitude,longitude,opening_hours')
      .eq('id', restaurantId)
      .maybeSingle();
    const trustedPatch = currentRestaurantResult.error
      ? {}
      : trustedRestaurantFieldPatch(currentRestaurantResult.data || {}, evidence.restaurant || {});
    const mediaStatus = await restaurantMediaStatus(supabase, restaurantId);
    const restaurantUpdate = {
      ...trustedPatch,
      menu_source: evidence.platform || 'hybrid',
      ai_validated: resultAudit.confidence >= 0.9 && mediaStatus.complete,
      ai_log: JSON.stringify({
        pipeline: 'menu-v2',
        audit: resultAudit,
        mediaStatus,
        trustedPatchFields: Object.keys(trustedPatch),
        sourceUrl: evidence.sourceUrl,
        importedAt: new Date().toISOString()
      }),
      menu_status: mediaStatus.complete ? 'found' : 'manual_required',
      menu_status_reason: mediaStatus.complete
        ? `${resultAudit.itemCount} itens estruturados via ${evidence.platform || 'hybrid'}; mídia mínima completa.`
        : `${resultAudit.itemCount} itens estruturados via ${evidence.platform || 'hybrid'}; aguardando mídia antes de Prontos p/ App: ${mediaStatus.missing.join(', ')}.`,
      menu_last_checked_at: new Date().toISOString()
    };
    let updateResult = await supabase.from('restaurants').update(restaurantUpdate).eq('id', restaurantId);
    if (updateResult.error && /menu_source|schema cache|column/i.test(updateResult.error.message || '')) {
      const { menu_source, ...withoutMenuSource } = restaurantUpdate;
      updateResult = await supabase.from('restaurants').update(withoutMenuSource).eq('id', restaurantId);
    }
    if (updateResult.error && /menu_status|menu_status_reason|menu_last_checked_at|schema cache|column/i.test(updateResult.error.message || '')) {
      const { menu_source, menu_status, menu_status_reason, menu_last_checked_at, ...legacyUpdate } = restaurantUpdate;
      updateResult = await supabase.from('restaurants').update(legacyUpdate).eq('id', restaurantId);
    }
    if (updateResult.error) throw updateResult.error;
    if (run) await supabase.from('menu_import_runs').update({ status: 'committed', committed_at: new Date().toISOString() }).eq('id', run.id);
  } catch (error) {
    await supabase.from('menu_categories').delete().eq('restaurant_id', restaurantId);
    await restoreSnapshot(supabase, restaurantId, snapshot);
    if (run) await supabase.from('menu_import_runs').update({ status: 'failed', error_message: error.message }).eq('id', run.id);
    throw error;
  }
}

async function main() {
  const restaurantId = arg('--id');
  const evidenceFile = arg('--evidence-file');
  if (!restaurantId) throw new Error('--id é obrigatório.');
  let evidence = {};
  if (evidenceFile && fs.existsSync(evidenceFile)) evidence = readJsonFile(evidenceFile);
  const platform = clean(evidence.platform || '');
  const preserveSourceCategories = new Set([
    'saipos',
    'livemenu_tagme',
    'anota_ai',
    'anota_ai_network',
    'anota_ai_deep',
    'cardapio_web',
    'menuintegrado_native_api',
    'whatsmenu',
    'whatsmenu_native_api',
    'yooga_native_api',
    'brendi_nuxt_payload',
    'cardapiodigital_html_payload',
    'instadelivery_native_api',
    'meucarrinho_native_api',
  ]).has(platform);
  let categories = normalizeCategories(evidence.categories, evidence.sourceUrl || evidence.finalUrl, { preserveSourceCategories });
  if (!categories.length) {
    categories = await categoriesFromTextOrImageEvidence(evidence);
  }
  if (!categories.length) {
    if (!evidenceFile) {
      console.log(`RESULT:${JSON.stringify({ success: false, requiresExtension: true, message: 'A extensão ativa é obrigatória para navegar e coletar este cardápio.' })}`);
      return;
    }
    if (evidence.visualAgentAllowed === false) {
      const blockers = (evidence.blockers || []).join(', ') || 'proteção de acesso';
      console.log(`RESULT:${JSON.stringify({ success: false, requiresHuman: true, message: `Coleta interrompida por ${blockers}. A IA não tentará contornar CAPTCHA, login ou proteção anti-bot.` })}`);
      return;
    }
    process.exitCode = await runFallback();
    return;
  }

  const optionSemanticAudit = await enrichOptionSemantics(categories);

  const resultAudit = audit(categories, evidence);
  resultAudit.optionSemanticAI = optionSemanticAudit;
  console.log(`[Menu V2] Auditoria estrutural: ${JSON.stringify(resultAudit)}`);

  if (hasFlag('--dry-run')) {
    const normalizedForAudit = categories.map(category => ({
      name: category.name,
      items: category.items.map(item => ({
        name: item.name,
        description: item.description || item.display_description || '',
        price: item.display_price ?? item.price ?? item.price_min ?? 0,
        display_price: item.display_price ?? item.price ?? item.price_min ?? 0,
        price_type: item.price_type || null,
        commercial_type: item.commercial_kind,
        image_url: item.image_url || null,
        combo_components: item.combo_components || [],
        combo_rules: item.combo_rules || null,
        option_groups: groupOptions(item.options || []).map(group => ({
          name: group.name,
          min_quantity: group.payload.min_quantity,
          max_quantity: group.payload.max_quantity,
          is_required: group.payload.is_required,
          semantic_type: group.payload.semantic_type,
          price_behavior: group.payload.price_behavior,
          items: group.items.map(option => ({
            external_id: option.external_id || null,
            group_name: option.group_name,
            name: option.name,
            description: option.description || null,
            image_url: option.image_url || null,
            price: option.price,
            price_delta: option.price_delta,
            min_quantity: option.min_quantity,
            max_quantity: option.max_quantity,
            is_required: option.is_required,
            semantic_type: option.semantic_type,
            price_behavior: option.price_behavior,
            is_searchable_variant: option.is_searchable_variant,
            search_label: option.search_label
          }))
        })),
        options: (item.options || []).map(option => ({
          external_id: option.external_id || null,
          group_name: option.group_name,
          name: option.name,
          description: option.description || null,
          image_url: option.image_url || null,
          price: option.price,
          price_delta: option.price_delta,
          min_quantity: option.min_quantity,
          max_quantity: option.max_quantity,
          is_required: option.is_required,
          semantic_type: option.semantic_type,
          price_behavior: option.price_behavior,
          is_searchable_variant: option.is_searchable_variant,
          search_label: option.search_label
        }))
      }))
    }));
    const preview = categories.map(category => ({
      name: category.name,
      count: category.items.length,
      samples: category.items.slice(0, 5).map(item => ({
        name: item.name,
        price: item.display_price ?? item.price,
        kind: item.commercial_kind,
        description: item.description || item.display_description || ''
      }))
    }));
    if (resultAudit.unresolvedPriceCount > 0) {
      console.log(`RESULT:${JSON.stringify({
        success: false,
        dryRun: true,
        requiresHuman: true,
        audit: resultAudit,
        preview,
        categories: normalizedForAudit,
        message: `Cardapio enviado para revisao: ${resultAudit.unresolvedPriceCount} item(ns) sem preco confiavel.`
      })}`);
      return;
    }
    console.log(`RESULT:${JSON.stringify({ success: true, dryRun: true, audit: resultAudit, preview, categories: normalizedForAudit, message: `Prévia estruturada com ${resultAudit.itemCount} itens via ${evidence.platform || 'hybrid'}.` })}`);
    return;
  }

  if (!resultAudit.approved) { process.exitCode = await runFallback(); return; }

  const supabase = createClient(process.env.VITE_SUPABASE_URL || 'https://gaawiewmlhorzbaixoqo.supabase.co', process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3');
  const run = await createStaging(supabase, restaurantId, evidence, categories, resultAudit);
  await commit(supabase, restaurantId, categories, evidence, resultAudit, run);
  console.log(`RESULT:${JSON.stringify({ success: true, message: `${resultAudit.itemCount} itens estruturados via ${evidence.platform}; ${resultAudit.unresolvedPriceCount} requerem revisão de preço.`, audit: resultAudit, fallbackUsed: false })}`);
}

main().catch(error => {
  console.error(`[Menu V2] ${error.stack || error.message}`);
  console.log(`RESULT:${JSON.stringify({ success: false, error: error.message })}`);
  process.exitCode = 1;
});
