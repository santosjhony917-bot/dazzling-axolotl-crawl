const DATAFORSEO_BASE_URL = 'https://api.dataforseo.com/v3';

export function providerFromEnv(env = {}, fallback = 'dataforseo') {
  return String(env.SEARCH_PROVIDER || env.SERP_PROVIDER || fallback || 'dataforseo').toLowerCase();
}

export function ensureProviderCredentials(env = {}, provider = providerFromEnv(env)) {
  if (provider === 'serpapi') {
    const apiKey = env.SERPAPI_API_KEY || env.VITE_SERPAPI_API_KEY;
    if (!apiKey) throw new Error('SERPAPI_API_KEY ausente no .env.');
    return { provider, apiKey };
  }

  const login = env.DATAFORSEO_LOGIN || env.DATAFORSEO_API_LOGIN;
  const password = env.DATAFORSEO_PASSWORD || env.DATAFORSEO_API_PASSWORD;
  const encoded = env.DATAFORSEO_BASIC_AUTH || env.DATAFORSEO_BASE64_AUTH;
  if (!encoded && (!login || !password)) {
    throw new Error('DataForSEO ausente: configure DATAFORSEO_LOGIN e DATAFORSEO_PASSWORD no .env.');
  }
  return { provider: 'dataforseo' };
}

function dataForSeoAuthHeader(env = {}) {
  const encoded = env.DATAFORSEO_BASIC_AUTH || env.DATAFORSEO_BASE64_AUTH;
  if (encoded) return encoded.startsWith('Basic ') ? encoded : `Basic ${encoded}`;

  const login = env.DATAFORSEO_LOGIN || env.DATAFORSEO_API_LOGIN;
  const password = env.DATAFORSEO_PASSWORD || env.DATAFORSEO_API_PASSWORD;
  if (!login || !password) {
    throw new Error('DataForSEO credentials missing.');
  }
  return `Basic ${Buffer.from(`${login}:${password}`, 'utf8').toString('base64')}`;
}

