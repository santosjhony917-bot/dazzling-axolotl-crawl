import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
async function fetchAll(table, select, decorate) {
  const out = [];
  for (let from = 0;; from += 1000) {
    let q = supabase.from(table).select(select).range(from, from + 999);
    if (decorate) q = decorate(q);
    const { data, error } = await q;
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}
const restaurants = await fetchAll('restaurants', 'id,name,reviews_count,rating,city,state,is_deleted', q => q.eq('city','João Pessoa').eq('state','PB').or('is_deleted.is.null,is_deleted.eq.false'));
const cats = await fetchAll('menu_categories', 'restaurant_id,is_active,restaurants!inner(city,state)', q => q.eq('restaurants.city','João Pessoa').eq('restaurants.state','PB').or('is_active.is.null,is_active.eq.true'));
const withMenu = new Set(cats.map(c => c.restaurant_id));
const targets = restaurants.filter(r => !withMenu.has(r.id)).sort((a,b) => Number(b.reviews_count||0)-Number(a.reviews_count||0)).slice(0,100);
fs.mkdirSync('scratch/production-queues', { recursive: true });
fs.writeFileSync('scratch/production-queues/joao-pessoa-no-menu-top100.ids.txt', targets.map(r => r.id).join('\n') + '\n');
fs.writeFileSync('scratch/production-queues/joao-pessoa-no-menu-top100.json', JSON.stringify({generated_at:new Date().toISOString(), count:targets.length, targets}, null, 2));
console.log(JSON.stringify({count:targets.length, top:targets.slice(0,10).map(r => ({id:r.id,name:r.name,reviews_count:r.reviews_count,rating:r.rating}))}, null, 2));
