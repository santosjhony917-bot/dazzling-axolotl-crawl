const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

const LIMIT = Number(process.env.LIMIT || 10);
const BROWSER_URL = process.env.FF_CDP_URL || 'http://127.0.0.1:9224';
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'instagram-highlight-discovery', RUN_ID);
const OUT_JSONL = path.join(OUT_DIR, 'results.jsonl');
const OUT_SUMMARY = path.join(OUT_DIR, 'summary.json');

fs.mkdirSync(OUT_DIR, { recursive: true });

const env = {};
for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#') || !t.includes('=')) continue;
  const i = t.indexOf('=');
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}

const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const norm = (value) => clean(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();
const parse = (value) => {
  if (value && typeof value === 'object') return value;
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
};
const hasIg = (row) => Boolean(row.instagram)
  || (Array.isArray(row.social_networks)
    && row.social_networks.some((item) => String(item?.platform || '').toLowerCase() === 'instagram' && item?.url));
const ig = (row) => row.instagram
  || (Array.isArray(row.social_networks)
    ? (row.social_networks.find((item) => String(item?.platform || '').toLowerCase() === 'instagram')?.url || '')
    : '');
const nonIfood = (url) => url && !/ifood\.com\.br/i.test(String(url));
const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
};
const normalizeUrl = (href) => {
  if (!href) return '';
  try {
    const parsed = new URL(href, 'https://www.instagram.com');
    if (/^(l|lm)\.instagram\.com$/i.test(parsed.hostname)) return parsed.searchParams.get('u') || parsed.href;
    parsed.hash = '';
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_|fbclid|igsh|igshid|gclid)/i.test(key)) parsed.searchParams.delete(key);
    }
    return parsed.href.replace(/[),.;]+$/g, '');
  } catch {
    return String(href).trim();
  }
};
const isIfood = (url) => /(?:^|\.)ifood\.com\.br$/i.test(hostOf(url));
const knownMenu = (url) => /(?:app\.cardapioweb\.com|integracao\.cardapioweb\.com|anota\.ai|pedido\.anota\.ai|instadelivery\.com\.br|goomer\.app|goomer\.com\.br|saipos\.com|livemenu\.app|deliverydireto\.com\.br|menudino\.com|dino\.com\.br|ola\.click|vucafood\.com\.br|whatsmenu\.com\.br|cardapio\.digital|cardapiodigital|meucarrinho\.delivery|pedir\.delivery)/i.test(hostOf(url));
const menuLike = (text) => /card[aá]pio|menu|pedido|pedir|delivery|deliveri|encomenda|pe[çc]a|fazer pedido/i.test(String(text || ''));
const allowedHighlight = (text) => /card[aá]pio|menu|pedido|delivery|localiza[cç][aã]o|como chegar/i.test(norm(text));
const ignoredHighlight = (text) => /feedback|cliente|clientes|ambiente|evento|eventos|fotos?|foto|random|aleat|depoimento|avalia|coment[aá]rios|novidades|promo/i.test(norm(text));
const locationTokensMatch = (row, haystack) => {
  const candidates = [row.address, row.neighborhood]
    .map((value) => norm(value).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((value) => value.length >= 5);
  return candidates.some((value) => haystack.includes(value));
};
const pageUnavailable = (text) => /p[aá]gina n[aã]o est[aá] dispon[ií]vel|link .* n[aã]o .* funcionando|page isn't available|page not available/i.test(text);
const cityConfirmed = (row, text) => {
  const haystack = norm(`${text} ${row.google_maps_name || row.name} ${ig(row)}`);
  if (/santa catarina|\bsc\b|florianopolis|joinville|blumenau|balneario camboriu|curitiba|\bpr\b|sao paulo|\bsp\b|rio de janeiro|\brj\b/i.test(haystack)
    && !/campina grande|\bcg\b|\bpb\b|83\s?9?\d{4}/.test(haystack)) {
    return false;
  }
  return /campina grande|\bcg\b|\bpb\b|83\s?9?\d{4}/.test(haystack) || locationTokensMatch(row, haystack);
};

async function fetchRows() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id,name,google_maps_name,instagram,social_networks,menu_status,other_url,external_url,coleta_logs,is_deleted,city,state,category,address,neighborhood,phone')
      .eq('city', 'Campina Grande')
      .eq('state', 'PB')
      .eq('is_deleted', false)
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows
    .filter((row) => hasIg(row)
      && !nonIfood(row.other_url)
      && !nonIfood(row.external_url)
      && row.menu_status !== 'found'
      && parse(row.coleta_logs)?.campina_instagram_bio_menu_v1?.status === 'bio_no_public_menu_link')
    .slice(0, LIMIT);
}

