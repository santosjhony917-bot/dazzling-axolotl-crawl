import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const REPORT_PATH = 'scratch/zero-lead-expansion-projects.json';

const env = {};
for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
  const index = trimmed.indexOf('=');
  env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
}

const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY,
);

const normalizeProjectCityName = (city, state) => {
  const rawCity = String(city || '').trim().replace(/\s*-\s*[A-Z]{2}$/i, '');
  const rawState = String(state || '').trim().toUpperCase();
  const normalized = rawCity
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  if (!rawCity || rawCity.toUpperCase() === rawState || rawCity.length <= 2) return '';
  if (rawState === 'PB' && normalized.includes('campina grande') && !normalized.includes('campina grande do sul')) {
    return 'Campina Grande';
  }
  if (/^\d/.test(rawCity) || /(?:^|\s)(?:loja|box|sala|bloco|quadra)\b/i.test(rawCity)) return '';
  if (/^(?:r\.|rua|av\.|avenida|travessa|tv\.|rod\.|rodovia|praca|praça|alameda|estrada)\b/i.test(normalized)) return '';
  if (rawCity.includes(' - ') && /campina grande/i.test(rawCity)) return '';
  return rawCity;
};

const projectKey = (city, state) => {
  const cleanedCity = normalizeProjectCityName(city, state);
  const cleanedState = String(state || '').trim().toUpperCase();
  if (!cleanedCity || !cleanedState) return '';
  return `${cleanedCity.toLowerCase()}-${cleanedState}`;
};

const fetchAll = async (table, select, queryBuilder = (query) => query) => {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const query = queryBuilder(supabase.from(table).select(select)).range(from, from + 999);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
};

const projects = await fetchAll('expansion_projects', 'id,name,state,slug,status,created_at');
const restaurants = await fetchAll(
  'restaurants',
  'city,state,is_deleted',
  (query) => query.or('is_deleted.eq.false,is_deleted.is.null'),
);

const counts = new Map();
for (const restaurant of restaurants) {
  const key = projectKey(restaurant.city, restaurant.state);
  if (!key) continue;
  counts.set(key, (counts.get(key) || 0) + 1);
}

const toDelete = projects
  .map((project) => {
    const key = projectKey(project.name, project.state);
    return {
      ...project,
      normalizedKey: key,
      activeRestaurantCount: key ? (counts.get(key) || 0) : 0,
    };
  })
  .filter((project) => project.activeRestaurantCount === 0);

if (APPLY && toDelete.length > 0) {
  for (let index = 0; index < toDelete.length; index += 100) {
    const ids = toDelete.slice(index, index + 100).map((project) => project.id);
    const { error } = await supabase.from('expansion_projects').delete().in('id', ids);
    if (error) throw error;
  }
}

const report = {
  mode: APPLY ? 'apply' : 'dry-run',
  generatedAt: new Date().toISOString(),
  scannedProjects: projects.length,
  activeCityKeys: counts.size,
  zeroLeadProjects: toDelete.length,
  deletedProjectIds: APPLY ? toDelete.map((project) => project.id) : [],
  projects: toDelete.map((project) => ({
    id: project.id,
    name: project.name,
    state: project.state,
    status: project.status,
    slug: project.slug,
    activeRestaurantCount: project.activeRestaurantCount,
  })),
};

fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  mode: report.mode,
  scannedProjects: report.scannedProjects,
  activeCityKeys: report.activeCityKeys,
  zeroLeadProjects: report.zeroLeadProjects,
  reportPath: REPORT_PATH,
  sample: report.projects.slice(0, 30),
}, null, 2));
