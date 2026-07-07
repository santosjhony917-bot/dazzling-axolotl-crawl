const fs = require('fs');
const env = Object.fromEntries(fs.readFileSync('.env','utf8').split(/\r?\n/).filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('='); return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^['\"]|['\"]$/g,'')];}));
const input = { usernames: ['coffeepb','sabor.nordestino.cg'] };
fetch('https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?timeout=120', {
  method:'POST',
  headers:{ Authorization:'Bearer '+env.APIFY_TOKEN, 'content-type':'application/json' },
  body: JSON.stringify(input)
}).then(async r=>{
  const text = await r.text();
  console.log('status', r.status);
  console.log(text.slice(0,12000));
}).catch(e=>{console.error(e.stack||e.message); process.exit(1);});
