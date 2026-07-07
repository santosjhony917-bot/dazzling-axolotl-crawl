import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const OFFSET = Number(process.argv.find((arg) => arg.startsWith('--offset='))?.split('=')[1] || 0);
const LIMIT = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || 10);
const IDS = process.argv
  .filter((arg) => arg.startsWith('--id='))
  .flatMap((arg) => arg.split('=')[1].split(','))
  .map((id) => id.trim())
  .filter(Boolean);
const WAIT_MS = Number(process.argv.find((arg) => arg.startsWith('--wait-ms='))?.split('=')[1] || 8000);
const APPLY = !process.argv.includes('--no-update');
const FORCE = process.argv.includes('--force');
const BROWSER_URL = process.env.FF_CDP_URL || 'http://127.0.0.1:9224';
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'google-maps-base-collection', RUN_ID);
const CHECKPOINT_FILE = path.join(OUT_DIR, 'visible-results.jsonl');
const SUMMARY_FILE = path.join(OUT_DIR, 'visible-summary.json');

const readEnv = () => {
  const env = {};
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return env;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForMapsDetails = async (page, maxMs) => {
  let ready = false;
  try {
    await page.waitForFunction(() => {
      const text = String(document.body?.innerText || '');
      const title = String(document.querySelector('h1')?.innerText || '').trim();
      return title.length >= 2
        && /(Endere[cç]o|Address|Aberto|Fechado|Permanentemente|Temporariamente|reviews|avalia[cç][oõ]es)/i.test(text);
    }, { polling: 500, timeout: maxMs });
    ready = true;
  } catch {
    ready = false;
  }
  if (ready) await sleep(Math.min(2500, Math.max(1200, Math.floor(maxMs / 4))));
};

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

const decodeLoose = (value) => {
  try {
    return decodeURIComponent(String(value || '').replace(/\+/g, ' '));
  } catch {
    return String(value || '').replace(/\+/g, ' ');
  }
};

const fetchAll = async (supabase, table, select, apply = (query) => query) => {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await apply(supabase.from(table).select(select).range(from, from + 999));
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
};

const isCampinaTarget = (restaurant) =>
  restaurant.is_deleted !== true
  && !normalize(`${restaurant.city} ${restaurant.state} ${restaurant.address} ${restaurant.location_issue_reason}`).includes('campina grande do sul')
  && normalize(restaurant.state) !== 'pr'
  && (
    normalize(restaurant.city).includes('campina grande')
    || normalize(decodeLoose(restaurant.google_maps_url)).includes('campina grande')
    || normalize(restaurant.google_maps_name).includes('campina grande')
    || normalize(restaurant.name).includes('campina grande')
  );

const parseAddress = (fullAddress) => {
  let street = '';
  let number = '';
  let neighborhood = '';
  let city = '';
  let state = '';
  let cep = '';
  if (!fullAddress) return { street, number, neighborhood, city, state, cep };

  let working = String(fullAddress)
    .replace(/^Endere[cç]o:\s*/i, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*,?\s*(?:Brazil|Brasil)\s*[;,.]*\s*$/i, '')
    .replace(/^[^\p{L}\d]*(?=(?:R\.|Rua|Av\.|Avenida|Travessa|Tv\.|Rod\.|Rodovia|Pra[cç]a|Alameda|Estrada|\d))/iu, '')
    .trim();
  const leadingNumberStreet = working.match(/^(\d+[A-Za-z]?)\s*,\s*((?:R\.|Rua|Av\.|Avenida|Travessa|Tv\.|Rod\.|Rodovia|Pra[cÃ§]a|Alameda|Estrada)\s+.+)$/iu);
  if (leadingNumberStreet) {
    number = leadingNumberStreet[1];
    working = leadingNumberStreet[2].trim();
  }
  const cepMatch = working.match(/\b(\d{5}-\d{3})\b/) || working.match(/\b(\d{8})\b/);
  if (cepMatch) {
    cep = cepMatch[1];
    working = working.replace(cepMatch[0], '').trim();
  }
  working = working.replace(/[\s,-]+$/g, '').trim();
  const stateMatch = working.match(/[\s,-]\s*([A-Z]{2})\s*$/);
  if (stateMatch) {
    state = stateMatch[1];
    working = working.substring(0, working.lastIndexOf(stateMatch[0])).trim();
  }
  working = working.replace(/^[\s,-]+|[\s,-]+$/g, '').trim();
  const parts = working.split(',').map((part) => part.trim()).filter(Boolean);

  if (parts.length >= 3) {
    street = parts[0];
    const second = parts[1];
    const hyphen = second.indexOf(' - ');
    if (/^(?:Brazil|Brasil)$/i.test(second) && (/^\d+/.test(parts[2] || '') || normalize(parts[2]) === 's/n')) {
      number = parts[2];
      city = parts.slice(3).join(', ');
    } else if (hyphen !== -1) {
      const before = second.slice(0, hyphen).trim();
      const after = second.slice(hyphen + 3).trim();
      if (/\d/.test(before) || normalize(before) === 's/n') {
        number = before;
        neighborhood = after;
      } else {
        street += `, ${second}`;
      }
    } else if (/^\d+/.test(second) || normalize(second) === 's/n') {
      number = second;
    } else {
      neighborhood = second;
    }
    if (!city) {
      const rest = parts.slice(2).join(', ').trim();
      const restHyphen = rest.indexOf(' - ');
      if (restHyphen !== -1 && !neighborhood) {
        const beforeRest = rest.slice(0, restHyphen).trim();
        const afterRest = rest.slice(restHyphen + 3).trim();
        const duplicateStreet = normalize(beforeRest).startsWith(normalize(street))
          && (!number || normalize(beforeRest).includes(normalize(number)));
        if (duplicateStreet) {
          const tailParts = afterRest.split(',').map((part) => part.trim()).filter(Boolean);
          neighborhood = tailParts.length > 1 ? tailParts[0] : afterRest;
          city = tailParts.length > 1 ? tailParts.slice(1).join(', ') : '';
        } else {
          neighborhood = beforeRest;
          city = afterRest;
        }
      } else {
        city = rest;
      }
    }
  } else if (parts.length === 2) {
    street = parts[0];
    const second = parts[1];
    const hyphen = second.indexOf(' - ');
    if (hyphen !== -1) {
      const before = second.slice(0, hyphen).trim();
      const after = second.slice(hyphen + 3).trim();
      if (/\d/.test(before) || normalize(before) === 's/n') {
        number = before;
        city = after;
      } else {
        neighborhood = before;
        city = after;
      }
    } else {
      city = second;
    }
    const numInStreet = street.match(/,\s*(\d+[A-Za-z]?)\s*$/);
    if (numInStreet) {
      number = numInStreet[1];
      street = street.substring(0, street.lastIndexOf(numInStreet[0])).trim();
    }
  } else {
    street = working;
  }

  const streetHyphen = street.indexOf(' - ');
  if (streetHyphen !== -1 && !neighborhood) {
    neighborhood = street.slice(streetHyphen + 3).trim();
    street = street.slice(0, streetHyphen).trim();
  }
  const streetMarkerOnly = /^(?:R\.|Rua|Av\.|Avenida|Travessa|Tv\.|Rod\.|Rodovia|Pra[cÃ§]a|Alameda|Estrada)\s+/iu;
  const alternateStreetHyphen = street.indexOf(' - ');
  if (alternateStreetHyphen !== -1) {
    const alternateStreet = street.slice(alternateStreetHyphen + 3).trim();
    if (streetMarkerOnly.test(alternateStreet) || /^[A-Z]{2}-\d+/i.test(alternateStreet)) street = alternateStreet;
  }
  if (streetMarkerOnly.test(neighborhood) && /\d/.test(city)) {
    const cityParts = city.split(',').map((part) => part.trim()).filter(Boolean);
    const firstCityPart = cityParts.shift() || '';
    const firstHyphen = firstCityPart.indexOf(' - ');
    if (firstHyphen !== -1) {
      const before = firstCityPart.slice(0, firstHyphen).trim();
      const after = firstCityPart.slice(firstHyphen + 3).trim();
      if (/^\d+/.test(before) || normalize(before) === 's/n') {
        street = neighborhood;
        number = before;
        neighborhood = after
          .replace(/^(?:loja|lj|box|sala)\s*[\w/-]+\s*-\s*/i, '')
          .trim();
        city = cityParts.join(', ');
      }
    }
  }
  if (/\b(?:qa|quadra|bloco|lote|apto|apartamento)\b/i.test(neighborhood) && neighborhood.includes(' - ')) {
    neighborhood = neighborhood.split(' - ').pop().trim();
  }

  return {
    street: street.replace(/^[\s,-]+|[\s,-]+$/g, '').trim(),
    number: number.replace(/^[\s,-]+|[\s,-]+$/g, '').trim(),
    neighborhood: neighborhood.replace(/^[\s,-]+|[\s,-]+$/g, '').trim(),
    city: city.replace(/^[\s,-]+|[\s,-]+$/g, '').trim(),
    state,
    cep,
  };
};

const cleanAddressText = (value) => {
  let text = String(value || '')
    .replace(/^Endere[cÃ§]o:\s*/i, '')
    .replace(/^Address:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return text;

  const streetMarker = /(?:^|[\s,;:_-])((?:R\.|Rua|Av\.|Avenida|Travessa|Tv\.|Rod\.|Rodovia|Pra[cÃ§]a|Alameda|Estrada)\s+.+)$/iu;
  const match = text.match(streetMarker);
  if (match && match.index > 0) {
    const prefix = text.slice(0, match.index).replace(/[\s,;:_-]+$/g, '').trim();
    const looksLikePastedNoise = /zap|whats|telefone|phone|fone|advogado|distribuidora|vidros?|vidraceiro|\(\d{2}\)|\d{4,}/i.test(prefix);
    const looksLikeShortNoise = /^[A-Za-z0-9]{1,4}$/i.test(prefix.replace(/[\s,;-]/g, ''));
    const looksLikeStreetTail = /^de\s+[\p{L}\s]{3,50}$/iu.test(prefix);
    if (looksLikePastedNoise || looksLikeShortNoise || looksLikeStreetTail) {
      text = match[1].trim();
    }
  }

  return text.replace(/^[\s,-]+|[\s,]+$/g, '').trim();
};

const cleanCategoryText = (value) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text || !/[\p{L}\d]/u.test(text)) return '';
  if (['permanentemente fechado', 'temporariamente fechado', 'closed', 'temporarily closed', 'permanently closed'].includes(normalize(text))) return '';
  return text;
};

