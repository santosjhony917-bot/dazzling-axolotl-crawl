import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');

const env = {};
for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
  const index = trimmed.indexOf('=');
  env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
}

const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY
  || env.VITE_SUPABASE_SERVICE_ROLE_KEY
  || env.SERVICE_ROLE_KEY
  || env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL/key ausente no .env.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

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

const decodeLoose = (value) => {
  try {
    return decodeURIComponent(String(value || '').replace(/\+/g, ' '));
  } catch {
    return String(value || '').replace(/\+/g, ' ');
  }
};

const fetchAll = async (table, select) => {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
};

const isCampinaText = (value) => {
  const text = String(value || '');
  return /Campina Grande\s*(?:-\s*PB|,\s*PB|\/PB)?\b/i.test(text)
    && !/Campina Grande do Sul/i.test(text);
};

const hasOutOfScopeEvidence = (row, googleBase) => {
  const context = [
    row.city,
    row.state,
    row.address,
    row.location_issue_reason,
    googleBase?.address,
    googleBase?.error,
    googleBase?.currentUrl,
    decodeLoose(row.google_maps_url),
  ].join(' ');
  const normalizedContext = normalize(context);
  const explicitLocationScopeError = (
    /fora do escopo|painel fora/.test(normalizedContext)
    && /(?:nao campina grande\/pb|fora de campina grande|fora do lote campina grande|outro municipio|aponta para)/.test(normalizedContext)
  );

  return explicitLocationScopeError
    || /Campina Grande do Sul/i.test(context)
    || /(?:-\s*PR\b|\/PR\b|,\s*PR\b)/i.test(context);
};

const outOfScopeReason = (row) => {
  const googleBase = parseLogs(row.coleta_logs).google_maps_base || {};
  const address = String(googleBase.address || row.address || '').replace(/\s+/g, ' ').trim();
  const state = String(row.state || '').trim().toUpperCase();

  if (/Campina Grande do Sul/i.test(`${address} ${row.city || ''}`)) {
    return 'Google Maps apontou Campina Grande do Sul/PR, fora do lote Campina Grande/PB.';
  }
  if (address) return `Google Maps apontou outro municipio/estado: ${address}.`;
  if (state && state !== 'PB') return `Registro com estado ${state}, fora do lote Campina Grande/PB.`;
  return 'Registro fora do lote Campina Grande/PB.';
};

const isOutOfScopeRestaurant = (row) => {
  if (row.is_deleted === true) return false;

  const googleBase = parseLogs(row.coleta_logs).google_maps_base || {};
  const hasGoogleScopeEvidence = Boolean(
    googleBase.address
    || googleBase.error
    || googleBase.currentUrl
    || row.location_issue_reason
  );
  if (!hasGoogleScopeEvidence) return false;

  const address = String(googleBase.address || row.address || '').trim();
  const state = String(row.state || '').trim().toUpperCase();

  if (hasOutOfScopeEvidence(row, googleBase)) return true;
  if (state && state !== 'PB' && (googleBase.address || row.location_issue_reason)) return true;

  return Boolean(
    address
    && !isCampinaText(address)
    && /(?:-\s*[A-Z]{2}\b|,\s*[A-Z]{2}\b|\/[A-Z]{2}\b)/.test(address)
    && /[A-Za-zÀ-ÿ]/.test(address)
  );
};

const isCampinaRestaurant = (row) => {
  const googleBase = parseLogs(row.coleta_logs).google_maps_base || {};
  if (hasOutOfScopeEvidence(row, googleBase)) return false;
  if (row.is_deleted === true) return false;

  const decodedMapsUrl = decodeLoose(row.google_maps_url);
  const context = [
    row.city,
    row.state,
    row.address,
    row.google_maps_name,
    row.name,
    googleBase.address,
    googleBase.currentUrl,
    decodedMapsUrl,
  ].join(' ');

  return isCampinaText(context)
    || (String(row.state || '').trim().toUpperCase() === 'PB' && normalize(decodedMapsUrl).includes('campina grande'));
};

const projectSlug = (name, state) => `${name}-${state}`
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const campinaNeighborhoodProjectNames = new Set([
  'acacio figueiredo',
  'alto branco',
  'bela vista',
  'bodocongo',
  'catole',
  'centenario',
  'centro',
  'cruzeiro',
  'dinamerica',
  'estacao velha',
  'galante',
  'itavara',
  'jardim continental',
  'jardim paulistano',
  'jardim quarenta',
  'jose pinheiro',
  'liberdade',
  'malvinas',
  'monte castelo',
  'monte santo',
  'nova brasilia',
  'palmeira',
  'pedregal',
  'prata',
  'quarenta',
  'ramadinha',
  'sandra cavalcante',
  'santa cruz',
  'santa rosa',
  'santo antonio',
  'sao jose',
  'sao jose da mata',
  'serrotao',
  'tambor',
  'tres irmas',
  'universitario',
  'velame',
  'vila cabral',
]);

