const { createClient } = require('@supabase/supabase-js');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    });
  }
}
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runProcess(cmd, args) {
  return new Promise((resolve) => {
    console.log(`Running ${cmd} ${args.join(' ')}`);
    const proc = spawn(cmd, args);
    proc.stdout.on('data', d => process.stdout.write(d.toString()));
    proc.stderr.on('data', d => process.stderr.write(d.toString()));
    proc.on('close', code => resolve(code));
  });
}

async function searchGoogleNative(query) {
  try {
    const res = await fetch(`https://s.jina.ai/${encodeURIComponent(query)}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer jina_91bc5bb0b85a43db8eb66b17bb6bbd55FjI29Q0_QZ35qI25x2b9X2w1O4P2'
      }
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.data || !Array.isArray(data.data)) return [];
    return data.data.slice(0, 5).map(r => ({ title: r.title, link: r.url, snippet: r.description }));
  } catch(e) {
    console.error("Erro na busca mock:", e);
    return [];
  }
}

async function test10() {
  console.log("Buscando restaurantes aleatórios do Supabase...");
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, city, state, address')
    .limit(3); // Let's start with 3 to be faster, then 10 later or if this script works.
    
  console.log(`Encontrados ${restaurants.length} restaurantes.`);
  
  const resultsLog = [];

  for (const r of restaurants) {
    console.log(`\n========================================`);
    console.log(`Testando Restaurante: ${r.name}`);
    console.log(`========================================`);
    
    const query = `${r.name} ${r.city || ''} ${r.state || ''} cardapio instagram telefone`;
    const googleRes = await searchGoogleNative(query);
    
    const tempGoogleFile = path.join(__dirname, `temp_google_${r.id}.json`);
    fs.writeFileSync(tempGoogleFile, JSON.stringify(googleRes));
    
    await runProcess('node', ['scratch/social_enricher.cjs', '--single', '--id', r.id, '--field', 'hours']);
    await runProcess('node', ['scratch/phase5_ai_validation.cjs', '--single', '--id', r.id, '--google-context-file', tempGoogleFile]);
    await runProcess('node', ['scratch/gallery_enricher.cjs', '--single', '--id', r.id]);
    
    try { fs.unlinkSync(tempGoogleFile); } catch(e){}
    
    const { data: finalR } = await supabase.from('restaurants').select('*').eq('id', r.id).single();
    const { count: menuCount } = await supabase.from('menu_categories').select('*', { count: 'exact', head: true }).eq('restaurant_id', r.id);
    
    const stats = {
      name: finalR.name,
      hasInsta: !!(finalR.social_networks?.find(s => s.platform==='instagram')),
      hasPhone: !!finalR.phone,
      hasDescription: !!finalR.description,
      hasHours: !!finalR.opening_hours,
      hasMenuSource: !!finalR.menuSourceUrl || !!finalR.external_url,
      hasMenuStructure: menuCount > 0,
      hasLogo: !!finalR.image_url,
      hasCover: !!finalR.cover_image_url,
      hasGallery: !!finalR.gallery_urls?.length
    };
    
    console.log("STATISTICS PARA", r.name, stats);
    resultsLog.push(stats);
  }
  
  console.log(resultsLog);
  console.log("\nTESTE FINALIZADO!");
}

test10();