async function extractProfile(page) {
  return page.evaluate(() => {
    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 3 && rect.height > 3 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const bodyText = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
    const links = [...document.querySelectorAll('a[href]')]
      .filter(visible)
      .map((anchor) => ({
        href: anchor.href,
        text: (anchor.innerText || anchor.textContent || '').replace(/\s+/g, ' ').trim(),
        aria: anchor.getAttribute('aria-label') || '',
        title: anchor.getAttribute('title') || '',
      }));
    const highlights = links
      .filter((link) => /\/stories\/highlights\//.test(link.href))
      .map((link) => ({
        href: link.href,
        label: (link.text || link.aria || link.title || '').replace(/\s+/g, ' ').trim(),
      }));
    return { url: location.href, title: document.title, bodyText, links, highlights };
  });
}

function classifyLinks(links, source) {
  return links
    .map((link) => ({
      url: normalizeUrl(link.href),
      label: clean([link.text, link.aria, link.title].filter(Boolean).join(' ')),
      source,
    }))
    .filter((candidate) => candidate.url && !/instagram\.com/i.test(hostOf(candidate.url)))
    .map((candidate) => ({
      ...candidate,
      isIfood: isIfood(candidate.url),
      isMenu: !isIfood(candidate.url) && (knownMenu(candidate.url) || menuLike(`${candidate.label} ${candidate.url}`)),
    }))
    .filter((candidate) => candidate.isIfood || candidate.isMenu);
}

async function inspectHighlight(page, highlight) {
  await page.goto(highlight.href, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(3500);
  const data = await page.evaluate(() => {
    const bodyText = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
    const anchors = [...document.querySelectorAll('a[href]')].map((anchor) => ({
      href: anchor.href,
      text: (anchor.innerText || anchor.textContent || '').replace(/\s+/g, ' ').trim(),
      aria: anchor.getAttribute('aria-label') || '',
    }));
    const buttons = [...document.querySelectorAll('button,[role="button"],a,div,span')]
      .slice(0, 1200)
      .map((el) => (el.innerText || el.textContent || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 80);
    return { url: location.href, title: document.title, bodyText, anchors, buttons };
  });
  const candidates = classifyLinks(data.anchors, `highlight:${highlight.label}`);
  const hasPriceText = /R\$\s*\d|\d{1,3},\d{2}/.test(data.bodyText);
  return {
    highlight,
    page: {
      url: data.url,
      title: data.title,
      bodyText: clean(data.bodyText).slice(0, 1200),
      buttons: data.buttons.slice(0, 20),
    },
    candidates,
    hasPriceText,
  };
}

async function main() {
  const rows = await fetchRows();
  console.log(JSON.stringify({
    runId: RUN_ID,
    outDir: OUT_DIR,
    limit: LIMIT,
    selected: rows.map((row) => ({ id: row.id, name: row.google_maps_name || row.name, instagram: ig(row) })),
  }, null, 2));

  const browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);
  const summary = {
    processed: 0,
    bioFound: 0,
    highlightLinkFound: 0,
    hardImage: 0,
    noAllowedHighlights: 0,
    checkedNoLink: 0,
    errors: 0,
  };
  const results = [];

  try {
    for (const row of rows) {
      const name = row.google_maps_name || row.name;
      const instagram = ig(row);
      const result = {
        id: row.id,
        name,
        instagram,
        sourceChecked: [],
        status: '',
        cityConfirmed: false,
        selectedUrl: null,
        selectedSource: null,
        allowedHighlights: [],
        ignoredHighlights: [],
        evidence: {},
      };
      console.log(`[${summary.processed + 1}/${rows.length}] ${name}`);
      try {
        await page.goto(instagram, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await sleep(3200);
        const profile = await extractProfile(page);
        result.cityConfirmed = cityConfirmed(row, `${profile.bodyText} ${profile.title}`);
        const bioCandidates = classifyLinks(profile.links, 'bio');
        result.sourceChecked.push('bio');
        result.evidence.profileTextExcerpt = clean(profile.bodyText).slice(0, 700);
        result.evidence.bioCandidates = bioCandidates;
        const bioMenu = bioCandidates.find((candidate) => candidate.isMenu && !candidate.isIfood);

        if (pageUnavailable(profile.bodyText)) {
          result.status = 'rejected_broken_instagram_page';
          summary.checkedNoLink += 1;
        } else if (!result.cityConfirmed) {
          result.status = 'rejected_city_or_unit_not_confirmed';
          summary.checkedNoLink += 1;
        } else if (bioMenu) {
          result.status = 'bio_menu_link_found';
          result.selectedUrl = bioMenu.url;
          result.selectedSource = 'bio';
          summary.bioFound += 1;
        } else {
          const highlights = profile.highlights.map((highlight) => ({
            ...highlight,
            label: clean(highlight.label) || clean(decodeURIComponent(highlight.href.split('/').filter(Boolean).pop() || '')),
          }));
          result.allowedHighlights = highlights
            .filter((highlight) => allowedHighlight(highlight.label) && !ignoredHighlight(highlight.label))
            .slice(0, 4);
          result.ignoredHighlights = highlights
            .filter((highlight) => ignoredHighlight(highlight.label))
            .map((highlight) => highlight.label)
            .slice(0, 8);

          if (!result.allowedHighlights.length) {
            result.status = 'no_allowed_highlight_after_bio';
            summary.noAllowedHighlights += 1;
          } else {
            const inspected = [];
            for (const highlight of result.allowedHighlights) inspected.push(await inspectHighlight(page, highlight));
            result.sourceChecked.push(...result.allowedHighlights.map((highlight) => `highlight:${highlight.label}`));
            result.evidence.highlightInspections = inspected.map((inspection) => ({
              label: inspection.highlight.label,
              url: inspection.highlight.href,
              candidates: inspection.candidates,
              hasPriceText: inspection.hasPriceText,
              textExcerpt: inspection.page.bodyText.slice(0, 500),
              buttons: inspection.page.buttons,
            }));
            const found = inspected
              .flatMap((inspection) => inspection.candidates.map((candidate) => ({
                ...candidate,
                highlight: inspection.highlight.label,
              })))
              .find((candidate) => candidate.isMenu && !candidate.isIfood);

            if (found) {
              result.status = 'highlight_menu_link_found';
              result.selectedUrl = found.url;
              result.selectedSource = `highlight:${found.highlight}`;
              summary.highlightLinkFound += 1;
            } else if (inspected.some((inspection) => inspection.hasPriceText || menuLike(inspection.page.bodyText))) {
              result.status = 'hard_image_or_story_menu_candidate';
              summary.hardImage += 1;
            } else {
              result.status = 'allowed_highlights_checked_no_menu_link';
              summary.checkedNoLink += 1;
            }
          }
        }
        summary.processed += 1;
        console.log(`  -> ${result.status}${result.selectedUrl ? ` | ${result.selectedUrl}` : ''}`);
      } catch (error) {
        result.status = 'error';
        result.error = error.message;
        summary.processed += 1;
        summary.errors += 1;
        console.log(`  !! ${error.message}`);
      }
      fs.appendFileSync(OUT_JSONL, `${JSON.stringify(result)}\n`);
      results.push(result);
      await sleep(1200);
    }
  } finally {
    await page.close().catch(() => {});
    await browser.disconnect();
  }

  fs.writeFileSync(OUT_SUMMARY, JSON.stringify({ runId: RUN_ID, outDir: OUT_DIR, summary, results }, null, 2));
  console.log(JSON.stringify({ outDir: OUT_DIR, summary }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
