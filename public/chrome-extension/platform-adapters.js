'use strict';

const FilterFoodPlatformAdapters = (() => {
  const text = value => String(value || '').replace(/\s+/g, ' ').trim();
  const translated = value => typeof value === 'object' && value ? text(value.pt || value['pt-BR'] || value.en || Object.values(value)[0]) : text(value);
  const externalId = value => text(value?._id || value?.id || value?.id_product || value?.id_item || value?.id_store_item || value?.id_store_choice_item || value?.id_store_item_variation || value?.uuid) || null;
  const positive = value => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
  const cents = value => positive(value) == null ? null : Number(value) / 100;
  const parseTextPrice = value => {
    const match = text(value).match(/(?:R\$\s*)?(\d{1,4}[.,]\d{2})/i);
    return match ? Number(match[1].replace(',', '.')) : null;
  };

  function liveMenuOptions(item) {
    return (item.options || []).flatMap((option, index) => {
      const name = translated(option.name || option.descript || option.wineVolume?.name || option.wineVolume?.value || `Opção ${index + 1}`);
      const optionPrice = cents(option.promoPriceEnabled && positive(option.promoPrice) ? option.promoPrice : option.price);
      const children = option.sons || option.subitems || [];
      const base = { external_id: externalId(option), group_name: translated(option.groupName || option.group || 'Opções'), name, price: optionPrice, price_delta: option.relativePrice ? optionPrice : null, is_required: false, raw_data: option };
      return [base, ...children.map(child => ({ external_id: externalId(child), group_name: name, name: translated(child.name), price: cents(child.price), price_delta: child.relativePrice ? cents(child.price) : null, is_required: false, raw_data: child }))];
    });
  }

  function resolveLiveMenuPrice(item, inheritedPrice) {
    const direct = cents(item.promoPriceEnabled && positive(item.promoPrice) ? item.promoPrice : item.price);
    const options = liveMenuOptions(item).map(option => option.price).filter(value => value != null);
    if (direct != null) return { price: direct, price_min: direct, price_max: direct, price_type: 'fixed', price_source: item.promoPriceEnabled ? 'promoPrice' : 'item.price' };
    if (options.length) {
      const min = Math.min(...options), max = Math.max(...options);
      return { price: null, price_min: min, price_max: max, price_type: min === max ? 'option_only' : 'range', price_source: 'item.options' };
    }
    if (inheritedPrice != null) return { price: null, price_min: inheritedPrice, price_max: inheritedPrice, price_type: 'included', price_source: 'parent_menu' };
    return { price: null, price_min: null, price_max: null, price_type: 'unknown', price_source: null };
  }

  function normalizeLiveMenu(payload, sourceUrl) {
    const categories = [];
    const walk = (node, ancestors = [], inheritedPrices = []) => {
      const nodeName = translated(node.name) || 'Cardápio';
      const categoryPath = [...ancestors, nodeName].filter(Boolean);
      const inheritedPrice = parseTextPrice(nodeName) || parseTextPrice(translated(node.descript)) || inheritedPrices.find(Boolean) || null;
      const directItems = node.menuItems || [];
      if (directItems.length) {
        categories.push({
          external_id: externalId(node), name: categoryPath.join(' / '), order_index: categories.length,
          items: directItems.map((item, index) => ({
            external_id: externalId(item), name: translated(item.name), description: translated(item.descript), image_url: item.avatarUrl || null,
            ...resolveLiveMenuPrice(item, inheritedPrice), options: liveMenuOptions(item), order_index: index,
            source_url: sourceUrl, raw_data: { ...item, parent_menu: ancestors[0] || null, category_path: categoryPath }, extraction_confidence: 0.99, needs_review: resolveLiveMenuPrice(item, inheritedPrice).price_type === 'unknown'
          }))
        });
      }
      for (const child of node.menus || []) walk(child, categoryPath, [inheritedPrice, ...inheritedPrices].filter(value => value != null));
    };
    for (const root of Array.isArray(payload) ? payload : [payload]) walk(root, []);
    return categories.filter(category => category.items.length);
  }

  function saiposName(node) {
    return text(node?.name || node?.product_name || node?.desc_product || node?.description_product || node?.desc_item || node?.desc_store_item_delivery || node?.desc_store_item || node?.desc_store_choice_item_deli || node?.desc_store_choice_item || node?.title);
  }
  function saiposPrice(node) {
    const value = node?.promotional_price ?? node?.promo_price ?? node?.sale_price ?? node?.price ?? node?.aditional_price ?? node?.additional_price ?? node?.unit_price ?? node?.value;
    if (positive(value) == null) return null;
    // A API Saipos normalmente usa decimal; inteiros muito grandes podem vir em centavos.
    return Number(value) > 1000 && Number.isInteger(Number(value)) ? Number(value) / 100 : Number(value);
  }
  function saiposOptions(node, resolvedChoices = []) {
    const variationOptions = (node.variations || []).filter(variation => variation.enabled !== 'N').map((variation, index) => ({
      external_id: externalId(variation), group_name: 'Variações',
      name: text(variation.variation?.desc_store_variation_delivery || variation.variation?.desc_store_variation || `Variação ${index + 1}`),
      price: saiposPrice(variation), price_delta: null, min_quantity: 0, max_quantity: 1,
      is_required: (node.variations || []).length > 1, order_index: Number(variation.order ?? index), raw_data: variation
    }));
    const groups = [...resolvedChoices, ...(node.add_ons || node.addons || node.complements || node.complement_groups || node.options || [])];
    const choiceOptions = groups.flatMap((group, groupIndex) => {
      const children = group.choice_items || group.subitems || group.items || group.options || group.products || [];
      return children.map((option, index) => {
        const variationPrices = (option.variations || []).map(saiposPrice).filter(value => value != null);
        const optionPrice = saiposPrice(option) ?? (variationPrices.length ? Math.min(...variationPrices) : null);
        return {
          external_id: externalId(option), group_name: text(group.desc_store_choice_delivery || group.desc_store_choice || group.name || group.description || `Opções ${groupIndex + 1}`),
          name: saiposName(option), description: text(option.detail) || null, price: optionPrice, price_delta: optionPrice,
          min_quantity: Number(group.min_choices ?? group.min ?? group.minimum ?? 0), max_quantity: Number(group.max_choices ?? group.max ?? group.maximum ?? 0) || null,
          is_required: Number(group.min_choices ?? group.min ?? 0) > 0, order_index: Number(option.order ?? index), raw_data: option
        };
      }).filter(option => option.name);
    });
    return [...variationOptions, ...choiceOptions];
  }

  function normalizeSaipos(networkEntries, transferState, sourceUrl) {
    const categoryNames = new Map();
    const store = transferState?.store || transferState || {};
    const rawCategories = text(store.categories || '').split('**');
    for (const raw of rawCategories) {
      const match = raw.match(/^(\d+)##(.+)$/);
      if (match) categoryNames.set(match[1], text(match[2]));
    }
    const choiceMap = new Map();
    for (const entry of networkEntries || []) {
      for (const choice of entry.body?.choices || []) choiceMap.set(String(choice.id_store_choice), choice);
    }
    const candidates = [];
    const visited = new WeakSet();
    const walk = (value, context = {}) => {
      if (!value || typeof value !== 'object') return;
      if (visited.has(value)) return;
      visited.add(value);
      if (Array.isArray(value)) { value.forEach(item => walk(item, context)); return; }
      const name = saiposName(value);
      const idCategory = text(value.id_category || value.category_id || value.id_product_category || value.id_store_category_item || context.idCategory);
      const looksProduct = Boolean(name && (value.id_product || value.id_item || value.id_store_item || value.product_name || value.desc_product));
      if (looksProduct) candidates.push({ node: value, categoryId: idCategory, categoryName: text(value.category_name || value.category?.name || value.category_item?.desc_store_category_item || context.categoryName) });
      const nextContext = { idCategory: idCategory || context.idCategory, categoryName: text(value.category_name || value.name_category || value.category_item?.desc_store_category_item || context.categoryName) };
      Object.values(value).forEach(child => walk(child, nextContext));
    };
    for (const entry of networkEntries || []) walk(entry.body);

    const grouped = new Map();
    const seen = new Set();
    for (const candidate of candidates) {
      const item = candidate.node;
      if (item.category_item?.enabled === 'N') continue;
      if (categoryNames.size && candidate.categoryId && !categoryNames.has(candidate.categoryId)) continue;
      const key = externalId(item) || `${saiposName(item)}:${candidate.categoryId}`;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const resolvedChoices = (item.choices || []).map(reference => choiceMap.get(String(reference.id_store_choice))).filter(Boolean);
      const options = saiposOptions(item, resolvedChoices);
      const variationPrices = (item.variations || []).filter(variation => variation.enabled !== 'N').map(saiposPrice).filter(value => value != null && value > 0);
      const directPrice = saiposPrice(item) ?? (variationPrices.length === 1 ? variationPrices[0] : null);
      const optionPrices = options.filter(option => option.group_name !== 'Variações' || directPrice == null).map(option => option.price).filter(value => value != null && value > 0);
      const allPrices = [directPrice, ...variationPrices, ...optionPrices].filter(value => value != null && value > 0);
      const min = allPrices.length ? Math.min(...allPrices) : null;
      const max = allPrices.length ? Math.max(...allPrices) : null;
      const priceType = directPrice != null && min === max ? 'fixed' : allPrices.length ? (min === max ? 'option_only' : 'range') : 'unknown';
      const categoryName = candidate.categoryName || categoryNames.get(candidate.categoryId) || 'Cardápio';
      if (!grouped.has(categoryName)) grouped.set(categoryName, []);
      grouped.get(categoryName).push({ external_id: externalId(item), name: saiposName(item), description: text(item.description || item.desc_product_details || item.detail || item.details), image_url: item.image_url || item.photo || item.url_image || (item.img_path ? `https://static.saipos.com/${item.img_path}` : null), price: directPrice, price_min: min, price_max: max, price_type: priceType, price_source: directPrice != null ? 'api.item' : optionPrices.length ? 'api.options' : null, options, source_url: sourceUrl, raw_data: item, extraction_confidence: priceType === 'unknown' ? 0.82 : 0.98, needs_review: priceType === 'unknown' });
    }
    return [...grouped.entries()].map(([name, items], index) => ({ name, order_index: index, items }));
  }

  function parseTransferState(html) {
    const match = String(html || '').match(/<script id="ng-state" type="application\/json">([\s\S]*?)<\/script>/i);
    if (!match) return null;
    try {
      const state = JSON.parse(match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
      for (const value of Object.values(state)) {
        const body = value?.b;
        if (Array.isArray(body) && body[0]?.id_store) return { store: body[0], raw: state };
      }
      return { raw: state };
    } catch (_) { return null; }
  }

  async function collectSaipos(url) {
    const html = await (await fetch(url)).text();
    const transferState = parseTransferState(html);
    const previous = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = await chrome.tabs.create({ url, active: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 4000));
      await chrome.scripting.executeScript({
        target: { tabId: tab.id }, world: 'MAIN',
        func: async () => {
          const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
          for (const element of document.querySelectorAll('button, [role="button"], a')) {
            const label = normalize(element.textContent);
            if (label.includes('quero continuar aqui') || label.includes('apenas visualizar') || label === 'continuar') {
              try { element.click(); } catch (_) {}
            }
          }
          await new Promise(resolve => setTimeout(resolve, 1500));
          for (let pass = 0; pass < 8; pass++) {
            window.scrollBy(0, Math.max(600, window.innerHeight));
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          window.scrollTo(0, 0);
        }
      });
      await new Promise(resolve => setTimeout(resolve, 5000));
      const result = await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN', func: () => window.__FILTERFOOD_MENU_NETWORK__ || [] });
      const networkEntries = result[0]?.result || [];
      const categories = normalizeSaipos(networkEntries, transferState, url);
      return { platform: 'saipos', categories, networkEntries: networkEntries.map(entry => ({ url: entry.url, status: entry.status })), rawTransferState: transferState?.store || null };
    } finally {
      try { await chrome.tabs.remove(tab.id); } catch (_) {}
      if (previous[0]?.id) try { await chrome.tabs.update(previous[0].id, { active: true }); } catch (_) {}
    }
  }

  function canonicalizeLegacy(categories, sourceUrl) {
    return (categories || []).map((category, categoryIndex) => ({
      external_id: externalId(category), name: text(category.name || category.nome || category.category_name || 'Cardápio'), order_index: categoryIndex,
      items: (category.items || category.itens || []).map((item, itemIndex) => {
        const itemPrice = positive(item.price ?? item.preco);
        return { external_id: externalId(item), name: text(item.name || item.nome), description: text(item.description || item.descricao), image_url: item.image_url || item.foto_url || null, price: itemPrice, price_min: itemPrice, price_max: itemPrice, price_type: itemPrice != null ? 'fixed' : 'unknown', price_source: itemPrice != null ? 'platform_adapter' : null, options: item.options || [], order_index: itemIndex, source_url: sourceUrl, raw_data: item, extraction_confidence: itemPrice != null ? 0.97 : 0.85, needs_review: itemPrice == null };
      }).filter(item => item.name)
    })).filter(category => category.items.length);
  }

  function cardapioWebPrice(value) {
    const number = positive(value);
    if (number == null) return null;
    return number > 1000 && Number.isInteger(number) ? Number(number) / 100 : Number(number);
  }

  function normalizeCardapioWeb(payload, sourceUrl) {
    const categories = [];
    for (const category of Array.isArray(payload) ? payload : []) {
      if (category.status && category.status !== 'ACTIVE') continue;
      const items = [];
      for (const item of category.items || []) {
        if (item.status && item.status !== 'ACTIVE') continue;
        const directPrice = cardapioWebPrice(item.promotional_price_active ? item.promotional_price : item.price);
        const options = [];
        for (const group of item.add_ons || item.addons || item.options || []) {
          if (group.status && group.status !== 'ACTIVE') continue;
          const children = group.subitems || group.items || group.options || [];
          children.forEach((option, index) => {
            if (option.status && option.status !== 'ACTIVE') return;
            options.push({
              external_id: externalId(option),
              group_name: text(group.name || group.title || 'Opcionais'),
              name: text(option.name || option.title),
              description: text(option.description),
              price: cardapioWebPrice(option.price),
              price_delta: cardapioWebPrice(option.price),
              min_quantity: Number(group.min || group.minimum || group.min_quantity || 0),
              max_quantity: Number(group.max || group.maximum || group.max_quantity || 0) || null,
              is_required: Number(group.min || group.minimum || group.min_quantity || 0) > 0,
              order_index: Number(option.order || option.position || index),
              raw_data: option
            });
          });
        }
        const optionPrices = options.map(option => option.price).filter(value => value != null && value > 0);
        const allPrices = [directPrice, ...optionPrices].filter(value => value != null && value > 0);
        const min = allPrices.length ? Math.min(...allPrices) : null;
        const max = allPrices.length ? Math.max(...allPrices) : null;
        items.push({
          external_id: externalId(item),
          name: text(item.name || item.title),
          description: text(item.description),
          image_url: item.image_url || item.thumbnail_url || item.image || null,
          price: directPrice,
          price_min: min,
          price_max: max,
          price_type: directPrice != null ? 'fixed' : optionPrices.length ? (min === max ? 'option_only' : 'range') : 'unknown',
          price_source: directPrice != null ? 'api.item' : optionPrices.length ? 'api.options' : null,
          options,
          source_url: sourceUrl,
          raw_data: item,
          extraction_confidence: allPrices.length ? 0.98 : 0.84,
          needs_review: !allPrices.length
        });
      }
      if (items.length) {
        categories.push({
          external_id: externalId(category),
          name: text(category.name || category.title || 'Cardápio'),
          order_index: categories.length,
          items
        });
      }
    }
    return categories;
  }

  async function collectCardapioWeb(url) {
    const previous = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = await chrome.tabs.create({ url, active: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 4500));
      const detailsResult = await chrome.scripting.executeScript({
        target: { tabId: tab.id }, world: 'MAIN',
        func: () => {
          const readStorage = keys => {
            for (const key of keys) {
              try {
                const value = localStorage.getItem(key) || sessionStorage.getItem(key);
                if (value) return value;
              } catch (_) {}
            }
            return '';
          };
          const bodyText = String(document.body?.innerText || '');
          const scripts = Array.from(document.scripts || []).map(script => script.textContent || '').join('\n').slice(0, 300000);
          const blob = [location.href, bodyText, scripts].join('\n');
          const companyId =
            window.companyId ||
            readStorage(['company-id', 'companyId', '@cardapio-web-menu/company_id']) ||
            (blob.match(/company[-_ ]?id["']?\s*[:=]\s*["']?([0-9]+)/i) || [])[1] ||
            '';
          const companySlug =
            window.companySlug ||
            readStorage(['company', 'companySlug', '@cardapio-web-menu/company']) ||
            (blob.match(/companySlug["']?\s*[:=]\s*["']?([a-z0-9._-]+)/i) || [])[1] ||
            location.pathname.split('/').filter(Boolean).pop() ||
            '';
          return { companyId: String(companyId || ''), companySlug: String(companySlug || '') };
        }
      });
      const details = detailsResult[0]?.result || {};
      if (!details.companySlug || !details.companyId) {
        throw new Error('Cardápio Web sem company/company-id detectável.');
      }
      const sessionid = `session_${Math.random().toString(36).slice(2, 11)}`;
      const endpoint = 'https://integracao.cardapioweb.com/api/menu/company/categories?only_available_for=delivery&origin=catalogo';
      const response = await fetch(endpoint, {
        headers: {
          company: details.companySlug,
          'company-id': String(details.companyId),
          sessionid
        }
      });
      if (!response.ok) throw new Error(`Cardápio Web API ${response.status}`);
      const categories = normalizeCardapioWeb(await response.json(), url);
      return { platform: 'cardapio_web', categories, sourceUrl: endpoint, rawDetails: details };
    } finally {
      try { await chrome.tabs.remove(tab.id); } catch (_) {}
      if (previous[0]?.id) try { await chrome.tabs.update(previous[0].id, { active: true }); } catch (_) {}
    }
  }

  function parseVisibleTextMenu(rawText, sourceUrl) {
    const lines = String(rawText || '')
      .split(/\n+/)
      .map(line => text(line))
      .filter(line => line && line.length <= 220)
      .filter(line => !/^(buscar|início|inicio|pedidos|perfil|sacola|subtotal|total|voltar|adicionar|finalizar|entrar|login|cadastro|cep|calcular taxa|sua sacola|sacola vazia|pedido mínimo|entrega|retirada|delivery|whatsapp|menu|horários?|reportar algo)$/i.test(line));
    const categories = [];
    let current = { name: 'Cardápio', order_index: 0, items: [] };
    const flush = () => {
      if (current.items.length) categories.push(current);
      current = { name: 'Cardápio', order_index: categories.length, items: [] };
    };
    const categoryLike = line => {
      if (/(r\$\s*)?\d{1,4}[,.]\d{2}/i.test(line) || line.length > 54) return false;
      const letters = line.replace(/[^A-Za-zÀ-ÿ]/g, '');
      if (letters.length < 4) return false;
      return line === line.toUpperCase() || /^categor[ií]a\s*\d+$/i.test(line) || /^(pizzas?|lanches?|hamb[uú]rguer|bebidas?|combos?|sobremesas?|promo[cç][oõ]es|promocionais|tradicionais|especiais|bordas|adicional|entradas?|por[cç][oõ]es|executivos?|massas?|salgados?|a[cç]a[ií]|past[eé]is|caf[eé]s?)$/i.test(line);
    };
    let pendingName = '';
    let pendingDescription = '';
    const addItem = (name, price, description = '') => {
      const cleanName = text(name).replace(/^(saiba mais|ver mais)\s*/i, '').trim();
      if (!cleanName || cleanName.length < 2 || /^(r\$|saiba mais|ver op[cç][oõ]es|adicionar)$/i.test(cleanName)) return;
      if (/^categor[ií]a\s*\d+$/i.test(cleanName) || /^(pizzas?|lanches?|hamb[uú]rguer|bebidas?|combos?|sobremesas?|promo[cç][oõ]es|promocionais|tradicionais|especiais|bordas|adicional|entradas?|por[cç][oõ]es|executivos?|massas?|salgados?|a[cç]a[ií]|past[eé]is|caf[eé]s?)$/i.test(cleanName)) return;
      if (/gerencie seu neg[oó]cio|card[aá]pio digital|chatbot|pdv|pedido m[ií]nimo|endere[cç]o|administrador|promo[cç][aã]o v[aá]lida/i.test(cleanName)) return;
      if (/(fechado|aberto|retirada|delivery|entrega|pedido m[ií]nimo|endere[cç]o|joão pessoa|brasil|\b\d{2,}\s*-\s*\d{2,}min)/i.test(description) && cleanName.split(/\s+/).length <= 3) return;
      if (/(fechado|aberto|retirada|delivery|entrega|pedido m[ií]nimo|endere[cç]o|joão pessoa|brasil|\b\d{2,}\s*-\s*\d{2,}min)/i.test(`${cleanName} ${description}`) && !/(combo|pizza|burger|hamb[uú]rguer|frango|carne|queijo|a[cç]a[ií]|pastel|bebida|refrigerante|batata|sushi|calabresa|mussarela|bacon|lombo|alho)/i.test(`${cleanName} ${description}`)) return;
      current.items.push({
        external_id: null,
        name: cleanName,
        description: text(description) || null,
        image_url: null,
        price,
        price_min: price,
        price_max: price,
        price_type: price != null ? 'fixed' : 'unknown',
        price_source: price != null ? 'visible_text' : null,
        options: [],
        order_index: current.items.length,
        source_url: sourceUrl,
        raw_data: { parser: 'visible_text', name: cleanName, price },
        extraction_confidence: price != null ? 0.78 : 0.55,
        needs_review: price == null
      });
    };
    for (const line of lines) {
      if (categoryLike(line)) {
        flush();
        current.name = line;
        pendingName = '';
        pendingDescription = '';
        continue;
      }
      const matches = [...line.matchAll(/(?:R\$\s*)?(\d{1,4}[,.]\d{2})/gi)];
      if (matches.length) {
        const match = matches[matches.length - 1];
        const price = Number(match[1].replace(',', '.'));
        const before = text(line.slice(0, match.index));
        const after = text(line.slice(match.index + match[0].length));
        addItem(before || pendingName, price, after || pendingDescription);
        pendingName = '';
        pendingDescription = '';
      } else if (!/saiba mais|adicionar|selecionar|escolha|obrigat[oó]rio/i.test(line)) {
        if (!pendingName) pendingName = line;
        else pendingDescription = text(`${pendingDescription} ${line}`);
      }
    }
    flush();
    return categories.filter(category => category.items.length);
  }

  async function collectVisibleTextMenu(url) {
    const previous = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = await chrome.tabs.create({ url, active: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 4500));
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async () => {
          const clickLabels = /aceitar|ok|entendi|continuar|ver card[aá]pio|apenas visualizar|quero continuar/i;
          for (const el of Array.from(document.querySelectorAll('button,[role="button"],a')).slice(0, 80)) {
            const label = String(el.textContent || el.getAttribute('aria-label') || '').trim();
            if (clickLabels.test(label)) { try { el.click(); } catch (_) {} }
          }
          await new Promise(resolve => setTimeout(resolve, 900));
          let lastHeight = 0;
          for (let i = 0; i < 22; i++) {
            window.scrollBy(0, Math.max(500, innerHeight * 0.75));
            await new Promise(resolve => setTimeout(resolve, 420));
            const height = document.documentElement.scrollHeight || document.body.scrollHeight || 0;
            if (height === lastHeight && window.scrollY + innerHeight >= height - 20 && i > 8) break;
            lastHeight = height;
          }
          window.scrollTo(0, 0);
        }
      });
      await new Promise(resolve => setTimeout(resolve, 2200));
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => ({ title: document.title, rawText: String(document.body?.innerText || ''), url: location.href })
      });
      const payload = result[0]?.result || {};
      const categories = parseVisibleTextMenu(payload.rawText, payload.url || url);
      const itemCount = categories.reduce((total, category) => total + category.items.length, 0);
      const pricedCount = categories.reduce((total, category) => total + category.items.filter(item => item.price != null).length, 0);
      return {
        platform: 'visible_text',
        categories,
        rawText: payload.rawText,
        sourceUrl: payload.url || url,
        title: payload.title,
        confidence: itemCount >= 5 && pricedCount >= 3 ? 0.74 : 0.45
      };
    } finally {
      try { await chrome.tabs.remove(tab.id); } catch (_) {}
      if (previous[0]?.id) try { await chrome.tabs.update(previous[0].id, { active: true }); } catch (_) {}
    }
  }

  async function extract(url) {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith('livemenu.app')) {
      const venueId = parsed.pathname.split('/').filter(Boolean).pop();
      if (!/^[a-f0-9]{24}$/i.test(venueId || '')) throw new Error('ID LiveMenu inválido.');
      const endpoint = `https://customers.tagme.com.br/dine-in/menu/${venueId}/Dine-in?ignoreDisabled=1`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`LiveMenu API ${response.status}`);
      const categories = normalizeLiveMenu(await response.json(), url);
      return { success: categories.length > 0, platform: 'livemenu_tagme', extractionLevel: 0, confidence: 0.99, categories, sourceUrl: endpoint };
    }
    if (parsed.hostname.endsWith('saipos.com')) {
      const result = await collectSaipos(url);
      return { success: result.categories.length > 0, extractionLevel: 0, confidence: result.categories.length ? 0.97 : 0, sourceUrl: url, ...result };
    }
    if (parsed.hostname.includes('anota.ai')) {
      const slug = parsed.pathname.split('/').filter(Boolean).pop();
      const response = await fetch(`https://api.anota.ai/v1/menu/merchant?slug=${encodeURIComponent(slug || '')}`);
      if (response.ok && typeof parseAnotaAiMenu === 'function') {
        const categories = canonicalizeLegacy(parseAnotaAiMenu(await response.json()), url);
        return { success: categories.length > 0, platform: 'anota_ai', extractionLevel: 0, confidence: 0.97, categories, sourceUrl: response.url };
      }
    }
    if (/cardapioweb|cardapio-web|cardapio\.menu/i.test(`${parsed.hostname}${parsed.pathname}`)) {
      const result = await collectCardapioWeb(url);
      return { success: result.categories.length > 0, extractionLevel: 0, confidence: result.categories.length ? 0.97 : 0, ...result };
    }
    if (parsed.hostname.endsWith('ola.click')) {
      let visible = await collectVisibleTextMenu(url);
      if (!visible.categories.length && !/\/products\/?$/i.test(parsed.pathname)) {
        const productsUrl = `${parsed.origin}/products`;
        visible = await collectVisibleTextMenu(productsUrl);
      }
      const itemCount = visible.categories.reduce((total, category) => total + category.items.length, 0);
      const pricedCount = visible.categories.reduce((total, category) => total + category.items.filter(item => item.price != null).length, 0);
      return {
        success: itemCount >= 5 && pricedCount >= 3,
        extractionLevel: 1,
        confidence: visible.confidence,
        ...visible,
        error: itemCount >= 5 && pricedCount >= 3 ? undefined : 'Cardápio visível insuficiente na Ola Click; requer fallback por IA/visual.'
      };
    }
    const visible = await collectVisibleTextMenu(url);
    const itemCount = visible.categories.reduce((total, category) => total + category.items.length, 0);
    const pricedCount = visible.categories.reduce((total, category) => total + category.items.filter(item => item.price != null).length, 0);
    return {
      success: itemCount >= 5 && pricedCount >= 3,
      extractionLevel: 1,
      confidence: visible.confidence,
      ...visible,
      error: itemCount >= 5 && pricedCount >= 3 ? undefined : 'Cardápio visível insuficiente; requer fallback por IA/visual.'
    };
  }

  return { extract, normalizeLiveMenu, normalizeSaipos, normalizeCardapioWeb, parseVisibleTextMenu };
})();

globalThis.FilterFoodPlatformAdapters = FilterFoodPlatformAdapters;
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message?.action !== 'extractMenuPlatform') return false;
  FilterFoodPlatformAdapters.extract(message.url).then(sendResponse).catch(error => sendResponse({ success: false, error: error.message }));
  return true;
});
