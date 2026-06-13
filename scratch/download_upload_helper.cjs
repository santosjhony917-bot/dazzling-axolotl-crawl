const { createClient } = require('@supabase/supabase-js');
const http = require('http');
const https = require('https');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Falha no download da imagem: HTTP ${res.statusCode}`));
        return;
      }
      const data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => {
        resolve({
          buffer: Buffer.concat(data),
          contentType: res.headers['content-type']
        });
      });
    }).on('error', (err) => reject(err));
  });
}

async function run() {
  const url = process.argv[2];
  const storagePath = process.argv[3];
  
  if (!url || !storagePath) {
    console.log(`RESULT:{"success":false,"error":"Parâmetros insuficientes."}`);
    process.exit(1);
  }
  
  try {
    console.log(`Baixando imagem de ${url}...`);
    const { buffer, contentType } = await downloadBuffer(url);
    console.log(`Upload para Supabase Storage em "${storagePath}" (${contentType})...`);
    
    const { data, error } = await supabase.storage
      .from('restaurant-images')
      .upload(storagePath, buffer, {
        contentType,
        upsert: true
      });
      
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('restaurant-images')
      .getPublicUrl(storagePath);
      
    console.log(`RESULT:{"success":true,"url":"${publicUrl}"}`);
  } catch (err) {
    console.log(`RESULT:{"success":false,"error":"${err.message}"}`);
  }
}

run().catch(err => {
  console.log(`RESULT:{"success":false,"error":"${err.message}"}`);
});
