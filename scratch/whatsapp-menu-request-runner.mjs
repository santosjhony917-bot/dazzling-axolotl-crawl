import fs from 'node:fs';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const QUEUE_FILE = process.argv.find(arg => arg.startsWith('--queue='))?.split('=')[1];
const LIMIT = Number(process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1] || 1) || 1;
const OFFSET = Number(process.argv.find(arg => arg.startsWith('--offset='))?.split('=')[1] || 0) || 0;
const SEND = process.argv.includes('--send');
const REDO = process.argv.includes('--redo');
const BROWSER_URL = process.env.FF_CDP_URL || 'http://127.0.0.1:9224';
const WAIT_MS = Number(process.argv.find(arg => arg.startsWith('--wait-ms='))?.split('=')[1] || 2500);
const WAIT_LOGIN = process.argv.includes('--wait-login');
const LOGIN_WAIT_MS = Number(process.argv.find(arg => arg.startsWith('--login-wait-ms='))?.split('=')[1] || 30 * 60 * 1000);
const OPEN_INTERVAL_MS = Number(process.argv.find(arg => arg.startsWith('--open-interval-ms='))?.split('=')[1] || 8000);
const SEND_INTERVAL_MS = Number(process.argv.find(arg => arg.startsWith('--send-interval-ms='))?.split('=')[1] || 30000);
const SEND_JITTER_MS = Number(process.argv.find(arg => arg.startsWith('--send-jitter-ms='))?.split('=')[1] || 5000);
const CAPTURE_RESPONSES = !process.argv.includes('--no-response-capture');
const CAPTURE_SKIPPED = process.argv.includes('--capture-skipped');
const RESPONSE_WAIT_MS = Number(process.argv.find(arg => arg.startsWith('--response-wait-ms='))?.split('=')[1] || 8000);
const LOG_KEY = 'campina_menu_whatsapp_queue_v1';
const RESPONSE_LOG_KEY = 'campina_menu_whatsapp_response_v1';
const STORAGE_BUCKET = 'restaurant-images';
const DEFAULT_MESSAGE = 'Ol\u00e1! Tudo bem? Pode me enviar o card\u00e1pio atualizado, por favor?';
const MESSAGE_OVERRIDE = process.env.FF_WHATSAPP_MENU_MESSAGE
  || process.argv.find(arg => arg.startsWith('--message='))?.slice('--message='.length)
  || '';

if (!QUEUE_FILE) {
  console.error('Use --queue=<arquivo.json> gerado por build-campina-menu-whatsapp-queue.mjs');
  process.exit(1);
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const normalizeText = value => String(value || '').replace(/\s+/g, ' ').trim();
const entries = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8')).slice(OFFSET, OFFSET + LIMIT);
const parseJson = value => {
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch {}
  }
  return {};
};

function messageForEntry(entry) {
  const candidate = normalizeText(entry.suggested_message);
  if (MESSAGE_OVERRIDE) return normalizeText(MESSAGE_OVERRIDE);
  if (
    /^.{8,180}$/.test(candidate)
    && /card(?:\u00e1|a)pio/i.test(candidate)
    && /por favor\??$/i.test(candidate)
    && !/instagram|ifood|promo(?:\u00e7|c)(?:\u00e3|a)o|cupom|desconto/i.test(candidate)
  ) {
    return candidate;
  }
  return DEFAULT_MESSAGE;
}

function normalizeUrl(raw) {
  let current = String(raw || '').trim();
  if (!current) return '';
  try {
    for (let index = 0; index < 3; index += 1) {
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
    const host = parsed.hostname.toLowerCase();
    const haystack = `${host} ${parsed.pathname} ${parsed.search}`.toLowerCase();
    if (/instagram\.com|facebook\.com|youtube\.com|tiktok\.com|google\./i.test(host)) return false;
    return /cardapio|card\u00e1pio|menu|pedido|delivery|anota\.ai|saipos|livemenu|goomer|ola\.click|ola\.menu|instadelivery|deliverydireto|deliverymuch|menudino/i.test(haystack);
  } catch {
    return false;
  }
}

function extractWhatsappPhone(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'wa.me') return String(parsed.pathname || '').replace(/\D/g, '');
    if (host === 'api.whatsapp.com' || host.endsWith('.whatsapp.com')) {
      return String(parsed.searchParams.get('phone') || parsed.pathname || '').replace(/\D/g, '');
    }
  } catch {}
  return '';
}