const looksLikeFoodPlace = (value) =>
  /restaurante|pizz|hamburg|burger|burguer|lanch|(?:^|\s)bar(?:\s|$)|caf[eé]|a[cç]a[ií]|sorvet|doc|confeit|bolo|padaria|pastel|sushi|espet|churrasc|marmit|salgad|sobremesa|caldo|tapioc|massa|cozinha|petisc|dog|delivery|panific|pamonh|steak|parrilla/i
    .test(String(value || ''));

const looksClearlyNonFoodPlace = (value) =>
  /sinagoga|igreja|templo|barbearia|barber|sal[aã]o de beleza|beauty|est[eé]tica|cl[ií]nica|odontol|dentista|advocacia|advogado|academia|studio|imobili[aá]ria|farm[aá]cia|pet shop|veterin[aá]ria|oficina|autope[cç]as|lava jato|borracharia|pneus?|copiadora|c[oó]pias|gr[aá]fica|papelaria|internet|provedor|inform[aá]tica|computador|assist[eê]ncia t[eé]cnica|lan house|cyber|centro comercial|shopping|mall|\bnet\b|supermercado|mercado|mercadinho|mercearia|lazer|clube|balne[aá]rio|eventos|recep[cç][oõ]es|casa de festas|sal[aã]o de festas|institui[cç][aã]o educacional|escola|col[eé]gio|educa[cç][aã]o|pousada|hotel|hospedagem|hostel|residencial|condom[ií]nio|loja de cestas|cestas de presente|presente|piscina|posto|gin[aá]sio|esporte|rodovi[aá]ria|esta[cç][aã]o ferrovi[aá]ria|terminal|centro de distribui[cç][aã]o|distribui[cç][aã]o|distribuidora|vidros?|vidraceiro|alpargatas|ubsf|posto de sa[uú]de|postinho|unidade b[aá]sica|variedades/i
    .test(String(value || ''));

