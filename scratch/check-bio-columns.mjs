import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
function readEnv(){const env={...process.env}; if(fs.existsSync('.env')){for(const line of fs.readFileSync('.env','utf8').split(/\r?\n/)){const t=line.trim(); if(!t||t.startsWith('#')||!t.includes('=')) continue; const i=t.indexOf('='); const k=t.slice(0,i).trim(); const v=t.slice(i+1).trim().replace(/^["']|["']$/g,''); if(!env[k]) env[k]=v;}} return env;}
const env=readEnv(); const supabase=createClient(env.VITE_SUPABASE_URL||env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY||env.VITE_SUPABASE_SERVICE_ROLE_KEY||env.SERVICE_ROLE_KEY||env.VITE_SUPABASE_ANON_KEY,{auth:{persistSession:false}});
const cols=['bio','instagram_bio','description','other_url','other_url_label','followers_override']; const out={}; for(const col of cols){const {error}=await supabase.from('restaurants').select(col).limit(1); out[col]=error?false:true;} console.log(JSON.stringify(out,null,2));