function mimeToExtension(mime, fallback = 'bin') {
  const cleanMime = String(mime || '').toLowerCase();
  if (cleanMime.includes('png')) return 'png';
  if (cleanMime.includes('webp')) return 'webp';
  if (cleanMime.includes('pdf')) return 'pdf';
  if (cleanMime.includes('jpeg') || cleanMime.includes('jpg')) return 'jpg';
  return fallback;
}

function dataUrlToBuffer(dataUrl) {
  const match = String(dataUrl || '').match(/^data:([^;,]+)?(?:;[^,]*)?,(.*)$/s);
  if (!match) return null;
  const mime = match[1] || 'application/octet-stream';
  const buffer = Buffer.from(match[2] || '', /;base64,/i.test(dataUrl) ? 'base64' : 'utf8');
  return { mime, buffer };
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

async function getRestaurantState(entry) {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id,name,phone,whatsapp_url,other_url,external_url,coleta_logs,menu_status')
    .eq('id', entry.restaurant_id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

function isAlreadySent(row) {
  if (REDO) return false;
  const logs = parseJson(row?.coleta_logs);
  const status = logs?.[LOG_KEY]?.status;
  return status === 'sent' || status === 'prepared_only' || status === 'invalid_phone';
}

async function updateAttempt(entry, status, details = {}) {
  const row = await getRestaurantState(entry);
  if (!row) return;
  const previousLogs = parseJson(row.coleta_logs);
  const now = new Date().toISOString();
  const log = {
    ...(previousLogs[LOG_KEY] || {}),
    status,
    updatedAt: now,
    sentAt: status === 'sent' ? now : previousLogs[LOG_KEY]?.sentAt || null,
    reason: entry.reason || previousLogs[LOG_KEY]?.reason || null,
    normalizedPhone: entry.normalized_phone,
    whatsappUrl: entry.whatsapp_url,
    message: messageForEntry(entry),
    source: entry.instagram ? 'instagram_fallback_or_google_phone' : 'google_phone_no_instagram',
    ...details,
  };
  const update = {
    coleta_logs: {
      ...previousLogs,
      [LOG_KEY]: log,
    },
    menu_last_checked_at: now,
  };
  if (status === 'sent' || status === 'prepared_only') {
    update.menu_status = 'manual_required';
    update.menu_status_reason = 'Mensagem enviada solicitando cardapio via WhatsApp.';
  } else if (status === 'invalid_phone') {
    update.menu_status = 'manual_required';
    update.menu_status_reason = 'Telefone/WhatsApp invalido ao solicitar cardapio.';
  }
  const { error } = await supabase.from('restaurants').update(update).eq('id', row.id);
  if (error) throw error;
}

async function findOrCreateWhatsappPage(browser) {
  const pages = await browser.pages();
  const existing = pages.find(page => /^https:\/\/web\.whatsapp\.com\//i.test(page.url()));
  if (existing) return existing;
  const page = await browser.newPage();
  await page.goto('https://web.whatsapp.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  return page;
}

async function waitForWhatsappReady(page) {
  await page.bringToFront();
  const maxAttempts = WAIT_LOGIN ? Math.max(90, Math.ceil(LOGIN_WAIT_MS / 1000)) : 90;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const state = await page.evaluate(() => {
      const text = document.body?.innerText || '';
      const hasQr = /use o whatsapp no seu computador|scan|qr|conectar um aparelho|link a device/i.test(text);
      const hasSearch = !!document.querySelector('[contenteditable="true"][data-tab], div[role="textbox"][contenteditable="true"]');
      const loggedInShell = /Tudo\s+N(?:\u00e3|a)o lidas|Favoritas|As notifica(?:\u00e7|c)(?:\u00f5|o)es|Conversas|Pesquisar/i.test(text);
      const useThisWindow = /Usar nesta janela|Use here/i.test(text);
      return { hasQr, hasSearch, loggedInShell, useThisWindow, text: text.slice(0, 700) };
    }).catch(() => ({ hasQr: false, hasSearch: false, text: '' }));
    if (state.useThisWindow) {
      await page.evaluate(() => {
        const button = Array.from(document.querySelectorAll('button,[role="button"]'))
          .find(element => /Usar nesta janela|Use here/i.test(element.innerText || element.textContent || ''));
        button?.click();
      }).catch(() => {});
      console.log('[whatsapp] assumindo esta janela do WhatsApp Web...');
      await sleep(5000);
      continue;
    }
    if ((state.hasSearch || state.loggedInShell) && !state.hasQr) return true;
    if (state.hasQr && !WAIT_LOGIN) throw new Error('WhatsApp Web precisa de login neste Chrome antes de eu controlar os envios.');
    if (state.hasQr && WAIT_LOGIN && attempt % 30 === 0) {
      console.log('[whatsapp] aguardando login no WhatsApp Web neste Chrome...');
    }
    await sleep(1000);
  }
  throw new Error('WhatsApp Web nao ficou pronto dentro do tempo esperado.');
}

async function openChat(page, entry) {
  const text = messageForEntry(entry);
  const phone = String(entry.normalized_phone || '').replace(/\D/g, '');
  if (!phone) throw new Error(`Telefone invalido para ${entry.name}`);
  const url = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(WAIT_MS);
  await page.bringToFront();
}

async function openExistingChat(page, entry) {
  const phone = String(entry.normalized_phone || '').replace(/\D/g, '');
  if (!phone) throw new Error(`Telefone invalido para ${entry.name}`);
  const url = `https://web.whatsapp.com/send?phone=${phone}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(WAIT_MS);
  await page.bringToFront();
}

async function dismissBlockingDialog(page) {
  return await page.evaluate(() => {
    const dialog = Array.from(document.querySelectorAll('[role="dialog"], div[aria-modal="true"]'))
      .find(el => /n(?:\u00fa|u)mero|number|whatsapp|inv(?:\u00e1|a)lido|invalid/i.test(el.innerText || ''));
    if (!dialog) return false;
    const buttons = Array.from(dialog.querySelectorAll('button, [role="button"]'));
    const ok = buttons.find(button => /^(ok|okay|entendi|fechar)$/i.test((button.innerText || button.textContent || '').trim()))
      || buttons[buttons.length - 1];
    ok?.click();
    return true;
  }).catch(() => false);
}

async function getChatState(page) {
  return await page.evaluate(() => {
    const bodyText = document.body?.innerText || '';
    const dialogText = Array.from(document.querySelectorAll('[role="dialog"], div[aria-modal="true"]'))
      .map(el => el.innerText || '')
      .join('\n');
    const composer = Array.from(document.querySelectorAll('div[contenteditable="true"][role="textbox"], footer div[contenteditable="true"], div[contenteditable="true"][data-tab]'))
      .find(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 80 && rect.height > 12;
      });
    const sendButton = document.querySelector('button[aria-label*="Enviar" i], button[aria-label*="Send" i], span[data-icon="send"]')?.closest('button')
      || document.querySelector('[data-testid="send"]')?.closest('button');
    const invalid = /n(?:\u00fa|u)mero de telefone compartilhado por url (?:\u00e9|e) inv(?:\u00e1|a)lido|phone number shared via url is invalid|n(?:\u00fa|u)mero inv(?:\u00e1|a)lido|n(?:\u00e3|a)o est(?:\u00e1|a) no whatsapp|not on whatsapp/i.test(`${bodyText}\n${dialogText}`);
    return {
      hasComposer: Boolean(composer),
      hasSendButton: Boolean(sendButton),
      invalid,
      bodyText: `${bodyText}\n${dialogText}`.slice(0, 1200),
    };
  });
}

async function sendPreparedMessage(page) {
  const result = await page.evaluate(() => {
    const button = document.querySelector('button[aria-label*="Enviar" i], button[aria-label*="Send" i], span[data-icon="send"]')?.closest('button')
      || document.querySelector('[data-testid="send"]')?.closest('button');
    if (!button) return { success: false, error: 'Botao Enviar nao encontrado.' };
    button.click();
    return { success: true };
  });
  if (!result.success) {
    await page.keyboard.press('Enter');
    return { success: true, fallback: 'enter' };
  }
  return result;
}

async function readConversationEvidence(page) {
  return await page.evaluate(async () => {
    const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
    const toDataUrl = blob => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('Falha ao ler blob.'));
      reader.readAsDataURL(blob);
    });
    const main = document.querySelector('#main') || document.querySelector('[data-testid="conversation-panel-wrapper"]') || document.body;
    const bodyText = main?.innerText || '';
    const links = Array.from(main.querySelectorAll('a[href]')).map(anchor => ({
      text: clean(anchor.innerText || anchor.textContent || ''),
      href: anchor.href,
    }));
    const media = [];
    const imageNodes = Array.from(main.querySelectorAll('img'));
    for (const img of imageNodes) {
      const rect = img.getBoundingClientRect();
      const src = img.currentSrc || img.src || '';
      if (!src || rect.width < 140 || rect.height < 80) continue;
      if (/emoji|avatar|profile|pps|favicon|sprite/i.test(src)) continue;
      const container = img.closest('[role="row"], [data-id], div[class*="message"], div');
      const context = clean(container?.innerText || img.alt || '');
      let dataUrl = '';
      let mime = '';
      let byteLength = 0;
      try {
        const response = await fetch(src);
        const blob = await response.blob();
        mime = blob.type || 'image/jpeg';
        byteLength = blob.size || 0;
        if (/^image\//i.test(mime) && byteLength > 0 && byteLength <= 8_000_000) {
          dataUrl = await toDataUrl(blob);
        }
      } catch (error) {
        media.push({
          kind: 'image',
          srcKind: src.startsWith('blob:') ? 'blob' : src.startsWith('data:') ? 'data' : 'url',
          context,
          rect: { width: Math.round(rect.width), height: Math.round(rect.height) },
          error: String(error?.message || error),
        });
        continue;
      }
      media.push({
        kind: 'image',
        srcKind: src.startsWith('blob:') ? 'blob' : src.startsWith('data:') ? 'data' : 'url',
        context,
        rect: { width: Math.round(rect.width), height: Math.round(rect.height) },
        mime,
        byteLength,
        dataUrl,
      });
      if (media.length >= 6) break;
    }

    const documents = [];
    const docNodes = Array.from(main.querySelectorAll('a[href], button, [role="button"]'));
    for (const node of docNodes) {
      const text = clean(node.innerText || node.textContent || node.getAttribute?.('aria-label') || '');
      const href = node.href || node.querySelector?.('a[href]')?.href || '';
      if (!/pdf|documento|arquivo|card(?:\u00e1|a)pio|menu/i.test(`${text} ${href}`)) continue;
      let dataUrl = '';
      let mime = '';
      let byteLength = 0;
      if (href && /^blob:|^data:/i.test(href)) {
        try {
          const response = await fetch(href);
          const blob = await response.blob();
          mime = blob.type || 'application/octet-stream';
          byteLength = blob.size || 0;
          if (byteLength > 0 && byteLength <= 15_000_000) dataUrl = await toDataUrl(blob);
        } catch {}
      }
      documents.push({ kind: 'document', text, href, mime, byteLength, dataUrl });
      if (documents.length >= 4) break;
    }

    const title = main.querySelector('header span[title]')?.getAttribute('title')
      || main.querySelector('header')?.innerText?.split('\n')?.[0]
      || document.title
      || '';
    return {
      title,
      url: location.href,
      text: bodyText,
      excerpt: bodyText.slice(-5000),
      links,
      media,
      documents,
    };
  });
}

function analyzeConversationEvidence(conversation) {
  const linkUrls = [
    ...conversation.links.map(link => link.href),
    ...(conversation.text.match(/https?:\/\/[^\s<>"')]+/gi) || []),
  ].map(normalizeUrl).filter(Boolean);
  const uniqueUrls = [...new Set(linkUrls)];
  const menuLinks = uniqueUrls.filter(isMenuUrl);
  const whatsappPhones = uniqueUrls.map(extractWhatsappPhone).filter(phone => phone.length >= 10);
  const textPhones = [...conversation.text.matchAll(/(?:\+?55\s*)?\(?\d{2}\)?\s*9?\d{4}[-\s.]?\d{4}/g)]
    .map(match => {
      const phone = String(match[0] || '').replace(/\D/g, '');
      if (phone.startsWith('55')) return phone;
      if (phone.length >= 10 && phone.length <= 11) return `55${phone}`;
      return phone;
    })
    .filter(phone => phone.length >= 12);
  const redirectSignals = /novo whatsapp|novo canal|n(?:\u00fa|u)mero n(?:\u00e3|a)o ser(?:\u00e1|a) mais utilizado|utilize agora|direcionado diretamente|telefone.*loja/i.test(conversation.text);
  const menuTextSignal = /card(?:\u00e1|a)pio|menu|esfiha|pizza|hamb[u\u00fa]rguer|hamburguer|lanche|combo|marmita|bebida|pastel|a(?:\u00e7|c)a(?:\u00ed|i)|pre(?:\u00e7|c)o|r\$/i;
  const mediaItems = (conversation.media || [])
    .filter(item => item.dataUrl && item.byteLength > 0)
    .filter(item => menuTextSignal.test(`${item.context} ${conversation.excerpt}`) || (item.rect?.width >= 220 && item.rect?.height >= 120));
  const documentItems = (conversation.documents || [])
    .filter(item => item.dataUrl || normalizeUrl(item.href))
    .filter(item => /pdf|card(?:\u00e1|a)pio|menu/i.test(`${item.text} ${item.href} ${item.mime}`));
  const newPhones = [...new Set([...whatsappPhones, ...textPhones])];
  let status = 'no_menu_evidence';
  if (menuLinks.length) status = 'link_menu_received';
  else if (documentItems.length) status = 'document_menu_received';
  else if (mediaItems.length) status = 'image_menu_received';
  else if (redirectSignals && newPhones.length) status = 'redirect_received';
  return {
    status,
    menuLinks,
    newPhones,
    redirectSignals,
    mediaItems,
    documentItems,
    linkCount: uniqueUrls.length,
  };
}

async function uploadEvidenceFiles(entry, analysis, existingFingerprints = new Set()) {
  const uploads = [];
  const allItems = [
    ...analysis.mediaItems.map(item => ({ ...item, evidenceKind: 'image' })),
    ...analysis.documentItems.map(item => ({ ...item, evidenceKind: 'document' })),
  ];
  for (let index = 0; index < allItems.length; index += 1) {
    const item = allItems[index];
    if (!item.dataUrl) continue;
    const parsed = dataUrlToBuffer(item.dataUrl);
    if (!parsed?.buffer?.length) continue;
    const fingerprint = `${parsed.mime}:${parsed.buffer.length}:${item.dataUrl.slice(0, 96)}`;
    if (existingFingerprints.has(fingerprint)) continue;
    const ext = mimeToExtension(parsed.mime, item.evidenceKind === 'document' ? 'pdf' : 'jpg');
    const storagePath = `whatsapp-menus/${entry.restaurant_id}/${Date.now()}-${index}.${ext}`;
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, parsed.buffer, {
        contentType: parsed.mime,
        cacheControl: '3600',
        upsert: true,
      });
    if (error) {
      uploads.push({ kind: item.evidenceKind, error: error.message, context: item.context || item.text || '', fingerprint });
      continue;
    }
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
    uploads.push({
      kind: item.evidenceKind,
      storagePath,
      publicUrl: data.publicUrl,
      mime: parsed.mime,
      byteLength: parsed.buffer.length,
      context: item.context || item.text || '',
      fingerprint,
    });
  }
  return uploads;
}

async function saveResponseEvidence(entry, conversation, analysis) {
  if (analysis.status === 'no_menu_evidence') return null;
  const row = await getRestaurantState(entry);
  if (!row) return null;
  const previousLogs = parseJson(row.coleta_logs);
  const previousResponseLog = previousLogs[RESPONSE_LOG_KEY] || {};
  const existingFingerprints = new Set((previousResponseLog.mediaEvidence || []).map(item => item.fingerprint).filter(Boolean));
  const uploaded = await uploadEvidenceFiles(entry, analysis, existingFingerprints);
  const now = new Date().toISOString();
  const nextResponseLog = {
    ...previousResponseLog,
    checkedAt: now,
    source: 'visible_whatsapp_web',
    conversationTitle: normalizeText(conversation.title),
    status: analysis.status,
    menuLinks: [...new Set([...(previousResponseLog.menuLinks || []), ...analysis.menuLinks])],
    newPhones: [...new Set([...(previousResponseLog.newPhones || []), ...analysis.newPhones])],
    redirectSignals: Boolean(previousResponseLog.redirectSignals || analysis.redirectSignals),
    mediaEvidence: [...(previousResponseLog.mediaEvidence || []), ...uploaded],
    linkCount: analysis.linkCount,
    excerpt: conversation.excerpt.slice(-1800),
  };
  const update = {
    coleta_logs: {
      ...previousLogs,
      [RESPONSE_LOG_KEY]: nextResponseLog,
    },
    menu_last_checked_at: now,
  };

  if (analysis.menuLinks.length) {
    update.other_url = analysis.menuLinks[0];
    update.external_url = analysis.menuLinks[0];
    update.other_url_label = 'Cardapio recebido via WhatsApp';
    update.menu_status = 'needs_recollection';
    update.menu_status_reason = 'Link de cardapio recebido via WhatsApp; aguardando coleta estruturada.';
  } else if (uploaded.length || analysis.documentItems.length || analysis.mediaItems.length) {
    update.menu_status = 'needs_recollection';
    update.menu_status_reason = 'Cardapio recebido como imagem/PDF via WhatsApp; aguardando extracao estruturada.';
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

  const { error } = await supabase.from('restaurants').update(update).eq('id', row.id);
  if (error) throw error;
  return { status: analysis.status, uploadedCount: uploaded.length, menuLinks: analysis.menuLinks.length, newPhones: analysis.newPhones.length };
}

async function captureCurrentConversationResponse(page, entry, label = 'resposta') {
  if (!CAPTURE_RESPONSES) return null;
  const conversation = await readConversationEvidence(page);
  const analysis = analyzeConversationEvidence(conversation);
  const saved = await saveResponseEvidence(entry, conversation, analysis);
  if (saved) {
    console.log(`[whatsapp] ${label} salva para ${entry.name}: ${saved.status}, links=${saved.menuLinks}, midias=${saved.uploadedCount}, telefones=${saved.newPhones}`);
  }
  return saved;
}

async function waitForSendPace(lastSentAt) {
  if (!lastSentAt || !SEND_INTERVAL_MS) return;
  const elapsed = Date.now() - lastSentAt;
  const jitter = SEND_JITTER_MS ? Math.round((Math.random() * 2 - 1) * SEND_JITTER_MS) : 0;
  const target = Math.max(10000, SEND_INTERVAL_MS + jitter);
  const remaining = target - elapsed;
  if (remaining > 0) {
    console.log(`[whatsapp] aguardando ${Math.ceil(remaining / 1000)}s para manter cadencia media de ${Math.round(SEND_INTERVAL_MS / 1000)}s`);
    await sleep(remaining);
  }
}

async function waitForOpenPace(lastOpenAt) {
  if (!lastOpenAt || !OPEN_INTERVAL_MS) return;
  const elapsed = Date.now() - lastOpenAt;
  const remaining = OPEN_INTERVAL_MS - elapsed;
  if (remaining > 0) await sleep(remaining);
}

async function main() {
  const browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null, protocolTimeout: 180000 });
  const results = [];
  let lastSentAt = 0;
  let lastOpenAt = 0;
  try {
    const page = await findOrCreateWhatsappPage(browser);
    await waitForWhatsappReady(page);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      const row = await getRestaurantState(entry);
      if (isAlreadySent(row)) {
        results.push({ restaurant_id: entry.restaurant_id, name: entry.name, status: 'skipped_already_sent' });
        console.log(`[whatsapp] ${index + 1}/${entries.length} pulando ja enviado: ${entry.name}`);
        const sentStatus = parseJson(row?.coleta_logs)?.[LOG_KEY]?.status;
        if (CAPTURE_SKIPPED && sentStatus === 'sent') {
          await waitForOpenPace(lastOpenAt);
          await openExistingChat(page, entry);
          lastOpenAt = Date.now();
          await sleep(RESPONSE_WAIT_MS);
          await captureCurrentConversationResponse(page, entry, 'resposta de envio anterior');
        }
        continue;
      }
      console.log(`[whatsapp] ${index + 1}/${entries.length} abrindo ${entry.name} (${entry.normalized_phone})`);
      await waitForOpenPace(lastOpenAt);
      await openChat(page, entry);
      lastOpenAt = Date.now();
      let state = await getChatState(page);
      for (let waitAttempt = 0; waitAttempt < 8 && !state.invalid && (!state.hasComposer || (SEND && !state.hasSendButton)); waitAttempt += 1) {
        await sleep(1000);
        state = await getChatState(page);
      }
      if (state.invalid) {
        await dismissBlockingDialog(page);
        await updateAttempt(entry, 'invalid_phone');
        results.push({ restaurant_id: entry.restaurant_id, name: entry.name, status: 'invalid_phone' });
        console.log(`[whatsapp] telefone invalido: ${entry.name}`);
        continue;
      }
      if (!state.hasComposer || (SEND && !state.hasSendButton)) {
        await updateAttempt(entry, 'chat_not_ready', { excerpt: state.bodyText });
        results.push({ restaurant_id: entry.restaurant_id, name: entry.name, status: 'chat_not_ready', excerpt: state.bodyText });
        console.log(`[whatsapp] chat nao pronto: ${entry.name}`);
        continue;
      }
      if (SEND) {
        await waitForSendPace(lastSentAt);
        const sent = await sendPreparedMessage(page);
        await sleep(1200);
        await updateAttempt(entry, sent.success ? 'sent' : 'send_failed', { sendResult: sent });
        if (sent.success) lastSentAt = Date.now();
        results.push({ restaurant_id: entry.restaurant_id, name: entry.name, status: sent.success ? 'sent' : 'send_failed', sendResult: sent });
        console.log(`[whatsapp] enviado: ${entry.name}`);
        if (sent.success && CAPTURE_RESPONSES) {
          await sleep(RESPONSE_WAIT_MS);
          await captureCurrentConversationResponse(page, entry, 'resposta imediata');
        }
      } else {
        await updateAttempt(entry, 'prepared_only');
        results.push({ restaurant_id: entry.restaurant_id, name: entry.name, status: 'prepared_only' });
        console.log(`[whatsapp] mensagem preparada, nao enviada: ${entry.name}`);
      }
      await sleep(900);
    }
  } finally {
    await browser.disconnect();
  }
  console.log(JSON.stringify({ success: true, send: SEND, count: results.length, results }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