const looksStrictlyNonFoodPlace = (value) =>
  /lan house|cyber|centro comercial|shopping|mall|\bnet\b|borracharia|pneus?|copiadora|c[oó]pias|gr[aá]fica|papelaria|internet|provedor|inform[aá]tica|computador|assist[eê]ncia t[eé]cnica|supermercado|mercado|mercadinho|mercearia|lazer|clube|balne[aá]rio|institui[cç][aã]o educacional|escola|col[eé]gio|educa[cç][aã]o|pousada|hotel|hospedagem|hostel|residencial|condom[ií]nio|loja de cestas|cestas de presente|presente|piscina|posto|gin[aá]sio|esporte|rodovi[aá]ria|esta[cç][aã]o ferrovi[aá]ria|terminal|centro de distribui[cç][aã]o|distribui[cç][aã]o|distribuidora|vidros?|vidraceiro|alpargatas|ubsf|posto de sa[uú]de|postinho|unidade b[aá]sica|variedades/i
    .test(String(value || ''));

const parseCoords = (url) => {
  const text = String(url || '');
  const match = text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  return match ? { latitude: Number(match[1]), longitude: Number(match[2]) } : null;
};

const parseHoursSlot = (value) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (/fechado|closed/i.test(text)) return { isOpen: false, slots: [] };
  if (/24\s*h|24 horas|open 24/i.test(text)) return { isOpen: true, slots: [{ start: '00:00', end: '23:59' }] };
  const slots = [];
  const pattern = /(\d{1,2}:\d{2})\s*(?:a|às|as|-|–)\s*(\d{1,2}:\d{2})/gi;
  let match;
  while ((match = pattern.exec(text))) {
    const start = match[1].padStart(5, '0');
    const end = match[2].padStart(5, '0');
    slots.push({ start, end });
  }
  return { isOpen: slots.length > 0, slots };
};