const isFakeCampinaProject = (project) => {
  const rawName = String(project.name || '').trim();
  const rawState = String(project.state || '').trim().toUpperCase();
  const normalized = normalize(rawName);

  if (rawState !== 'PB') return false;
  if (normalized === 'campina grande') return false;
  if (!normalized) return false;

  if (normalized.includes('campina grande')) return true;
  if (/^\d/.test(rawName)) return true;
  if (rawName.includes(',') || rawName.includes(' - ')) return true;
  if (/(?:^|\s)(?:loja|lj|box|sala|bloco|quadra)\b/i.test(rawName)) return true;
  if (/^(?:r\.|rua|av\.|avenida|travessa|tv\.|rod\.|rodovia|praca|praça|alameda|estrada)\b/i.test(rawName)) return true;
  return campinaNeighborhoodProjectNames.has(normalized);
};

const restaurants = await fetchAll(
  'restaurants',
  'id,name,city,state,address,google_maps_url,google_maps_name,location_issue_reason,coleta_logs,ai_log,is_deleted,is_published,ai_validated',
);

const outOfScopeRemovals = restaurants
  .filter(isOutOfScopeRestaurant)
  .map((row) => ({
    id: row.id,
    name: row.name,
    city: row.city,
    state: row.state,
    address: (parseLogs(row.coleta_logs).google_maps_base || {}).address || row.address,
    reason: outOfScopeReason(row),
  }));

const restaurantFixes = restaurants
  .filter(isCampinaRestaurant)
  .filter((row) => row.city !== 'Campina Grande' || String(row.state || '').trim().toUpperCase() !== 'PB')
  .map((row) => ({
    id: row.id,
    name: row.name,
    before: { city: row.city, state: row.state },
    after: { city: 'Campina Grande', state: 'PB' },
  }));

const projects = await fetchAll('expansion_projects', '*');
const campinaProject = projects.find((project) =>
  normalize(project.name) === 'campina grande'
  && String(project.state || '').trim().toUpperCase() === 'PB'
);
const fakeProjectDeletes = projects.filter(isFakeCampinaProject);

const summary = {
  mode: APPLY ? 'apply' : 'dry-run',
  restaurantsScanned: restaurants.length,
  restaurantsToNormalize: restaurantFixes.length,
  outOfScopeRestaurantsToRemove: outOfScopeRemovals.length,
  campinaProjectExists: Boolean(campinaProject),
  fakeExpansionProjectsToDelete: fakeProjectDeletes.length,
  sampleRestaurantFixes: restaurantFixes.slice(0, 15),
  sampleOutOfScopeRemovals: outOfScopeRemovals.slice(0, 25),
  fakeExpansionProjects: fakeProjectDeletes.map((project) => ({
    id: project.id,
    name: project.name,
    state: project.state,
  })),
};

if (!APPLY) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

for (const fix of restaurantFixes) {
  const { error } = await supabase
    .from('restaurants')
    .update(fix.after)
    .eq('id', fix.id);
  if (error) throw error;
}

for (const removal of outOfScopeRemovals) {
  const row = restaurants.find((candidate) => candidate.id === removal.id);
  const previousLog = parseLogs(row?.ai_log);
  const { error } = await supabase
    .from('restaurants')
    .update({
      is_deleted: true,
      is_published: false,
      ai_validated: false,
      menu_status: 'unavailable',
      menu_status_reason: removal.reason,
      location_issue_reason: removal.reason,
      ai_log: JSON.stringify({
        ...previousLog,
        pipeline: 'campina-google-base-repair',
        status: 'out_of_scope_removed',
        phase: 'google_maps_scope_cleanup',
        decision: {
          status: 'ineligible',
          confidence: 0.99,
          reason: removal.reason,
        },
        removedAt: new Date().toISOString(),
      }),
    })
    .eq('id', removal.id);
  if (error) throw error;
}

let insertedCampinaProject = null;
if (!campinaProject) {
  const payload = {
    name: 'Campina Grande',
    state: 'PB',
    slug: projectSlug('Campina Grande', 'PB'),
    status: 'Operação',
    progress: 80,
    health_score: 100,
  };
  const { data, error } = await supabase
    .from('expansion_projects')
    .insert([payload])
    .select('*')
    .single();
  if (error) throw error;
  insertedCampinaProject = data;
}

for (const project of fakeProjectDeletes) {
  const { error } = await supabase
    .from('expansion_projects')
    .delete()
    .eq('id', project.id);
  if (error) throw error;
}

console.log(JSON.stringify({
  ...summary,
  insertedCampinaProject,
  appliedRestaurantFixes: restaurantFixes.length,
  removedOutOfScopeRestaurants: outOfScopeRemovals.length,
  deletedFakeExpansionProjects: fakeProjectDeletes.length,
}, null, 2));