async function dataForSeoPost(env, endpoint, tasks, timeoutMs = 60000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${DATAFORSEO_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: dataForSeoAuthHeader(env),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tasks),
      signal: controller.signal,
    });
    const text = await response.text();
    let payload = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`DataForSEO returned non-JSON response: ${text.slice(0, 180)}`);
    }
    const statusCode = Number(payload.status_code || 0);
    if (!response.ok || statusCode >= 40000 || Number(payload.tasks_error || 0) > 0) {
      const taskError = (payload.tasks || []).find((task) => Number(task.status_code || 0) >= 40000);
      throw new Error(taskError?.status_message || payload.status_message || `DataForSEO HTTP ${response.status}`);
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function dataForSeoResults(payload) {
  return (payload.tasks || []).flatMap((task) => task.result || []);
}

function dataForSeoItems(payload) {
  return dataForSeoResults(payload).flatMap((result) => result.items || []);
}

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function padTime(value) {
  return String(Number(value || 0)).padStart(2, '0');
}

function timeSlotToText(slot) {
  const open = slot?.open;
  const close = slot?.close;
  if (!open || !close) return '';
  return `${padTime(open.hour)}:${padTime(open.minute)}-${padTime(close.hour)}:${padTime(close.minute)}`;
}

function dataForSeoTimetableToGoogleHours(workHours) {
  const timetable = workHours?.timetable;
  if (!timetable || typeof timetable !== 'object') return null;
  const result = {};
  for (const [day, slots] of Object.entries(timetable)) {
    const texts = Array.isArray(slots) ? slots.map(timeSlotToText).filter(Boolean) : [];
    result[day] = texts.length ? texts.join(', ') : 'Closed';
  }
  return Object.keys(result).length ? result : null;
}

function dataForSeoMapsItemToLocalResult(item) {
  const rating = item.rating && typeof item.rating === 'object' ? item.rating : {};
  const ratingValue = item.rating && typeof item.rating !== 'object' ? item.rating : rating.value;
  const votesCount = rating.votes_count ?? item.rating_votes_count ?? item.reviews_count ?? item.review_count;
  const addressInfo = item.address_info && typeof item.address_info === 'object' ? item.address_info : {};
  const address = clean(item.address || [
    addressInfo.address,
    addressInfo.borough,
    addressInfo.city,
    addressInfo.region,
    addressInfo.zip,
  ].filter(Boolean).join(', '));
  const latitude = Number(item.latitude);
  const longitude = Number(item.longitude);

  return {
    title: clean(item.title || item.original_title),
    name: clean(item.title || item.original_title),
    link: item.url || item.contact_url || '',
    website: item.url || '',
    place_id: item.place_id || null,
    data_id: item.feature_id || item.cid || null,
    cid: item.cid || null,
    type: item.category || item.category_name || '',
    types: [
      item.category || item.category_name,
      ...(item.additional_categories || []).map((category) => (
        typeof category === 'string' ? category : category?.category || category?.title || category?.name
      )),
    ].filter(Boolean),
    address,
    address_info: addressInfo,
    phone: item.phone || '',
    rating: ratingValue ?? null,
    reviews: votesCount ?? null,
    reviews_original: votesCount ?? null,
    gps_coordinates: {
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
    },
    hours: item.work_hours?.current_status || '',
    open_state: item.work_hours?.current_status || '',
    operating_hours: dataForSeoTimetableToGoogleHours(item.work_hours),
    thumbnail: item.main_image || '',
    serpapi_thumbnail: item.main_image || '',
    total_photos: item.total_photos ?? null,
    raw_dataforseo: item,
  };
}

export async function dataForSeoMapsSearch(env, search, options = {}) {
  const zoom = String(search.zoom || '').replace(/z$/i, '') || String(search.ll || '').match(/,(\d+)z$/i)?.[1] || '15';
  const locationCoordinate = `${Number(search.lat).toFixed(7)},${Number(search.lng).toFixed(7)},${zoom}z`;
  const payload = await dataForSeoPost(env, '/serp/google/maps/live/advanced', [{
    keyword: search.query,
    language_code: options.languageCode || 'pt',
    location_coordinate: locationCoordinate,
    se_domain: options.seDomain || 'google.com.br',
    depth: Number(options.depth || 100),
    device: 'desktop',
    os: 'windows',
    search_this_area: true,
    search_places: false,
    tag: options.tag || search.area || undefined,
  }], options.timeoutMs || 60000);
  const task = payload.tasks?.[0] || {};
  const result = task.result?.[0] || {};
  const items = (result.items || []).filter((item) => ['maps_search', 'maps_paid_item'].includes(item.type));
  return {
    search_metadata: {
      id: task.id || null,
      status: task.status_message || payload.status_message || null,
      total_time_taken: Number(task.time || payload.time || 0),
      provider: 'dataforseo',
      cost: task.cost ?? payload.cost ?? null,
    },
    search_parameters: task.data || {},
    local_results: items.map(dataForSeoMapsItemToLocalResult),
    raw_dataforseo: payload,
  };
}

function addLinkCandidate(list, item, source) {
  const link = clean(item.url || item.source_url || item.encoded_url || item.image_url);
  if (!link) return;
  list.push({
    source,
    position: item.rank_absolute ?? item.rank_group ?? null,
    title: clean(item.title || item.alt || item.subtitle),
    link,
    snippet: clean(item.description || item.snippet || item.subtitle || item.alt),
    displayed_link: clean(item.domain || item.breadcrumb),
  });
}

function flattenItems(items = []) {
  const flat = [];
  for (const item of items) {
    flat.push(item);
    if (Array.isArray(item.items)) flat.push(...flattenItems(item.items));
  }
  return flat;
}

export async function dataForSeoOrganicSearch(env, query, options = {}) {
  const locationName = options.locationName || env.DATAFORSEO_LOCATION_NAME || 'Brazil';
  const payload = await dataForSeoPost(env, '/serp/google/organic/live/advanced', [{
    keyword: query,
    language_code: options.languageCode || 'pt',
    location_name: locationName,
    se_domain: options.seDomain || 'google.com.br',
    depth: Number(options.numResults || 10),
    device: 'desktop',
    os: 'windows',
  }], options.timeoutMs || 60000);

  const task = payload.tasks?.[0] || {};
  const result = task.result?.[0] || {};
  const flat = flattenItems(result.items || []);
  const organic_results = [];
  const inline_images = [];
  const places = [];

  for (const item of flat) {
    if (item.type === 'organic') {
      addLinkCandidate(organic_results, item, 'organic');
    } else if (['images', 'images_search', 'carousel_element'].includes(item.type)) {
      addLinkCandidate(inline_images, item, 'inline_image');
    } else if (['local_pack', 'local_pack_element', 'maps_search'].includes(item.type)) {
      places.push({
        position: item.rank_absolute ?? item.rank_group ?? null,
        title: clean(item.title),
        website: item.url || item.contact_url || '',
        link: item.url || item.contact_url || '',
        place_id_search: item.place_id || '',
        type: item.category || item.type || '',
        address: item.address || '',
        phone: item.phone || '',
      });
    } else if (item.url || item.source_url || item.image_url) {
      addLinkCandidate(organic_results, item, item.type || 'organic');
    }
  }

  return {
    search_metadata: {
      id: task.id || null,
      status: task.status_message || payload.status_message || null,
      total_time_taken: Number(task.time || payload.time || 0),
      provider: 'dataforseo',
      cost: task.cost ?? payload.cost ?? null,
    },
    search_parameters: task.data || {},
    organic_results,
    local_results: { places },
    inline_images,
    raw_dataforseo: payload,
  };
}

export async function dataForSeoImagesSearch(env, query, options = {}) {
  const locationCoordinate = options.locationCoordinate || null;
  const task = {
    keyword: query,
    language_code: options.languageCode || 'pt',
    se_domain: options.seDomain || 'google.com.br',
    depth: Number(options.depth || 20),
    device: 'desktop',
    os: 'windows',
  };
  if (locationCoordinate) {
    task.location_coordinate = locationCoordinate;
  } else {
    task.location_name = options.locationName || env.DATAFORSEO_LOCATION_NAME || 'Brazil';
  }
  const payload = await dataForSeoPost(env, '/serp/google/images/live/advanced', [task], options.timeoutMs || 60000);
  const images = dataForSeoItems(payload)
    .filter((item) => item.type === 'images_search' || item.image_url || item.source_url || item.encoded_url)
    .map((item, index) => ({
      position: item.rank_absolute ?? item.rank_group ?? index + 1,
      title: clean(item.title || item.alt),
      source: clean(item.domain),
      link: item.url || '',
      original: item.source_url || item.encoded_url || item.image_url || '',
      thumbnail: item.image_url || item.encoded_url || item.source_url || '',
    }))
    .filter((item) => item.original || item.thumbnail);
  return { payload, query, images, attempts: [{ query, count: images.length, provider: 'dataforseo' }] };
}