const dayMap = new Map([
  ['segunda-feira', 'monday'],
  ['segunda', 'monday'],
  ['terça-feira', 'tuesday'],
  ['terca-feira', 'tuesday'],
  ['terça', 'tuesday'],
  ['terca', 'tuesday'],
  ['quarta-feira', 'wednesday'],
  ['quarta', 'wednesday'],
  ['quinta-feira', 'thursday'],
  ['quinta', 'thursday'],
  ['sexta-feira', 'friday'],
  ['sexta', 'friday'],
  ['sábado', 'saturday'],
  ['sabado', 'saturday'],
  ['domingo', 'sunday'],
]);

const parseMapsVisiblePage = async (page) => page.evaluate(() => {
  const compact = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const text = String(document.body?.innerText || '');
  const lines = text.split('\n').map(compact).filter(Boolean);
  const pickAria = (selector, prefix) => {
    const items = Array.from(document.querySelectorAll(selector));
    const found = items.find((el) => compact(el.getAttribute('aria-label')).toLowerCase().startsWith(prefix.toLowerCase()));
    return compact(found?.getAttribute('aria-label') || found?.innerText || found?.textContent || '');
  };
  const name = compact(document.querySelector('h1')?.innerText || document.querySelector('h1')?.textContent || '');
  const addressRaw = pickAria('[data-item-id="address"], [aria-label^="Endereço:"], [aria-label^="Address:"]', 'Endereço:')
    || pickAria('[data-item-id="address"], [aria-label^="Address:"]', 'Address:');
  const phoneRaw = pickAria('[data-item-id*="phone"], [aria-label^="Telefone:"], [aria-label^="Phone:"]', 'Telefone:')
    || pickAria('[data-item-id*="phone"], [aria-label^="Phone:"]', 'Phone:');
  const websiteEl = document.querySelector('[data-item-id="authority"]');
  const website = websiteEl?.href || '';
  const ratingAria = Array.from(document.querySelectorAll('[role="img"], span'))
    .map((el) => compact(el.getAttribute('aria-label') || el.textContent || ''))
    .find((value) => /\d+[,.]\d+\s+estrelas|\d+[,.]\d+\s+stars/i.test(value)) || '';
  const reviewsAria = Array.from(document.querySelectorAll('[role="img"], span'))
    .map((el) => compact(el.getAttribute('aria-label') || el.textContent || ''))
    .find((value) => /\d[\d.,]*\s+(avaliações|avaliacoes|reviews)/i.test(value)) || '';
  const ratingText = lines.find((line, index) => /^\d+[,.]\d+$/.test(line) && /^\(?\d+/.test(lines[index + 1] || '')) || '';
  const rating = ratingAria.match(/(\d+[,.]\d+)/)?.[1] || ratingText || '';
  const reviews = reviewsAria.match(/(\d[\d.,]*)/)?.[1]
    || (lines.find((line) => /^\(\d[\d.,]*\)$/.test(line)) || '').replace(/[()]/g, '');
  const category = lines.find((line, index) =>
    index > 0
    && !/^(Visão geral|Cardápio|Avaliações|Sobre|Rotas|Salvar|Compartilhar)$/i.test(line)
    && !/\d+[,.]\d+|\(\d+\)|R\$/i.test(line)
    && lines[index - 1]?.match(/\(\d+\)|avaliações|reviews/i)
  ) || '';
  const statusLine = lines.find((line) =>
    /^(Aberto|Fechado|Fecha em breve|Abre em breve|Temporariamente fechado|Permanentemente fechado|Esse lugar pode estar fechado|Aberto 24 horas|Open|Closed)\b/i.test(line)
    || /^(Open|Closed)\s*·/i.test(line)
  ) || '';
  const permanentlyClosed = /permanentemente fechado|fechado permanentemente|permanently closed/i.test(text);
  const temporarilyClosed = /temporariamente fechado|fechado temporariamente|temporarily closed/i.test(text);
  const hourButtons = Array.from(document.querySelectorAll('button[aria-label]'))
    .map((el) => compact(el.getAttribute('aria-label')))
    .filter((value) =>
      /(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)/i.test(value)
      && /(copiar horário|copy hours|fechado|\d{1,2}:\d{2}|24 horas)/i.test(value)
    );
  return {
    url: location.href,
    title: document.title,
    name,
    address: addressRaw.replace(/^Endere[cç]o:\s*/i, '').replace(/^Address:\s*/i, ''),
    phone: phoneRaw.replace(/^Telefone:\s*/i, '').replace(/^Phone:\s*/i, ''),
    website,
    rating,
    reviews,
    category,
    statusLine,
    permanentlyClosed,
    temporarilyClosed,
    hourButtons,
    textExcerpt: compact(text).slice(0, 5000),
  };
});

const buildOpeningHours = (hourButtons) => {
  const openingHours = {};
  for (const raw of hourButtons || []) {
    const normalized = normalize(raw);
    const dayKey = [...dayMap.entries()].find(([pt]) => normalized.includes(normalize(pt)))?.[1];
    if (!dayKey) continue;
    const timePart = raw
      .replace(/copiar horário de funcionamento|copy hours/ig, '')
      .replace(/^[^,]+,\s*/i, '')
      .replace(/,\s*$/g, '')
      .trim();
    openingHours[dayKey] = parseHoursSlot(timePart);
  }
  return Object.keys(openingHours).length === 7 ? openingHours : null;
};

const parseLogs = (value) => {
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return {};
};

const buildUpdate = (restaurant, scraped) => {
  const address = cleanAddressText(scraped.address);
  const category = cleanCategoryText(scraped.category);
  const parsedAddress = parseAddress(address);
  const rating = scraped.rating ? Number(String(scraped.rating).replace(',', '.')) : null;
  const reviewsCount = scraped.reviews ? Number(String(scraped.reviews).replace(/[^\d]/g, '')) : null;
  const openingHours = buildOpeningHours(scraped.hourButtons);
  const coords = parseCoords(scraped.url || restaurant.google_maps_url);
  const parsedCity = normalize(parsedAddress.city);
  const parsedState = normalize(parsedAddress.state);
  const addressInCampinaGrandePb = /Campina Grande\s*(?:-\s*PB|,\s*PB|\/PB)\b/i.test(address)
    && !/Campina Grande do Sul/i.test(address);
  const parsedCityIsStateOnly = /^[a-z]{2}$/.test(parsedCity);
  const parsedAddressOutsideCampina = Boolean(
    address
    && parsedAddress.state
    && (
      parsedState !== 'pb'
      || (parsedAddress.city && !parsedCityIsStateOnly && !parsedCity.includes('campina grande'))
    )
  );
  const explicitOutsideCityMatch = address.match(/(?:^|[-,]\s*)(Cuit[eé](?!s)|Lagoa Seca|Nova Palmeira|Patos|Santa Cruz do Sul)\s*(?:-\s*([A-Z]{2})|,\s*([A-Z]{2})|\/([A-Z]{2}))\b/i);
  const explicitOutsidePlace = explicitOutsideCityMatch
    ? `${explicitOutsideCityMatch[1]}/${explicitOutsideCityMatch[2] || explicitOutsideCityMatch[3] || explicitOutsideCityMatch[4] || 'PB'}`
    : null;
  const outOfScopeAddress = /Campina Grande do Sul|-\s*PR\b|\/PR\b/i.test(address)
    || Boolean(explicitOutsideCityMatch)
    || (!addressInCampinaGrandePb && parsedAddressOutsideCampina);
  const outOfScopePlace = explicitOutsidePlace || (parsedAddress.city && parsedAddress.state
    ? `${parsedAddress.city}/${parsedAddress.state}`
    : 'outra cidade');
  const placeKindText = [
    scraped.name,
    category,
    restaurant.name,
    restaurant.google_maps_name,
  ].filter(Boolean).join(' ');
  const normalizedPlaceKindText = normalize(placeKindText);
  const placeLooksLikeFood = looksLikeFoodPlace(placeKindText) || /\bgrill\b/i.test(placeKindText);
  const strictNonFoodPlace = looksStrictlyNonFoodPlace(placeKindText)
    && !(placeLooksLikeFood && /centro comercial|shopping|mall/i.test(placeKindText));
  const clearlyNonFoodPlace = looksClearlyNonFoodPlace(placeKindText)
    && (!placeLooksLikeFood || strictNonFoodPlace);
  const salonLikeNonFoodPlace = /\bsalao\b/.test(normalizedPlaceKindText) && !placeLooksLikeFood;
  const herbalStorePlace = /loja de ervas|ervas medicinais|banca (?:das|de) ervas/.test(normalizedPlaceKindText);
  const publicOrResidentialPlace = /\b(parque|praca|complexo habitacional|conjunto|fazenda)\b/.test(normalizedPlaceKindText) && !placeLooksLikeFood;
  const tourismOrVenuePlace = /\b(vila|sitio|artesao|spazzio|centro comunitario|cumpade)\b/.test(normalizedPlaceKindText) && !placeLooksLikeFood;
  const tourismCategoryPlace = /area de camping|atracao turistica/.test(normalizedPlaceKindText);
  const lodgingOrCountryHousePlace = /\bresort\b|casa de campo/.test(normalizedPlaceKindText);
  const productionOrGenericGoodsPlace = /fabricacao de alimentos|\bedificio\b|\bprodutos\b/.test(normalizedPlaceKindText) && !placeLooksLikeFood;
  const socialAssistancePlace = /\bcras\b|assistencia social|assistencia social/.test(normalizedPlaceKindText);
  const nonFoodPlace = clearlyNonFoodPlace
    || salonLikeNonFoodPlace
    || herbalStorePlace
    || publicOrResidentialPlace
    || tourismOrVenuePlace
    || tourismCategoryPlace
    || lodgingOrCountryHousePlace
    || productionOrGenericGoodsPlace
    || socialAssistancePlace;
  const normalizedScrapedName = normalize(scraped.name);
  const looksLikeAreaName = Boolean(
    normalizedScrapedName
    && (
      normalizedScrapedName === normalize(parsedAddress.neighborhood)
      || normalizedScrapedName === normalize(parsedAddress.city)
    )
  );
  const looksLikeStreetName = /^(?:r\.|rua|av\.|avenida|travessa|tv\.|rod\.|rodovia|praca|alameda|estrada)(?:\s|$)/i.test(normalizedScrapedName);
  const streetNamedPlace = looksLikeStreetName && !looksLikeFoodPlace(scraped.name);
  const hasGoogleBusinessIdentityEvidence = Boolean(
    category
    || rating != null
    || reviewsCount != null
    || openingHours
    || placeLooksLikeFood
  );
  const ambiguousGenericPlace = ((looksLikeAreaName || looksLikeStreetName) && !hasGoogleBusinessIdentityEvidence)
    || streetNamedPlace;
  const hasReliableBase = Boolean(
    scraped.name
    && !/google maps/i.test(scraped.name)
    && (addressInCampinaGrandePb || scraped.permanentlyClosed || scraped.temporarilyClosed)
    && !outOfScopeAddress
    && !nonFoodPlace
    && !ambiguousGenericPlace
  );
  const unreliableReason = outOfScopeAddress
    ? `Fora do escopo: painel do Google Maps aponta para ${outOfScopePlace}, nao Campina Grande/PB.`
    : nonFoodPlace
      ? `Fora do escopo: painel do Google Maps retornou categoria nao alimentacao (${category || scraped.name}).`
      : ambiguousGenericPlace
        ? `Painel generico do Google Maps sem evidencia de restaurante (${scraped.name}); revisar manualmente.`
        : 'Chrome visivel nao retornou painel confiavel; revisar manualmente.';
  const unreliableError = outOfScopeAddress
    ? `Painel fora de Campina Grande/PB: ${outOfScopePlace}.`
    : nonFoodPlace
      ? `Painel de categoria nao alimentacao: ${category || scraped.name}.`
      : ambiguousGenericPlace
        ? `Painel generico sem evidencia de restaurante: ${scraped.name}.`
        : 'Painel sem evidencias suficientes.';
  const previousLogs = parseLogs(restaurant.coleta_logs);
  const inScopeCity = addressInCampinaGrandePb && !outOfScopeAddress;
  const update = {
    google_maps_name: scraped.name || restaurant.google_maps_name || restaurant.name,
    name: hasReliableBase ? (scraped.name || restaurant.name) : restaurant.name,
    city: outOfScopeAddress
      ? (parsedAddress.city || 'outra cidade')
      : (inScopeCity ? 'Campina Grande' : (restaurant.city || 'Campina Grande')),
    state: outOfScopeAddress
      ? (parsedAddress.state || restaurant.state || 'PB')
      : (inScopeCity ? 'PB' : (restaurant.state || 'PB')),
    location_issue_reason: hasReliableBase
      ? null
      : unreliableReason,
    coleta_logs: {
      ...previousLogs,
      google_maps_base: {
        collectedAt: new Date().toISOString(),
        success: hasReliableBase,
        source: 'visible_chrome_google_maps_panel',
        name: scraped.name || null,
        address: address || null,
        rating,
        reviews_count: reviewsCount,
        category: category || null,
        statusText: scraped.statusLine || null,
        isPermanentlyClosed: Boolean(scraped.permanentlyClosed),
        isTemporarilyClosed: Boolean(scraped.temporarilyClosed),
        scheduleIsWeekly: Boolean(openingHours),
        currentUrl: scraped.url || null,
        error: hasReliableBase ? null : unreliableError,
      },
    },
  };
  if (addressInCampinaGrandePb) {
    update.address = parsedAddress.street || address;
    update.number = parsedAddress.number || null;
    update.neighborhood = parsedAddress.neighborhood || null;
    update.cep = parsedAddress.cep || null;
  }
  if (outOfScopeAddress) {
    update.is_deleted = true;
    update.is_published = false;
    update.ai_validated = false;
    update.menu_status = 'unavailable';
    update.menu_status_reason = unreliableReason;
  }
  if (hasReliableBase && scraped.phone) update.phone = scraped.phone;
  if (hasReliableBase && category) update.category = category;
  if (hasReliableBase && scraped.category && !category) update.category = null;
  if (!hasReliableBase && nonFoodPlace) update.category = null;
  if (hasReliableBase && rating != null) update.rating = rating;
  if (hasReliableBase && reviewsCount != null) update.reviews_count = reviewsCount;
  if (hasReliableBase && openingHours) update.opening_hours = openingHours;
  if (coords) {
    update.latitude = coords.latitude;
    update.longitude = coords.longitude;
  }
  return { update, hasReliableBase, openingHours };
};

const main = async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const env = readEnv();
  const supabase = createClient(
    env.VITE_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
      || env.VITE_SUPABASE_SERVICE_ROLE_KEY
      || env.SERVICE_ROLE_KEY
      || env.VITE_SUPABASE_ANON_KEY,
  );
  const all = await fetchAll(
    supabase,
    'restaurants',
    'id,created_at,name,google_maps_name,google_maps_url,address,number,neighborhood,city,state,cep,phone,category,rating,reviews_count,opening_hours,location_issue_reason,coleta_logs,is_deleted',
    (query) => query.not('google_maps_url', 'is', null).order('created_at', { ascending: true }),
  );
  const selectedById = IDS.length
    ? IDS.map((id) => all.find((restaurant) => restaurant.id === id)).filter(Boolean)
    : null;
  const missingIds = IDS.filter((id) => !all.some((restaurant) => restaurant.id === id));
  const targets = selectedById || all.filter(isCampinaTarget).slice(OFFSET, OFFSET + LIMIT);
  const summary = {
    runId: RUN_ID,
    mode: IDS.length ? 'ids' : 'offset',
    ids: IDS,
    missingIds,
    offset: OFFSET,
    limit: LIMIT,
    total: targets.length,
    ok: 0,
    review: 0,
    skipped: 0,
    failed: 0,
  };
  console.log(JSON.stringify({
    runId: RUN_ID,
    mode: IDS.length ? 'ids' : 'offset',
    ids: IDS,
    missingIds,
    offset: OFFSET,
    limit: LIMIT,
    total: targets.length,
    apply: APPLY,
  }, null, 2));

  const browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  try {
    for (let index = 0; index < targets.length; index += 1) {
      const restaurant = targets[index];
      const previous = parseLogs(restaurant.coleta_logs)?.google_maps_base;
      if (!FORCE && previous?.success && restaurant.address && restaurant.rating != null && restaurant.reviews_count != null) {
        summary.skipped += 1;
        const skipped = { index: index + 1, globalIndex: IDS.length ? null : OFFSET + index, id: restaurant.id, name: restaurant.name, skipped: true };
        fs.appendFileSync(CHECKPOINT_FILE, `${JSON.stringify(skipped)}\n`);
        console.log(JSON.stringify(skipped));
        continue;
      }
      try {
        await page.goto(restaurant.google_maps_url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await waitForMapsDetails(page, WAIT_MS);
        const scraped = await parseMapsVisiblePage(page);
        const { update, hasReliableBase, openingHours } = buildUpdate(restaurant, scraped);
        if (APPLY) {
          const { error } = await supabase.from('restaurants').update(update).eq('id', restaurant.id);
          if (error) throw error;
        }
        if (hasReliableBase) summary.ok += 1;
        else summary.review += 1;
        const record = {
          index: index + 1,
          globalIndex: IDS.length ? null : OFFSET + index,
          id: restaurant.id,
          name: restaurant.name,
          ok: hasReliableBase,
          extractedName: scraped.name || null,
          address: scraped.address || null,
          rating: update.rating ?? null,
          reviewsCount: update.reviews_count ?? null,
          weeklyHours: Boolean(openingHours),
          status: scraped.statusLine || null,
        };
        fs.appendFileSync(CHECKPOINT_FILE, `${JSON.stringify(record)}\n`);
        console.log(JSON.stringify(record));
      } catch (error) {
        summary.failed += 1;
        const record = { index: index + 1, globalIndex: IDS.length ? null : OFFSET + index, id: restaurant.id, name: restaurant.name, ok: false, error: error.message };
        fs.appendFileSync(CHECKPOINT_FILE, `${JSON.stringify(record)}\n`);
        console.error(JSON.stringify(record));
      }
    }
  } finally {
    await page.close().catch(() => {});
    await browser.disconnect();
  }
  fs.writeFileSync(SUMMARY_FILE, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
