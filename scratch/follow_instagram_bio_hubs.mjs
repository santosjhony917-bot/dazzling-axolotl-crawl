import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const outDir = path.join('scratch', 'instagram-bio-followup', new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(outDir, { recursive: true });
const targets = [
  {name:'Rubacão', url:'https://www.instagram.com/rubacaodopedrooficial/'},
  {name:'Sereia do Mar', url:'https://www.instagram.com/quiosquesereiadomar_oficial/'},
  {name:'Sukasa', url:'https://www.instagram.com/sukasasushi/'},
  {name:'Padaria Imperial', url:'https://www.instagram.com/padariaimperialtorre/'},
  {name:'Blend Doceria', url:'https://www.instagram.com/blenddoceria/'},
  {name:'NUI 360', url:'https://www.instagram.com/nui_360/'},
  {name:'Hashi', url:'https://www.instagram.com/hashijpa/'},
  {name:"Lolla's", url:'https://www.instagram.com/lollasloungejp/'},
  {name:'Panificadora Laura França', url:'https://www.instagram.com/panificadoralaurafranca/'},
];
const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9224', defaultViewport: null });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1800 });
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
const results=[];
for (const t of targets) {
  const slug = t.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  const dir = path.join(outDir, slug); fs.mkdirSync(dir,{recursive:true});
  try {
    await page.goto(t.url, {waitUntil:'networkidle2', timeout:45000});
    await sleep(1200);
    const data = await page.evaluate(() => {
      const clean = s => String(s||'').replace(/\s+/g,' ').trim();
      const anchors = Array.from(document.querySelectorAll('a[href]')).map(a=>({text:clean(a.innerText||a.textContent||''), href:a.href}));
      const text = clean(document.body?.innerText||'');
      return { text, anchors };
    });
    fs.writeFileSync(path.join(dir,'visible-text.txt'), data.text, 'utf8');
    fs.writeFileSync(path.join(dir,'anchors.json'), JSON.stringify(data.anchors.slice(0,40), null, 2), 'utf8');
    await page.screenshot({path:path.join(dir,'page.png'), fullPage:true});
    let bioLink = data.anchors.find(a => !/instagram\.com/i.test(a.href) && /link|cardáp|cardap|pedido|delivery|whatsapp|menu|menu/i.test(`${a.text} ${a.href}`));
    if (!bioLink) bioLink = data.anchors.find(a => !/instagram\.com/i.test(a.href));
    let finalUrl = page.url();
    let title = await page.title();
    let status = 'profile_only';
    if (bioLink) {
      await page.goto(bioLink.href, {waitUntil:'networkidle2', timeout:45000}).catch(()=>{});
      await sleep(1200);
      finalUrl = page.url();
      title = await page.title();
      const followText = await page.evaluate(()=>String(document.body?.innerText||'').replace(/\s+/g,' ').trim());
      fs.writeFileSync(path.join(dir,'follow-text.txt'), followText, 'utf8');
      status = 'followed';
    }
    const payload = { name:t.name, initialUrl:t.url, bioLink: bioLink||null, finalUrl, title, status };
    fs.writeFileSync(path.join(dir,'meta.json'), JSON.stringify(payload,null,2), 'utf8');
    results.push(payload);
  } catch (error) {
    results.push({name:t.name, initialUrl:t.url, status:'error', error:String(error?.message||error)});
  }
}
fs.writeFileSync(path.join(outDir,'summary.json'), JSON.stringify(results,null,2), 'utf8');
await page.close().catch(()=>{});
await browser.disconnect();
console.log(JSON.stringify({outDir, results}, null, 2));
