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
const restaurants = await fetchAll('restaurants', 'id,name,google_maps_name,category,address,neighborhood,phone,rating,reviews_count,city,state,is_deleted', q => q.eq('city','João Pessoa').eq('state','PB').or('is_deleted.is.null,is_deleted.eq.false'));
const cats = await fetchAll('menu_categories', 'restaurant_id,is_active,restaurants!inner(city,state)', q => q.eq('restaurants.city','João Pessoa').eq('restaurants.state','PB').or('is_active.is.null,is_active.eq.true'));
const withMenu = new Set(cats.map(c => c.restaurant_id));
const targets = restaurants
  .filter(r => !withMenu.has(r.id))
  .sort((a,b) => Number(b.reviews_count||0)-Number(a.reviews_count||0));
const stamp = new Date().toISOString().replace(/[:.]/g,'-');
fs.mkdirSync('scratch/production-queues', { recursive: true });
const base = `scratch/production-queues/joao-pessoa-no-menu-current-${stamp}`;
fs.writeFileSync(`${base}.ids.txt`, targets.map(r => r.id).join('\n') + '\n');
fs.writeFileSync(`${base}.json`, JSON.stringify({generated_at:new Date().toISOString(), count:targets.length, with_menu:withMenu.size, targets}, null, 2));
for (let i=0; i<Math.min(targets.length, 500); i += 50) {
  fs.writeFileSync(`${base}-${String(i).padStart(4,'0')}-${String(i+49).padStart(4,'0')}.ids.txt`, targets.slice(i,i+50).map(r => r.id).join('\n') + '\n');
}
console.log(JSON.stringify({base, count: targets.length, with_menu: withMenu.size, chunks: Math.ceil(Math.min(targets.length,500)/50), top: targets.slice(0,10).map(r=>({id:r.id,name:r.name,reviews_count:r.reviews_count,rating:r.rating}))}, null, 2));
