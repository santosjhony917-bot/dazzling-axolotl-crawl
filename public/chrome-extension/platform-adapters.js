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
  const isUnsafeMenuDestination = value => {
    try {
      const parsed = new URL(value);
      const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
      const pathAndQuery = `${parsed.pathname}${parsed.search}`.toLowerCase();
      if (['instagram.com', 'threads.net', 'threads.com', 'facebook.com', 'fb.com', 'tiktok.com', 'x.com', 'twitter.com', 'youtube.com', 'meta.ai', 'meta.com', 'about.meta.com'].some(domain => host === domain || host.endsWith('.' + domain))) return true;
      if (host.endsWith('anota.ai') && parsed.pathname.toLowerCase().startsWith('/m/')) return false;
      if (host.endsWith('anota.ai') && parsed.pathname.toLowerCase().startsWith('/login') && parsed.searchParams.get('access_token')) return false;
      return /\/(?:share|sharer|intent|login|auth|account|cart|checkout|promotions?|promos?|cashback|cupom|coupons?|fidelidade|loyalty|pagamento|payment|wallet|orders?|pedidos?|wp-json|feed\b|tag\/|author\/|category\/(?:bookkeeping|contabilidade|blog|noticias|news))|[?&](?:share|u|url)=https?%3a|[?&](?:tab|origin)=[^&]*(?:cashback|promo|cupom|coupon|fidelidade|payment|pagamento)/i.test(pathAndQuery);
    } catch (_) {
      return true;
    }
  };

  const normalizeLookupKey = value => text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

  const isUiLine = value => {
    const line = normalizeLookupKey(value);
    return !line
      || /^(detalhes do produto|pesquise pelo nome|pesquise|buscar|busque|inicio|início|pedidos|perfil|sacola|subtotal|total|adicionar|avancar|avançar|voltar|compartilhar|fechar|obrigatorio|obrigatório)$/i.test(line)
      || /^\d+\s*\/\s*\d+$/.test(line)
      || /^max\s*\d+$/i.test(line)
      || /^min\s*\d+$/i.test(line);
  };

  function parseChoiceLimits(line) {
    const normalized = normalizeLookupKey(line);
    const number = Number((normalized.match(/\d+/) || [0])[0] || 0);
    const isRequired = /obrigatorio|obrigatoria|required/.test(normalized);
    if (/ate/.test(normalized)) return { min_quantity: isRequired ? 1 : 0, max_quantity: number || null, is_required: isRequired };
    if (/escolha/.test(normalized) && number > 0) return { min_quantity: isRequired ? number : 0, max_quantity: number, is_required: isRequired };
    return { min_quantity: 0, max_quantity: null, is_required: isRequired };
  }

  function inferOptionSemantic(groupName) {
    const key = normalizeLookupKey(groupName);
    if (/sabor|sabores/.test(key)) return 'flavor';
    if (/borda|massa/.test(key)) return 'addon';
    if (/adicional|turbinar|extra|complemento|bacon|molho|queijo/.test(key)) return 'addon';
    if (/bebida|refri|suco/.test(key)) return 'combo_component';
    return /escolha/.test(key) ? 'required_choice' : 'addon';
  }

  const isNonMenuOperationalChoiceGroup = value => {
    const key = normalizeLookupKey(value);
    return /\b(descartavel|talher|guardanapo|canudo|sacola|embalagem|cpf|troco|nota fiscal|cupom fiscal|observacao|observacoes)\b/.test(key);
  };

  const isComboCompositionOnlyGroup = value => {
    const key = normalizeLookupKey(value);
    return /^(itens? inclusos?|composicao(?: do combo)?|conteudo(?: do combo)?|items? included)$/.test(key);
  };

  function sanitizeAnotaOptionGroups(groups = []) {
    const seen = new Set();
    return (Array.isArray(groups) ? groups : [])
      .map(group => {
        const name = text(group?.name || group?.group_name || '');
        if (!name || isNonMenuOperationalChoiceGroup(name) || isComboCompositionOnlyGroup(name)) return null;
        const items = (Array.isArray(group?.items) ? group.items : [])
          .filter(option => {
            const optionName = text(option?.name || option?.title || option?.label || '');
            if (!optionName) return false;
            if (isNonMenuOperationalChoiceGroup(`${name} ${optionName}`)) return false;
            return true;
          });
        if (!items.length) return null;
        return { ...group, name, items };
      })
      .filter(Boolean)
      .filter(group => {
        const optionSig = (group.items || [])
          .map(option => [
            normalizeLookupKey(option?.name || ''),
            option?.price ?? '',
            option?.price_delta ?? ''
          ].join(':'))
          .join('|');
        const key = [
          normalizeLookupKey(group.name),
          group.min_quantity ?? '',
          group.max_quantity ?? '',
          Boolean(group.is_required),
          optionSig
        ].join('::');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((group, index) => ({ ...group, order_index: index }));
  }

  function extractAnotaDetailFromRaw(rawText, url, imageUrl) {
    const lines = String(rawText || '')
      .split(/\n+/)
      .map(line => text(line))
      .filter(Boolean);

    const priceAt = index => parseTextPrice(lines[index] || '');
    const detailsIdx = lines.findIndex(line => /detalhes do produto/i.test(line));
    let itemName = '';
    let price = null;
    let priceIdx = -1;

    for (let i = Math.max(0, detailsIdx + 1); i < Math.min(lines.length, 12); i++) {
      if (isUiLine(lines[i])) continue;
      const nextPrice = priceAt(i + 1);
      if (nextPrice != null || priceAt(i) != null) {
        if (priceAt(i) != null) {
          price = priceAt(i);
          priceIdx = i;
        } else {
          itemName = lines[i];
          price = nextPrice;
          priceIdx = i + 1;
        }
        break;
      }
      if (!itemName && lines[i].length >= 3) itemName = lines[i];
    }

    if (!itemName && detailsIdx >= 0 && lines[detailsIdx + 1]) itemName = lines[detailsIdx + 1];
    if (price == null) {
      priceIdx = lines.findIndex(line => parseTextPrice(line) != null);
      price = priceIdx >= 0 ? parseTextPrice(lines[priceIdx]) : null;
    }

    const searchIdx = lines.findIndex((line, index) => index > priceIdx && /pesquise pelo nome/i.test(line));
    const firstGroupIdx = lines.findIndex((line, index) => {
      if (index <= priceIdx) return false;
      const next = lines[index + 1] || '';
      return /escolha/i.test(next) && !parseTextPrice(line) && !isUiLine(line);
    });
    const descriptionEnd = [searchIdx, firstGroupIdx].filter(index => index > priceIdx).sort((a, b) => a - b)[0] ?? -1;
    const description = descriptionEnd > priceIdx
      ? lines.slice(priceIdx + 1, descriptionEnd).filter(line => !isUiLine(line) && !parseTextPrice(line)).join(' ')
      : '';

    const start = searchIdx >= 0 ? searchIdx + 1 : Math.max(priceIdx + 1, 0);
    const groups = [];
    let currentGroup = null;

    const flushGroup = () => {
      if (currentGroup && currentGroup.items.length) groups.push(currentGroup);
      currentGroup = null;
    };

    for (let i = start; i < lines.length; i++) {
      const line = lines[i];
      const normalized = normalizeLookupKey(line);
      const next = lines[i + 1] || '';
      const isGroupHeader = !parseTextPrice(line)
        && !isUiLine(line)
        && (/escolha/i.test(next) || /^(massas?|bordas?|adicionais?|complementos?|bebidas?|sabores?|molhos?|vamos turbinar|bora de combo)/i.test(line));

      if (isGroupHeader) {
        flushGroup();
        const limits = parseChoiceLimits(next);
        currentGroup = {
          name: line,
          min_quantity: limits.min_quantity,
          max_quantity: limits.max_quantity,
          is_required: limits.is_required || /obrigat/i.test(`${next} ${lines[i + 2] || ''}`),
          semantic_type: inferOptionSemantic(line),
          price_behavior: 'price_delta',
          items: []
        };
        if (/escolha/i.test(next)) i += 1;
        continue;
      }

      if (!currentGroup) continue;
      if (isUiLine(line)) continue;
      if (/^alguma observ/i.test(normalized) || /^observa/.test(normalized)) break;
      if (parseTextPrice(line) != null) continue;

      const item = {
        name: line,
        description: '',
        price: null,
        price_delta: null,
        price_behavior: 'price_delta',
        semantic_type: currentGroup.semantic_type,
        is_searchable_variant: currentGroup.semantic_type === 'flavor'
      };

      const lookAhead = [];
      for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
        const candidate = lines[j];
        if (!candidate || isUiLine(candidate)) continue;
        if (!parseTextPrice(candidate) && /escolha/i.test(lines[j + 1] || '')) break;
        lookAhead.push({ index: j, line: candidate, price: parseTextPrice(candidate) });
      }
      const priceLine = lookAhead.find(entry => entry.price != null);
      if (priceLine) {
        item.price_delta = priceLine.price;
        item.price = priceLine.price;
      }
      const descLines = lookAhead
        .filter(entry => entry.price == null && !/^max\s*\d+$/i.test(normalizeLookupKey(entry.line)))
        .map(entry => entry.line);
      item.description = descLines.join(' ');
      currentGroup.items.push(item);
    }
    flushGroup();

    return {
      itemName: text(itemName),
      price,
      description: text(description),
      image_url: imageUrl || null,
      option_groups: groups,
      rawText,
      url
    };
  }

  function mergeDetailPagesIntoCategories(categories, detailPages) {
    if (!Array.isArray(detailPages) || !detailPages.length) return categories;
    const byKey = new Map();
    for (const detail of detailPages) {
      const key = normalizeLookupKey(detail.itemName);
      if (key) byKey.set(key, detail);
    }
    return (categories || []).map(category => ({
      ...category,
      items: (category.items || []).map(item => {
        const key = normalizeLookupKey(item.name);
        let detail = byKey.get(key);
        if (!detail) {
          detail = Array.from(byKey.entries()).find(([detailKey]) => detailKey.includes(key) || key.includes(detailKey))?.[1];
        }
        if (!detail) return item;
        const options = (detail.option_groups || []).flatMap((group, groupIndex) => (group.items || []).map((option, optionIndex) => ({
          group_name: group.name,
          name: option.name,
          description: option.description || null,
          price: option.price,
          price_delta: option.price_delta,
          min_quantity: group.min_quantity || 0,
          max_quantity: group.max_quantity ?? null,
          is_required: Boolean(group.is_required),
          semantic_type: option.semantic_type || group.semantic_type || null,
          price_behavior: option.price_behavior || group.price_behavior || null,
          is_searchable_variant: Boolean(option.is_searchable_variant),
          search_label: option.is_searchable_variant ? `${item.name} ${option.name}` : null,
          order_index: optionIndex,
          group_order_index: groupIndex,
          raw_data: { source: 'anota_product_detail', detail_url: detail.url, option }
        })));
        return {
          ...item,
          description: detail.description || item.description || '',
          image_url: detail.image_url || item.image_url || null,
          price: item.price ?? detail.price,
          price_min: item.price_min ?? detail.price,
          price_max: item.price_max ?? detail.price,
          price_type: options.length ? 'starting_at' : item.price_type,
          price_source: options.length ? 'anota_product_detail' : item.price_source,
          options: options.length ? options : item.options,
          raw_data: { ...(item.raw_data || {}), anota_product_detail: detail }
        };
      })
    }));
  }

  function anotaMoney(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value > 0 ? Number(value) : null;
    const parsed = parseTextPrice(value);
    return parsed != null && parsed > 0 ? parsed : null;
  }

  function promoteImageSize(urlValue) {
    try {
      const url = new URL(urlValue);
      ['w', 'width', 'h', 'height'].forEach(key => {
        if (url.searchParams.has(key)) url.searchParams.set(key, '1200');
      });
      if (url.searchParams.has('size')) url.searchParams.set('size', 'large');
      url.pathname = url.pathname
        .replace(/\/(?:thumb|thumbnail|small|medium|mini|preview)\//gi, '/')
        .replace(/_(?:thumb|small|medium|mini|preview)(?=\.)/gi, '');
      return url.toString();
    } catch (_) {
      return urlValue;
    }
  }

  function normalizeAnotaImage(value) {
    const raw = text(value);
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return promoteImageSize(raw);
    if (/^\/\//.test(raw)) return promoteImageSize(`https:${raw}`);
    if (/^[\w/-]+\.(?:jpe?g|png|webp)(?:\?.*)?$/i.test(raw)) {
      return promoteImageSize(`https://client-assets.anota.ai/${raw.replace(/^\/+/, '')}`);
    }
    return null;
  }

  const categoryKey = value => normalizeLookupKey(value);
  const isGenericMenuCategory = value => /^(menu|cardapio|cardapio completo|geral)$/i.test(categoryKey(value));
  const menuItemKey = item => normalizeLookupKey(item?.name || item?.title || item?.label || item?.display_name || '');

  function removeGenericDuplicateCategories(categories = []) {
    if (!Array.isArray(categories) || categories.length <= 1) return categories;
    const realCategories = categories.filter(category => !isGenericMenuCategory(category?.name));
    if (realCategories.length === 0) return categories;
    return categories.filter(category => !isGenericMenuCategory(category?.name));
  }

  function normalizeAnotaNetworkMenu(payload, sourceUrl) {
    const root = payload?.data?.menu || payload?.menu || payload?.data || payload;
    const mainCategories = Array.isArray(root?.menu)
      ? root.menu
      : Array.isArray(root?.categories)
        ? root.categories
        : [];
    const auxCategories = Array.isArray(root?.menu_aux)
      ? root.menu_aux
      : Array.isArray(root?.aux_categories)
        ? root.aux_categories
        : [];
    if (!mainCategories.length) return [];

    const auxById = new Map();
    for (const aux of auxCategories) {
      const keys = [aux?.category_id, aux?._id, aux?.id].map(text).filter(Boolean);
      for (const key of keys) auxById.set(key, aux);
    }

    const normalizeOption = (option, group, groupIndex, optionIndex, itemBasePrice = null) => {
      const name = text(option?.title || option?.name || option?.label);
      if (!name) return null;
      const price = anotaMoney(option?.price ?? option?.price_base ?? option?.minimal_price);
      const semanticType = inferOptionSemantic(group.name);
      const requiredPricedChoiceWithoutBase = (
        itemBasePrice == null
        && group.is_required
        && Number(group.min_quantity || 0) > 0
        && price != null
        && price > 0
        && !/(addon|combo_component)/i.test(String(semanticType || ''))
      );
      return {
        external_id: externalId(option),
        group_name: group.name,
        name,
        description: text(option?.description || option?.descript || '') || null,
        image_url: normalizeAnotaImage(option?.image || option?.image_url),
        price,
        price_delta: requiredPricedChoiceWithoutBase ? null : price,
        min_quantity: group.min_quantity,
        max_quantity: group.max_quantity,
        is_required: group.is_required,
        semantic_type: semanticType,
        price_behavior: requiredPricedChoiceWithoutBase
          ? 'absolute_price'
          : (price != null && price > 0 ? 'price_delta' : 'included'),
        is_searchable_variant: semanticType === 'flavor',
        search_label: null,
        order_index: optionIndex,
        group_order_index: groupIndex,
        raw_data: { source: 'anota_network_menu', option }
      };
    };

    const categories = [];
    for (const category of mainCategories) {
      const categoryName = text(category?.title || category?.name || category?.internal_title) || 'Cardápio';
      const sourceItems = Array.isArray(category?.itens)
        ? category.itens
        : Array.isArray(category?.items)
          ? category.items
          : [];
      const items = [];

      for (const item of sourceItems) {
        if (!item || item.out === true) continue;
        const itemName = text(item.title || item.name || item.label);
        if (!itemName) continue;

        const basePrice = anotaMoney(item.price ?? item.price_base ?? item.minimal_price);
        const optionGroups = [];
        const flatOptions = [];
        const steps = Array.isArray(item.next_steps) ? item.next_steps : [];
        steps.forEach((step, groupIndex) => {
          const aux = auxById.get(text(step?.category)) || auxById.get(text(step?.category_id));
          if (!aux) return;
          const groupName = text(aux.title || aux.name || aux.internal_title);
          const auxItems = Array.isArray(aux.itens) ? aux.itens : Array.isArray(aux.items) ? aux.items : [];
          if (!groupName || !auxItems.length) return;
          const maxRaw = Number(step?.max ?? aux?.max);
          const minRaw = Number(step?.min ?? 0);
          const group = {
            external_id: externalId(aux) || text(step?._id || step?.id || step?.category) || null,
            name: groupName,
            min_quantity: Number.isFinite(minRaw) && minRaw > 0 ? minRaw : 0,
            max_quantity: Number.isFinite(maxRaw) && maxRaw >= 0 ? maxRaw : null,
            is_required: Number.isFinite(minRaw) && minRaw > 0,
            semantic_type: inferOptionSemantic(groupName),
            price_behavior: 'price_delta',
            order_index: groupIndex,
            items: [],
            raw_data: { source: 'anota_network_menu', step, aux }
          };
          group.items = auxItems
            .filter(option => option && option.out !== true)
            .map((option, optionIndex) => normalizeOption(option, group, groupIndex, optionIndex, basePrice))
            .filter(Boolean);
          if (!group.items.length) return;
          optionGroups.push(group);
        });

        const finalOptionGroups = sanitizeAnotaOptionGroups(optionGroups);
        const finalFlatOptions = finalOptionGroups.flatMap(group => (group.items || []).map(option => ({
          ...option,
          group_name: group.name,
          group_order_index: group.order_index,
          search_label: option.is_searchable_variant ? `${itemName} ${option.name}` : null
        })));

        const requiredChoicePriceRanges = finalOptionGroups
          .filter(group => (
            group.is_required
            && Number(group.min_quantity || 0) > 0
            && !/(addon|combo_component)/i.test(String(group.semantic_type || ''))
          ))
          .map(group => {
            const prices = (group.items || [])
              .map(option => anotaMoney(option.price))
              .filter(value => value != null && value > 0)
              .sort((a, b) => a - b);
            const count = Math.min(Number(group.min_quantity || 1), prices.length);
            if (!count) return null;
            return {
              min: prices.slice(0, count).reduce((sum, value) => sum + value, 0),
              max: prices.slice(-count).reduce((sum, value) => sum + value, 0)
            };
          })
          .filter(Boolean);
        let priceMin = basePrice != null
          ? (anotaMoney(item.price_min ?? item.minimal_price) ?? basePrice)
          : null;
        let priceMax = basePrice != null
          ? (anotaMoney(item.price_max) ?? basePrice)
          : null;
        if (basePrice == null && requiredChoicePriceRanges.length) {
          priceMin = requiredChoicePriceRanges.reduce((sum, range) => sum + range.min, 0);
          priceMax = requiredChoicePriceRanges.reduce((sum, range) => sum + range.max, 0);
        }
        const priceType = basePrice != null
          ? (finalFlatOptions.length ? 'starting_at' : 'fixed')
          : (requiredChoicePriceRanges.length ? (priceMin === priceMax ? 'option_only' : 'range') : 'unknown');

        items.push({
          external_id: externalId(item),
          name: itemName,
          description: text(item.description || item.descript || '') || null,
          image_url: normalizeAnotaImage(item.image || item.image_url),
          price: basePrice,
          price_min: priceMin,
          price_max: priceMax,
          price_type: priceType,
          price_source: basePrice != null ? 'anota_network_item_price' : requiredChoicePriceRanges.length ? 'anota_network_required_options' : null,
          source_url: sourceUrl,
          options: finalFlatOptions,
          option_groups: finalOptionGroups,
          raw_data: { source: 'anota_network_menu', item, category },
          extraction_confidence: finalOptionGroups.length ? 0.99 : 0.96,
          needs_review: priceType === 'unknown',
          order_index: Number(item.order ?? items.length)
        });
      }

      if (items.length) {
        categories.push({
          external_id: externalId(category),
          name: categoryName,
          order_index: Number(category.order ?? categories.length),
          items: items.sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0))
        });
      }
    }

    return removeGenericDuplicateCategories(categories)
      .sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0));
  }

  const countAnotaMenuStats = categories => {
    const itemCount = (categories || []).reduce((sum, category) => sum + ((category.items || []).length || 0), 0);
    const imageCount = (categories || []).reduce((sum, category) => (
      sum + (category.items || []).filter(item => Boolean(item.image_url)).length
    ), 0);
    const pricedCount = (categories || []).reduce((sum, category) => (
      sum + (category.items || []).filter(item => item.price != null || item.price_min != null || item.price_max != null).length
    ), 0);
    const itemsWithOptions = (categories || []).reduce((sum, category) => (
      sum + (category.items || []).filter(item => {
        const flatOptions = Array.isArray(item.options) ? item.options.length : 0;
        const groupedOptions = Array.isArray(item.option_groups)
          ? item.option_groups.reduce((groupSum, group) => groupSum + ((group.items || []).length || 0), 0)
          : 0;
        return Math.max(flatOptions, groupedOptions) > 0;
      }).length
    ), 0);
    const optionCount = (categories || []).reduce((sum, category) => (
      sum + (category.items || []).reduce((inner, item) => {
        const flatOptions = Array.isArray(item.options) ? item.options.length : 0;
        const groupedOptions = Array.isArray(item.option_groups)
          ? item.option_groups.reduce((groupSum, group) => groupSum + ((group.items || []).length || 0), 0)
          : 0;
        return inner + Math.max(flatOptions, groupedOptions);
      }, 0)
    ), 0);
    return { itemCount, optionCount, imageCount, pricedCount, itemsWithOptions };
  };

  async function readAnotaNetworkMenu(tabId, sourceUrl, options = {}) {
    try {
      const publicSourceUrl = canonicalAnotaStoreUrl(sourceUrl);
      const result = await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: () => {
          const entries = Array.isArray(window.__FILTERFOOD_MENU_NETWORK__)
            ? window.__FILTERFOOD_MENU_NETWORK__
            : [];
          return entries.slice(-24).map(entry => ({
            url: String(entry.url || ''),
            status: entry.status,
            body: entry.body,
            capturedAt: entry.capturedAt || 0
          }));
        }
      });
      const entries = Array.isArray(result[0]?.result) ? result[0].result : [];
      for (const entry of entries.slice().reverse()) {
        const categories = normalizeAnotaNetworkMenu(entry.body, sourceUrl);
        const { itemCount, optionCount, imageCount, pricedCount, itemsWithOptions } = countAnotaMenuStats(categories);
        if (itemCount > 0) {
          if (optionCount <= 0 && options.requireOptions !== false) {
            return {
              success: false,
              platform: 'anota_ai_network_partial',
              extractionLevel: 0,
              confidence: 0.58,
              categories,
              rawText: JSON.stringify(entry.body).slice(0, 450000),
              sourceUrl,
              finalUrl: sourceUrl,
              publicSourceUrl,
              canonicalSourceUrl: publicSourceUrl,
              metrics: {
                networkEntries: entries.length,
                sourceEndpoint: entry.url,
                itemCount,
                optionCount,
                imageCount,
                pricedCount,
                itemsWithOptions,
                optionlessNetworkMenu: true
              },
              error: 'A rede do Anota AI trouxe itens sem opções/adicionais; abrir detalhes item-a-item antes de aceitar.'
            };
          }
          return {
            success: true,
            platform: 'anota_ai_network',
            extractionLevel: 0,
            confidence: optionCount > 0 ? 0.995 : 0.97,
            categories,
            rawText: JSON.stringify(entry.body).slice(0, 450000),
            sourceUrl,
            finalUrl: sourceUrl,
            publicSourceUrl,
            canonicalSourceUrl: publicSourceUrl,
            metrics: {
              networkEntries: entries.length,
              sourceEndpoint: entry.url,
              itemCount,
              optionCount,
              imageCount,
              pricedCount,
              itemsWithOptions
            }
          };
        }
      }
    } catch (_) {}
    return null;
  }

  function extractAnotaSlugFromUrl(value) {
    try {
      const parsed = new URL(value);
      const parts = parsed.pathname.split('/').filter(Boolean);
      const lojaIndex = parts.findIndex(part => part.toLowerCase() === 'loja');
      if (lojaIndex >= 0 && parts[lojaIndex + 1]) return parts[lojaIndex + 1];
      if (parsed.hostname === 'pedido.anota.ai' && parts.length === 1 && !/login|product|m/i.test(parts[0])) return parts[0];
      return '';
    } catch (_) {
      return '';
    }
  }

  function canonicalAnotaStoreUrl(value) {
    const slug = extractAnotaSlugFromUrl(value);
    return slug ? `https://pedido.anota.ai/loja/${encodeURIComponent(slug)}` : '';
  }

  async function collectAnotaAiNativeBySlug(url) {
    const slug = extractAnotaSlugFromUrl(url);
    if (!slug) return null;
    const endpoint = `https://api.anota.ai/v1/menu/merchant?slug=${encodeURIComponent(slug)}`;
    const publicSourceUrl = canonicalAnotaStoreUrl(url);
    try {
      const response = await fetch(endpoint);
      if (!response.ok) return null;
      const body = await response.json();
      const categories = normalizeAnotaNetworkMenu(body, url);
      const { itemCount, optionCount, imageCount, pricedCount, itemsWithOptions } = countAnotaMenuStats(categories);
      if (itemCount <= 0) return null;
      return {
        success: optionCount > 0,
        platform: optionCount > 0 ? 'anota_ai_native_api' : 'anota_ai_native_api_partial',
        extractionLevel: 0,
        confidence: optionCount > 0 ? 0.995 : 0.62,
        categories,
        rawText: JSON.stringify(body).slice(0, 450000),
        sourceUrl: url,
        finalUrl: url,
        publicSourceUrl,
        canonicalSourceUrl: publicSourceUrl,
        metrics: {
          sourceEndpoint: endpoint,
          itemCount,
          optionCount,
          imageCount,
          pricedCount,
          itemsWithOptions,
          nativeApi: true
        },
        error: optionCount > 0
          ? undefined
          : 'API nativa do Anota AI trouxe itens sem opcoes/adicionais; coleta complementar necessaria.'
      };
    } catch (error) {
      console.warn('[FilterFoodPlatformAdapters] Falha ao ler API nativa do Anota AI:', error);
      return null;
    }
  }

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
      const letters = line.replace(/[^\\p{L}]/gu, '');
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

  const normalizeMoney = value => {
    const raw = text(value);
    const match = raw.match(/(?:\+\s*)?(?:R\$\s*)?(\d{1,4}[,.]\d{2})/i);
    return match ? Number(match[1].replace(',', '.')) : null;
  };

  const waitForTabLoad = (tabId, timeoutMs = 22000) => new Promise(resolve => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { chrome.tabs.onUpdated.removeListener(listener); } catch (_) {}
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') finish();
    };
    try { chrome.tabs.onUpdated.addListener(listener); } catch (_) { finish(); }
  });

  function semanticTypeFromGroupName(groupName) {
    const normalized = text(groupName).toLowerCase();
    if (/sabor|recheio|prote[ií]na|burger|hamb[uú]rguer|pizza/.test(normalized)) return 'flavor';
    if (/borda|massa|adicional|turbinar|extra|complemento|molho/.test(normalized)) return 'addon';
    if (/bebida|refri|suco/.test(normalized)) return 'combo_component';
    return 'required_choice';
  }

  function parseGroupQuantities(groupName, helperText) {
    const raw = `${groupName || ''} ${helperText || ''}`.toLowerCase();
    const slash = raw.match(/(\d+)\s*\/\s*(\d+)/);
    const exact = raw.match(/escolha\s+(\d+)\s+(?:item|itens|op[cç][oõ]es?)/i);
    const atMost = raw.match(/(?:at[eé]|até)\s+(\d+)\s+(?:item|itens|op[cç][oõ]es?)/i);
    const max = slash ? Number(slash[2]) : exact ? Number(exact[1]) : atMost ? Number(atMost[1]) : null;
    const required = /obrigat[oó]rio|obrigatorio/.test(raw) || Boolean(slash && Number(slash[2]) > 0 && !/at[eé]|até/.test(raw));
    return {
      min_quantity: required ? (exact ? Number(exact[1]) : slash ? Number(slash[2]) : 1) : 0,
      max_quantity: max,
      is_required: required,
    };
  }

  function parseAnotaVisibleDetailText(rawText, sourceUrl, fallbackTitle = '') {
    const lines = String(rawText || '')
      .split(/\n+/)
      .map(line => text(line))
      .filter(Boolean)
      .filter(line => line.length <= 260);
    const ignored = /^(detalhes do produto|pesquise pelo nome|alguma observa[cç][aã]o|avan[cç]ar|adicionar|voltar|buscar|in[ií]cio|pedidos|promos?|carrinho|fechar|compartilhar|0\s*\/\s*\d+|obrigat[oó]rio|m[aá]x\s*\d+|\d+\s*\/\s*\d+)$/i;
    const isPriceLine = line => normalizeMoney(line) != null && line.replace(/(?:\+\s*)?(?:R\$\s*)?\d{1,4}[,.]\d{2}/ig, '').trim().length < 24;
    const titleIndex = lines.findIndex((line, index) => (
      !ignored.test(line)
      && !isPriceLine(line)
      && line.length >= 3
      && index > -1
    ));
    const title = fallbackTitle || (titleIndex >= 0 ? lines[titleIndex] : '');
    const priceIndex = titleIndex >= 0 ? lines.findIndex((line, index) => index > titleIndex && isPriceLine(line)) : -1;
    const price = priceIndex >= 0 ? normalizeMoney(lines[priceIndex]) : null;

    let cursor = priceIndex >= 0 ? priceIndex + 1 : Math.max(0, titleIndex + 1);
    const descriptionParts = [];
    const looksGroupHeader = (index) => {
      const line = lines[index] || '';
      const next = `${lines[index + 1] || ''} ${lines[index + 2] || ''}`;
      if (!line || ignored.test(line) || isPriceLine(line)) return false;
      if (/escolha|selecione|obrigat[oó]rio|\d+\s*\/\s*\d+|at[eé]\s+\d+/i.test(next)) return true;
      return /massas?\s*&?\s*bordas?|bordas?|adicionais?|turbinar|bora de combo|bebidas?|sabores?/i.test(line);
    };
    while (cursor < lines.length && !looksGroupHeader(cursor)) {
      const line = lines[cursor];
      if (!ignored.test(line) && !isPriceLine(line) && line !== title) descriptionParts.push(line);
      cursor++;
    }

    const options = [];
    let groupOrder = 0;
    while (cursor < lines.length) {
      if (!looksGroupHeader(cursor)) {
        cursor++;
        continue;
      }
      const groupName = lines[cursor++];
      const helper = [];
      while (cursor < lines.length && cursor < lines.length && !looksGroupHeader(cursor) && (/escolha|selecione|obrigat[oó]rio|\d+\s*\/\s*\d+|at[eé]\s+\d+/i.test(lines[cursor]) || ignored.test(lines[cursor]))) {
        helper.push(lines[cursor]);
        cursor++;
        if (helper.length >= 4) break;
      }
      const quantities = parseGroupQuantities(groupName, helper.join(' '));
      const semanticType = semanticTypeFromGroupName(groupName);
      let optionOrder = 0;

      while (cursor < lines.length && !looksGroupHeader(cursor)) {
        let optionName = lines[cursor++];
        if (!optionName || ignored.test(optionName) || isPriceLine(optionName)) continue;
        if (/^(buscar|pesquise|alguma observa[cç][aã]o|avan[cç]ar|adicionar)$/i.test(optionName)) continue;

        const descParts = [];
        let priceLine = '';
        while (cursor < lines.length && !looksGroupHeader(cursor)) {
          const probe = lines[cursor];
          if (ignored.test(probe)) { cursor++; continue; }
          if (isPriceLine(probe)) { priceLine = probe; cursor++; break; }
          if (/^\+\s*$/.test(probe)) { cursor++; continue; }
          if (descParts.length >= 2) break;
          // Se o próximo bloco já parece outra opção, não coma o nome dela como descrição.
          const nextIsPrice = isPriceLine(lines[cursor + 1] || '');
          if (!nextIsPrice && descParts.length === 0 && probe.length > 18) {
            descParts.push(probe);
            cursor++;
            continue;
          }
          break;
        }

        const optionPrice = normalizeMoney(priceLine);
        options.push({
          group_name: groupName,
          name: optionName,
          description: descParts.join(' ') || null,
          price: optionPrice,
          price_delta: optionPrice,
          min_quantity: quantities.min_quantity,
          max_quantity: quantities.max_quantity,
          is_required: quantities.is_required,
          semantic_type: semanticType,
          price_behavior: optionPrice != null && optionPrice > 0 ? 'price_delta' : 'included',
          is_searchable_variant: semanticType === 'flavor',
          search_label: semanticType === 'flavor' ? `${title} ${optionName}` : null,
          order_index: optionOrder++,
          group_order_index: groupOrder,
          raw_data: { source: 'anota_detail_text', source_url: sourceUrl, helper },
        });
      }
      groupOrder++;
    }

    return {
      name: text(title),
      description: text(descriptionParts.join(' ')) || '',
      price,
      options,
      rawText: lines.join('\n'),
      source_url: sourceUrl,
    };
  }

  function mergeProductDetailsIntoVisibleMenu(categories, productDetails) {
    if (!Array.isArray(productDetails) || !productDetails.length) return categories;
    const normalizeKey = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const used = new Set();
    return (categories || []).map(category => ({
      ...category,
      items: (category.items || []).map(item => {
        const itemKey = normalizeKey(item.name);
        const descKey = normalizeKey(item.description || '');
        let detailIndex = productDetails.findIndex((detail, index) => (
          !used.has(index)
          && detail.name
          && (
            normalizeKey(detail.name) === itemKey
            || normalizeKey(detail.name).includes(itemKey)
            || itemKey.includes(normalizeKey(detail.name))
            || descKey.includes(normalizeKey(detail.name))
          )
        ));
        if (detailIndex < 0) return item;
        used.add(detailIndex);
        const detail = productDetails[detailIndex];
        const shouldReplaceGenericName = descKey.includes(normalizeKey(detail.name)) || /promocionais|mais pedidos|destaques|monte seu|produtos$/i.test(item.name);
        return {
          ...item,
          name: shouldReplaceGenericName ? detail.name : item.name,
          description: detail.description || item.description || null,
          price: detail.price ?? item.price,
          price_min: detail.price ?? item.price_min,
          price_max: detail.price ?? item.price_max,
          image_url: detail.image_url || item.image_url || null,
          options: detail.options && detail.options.length ? detail.options : item.options,
          raw_data: { ...(item.raw_data || {}), anota_detail: detail },
          extraction_confidence: detail.options?.length ? 0.92 : Math.max(item.extraction_confidence || 0, 0.82),
          needs_review: false,
        };
      })
    }));
  }

  async function collectVisibleTextMenu(url) {
    if (isUnsafeMenuDestination(url)) throw new Error('URL bloqueada: destino não parece ser cardápio.');
    const previous = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = await chrome.tabs.create({ url, active: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 4500));
      const currentBefore = await chrome.tabs.get(tab.id);
      if (isUnsafeMenuDestination(currentBefore?.url || url)) {
        throw new Error(`Destino bloqueado após navegação: ${currentBefore?.url || url}`);
      }
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async () => {
          const clickLabels = /aceitar|ok|entendi|continuar|ver card[aá]pio|apenas visualizar|quero continuar/i;
          const isUnsafeHref = href => {
            try {
              const parsed = new URL(href, location.href);
              const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
              const pathAndQuery = `${parsed.pathname}${parsed.search}`.toLowerCase();
              if (['instagram.com', 'threads.net', 'threads.com', 'facebook.com', 'fb.com', 'tiktok.com', 'x.com', 'twitter.com', 'youtube.com'].some(domain => host === domain || host.endsWith('.' + domain))) return true;
              return /\/(?:share|sharer|intent|login|auth|account|cart|checkout|wp-json|feed\b|tag\/|author\/|category\/(?:bookkeeping|contabilidade|blog|noticias|news))|[?&](?:share|u|url)=https?%3a/i.test(pathAndQuery);
            } catch (_) {
              return true;
            }
          };
          for (const el of Array.from(document.querySelectorAll('button,[role="button"],a')).slice(0, 80)) {
            const label = String(el.textContent || el.getAttribute('aria-label') || '').trim();
            if (el.tagName === 'A' && isUnsafeHref(el.href || el.getAttribute('href') || '')) continue;
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
      const productLinkResult = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
          const links = [];
          for (const anchor of Array.from(document.querySelectorAll('a[href]'))) {
            const href = anchor.href || '';
            if (!/\/product\//i.test(href)) continue;
            const card = anchor.closest('article, li, section, [role="listitem"], [class*="card"], [class*="item"], [class*="product"]') || anchor;
            links.push({ url: href, text: normalize(card.textContent || anchor.textContent || '') });
          }
          const seen = new Set();
          return links.filter(link => {
            const key = link.url.split('?')[0];
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          }).slice(0, 60);
        }
      });
      const productLinks = Array.isArray(productLinkResult[0]?.result) ? productLinkResult[0].result : [];

      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => ({ title: document.title, rawText: String(document.body?.innerText || ''), url: location.href })
      });
      const payload = result[0]?.result || {};
      if (isUnsafeMenuDestination(payload.url || url)) {
        throw new Error(`Destino bloqueado após auditoria visual: ${payload.url || url}`);
      }
      const blockerText = `${payload.title || ''}\n${payload.rawText || ''}`;
      if (/cloudflare|attention required|sorry,\s*you have been blocked|unable to access|captcha|n[aã]o sou um rob[oô]|i am not a robot|checking your browser|just a moment/i.test(blockerText)) {
        return {
          success: false,
          platform: 'visible_text',
          categories: [],
          rawText: payload.rawText || '',
          sourceUrl: payload.url || url,
          title: payload.title,
          requiresHuman: true,
          error: 'Bloqueio/Cloudflare/captcha na fonte do cardápio. Precisa intervenção humana ou navegador logado/liberado.'
        };
      }
      let categories = parseVisibleTextMenu(payload.rawText, payload.url || url);
      const productDetails = [];
      if (new URL(payload.url || url).hostname.includes('anota.ai') && productLinks.length) {
        for (const link of productLinks.slice(0, 45)) {
          try {
            await chrome.tabs.update(tab.id, { url: link.url, active: true });
            await waitForTabLoad(tab.id, 18000);
            await new Promise(resolve => setTimeout(resolve, 1400));
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: async () => {
                window.scrollTo(0, 0);
                await new Promise(resolve => setTimeout(resolve, 250));
                for (let i = 0; i < 6; i++) {
                  window.scrollBy(0, Math.max(450, innerHeight * 0.72));
                  await new Promise(resolve => setTimeout(resolve, 260));
                }
                window.scrollTo(0, 0);
              }
            });
            const detailResult = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                const img = Array.from(document.images || []).find(image => {
                  const src = image.currentSrc || image.src || '';
                  return /anota|client-assets|produtos|s3|blob/i.test(src) && image.naturalWidth > 80 && image.naturalHeight > 80;
                });
                return {
                  title: document.title,
                  rawText: String(document.body?.innerText || ''),
                  url: location.href,
                  image_url: img ? (img.currentSrc || img.src || '') : '',
                };
              }
            });
            const detailPayload = detailResult[0]?.result || {};
            if (!/\/product\//i.test(detailPayload.url || link.url)) continue;
            const parsedDetail = extractAnotaDetailFromRaw(detailPayload.rawText || '', detailPayload.url || link.url, detailPayload.image_url || '');
            const flatOptions = (parsedDetail.option_groups || []).flatMap((group, groupIndex) => (group.items || []).map((option, optionIndex) => ({
              external_id: null,
              group_name: group.name,
              name: option.name,
              description: option.description || null,
              price: option.price,
              price_delta: option.price_delta,
              min_quantity: group.min_quantity || 0,
              max_quantity: group.max_quantity ?? null,
              is_required: Boolean(group.is_required),
              semantic_type: option.semantic_type || group.semantic_type || null,
              price_behavior: option.price_behavior || group.price_behavior || null,
              is_searchable_variant: Boolean(option.is_searchable_variant),
              search_label: option.is_searchable_variant ? `${parsedDetail.itemName} ${option.name}` : null,
              order_index: optionIndex,
              group_order_index: groupIndex,
              raw_data: { source: 'anota_ai_detail_text', detail_url: parsedDetail.url, option }
            })));
            if (parsedDetail.itemName) {
              productDetails.push({
                name: parsedDetail.itemName,
                price: parsedDetail.price,
                description: parsedDetail.description || '',
                image_url: parsedDetail.image_url || detailPayload.image_url || '',
                options: flatOptions,
                option_groups: parsedDetail.option_groups || [],
                rawText: parsedDetail.rawText || detailPayload.rawText || '',
                source_url: detailPayload.url || link.url,
                preview_text: link.text || '',
              });
            }
          } catch (_) {}
        }
        categories = mergeProductDetailsIntoVisibleMenu(categories, productDetails);
      }
      const itemCount = categories.reduce((total, category) => total + category.items.length, 0);
      const pricedCount = categories.reduce((total, category) => total + category.items.filter(item => item.price != null).length, 0);
      return {
        platform: 'visible_text',
        categories,
        rawText: [payload.rawText, ...productDetails.map(detail => detail.rawText)].filter(Boolean).join('\n\n--- DETALHE DO PRODUTO ---\n\n'),
        productDetails,
        sourceUrl: payload.url || url,
        title: payload.title,
        confidence: productDetails.some(detail => detail.options?.length) ? 0.9 : (itemCount >= 5 && pricedCount >= 3 ? 0.74 : 0.45)
      };
    } finally {
      try { await chrome.tabs.remove(tab.id); } catch (_) {}
      if (previous[0]?.id) try { await chrome.tabs.update(previous[0].id, { active: true }); } catch (_) {}
    }
  }

  async function waitForTabComplete(tabId, timeoutMs = 30000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab?.status === 'complete') {
          await new Promise(resolve => setTimeout(resolve, 900));
          return tab;
        }
      } catch (_) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 350));
    }
    try { return await chrome.tabs.get(tabId); } catch (_) { return null; }
  }

  function parseAnotaDeepOptionGroups(detail) {
    const source = typeof detail === 'string'
      ? { rawText: detail, name: '' }
      : (detail || {});
    const lines = Array.isArray(source?.lines)
      ? source.lines.map(text).filter(Boolean)
      : String(source?.rawText || '')
        .split(/\r?\n/)
        .map(text)
        .filter(Boolean)
        .filter(line => !/^\d+\s*\/\s*\d+\s*$/.test(line));
    const groups = [];
    let current = null;
    const priceFromLine = value => parseTextPrice(value);
    const isRule = value => /escolha|op[cç][oõ]es?|obrigat[oó]rio|m[aá]x|min/i.test(value || '');
    const isUiNoise = value => /detalhes do produto|pesquise pelo nome|alguma observa[cç][aã]o|adicionar|avan[cç]ar|compartilhar|buscar|voltar|r\$\s*0,00/i.test(value || '');
    const ruleLineMatches = value => {
      const key = normalizeLookupKey(value);
      return /escolha|opcoes?|obrigatorio|required|max|min/.test(key) || /^\d+\s*[\/]\s*\d+$/.test(text(value));
    };
    const pureRuleLineMatches = value => {
      const key = normalizeLookupKey(value);
      return /^(escolha(?:\s+ate)?\s+\d+\s*(?:item|itens|opcoes?)?|opcoes?|obrigatorio|required|max\s*\d+|min\s*\d+|\d+\s+\d+)$/.test(key)
        || /^\d+\s*[\/]\s*\d+$/.test(text(value));
    };
    const uiLineNoise = value => {
      const key = normalizeLookupKey(value);
      return /detalhes do produto|pesquise pelo nome|alguma observacao|adicionar|avancar|compartilhar|buscar|voltar|r\s*0\s*00/.test(key);
    };
    const looksDescriptionLine = value => {
      const line = text(value);
      if (!line || priceFromLine(line) != null || ruleLineMatches(line) || uiLineNoise(line)) return false;
      if (line.length > 44) return true;
      if (/[.;:]/.test(line) && line.length > 20) return true;
      if (/,/.test(line) && line.length > 26) return true;
      if (/\b(com|acompanhad[oa]s?|finalizado|molho|pao|smash|hamburguer|queijo|cebola|alface|tomate|maionese|ingredientes?)\b/i.test(normalizeLookupKey(line)) && line.length > 22) return true;
      if (/\b(com|acompanhad[oa]s?|finalizado|molho|p[aã]o|smash|hamb[uú]rguer|queijo|cebola|alface|tomate|maionese|ingredientes?)\b/i.test(line) && line.length > 22) return true;
      return false;
    };
    const looksGroupHeaderAt = index => {
      const line = lines[index] || '';
      const next = lines[index + 1] || '';
      const next2 = lines[index + 2] || '';
      return !priceFromLine(line)
        && !pureRuleLineMatches(line)
        && !uiLineNoise(line)
        && line.length <= 90
        && (ruleLineMatches(next) || (!priceFromLine(next) && ruleLineMatches(next2)))
        && !/^\d+\s*[\/]\s*\d+/.test(line)
        && line.toLowerCase() !== text(source.name).toLowerCase();
    };
    const parseRule = value => {
      const raw = normalizeLookupKey(value);
      const chooseExact = raw.match(/escolha\s+(\d+)/i);
      const chooseUntil = raw.match(/escolha\s+at[eé]\s+(\d+)/i);
      const max = chooseUntil ? Number(chooseUntil[1]) : chooseExact ? Number(chooseExact[1]) : null;
      const min = /obrigat[oó]rio/.test(raw) || chooseExact ? (chooseExact ? Number(chooseExact[1]) : 1) : 0;
      const normalizedMin = (/obrigatorio|required/.test(raw) || chooseExact) ? (chooseExact ? Number(chooseExact[1]) : 1) : min;
      return { min_quantity: normalizedMin, max_quantity: max, is_required: normalizedMin > 0 };
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || uiLineNoise(line)) continue;
      const next = lines[i + 1] || '';
      const next2 = lines[i + 2] || '';
      if (looksGroupHeaderAt(i)) {
        const ruleLine = ruleLineMatches(next) ? next : next2;
        current = {
          name: line,
          ...parseRule(ruleLine),
          items: []
        };
        groups.push(current);
        continue;
      }
      if (!current) continue;
      if (pureRuleLineMatches(line) || /^\d+\s*[\/]\s*\d+/.test(line)) continue;
      const optionName = line.replace(/^\+\s*/, '').trim();
      if (!optionName || optionName.length < 2 || priceFromLine(optionName)) continue;
      if (looksDescriptionLine(optionName)) continue;
      let price = null;
      const descriptionParts = [];
      let consumedUntil = i;
      for (let j = i + 1; j <= Math.min(lines.length - 1, i + 9); j++) {
        const probe = lines[j];
        if (!probe || uiLineNoise(probe)) {
          consumedUntil = j;
          continue;
        }
        if (looksGroupHeaderAt(j)) break;
        if (pureRuleLineMatches(probe) || /^\d+\s*[\/]\s*\d+/.test(probe)) {
          consumedUntil = j;
          continue;
        }
        const maybePrice = priceFromLine(probe);
        if (maybePrice != null) {
          price = maybePrice;
          consumedUntil = j;
          break;
        }
        const nextLooksLikeNewOption = !looksDescriptionLine(probe)
          && !priceFromLine(probe)
          && (priceFromLine(lines[j + 1] || '') != null || looksGroupHeaderAt(j + 1));
        if (nextLooksLikeNewOption) break;
        if (!looksDescriptionLine(probe) && descriptionParts.length > 0) break;
        if (looksDescriptionLine(probe) || descriptionParts.length < 2) {
          descriptionParts.push(probe);
          consumedUntil = j;
          continue;
        }
        break;
      }
      const option = {
        external_id: null,
        group_name: current.name,
        name: optionName,
        description: descriptionParts.join(' ') || null,
        price,
        price_delta: price,
        min_quantity: current.min_quantity,
        max_quantity: current.max_quantity,
        is_required: current.is_required,
        order_index: current.items.length,
        raw_data: { source: 'anota_ai_detail_text' }
      };
      if (!current.items.some(existing => existing.name.toLowerCase() === option.name.toLowerCase())) current.items.push(option);
      if (consumedUntil > i) i = consumedUntil;
    }

    return sanitizeAnotaOptionGroups(groups);
  }

  async function collectAnotaAiDeep(url) {
    const previous = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = await chrome.tabs.create({ url, active: true });
    const normalizeSourceUrl = value => {
      try { return new URL(value, url).href; } catch (_) { return String(value || ''); }
    };
    try {
      await waitForTabComplete(tab.id, 35000);
      const current = await chrome.tabs.get(tab.id);
      if (isUnsafeMenuDestination(current?.url || url)) {
        throw new Error(`Destino bloqueado no Anota AI: ${current?.url || url}`);
      }

      const initial = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async () => {
          const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
          const isPrice = value => /(?:R\$\s*)?\d{1,4}[,.]\d{2}(?!\d)/i.test(value || '');
          const buttonWords = ['aceitar', 'entendi', 'ver cardápio', 'ver cardapio', 'continuar', 'fechar'];
          for (const element of document.querySelectorAll('button, [role="button"], a')) {
            const label = normalize(element.textContent).toLowerCase();
            if (buttonWords.some(word => label === word || label.includes(word))) {
              try { element.click(); } catch (_) {}
            }
          }
          await new Promise(resolve => setTimeout(resolve, 1200));
          const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
          const scrollableTargets = () => [
            document.scrollingElement || document.documentElement,
            ...Array.from(document.querySelectorAll('main,section,div,ul,ol'))
              .filter(el => {
                const style = getComputedStyle(el);
                return /(auto|scroll)/i.test(`${style.overflowY} ${style.overflow}`)
                  && el.scrollHeight > el.clientHeight + 120
                  && el.clientHeight > 180;
              })
              .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))
              .slice(0, 5)
          ].filter(Boolean);
          const targets = scrollableTargets();
          for (let pass = 0; pass < 22; pass++) {
            for (const target of targets) {
              try { target.scrollTop = Math.min(target.scrollHeight, target.scrollTop + Math.max(520, innerHeight * 0.75)); } catch (_) {}
            }
            window.scrollBy(0, Math.max(520, innerHeight * 0.75));
            await sleep(300);
          }
          for (const target of targets) {
            try { target.scrollTop = 0; } catch (_) {}
          }
          window.scrollTo(0, 0);
          await sleep(500);
          const headingNodes = [...document.querySelectorAll('h1,h2,h3,h4,[role="heading"],strong,b')];
          const headings = headingNodes.map(node => ({
            text: normalize(node.textContent),
            top: node.getBoundingClientRect().top + scrollY
          })).filter(entry => entry.text && entry.text.length <= 80 && !isPrice(entry.text));
          const links = [];
          const seen = new Set();
          for (const anchor of document.querySelectorAll('a[href*="/product/"]')) {
            const href = new URL(anchor.getAttribute('href'), location.href).href;
            if (seen.has(href)) continue;
            seen.add(href);
            const card = anchor.closest('article, li, section, [class*="card"], [class*="Card"], [class*="item"], [class*="Item"], [class*="product"], [class*="Product"]') || anchor;
            const rectTop = card.getBoundingClientRect().top + scrollY;
            const text = normalize(card.innerText || card.textContent);
            const category = [...headings].reverse().find(heading => heading.top < rectTop - 8)?.text || 'Cardápio';
            links.push({ href, category, previewText: text.slice(0, 700) });
          }
          const clickCandidates = [];
          const seenClick = new Set();
          const priceReGlobal = /(?:R\$\s*)?\d{1,4}[,.]\d{2}(?!\d)/ig;
          const noiseRe = /sacola|subtotal|entrega|cupom|estabelecimento fechado|fazer login|calcular taxa|favoritos da galeria|in..cio|inicio|pedidos/i;
          const isVisible = element => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return rect.width >= 90 && rect.height >= 42 && style.visibility !== 'hidden' && style.display !== 'none';
          };
          for (const element of [...document.querySelectorAll('article, li, section, button, [role="button"], div')]) {
            if (!isVisible(element)) continue;
            const candidateText = normalize(element.innerText || element.textContent);
            if (candidateText.length < 12 || candidateText.length > 900 || noiseRe.test(candidateText)) continue;
            const priceMatches = candidateText.match(priceReGlobal) || [];
            if (!priceMatches.length || priceMatches.length > 4) continue;
            const hasNestedProduct = [...element.children].some(child => {
              const childText = normalize(child.innerText || child.textContent);
              return childText.length >= 12
                && childText.length < candidateText.length
                && childText.length >= Math.min(180, candidateText.length * 0.35)
                && ((childText.match(priceReGlobal) || []).length > 0);
            });
            if (hasNestedProduct) continue;
            const key = candidateText.toLowerCase().replace(/r\$\s*\d{1,4}[,.]\d{2}/ig, '').slice(0, 100);
            if (!key || seenClick.has(key)) continue;
            seenClick.add(key);
            const rectTop = element.getBoundingClientRect().top + scrollY;
            const category = [...headings].reverse().find(heading => heading.top < rectTop - 8)?.text || 'Cardapio';
            clickCandidates.push({ clickIndex: clickCandidates.length, category, previewText: candidateText.slice(0, 700) });
          }
          const blockerText = normalize(document.body?.innerText || '');
          const blockers = [];
          if (/captcha|não sou um robô|i am not a robot/i.test(blockerText)) blockers.push('captcha');
          if (/checking your browser|just a moment|cloudflare|attention required|sorry,\s*you have been blocked|unable to access/i.test(blockerText)) blockers.push('cloudflare');
          if (/faça login|entre para continuar|sign in/i.test(blockerText)) blockers.push('login');
          return {
            title: document.title,
            finalUrl: location.href,
            rawText: String(document.body?.innerText || '').slice(0, 160000),
            links: links.slice(0, 160),
            clickCandidates: clickCandidates.slice(0, 160),
            blockers
          };
        }
      });

      const initialSnapshot = initial[0]?.result || {};
      const directProduct = /\/product\//i.test(initialSnapshot.finalUrl || url);
      let productEntries = directProduct
        ? [{ href: initialSnapshot.finalUrl || url, category: 'Cardápio', previewText: initialSnapshot.rawText || '' }]
        : (initialSnapshot.links || []);
      if (!directProduct && (!productEntries.length || productEntries.length < 3)) {
        productEntries = [
          ...productEntries,
          ...((initialSnapshot.clickCandidates || []).map(candidate => ({ ...candidate, clickOnly: true }))),
        ];
      }
      const entrySeen = new Set();
      productEntries = productEntries.filter(entry => {
        const key = entry.href || `click:${entry.clickIndex}:${text(entry.previewText).slice(0, 120)}`;
        if (!key || entrySeen.has(key)) return false;
        entrySeen.add(key);
        return true;
      });

      const mergeNetworkProductEntries = (networkMenu) => {
        if (!networkMenu?.success || !Array.isArray(networkMenu.categories)) return;
        try {
          const finalUrl = new URL(initialSnapshot.finalUrl || url);
          const slug = finalUrl.pathname.split('/').filter(Boolean).pop() || '';
          if (!slug) return;
          const existing = new Set(productEntries.map(entry => entry.href || `click:${entry.clickIndex}:${text(entry.previewText).slice(0, 120)}`));
          for (const category of networkMenu.categories) {
            for (const item of (category.items || [])) {
              const rawItem = item.raw_data?.item || item.raw_data || {};
              const id = text(item.external_id || rawItem._id || rawItem.id || rawItem.id_product || rawItem.id_item);
              if (!/^[a-f0-9]{12,}$/i.test(id)) continue;
              const href = `${finalUrl.origin}/product/${encodeURIComponent(id)}/0/${encodeURIComponent(slug)}?categoryType=simple_item`;
              if (existing.has(href)) continue;
              existing.add(href);
              productEntries.push({
                href,
                category: text(category.name) || 'Cardapio',
                previewText: `${item.name || ''} ${item.price != null ? `R$ ${item.price}` : ''}`.trim()
              });
            }
          }
        } catch (_) {}
      };
      const shouldTrustAnotaNetworkMenu = (networkMenu) => {
        if (!networkMenu?.success) return false;
        const metrics = networkMenu.metrics || {};
        const itemCount = Number(metrics.itemCount || 0);
        const optionCount = Number(metrics.optionCount || 0);
        const imageCount = Number(metrics.imageCount || 0);
        const itemsWithOptions = Number(metrics.itemsWithOptions || 0);
        if (itemCount <= 0 || optionCount <= 0) return false;
        const imageCoverage = itemCount > 0 ? imageCount / itemCount : 0;
        const optionItemCoverage = itemCount > 0 ? itemsWithOptions / itemCount : 0;
        return (
          optionItemCoverage >= 0.12
          && (
            imageCoverage >= 0.45
            || imageCount >= 12
            || itemCount <= 10
          )
        );
      };

      const isRichAnotaNetworkMenu = (networkMenu) => {
        if (!networkMenu?.success) return false;
        const metrics = networkMenu.metrics || {};
        const itemCount = Number(metrics.itemCount || 0);
        const optionCount = Number(metrics.optionCount || 0);
        const imageCount = Number(metrics.imageCount || 0);
        const pricedCount = Number(metrics.pricedCount || 0);
        const itemsWithOptions = Number(metrics.itemsWithOptions || 0);
        if (itemCount < 8) return false;
        const imageCoverage = itemCount > 0 ? imageCount / itemCount : 0;
        const priceCoverage = itemCount > 0 ? pricedCount / itemCount : 0;
        const optionItemCoverage = itemCount > 0 ? itemsWithOptions / itemCount : 0;
        return (
          optionCount >= Math.max(20, itemCount * 2)
          && priceCoverage >= 0.9
          && optionItemCoverage >= 0.25
          && (imageCoverage >= 0.65 || imageCount >= 20)
        );
      };

      const countAnotaNetworkItemOptions = item => {
        const groups = Array.isArray(item?.option_groups) ? item.option_groups : [];
        return groups.reduce((sum, group) => sum + ((group.items || []).length || 0), 0);
      };

      const networkItemKey = value => normalizeLookupKey(String(value || '')).slice(0, 90);

      const buildAnotaNetworkProbeIndex = networkMenu => {
        const byName = new Map();
        for (const category of (networkMenu?.categories || [])) {
          for (const item of (category.items || [])) {
            const key = networkItemKey(item.name);
            if (!key) continue;
            byName.set(key, {
              name: text(item.name),
              category: text(category.name),
              optionCount: countAnotaNetworkItemOptions(item),
              hasImage: Boolean(item.image_url),
              price: item.price,
            });
          }
        }
        return byName;
      };

      const findAnotaNetworkProbeMatch = (probeIndex, entry) => {
        const previewKey = networkItemKey(String(entry?.previewText || '').replace(/R\$\s*\d{1,4}[,.]\d{2}.*/i, ''));
        if (probeIndex.has(previewKey)) return probeIndex.get(previewKey);
        for (const [key, value] of probeIndex.entries()) {
          if (previewKey && (key.includes(previewKey) || previewKey.includes(key))) return value;
        }
        return null;
      };

      const readAnotaProductDetailProbe = async href => {
        const detailUrl = normalizeSourceUrl(href);
        if (!detailUrl || !/\/product\//i.test(detailUrl)) return { ok: false, error: 'invalid_product_url' };
        try {
          await chrome.tabs.update(tab.id, { url: detailUrl, active: true });
          await waitForTabComplete(tab.id, 18000);
          await new Promise(resolve => setTimeout(resolve, 700));
          const detailResult = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: async () => {
              const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
              const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
              const readText = () => String(document.body?.innerText || '');
              const targets = [
                document.scrollingElement || document.documentElement,
                ...Array.from(document.querySelectorAll('main,section,div,ul,ol'))
                  .filter(el => {
                    const style = getComputedStyle(el);
                    return /(auto|scroll)/i.test(`${style.overflowY} ${style.overflow}`)
                      && el.scrollHeight > el.clientHeight + 100
                      && el.clientHeight > 160;
                  })
                  .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))
                  .slice(0, 5)
              ].filter(Boolean);
              const snapshots = [];
              const remember = () => {
                const text = readText();
                if (text && !snapshots.includes(text)) snapshots.push(text);
              };
              remember();
              for (let pass = 0; pass < 10; pass++) {
                for (const target of targets) {
                  try { target.scrollTop = Math.min(target.scrollHeight, target.scrollTop + Math.max(430, innerHeight * 0.65)); } catch (_) {}
                }
                window.scrollBy(0, Math.max(430, innerHeight * 0.65));
                await sleep(160);
                remember();
              }
              const rawText = snapshots.join('\n').slice(0, 140000);
              const lines = rawText.split(/\r?\n/).map(normalize).filter(Boolean).slice(0, 700);
              const image = [...document.images]
                .map(img => img.currentSrc || img.src)
                .find(src => src && /^https?:\/\//i.test(src) && !/logo|icon|sprite|placeholder|google/i.test(src)) || null;
              return { ok: true, rawText, lines, image_url: image, url: location.href, title: document.title };
            }
          });
          return detailResult[0]?.result || { ok: false, error: 'empty_probe' };
        } catch (error) {
          return { ok: false, error: error?.message || String(error || 'probe_failed') };
        }
      };

      const verifyAnotaNetworkMenuAgainstDetails = async (networkMenu, label = 'network') => {
        if (!networkMenu?.success || !productEntries.length) return { ok: true, skipped: 'no_product_entries', samples: [] };
        const probeIndex = buildAnotaNetworkProbeIndex(networkMenu);
        const sampleEntries = productEntries
          .filter(entry => /\/product\//i.test(String(entry.href || '')))
          .map(entry => ({ entry, match: findAnotaNetworkProbeMatch(probeIndex, entry) }))
          .sort((a, b) => Number(b.match?.optionCount || 0) - Number(a.match?.optionCount || 0))
          .slice(0, 3);
        if (!sampleEntries.length) return { ok: true, skipped: 'no_direct_product_links', samples: [] };

        const samples = [];
        for (const sample of sampleEntries) {
          const detail = await readAnotaProductDetailProbe(sample.entry.href);
          const rawText = String(detail.rawText || detail.lines?.join('\n') || '');
          const sampleNameKey = networkItemKey(sample.match?.name || sample.entry.previewText || '');
          const detailTextReadable = Boolean(detail.ok && rawText.length > 180 && (
            /detalhes do produto|pesquise pelo nome|escolha|obrigat|adicionais|bordas|sabores/i.test(rawText)
            || (sampleNameKey && networkItemKey(rawText).includes(sampleNameKey.slice(0, 35)))
          ));
          const detailHintKey = normalizeLookupKey(rawText);
          const hasOptionGroupHints = /escolha\s+(?:ate\s+)?\d|obrigatorio|massas?\s*bordas?|bordas?|adicionais?|complementos?|turbinar|bora de combo|sabores?/.test(detailHintKey);
          const groups = detailTextReadable ? parseAnotaDeepOptionGroups({ rawText, name: sample.match?.name || sample.entry.previewText || '' }) : [];
          const detailOptionCount = groups.reduce((sum, group) => sum + ((group.items || []).length || 0), 0);
          const networkOptionCount = Number(sample.match?.optionCount || 0);
          let issue = '';
          if (detailTextReadable && hasOptionGroupHints && networkOptionCount === 0) {
            issue = 'detail_has_option_hints_but_network_has_no_options';
          } else if (detailTextReadable && detailOptionCount > networkOptionCount + Math.max(2, Math.ceil(networkOptionCount * 0.25))) {
            issue = 'detail_has_more_options_than_network';
          }
          samples.push({
            name: sample.match?.name || sample.entry.previewText || '',
            url: sample.entry.href,
            ok: Boolean(detailTextReadable),
            networkOptions: networkOptionCount,
            detailOptions: detailOptionCount,
            hasOptionGroupHints,
            issue,
            error: detailTextReadable ? '' : (detail.error || 'detail_page_unreadable_or_empty')
          });
        }
        const blockingIssues = samples.filter(sample => sample.issue);
        const unreadableCount = samples.filter(sample => !sample.ok).length;
        return {
          ok: blockingIssues.length === 0,
          label,
          samples,
          issues: blockingIssues.map(sample => `${sample.name || sample.url}: ${sample.issue}`),
          warning: unreadableCount === samples.length
            ? 'detail_pages_unreadable_network_accepted_by_structured_metrics'
            : unreadableCount > 0
              ? `${unreadableCount}_detail_probe_unreadable`
              : ''
        };
      };

      const acceptTrustedAnotaNetworkMenu = async (networkMenu, label) => {
        if (!networkMenu?.success) return false;
        if (!productEntries.length) return true;
        if (!shouldTrustAnotaNetworkMenu(networkMenu)) return false;
        if (isRichAnotaNetworkMenu(networkMenu)) {
          networkMenu.metrics = {
            ...(networkMenu.metrics || {}),
            detailVerification: {
              ok: true,
              label,
              skipped: 'rich_network_menu_accepted_without_product_navigation',
              samples: [],
              issues: [],
              warning: ''
            }
          };
          return true;
        }
        const verification = await verifyAnotaNetworkMenuAgainstDetails(networkMenu, label);
        networkMenu.metrics = {
          ...(networkMenu.metrics || {}),
          detailVerification: verification
        };
        if (verification.ok) return true;
        console.log(`[FilterFoodPlatformAdapters] Anota network ${label} falhou na auditoria por detalhe; forçando coleta item-a-item.`, verification.issues || []);
        return false;
      };

      const networkMenuBeforeBlockers = await readAnotaNetworkMenu(tab.id, initialSnapshot.finalUrl || url);
      mergeNetworkProductEntries(networkMenuBeforeBlockers);
      if (networkMenuBeforeBlockers?.success && await acceptTrustedAnotaNetworkMenu(networkMenuBeforeBlockers, 'before_blockers')) {
        return networkMenuBeforeBlockers;
      }
      if (networkMenuBeforeBlockers?.success && productEntries.length > 0) {
        console.log('[FilterFoodPlatformAdapters] Anota network trouxe menu, mas existem detalhes /product; forçando coleta profunda item-a-item para preservar imagens, escolhas e adicionais.');
      }

      if ((initialSnapshot.blockers || []).length) {
        return {
          success: false,
          platform: 'anota_ai_deep',
          error: `Bloqueio na página Anota AI: ${(initialSnapshot.blockers || []).join(', ')}`,
          requiresHuman: true,
          finalUrl: initialSnapshot.finalUrl || url
        };
      }

      const networkMenu = await readAnotaNetworkMenu(tab.id, initialSnapshot.finalUrl || url);
      mergeNetworkProductEntries(networkMenu);
      if (networkMenu?.success && await acceptTrustedAnotaNetworkMenu(networkMenu, 'after_blockers')) {
        return networkMenu;
      }
      if (networkMenu?.success && productEntries.length > 0) {
        console.log('[FilterFoodPlatformAdapters] Anota network pós-bloqueio trouxe menu, mas detalhes /product existem; continuando coleta item-a-item.');
      }

      const openProductEntry = async (entry) => {
        if (entry.href) {
          const href = normalizeSourceUrl(entry.href);
          if (!href || !/\/product\//i.test(href)) return '';
          await chrome.tabs.update(tab.id, { url: href, active: true });
          await waitForTabComplete(tab.id, 25000);
          await new Promise(resolve => setTimeout(resolve, 900));
          return href;
        }

        await chrome.tabs.update(tab.id, { url: initialSnapshot.finalUrl || url, active: true });
        await waitForTabComplete(tab.id, 25000);
        await new Promise(resolve => setTimeout(resolve, 1200));
        const clickResult = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          args: [Number(entry.clickIndex ?? -1), String(entry.previewText || '')],
          func: async (targetIndex, expectedText) => {
            const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
            const priceReGlobal = /(?:R\$\s*)?\d{1,4}[,.]\d{2}(?!\d)/ig;
            const noiseRe = /sacola|subtotal|entrega|cupom|estabelecimento fechado|fazer login|calcular taxa|favoritos da galeria|in..cio|inicio|pedidos/i;
            const isVisible = element => {
              const rect = element.getBoundingClientRect();
              const style = getComputedStyle(element);
              return rect.width >= 90 && rect.height >= 42 && style.visibility !== 'hidden' && style.display !== 'none';
            };
            const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
            const targets = [
              document.scrollingElement || document.documentElement,
              ...Array.from(document.querySelectorAll('main,section,div,ul,ol'))
                .filter(el => {
                  const style = getComputedStyle(el);
                  return /(auto|scroll)/i.test(`${style.overflowY} ${style.overflow}`)
                    && el.scrollHeight > el.clientHeight + 100
                    && el.clientHeight > 160;
                })
                .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))
                .slice(0, 5)
            ].filter(Boolean);
            for (let pass = 0; pass < 14; pass++) {
              for (const target of targets) {
                try { target.scrollTop = Math.min(target.scrollHeight, target.scrollTop + Math.max(480, innerHeight * 0.7)); } catch (_) {}
              }
              window.scrollBy(0, Math.max(480, innerHeight * 0.7));
              await sleep(180);
            }
            for (const target of targets) {
              try { target.scrollTop = 0; } catch (_) {}
            }
            window.scrollTo(0, 0);
            await sleep(300);
            const candidates = [];
            const seenClick = new Set();
            for (const element of [...document.querySelectorAll('article, li, section, button, [role="button"], div')]) {
              if (!isVisible(element)) continue;
              const candidateText = normalize(element.innerText || element.textContent);
              if (candidateText.length < 12 || candidateText.length > 900 || noiseRe.test(candidateText)) continue;
              const priceMatches = candidateText.match(priceReGlobal) || [];
              if (!priceMatches.length || priceMatches.length > 4) continue;
              const hasNestedProduct = [...element.children].some(child => {
                const childText = normalize(child.innerText || child.textContent);
                return childText.length >= 12
                  && childText.length < candidateText.length
                  && childText.length >= Math.min(180, candidateText.length * 0.35)
                  && ((childText.match(priceReGlobal) || []).length > 0);
              });
              if (hasNestedProduct) continue;
              const key = candidateText.toLowerCase().replace(/r\$\s*\d{1,4}[,.]\d{2}/ig, '').slice(0, 100);
              if (!key || seenClick.has(key)) continue;
              seenClick.add(key);
              candidates.push({ element, text: candidateText });
            }
            const expectedKey = normalize(expectedText).toLowerCase().slice(0, 80);
            const target = candidates[targetIndex]?.element
              || candidates.find(candidate => expectedKey && candidate.text.toLowerCase().includes(expectedKey.slice(0, 45)))?.element
              || null;
            if (!target) return { clicked: false, candidates: candidates.map(candidate => candidate.text.slice(0, 100)).slice(0, 20) };
            target.scrollIntoView({ block: 'center', inline: 'center' });
            await new Promise(resolve => setTimeout(resolve, 350));
            target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            target.click();
            target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            return { clicked: true, text: normalize(target.textContent).slice(0, 160) };
          }
        });
        if (!clickResult[0]?.result?.clicked) return '';
        for (let i = 0; i < 28; i++) {
          await new Promise(resolve => setTimeout(resolve, 350));
          const currentTab = await chrome.tabs.get(tab.id);
          if (/\/product\//i.test(currentTab?.url || '')) return currentTab.url || '';
          const state = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => ({
              url: location.href,
              hasDetail: /detalhes do produto/i.test(String(document.body?.innerText || '')),
            })
          });
          const stateResult = state[0]?.result || {};
          if (stateResult.hasDetail) return stateResult.url || '';
        }
        return '';
      };

      const categories = new Map();
      const rawTextParts = [initialSnapshot.rawText || ''];
      const details = [];
      for (const link of productEntries.slice(0, 140)) {
        const openedUrl = await openProductEntry(link);
        const href = normalizeSourceUrl(openedUrl || link.href || initialSnapshot.finalUrl || url);
        if (!openedUrl) continue;
        const detailResult = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: async () => {
            const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
            const priceRe = /(?:R\$\s*)?\d{1,4}[,.]\d{2}(?!\d)/i;
            const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
            const readText = () => String(document.body?.innerText || '');
            const scrollableTargets = () => [
              document.scrollingElement || document.documentElement,
              ...Array.from(document.querySelectorAll('main,section,div,ul,ol'))
                .filter(el => {
                  const style = getComputedStyle(el);
                  return /(auto|scroll)/i.test(`${style.overflowY} ${style.overflow}`)
                    && el.scrollHeight > el.clientHeight + 100
                    && el.clientHeight > 160;
                })
                .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))
                .slice(0, 6)
            ].filter(Boolean);
            const rawSnapshots = [];
            const targets = scrollableTargets();
            const rememberText = () => {
              const currentText = readText();
              if (currentText && !rawSnapshots.includes(currentText)) rawSnapshots.push(currentText);
            };
            rememberText();
            for (let pass = 0; pass < 18; pass++) {
              for (const target of targets) {
                try { target.scrollTop = Math.min(target.scrollHeight, target.scrollTop + Math.max(460, innerHeight * 0.72)); } catch (_) {}
              }
              window.scrollBy(0, Math.max(460, innerHeight * 0.72));
              await sleep(220);
              rememberText();
            }
            for (const target of targets) {
              try { target.scrollTop = 0; } catch (_) {}
            }
            window.scrollTo(0, 0);
            await sleep(180);
            rememberText();
            const accumulatedText = rawSnapshots.join('\n');
            const lines = accumulatedText
              .split(/\r?\n/)
              .map(normalize)
              .filter(Boolean)
              .filter(line => !/^\d+\s*\/\s*\d+\s*$/.test(line));
            const heading = [...document.querySelectorAll('h1,h2,[role="heading"],strong,b')]
              .map(node => normalize(node.textContent))
              .find(value => value && value.length >= 2 && value.length <= 160 && !priceRe.test(value) && !/detalhes do produto|pesquise pelo nome/i.test(value));
            const priceLine = lines.find(line => priceRe.test(line));
            const price = priceLine?.match(priceRe)?.[0] || null;
            const detailsIndex = lines.findIndex(line => /detalhes do produto/i.test(line));
            const lineName = lines
              .slice(detailsIndex >= 0 ? detailsIndex + 1 : 0, detailsIndex >= 0 ? detailsIndex + 10 : 12)
              .find((line, index, subset) => {
                if (!line || line.length < 2 || line.length > 180 || priceRe.test(line) || /detalhes do produto|pesquise pelo nome|compartilhar|buscar/i.test(line)) return false;
                const next = subset[index + 1] || lines[(detailsIndex >= 0 ? detailsIndex + 1 : 0) + index + 1] || '';
                return priceRe.test(next) || !/escolha|obrigat|adicionar|avançar|avancar/i.test(line);
              });
            const name = lineName || heading || lines.find(line => line.length >= 2 && line.length <= 160 && !priceRe.test(line) && !/detalhes do produto|pesquise pelo nome/i.test(line)) || '';
            const nameIndex = lines.findIndex(line => line.toLowerCase() === name.toLowerCase());
            const priceIndex = priceLine ? lines.findIndex(line => line === priceLine) : -1;
            const stopIndex = lines.findIndex((line, index) => index > Math.max(nameIndex, priceIndex) && /pesquise pelo nome|escolha\s+\d|escolha\s+at[eé]|obrigat[oó]rio|alguma observa/i.test(line));
            const descriptionStart = priceIndex >= 0 ? priceIndex + 1 : nameIndex + 1;
            const descriptionLines = lines
              .slice(Math.max(0, descriptionStart), stopIndex > 0 ? stopIndex : Math.min(lines.length, descriptionStart + 5))
              .filter(line => line !== name && !priceRe.test(line) && !/detalhes do produto|pesquise pelo nome/i.test(line));
            const image = [...document.images]
              .map(img => img.currentSrc || img.src)
              .find(src => src && /^https?:\/\//i.test(src) && !/logo|icon|sprite|placeholder|google/i.test(src)) || null;
            return {
              name,
              price,
              description: descriptionLines.join(' ').slice(0, 1000),
              image_url: image,
              lines: lines.slice(0, 700),
              rawText: accumulatedText.slice(0, 180000),
              finalUrl: location.href,
              title: document.title
            };
          }
        });
        const detail = detailResult[0]?.result || {};
        if (!detail.name) continue;
        const groups = parseAnotaDeepOptionGroups(detail);
        const detailHintKey = normalizeLookupKey(String(detail.rawText || detail.lines?.join('\n') || ''));
        const hasOptionGroupHints = /escolha\s+(?:ate\s+)?\d|obrigatorio|massas?\s*bordas?|bordas?|adicionais?|complementos?|turbinar|bora de combo|sabores?/.test(detailHintKey);
        const flatOptions = groups.flatMap(group => group.items.map(option => ({
          ...option,
          group_name: group.name,
          min_quantity: group.min_quantity,
          max_quantity: group.max_quantity,
          is_required: group.is_required
        })));
        const priceValue = parseTextPrice(detail.price);
        const categoryName = text(link.category) || 'Cardápio';
        if (!categories.has(categoryName)) categories.set(categoryName, []);
        const item = {
          external_id: href.match(/\/product\/([^/?#]+)/i)?.[1] || href,
          name: text(detail.name),
          description: text(detail.description),
          image_url: detail.image_url || null,
          price: priceValue,
          price_min: priceValue,
          price_max: priceValue,
          price_type: priceValue != null ? 'fixed' : (flatOptions.length ? 'option_only' : 'unknown'),
          price_source: priceValue != null ? 'anota_detail_page' : null,
          options: flatOptions,
          option_groups: groups,
          source_url: detail.finalUrl || href,
          raw_data: { source: 'anota_ai_deep', previewText: link.previewText, lines: detail.lines, option_groups: groups },
          extraction_confidence: flatOptions.length ? 0.97 : 0.92,
          needs_review: (priceValue == null && !flatOptions.length) || (hasOptionGroupHints && !flatOptions.length)
        };
        if (!categories.get(categoryName).some(existing => existing.external_id === item.external_id || existing.name.toLowerCase() === item.name.toLowerCase())) {
          categories.get(categoryName).push(item);
          details.push({ name: item.name, options: flatOptions.length, hasOptionGroupHints, url: item.source_url });
          rawTextParts.push(detail.rawText || '');
        }
      }

      const normalizedCategories = [...categories.entries()]
        .map(([name, items], index) => ({ name, order_index: index, items }))
        .filter(category => category.items.length);
      const itemCount = normalizedCategories.reduce((sum, category) => sum + category.items.length, 0);
      const optionCount = normalizedCategories.reduce((sum, category) => sum + category.items.reduce((inner, item) => inner + (item.options || []).length, 0), 0);
      const detailGroupHintCount = details.filter(detail => detail.hasOptionGroupHints).length;
      const detailGroupHintMissCount = details.filter(detail => detail.hasOptionGroupHints && Number(detail.options || 0) === 0).length;
      const optionExtractionMissed = detailGroupHintMissCount > 0;
      return {
        success: itemCount > 0 && !optionExtractionMissed,
        platform: 'anota_ai_deep',
        extractionLevel: 0,
        confidence: optionExtractionMissed ? 0.38 : (optionCount > 0 ? 0.98 : 0.9),
        categories: normalizedCategories,
        rawText: rawTextParts.join('\n\n--- ITEM DETAIL ---\n\n').slice(0, 450000),
        sourceUrl: initialSnapshot.finalUrl || url,
        finalUrl: initialSnapshot.finalUrl || url,
        details,
        metrics: {
          productLinks: productEntries.filter(entry => entry.href).length,
          clickCandidates: productEntries.filter(entry => entry.clickOnly).length,
          itemCount,
          optionCount,
          detailPagesCaptured: details.length,
          detailGroupHintCount,
          detailGroupHintMissCount,
          optionExtractionMissed
        },
        error: optionExtractionMissed
          ? 'Detalhes do Anota AI indicam escolhas/adicionais, mas nenhuma option_group foi capturada. Recoleta item-a-item obrigatória.'
          : (itemCount > 0 ? undefined : 'Nenhum produto detalhado encontrado no Anota AI.')
      };
    } finally {
      try { await chrome.tabs.remove(tab.id); } catch (_) {}
      if (previous[0]?.id) try { await chrome.tabs.update(previous[0].id, { active: true }); } catch (_) {}
    }
  }

  async function extract(url) {
    if (isUnsafeMenuDestination(url)) throw new Error('URL bloqueada: destino não parece ser cardápio.');
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
      const native = await collectAnotaAiNativeBySlug(url);
      if (native?.success) return native;
      const deep = await collectAnotaAiDeep(url);
      if (deep?.success) return deep;
      if (deep?.requiresHuman) return deep;
      if (deep?.metrics?.optionExtractionMissed) return deep;
      const slug = extractAnotaSlugFromUrl(url) || parsed.pathname.split('/').filter(Boolean).pop();
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
      if (visible.requiresHuman) return visible;
      if (!visible.categories.length && !/\/products\/?$/i.test(parsed.pathname)) {
        const productsUrl = `${parsed.origin}/products`;
        visible = await collectVisibleTextMenu(productsUrl);
        if (visible.requiresHuman) return visible;
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
    if (visible.requiresHuman) return visible;
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
const FilterFoodPlatformAdapterCache = globalThis.__FILTERFOOD_PLATFORM_ADAPTER_CACHE__ || new Map();
globalThis.__FILTERFOOD_PLATFORM_ADAPTER_CACHE__ = FilterFoodPlatformAdapterCache;
const filterFoodPlatformCacheKey = value => {
  try {
    const parsed = new URL(value);
    parsed.hash = '';
    return parsed.href;
  } catch (_) {
    return String(value || '');
  }
};
const filterFoodPlatformItemCount = result => Array.isArray(result?.categories)
  ? result.categories.reduce((total, category) => total + ((category.items || []).length || 0), 0)
  : 0;
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message?.action !== 'extractMenuPlatform') return false;
  const cacheKey = filterFoodPlatformCacheKey(message.url);
  FilterFoodPlatformAdapters.extract(message.url)
    .then(result => {
      const itemCount = filterFoodPlatformItemCount(result);
      if (result?.success && itemCount > 0) {
        FilterFoodPlatformAdapterCache.set(cacheKey, {
          ...result,
          cacheStoredAt: Date.now(),
          metrics: { ...(result.metrics || {}), itemCount: result.metrics?.itemCount ?? itemCount }
        });
        sendResponse(result);
        return;
      }

      const cached = FilterFoodPlatformAdapterCache.get(cacheKey);
      const cachedItemCount = filterFoodPlatformItemCount(cached);
      const cacheAgeMs = cached?.cacheStoredAt ? Date.now() - Number(cached.cacheStoredAt) : Number.POSITIVE_INFINITY;
      const failedByTemporaryBlock = result?.requiresHuman || /cloudflare|attention required|captcha|blocked|checking your browser|just a moment/i.test(String(result?.error || ''));
      if (failedByTemporaryBlock && cached?.success && cachedItemCount > 0 && cacheAgeMs < 45 * 60 * 1000) {
        sendResponse({
          ...cached,
          cacheFallback: true,
          warning: `Fonte nativa reutilizada do cache porque a tentativa atual falhou temporariamente: ${result?.error || 'bloqueio intermitente'}`,
          metrics: {
            ...(cached.metrics || {}),
            cacheFallback: true,
            cacheAgeMs,
            failedAttemptError: result?.error || null
          }
        });
        return;
      }

      sendResponse(result);
    })
    .catch(error => {
      const cached = FilterFoodPlatformAdapterCache.get(cacheKey);
      const cacheAgeMs = cached?.cacheStoredAt ? Date.now() - Number(cached.cacheStoredAt) : Number.POSITIVE_INFINITY;
      if (cached?.success && filterFoodPlatformItemCount(cached) > 0 && cacheAgeMs < 45 * 60 * 1000) {
        sendResponse({
          ...cached,
          cacheFallback: true,
          warning: `Fonte nativa reutilizada do cache porque a extração atual gerou erro: ${error.message || error}`,
          metrics: { ...(cached.metrics || {}), cacheFallback: true, cacheAgeMs }
        });
        return;
      }
      sendResponse({ success: false, error: error.message });
    });
  return true;
});
