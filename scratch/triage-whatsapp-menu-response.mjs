import fs from 'node:fs';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const RESTAURANT_ID = process.argv.find(arg => arg.startsWith('--id='))?.slice('--id='.length);
const APPLY = process.argv.includes('--apply');
const BROWSER_URL = process.env.FF_CDP_URL || 'http://127.0.0.1:9224';
const LOG_KEY = 'campina_menu_whatsapp_response_v1';

if (!RESTAURANT_ID) {
  console.error('Use --id=<restaurant_id> para salvar a triagem no restaurante correto.');
  process.exit(1);
}

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
  { auth: { persistSession: false } },
);

const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
const digits = value => String(value || '').replace(/\D/g, '');
const parseJson = value => {
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch {}
  }
  return {};
};

function normalizeUrl(raw) {
  let current = String(raw || '').trim();
  if (!current) return '';
  try {
    for (let i = 0; i < 3; i += 1) {
      const parsed = new URL(current);
      const wrapped = parsed.searchParams.get('u') || parsed.searchParams.get('url') || parsed.searchParams.get('q');
      if (!wrapped) break;
      current = decodeURIComponent(wrapped);
    }
    const parsed = new URL(current);
    parsed.hash = '';
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (/^(utm_|fbclid|gclid|igsh|mc_|ref$|source$)/i.test(key)) parsed.searchParams.delete(key);
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

function isIfoodUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return host === 'ifood.com.br' || host.endsWith('.ifood.com.br');
  } catch {
    return false;
  }
}

function isWhatsappUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return host === 'wa.me' || host === 'whatsapp.com' || host.endsWith('.whatsapp.com');
  } catch {
    return false;
  }
}

function isMenuUrl(url) {
  if (!url || isIfoodUrl(url) || isWhatsappUrl(url)) return false;
  try {
    const parsed = new URL(url);
    const haystack = `${parsed.hostname} ${parsed.pathname} ${parsed.search}`.toLowerCase();
    if (/instagram\.com|facebook\.com|youtube\.com|tiktok\.com|google\./i.test(parsed.hostname)) return false;
    return /cardapio|card[aá]pio|menu|pedido|delivery|anota\.ai|saipos|livemenu|goomer|ola\.click|ola\.menu|instadelivery|deliverydireto|deliverymuch|menudino/i.test(haystack);
  } catch {
    return false;
  }
}

function extractWhatsappPhone(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'wa.me') return digits(parsed.pathname);
    if (host === 'api.whatsapp.com' || host.endsWith('.whatsapp.com')) {
      return digits(parsed.searchParams.get('phone') || parsed.pathname);
    }
  } catch {}
  return '';
}

async function readOpenWhatsappConversation() {
  const browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null, protocolTimeout: 90000 });
  try {
    const pages = await browser.pages();
    const page = pages.find(candidate => /^https:\/\/web\.whatsapp\.com\//i.test(candidate.url()));
    if (!page) throw new Error('WhatsApp Web nao esta aberto no Chrome depuravel.');
    await page.bringToFront();
    return await page.evaluate(() => {
      const bodyText = document.body?.innerText || '';
      const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
        text: (a.innerText || a.textContent || '').trim(),
        href: a.href,
      }));
      const title = document.querySelector('header span[title]')?.getAttribute('title')
        || document.querySelector('header')?.innerText?.split('\n')?.[0]
        || document.title
        || '';
      return {
        title,
        url: location.href,
        text: bodyText,
        excerpt: bodyText.slice(-5000),
        links,
      };
    });
  } finally {
    await browser.disconnect();
  }
}

function analyzeConversation(conversation) {
  const linkUrls = [
    ...conversation.links.map(link => link.href),
    ...(conversation.text.match(/https?:\/\/[^\s<>"')]+/gi) || []),
  ].map(normalizeUrl).filter(Boolean);
  const uniqueUrls = [...new Set(linkUrls)];
  const menuLinks = uniqueUrls.filter(isMenuUrl);
  const whatsappPhones = uniqueUrls.map(extractWhatsappPhone).filter(phone => phone.length >= 10);
  const textPhones = [...conversation.text.matchAll(/(?:\+?55\s*)?\(?\d{2}\)?\s*9?\d{4}[-\s.]?\d{4}/g)]
    .map(match => {
      const phone = digits(match[0]);
      if (phone.startsWith('55')) return phone;
      if (phone.length >= 10 && phone.length <= 11) return `55${phone}`;
      return phone;
    })
    .filter(phone => phone.length >= 12);
  const redirectSignals = /novo whatsapp|novo canal|n[uú]mero n[aã]o ser[aá] mais utilizado|utilize agora|direcionado diretamente|telefone.*loja/i.test(conversation.text);
  const newPhones = [...new Set([...whatsappPhones, ...textPhones])];
  return {
    menuLinks,
    newPhones,
    redirectSignals,
    linkCount: uniqueUrls.length,
  };
}

async function saveTriage(restaurant, conversation, analysis) {
  const logs = parseJson(restaurant.coleta_logs);
  const now = new Date().toISOString();
  const update = {
    coleta_logs: {
      ...logs,
      [LOG_KEY]: {
        checkedAt: now,
        source: 'visible_whatsapp_web',
        conversationTitle: clean(conversation.title),
        menuLinks: analysis.menuLinks,
        newPhones: analysis.newPhones,
        redirectSignals: analysis.redirectSignals,
        excerpt: conversation.excerpt.slice(-1800),
      },
    },
    menu_last_checked_at: now,
  };

  if (analysis.menuLinks.length) {
    update.other_url = analysis.menuLinks[0];
    update.external_url = analysis.menuLinks[0];
    update.other_url_label = 'Cardapio recebido via WhatsApp';
    update.menu_status = 'needs_recollection';
    update.menu_status_reason = 'Link de cardapio recebido via WhatsApp; aguardando coleta estruturada.';
  }

  if (analysis.redirectSignals && analysis.newPhones.length) {
    const preferred = analysis.newPhones[0];
    update.phone = preferred.startsWith('55')
      ? `(${preferred.slice(2, 4)}) ${preferred.slice(4)}`
      : preferred;
    update.whatsapp_url = `https://wa.me/${preferred}`;
    update.primary_contact_source = 'whatsapp_redirect_response';
    update.contacts_last_checked_at = now;
  }

  const { error } = await supabase.from('restaurants').update(update).eq('id', restaurant.id);
  if (error) throw error;
  return update;
}

async function main() {
  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .select('id,name,phone,whatsapp_url,other_url,external_url,coleta_logs')
    .eq('id', RESTAURANT_ID)
    .single();
  if (error) throw error;

  const conversation = await readOpenWhatsappConversation();
  const analysis = analyzeConversation(conversation);
  let update = null;
  if (APPLY) update = await saveTriage(restaurant, conversation, analysis);

  console.log(JSON.stringify({
    success: true,
    apply: APPLY,
    restaurant: { id: restaurant.id, name: restaurant.name },
    conversationTitle: conversation.title,
    analysis,
    updatePreview: update ? {
      phone: update.phone || null,
      whatsapp_url: update.whatsapp_url || null,
      other_url: update.other_url || null,
      menu_status: update.menu_status || null,
      menu_status_reason: update.menu_status_reason || null,
    } : null,
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
