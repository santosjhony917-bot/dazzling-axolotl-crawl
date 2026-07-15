import assert from 'node:assert/strict';
import test from 'node:test';

const telemetry = await import('../src/features/menu-assistant/telemetry.ts');

function installBrowser() {
  globalThis.window = {
    location: { pathname: '/home' },
    dataLayer: [],
    dispatchEvent() {},
  };
  return globalThis.window;
}

function resultFixture() {
  return {
    id: 'result',
    itemId: 'SECRET_ITEM_ID',
    itemName: 'SECRET_DISH_NAME',
    itemDescription: null,
    itemImageUrl: null,
    itemCategoryId: 'category',
    itemCategoryName: 'SECRET_CATEGORY',
    restaurantId: 'SECRET_RESTAURANT_ID',
    restaurantName: 'SECRET_RESTAURANT_NAME',
    restaurantCategory: null,
    restaurantNeighborhood: 'SECRET_NEIGHBORHOOD',
    restaurantCity: 'SECRET_CITY',
    restaurantState: 'PB',
    distanceKm: 1.2,
    restaurantOpeningHours: null,
    price: { currency: 'BRL', value: 10, min: null, max: null, type: null },
    matchReason: 'SECRET_MATCH_REASON',
    evidence: {
      kind: 'published_catalog',
      itemId: 'SECRET_ITEM_ID',
      restaurantId: 'SECRET_RESTAURANT_ID',
      sourceUrl: 'https://secret.example/menu',
      verifiedAt: '2026-01-01T00:00:00.000Z',
      grounding: 'source_verified',
    },
  };
}

test('query telemetry contains only intent shape, never free text or location data', () => {
  const browser = installBrowser();
  const intent = telemetry.describeMenuIntentForTelemetry(null, {
    location: {
      latitude: -7.1,
      longitude: -34.8,
      label: 'SECRET_ADDRESS',
      neighborhood: 'SECRET_NEIGHBORHOOD',
      regionId: null,
      city: 'SECRET_CITY',
      state: 'PB',
      radiusKm: 10,
      source: 'manual',
    },
    priceMax: 100,
    categories: ['SECRET_CATEGORY'],
  });
  telemetry.trackMenuQuerySubmitted({
    operation: telemetry.createMenuTelemetryOperation('home'),
    trigger: 'text',
    queryLength: 38,
    intent,
  });

  assert.equal(browser.dataLayer.length, 1);
  const serialized = JSON.stringify(browser.dataLayer);
  for (const secret of ['SECRET_ADDRESS', 'SECRET_NEIGHBORHOOD', 'SECRET_CITY', 'SECRET_CATEGORY', '-7.1', '-34.8']) {
    assert.equal(serialized.includes(secret), false, `telemetry leaked ${secret}`);
  }
  assert.equal(browser.dataLayer[0].query_length_bucket, '21_60');
  assert.equal(browser.dataLayer[0].has_location, true);
  assert.equal(browser.dataLayer[0].category_count, 1);
});

test('home lifecycle telemetry records only coarse state', () => {
  const browser = installBrowser();
  telemetry.trackMenuHomeViewed({ hasLocation: false, demoAvailable: true });
  telemetry.trackMenuPromptStarted({ surface: 'home', entryPoint: 'landing_handoff' });
  telemetry.trackMenuLocationResolved({ surface: 'home', source: 'manual' });

  assert.deepEqual(
    browser.dataLayer.map((event) => event.event),
    [
      'menu_assistant_home_view',
      'menu_assistant_assistant_prompt_started',
      'menu_assistant_location_resolved',
    ],
  );
  assert.equal(JSON.stringify(browser.dataLayer).includes('SECRET'), false);
});

test('outcome and grounded-result telemetry expose metrics but no catalog facts', () => {
  const browser = installBrowser();
  const result = resultFixture();
  const operation = telemetry.createMenuTelemetryOperation('home');
  telemetry.trackMenuDiscoveryOutcome({
    status: 'success',
    surface: 'home',
    rawText: 'SECRET_RAW_QUERY',
    intent: null,
    results: [result],
    coverage: {
      status: 'covered',
      regionLabel: 'SECRET_REGION_LABEL',
      eligibleRestaurantCount: 9,
      searchableItemCount: 80,
      checkedAt: '2026-01-01T00:00:00.000Z',
      reason: null,
    },
    usedAI: true,
    queriesUsed: ['SECRET_REWRITTEN_QUERY'],
    unappliedCriteria: [],
    hasMore: false,
    traceId: 'safe-trace-id',
    error: null,
    requestId: 1,
    isFromCache: false,
    cacheSavedAt: null,
  }, operation);
  telemetry.trackGroundedResultOpened({ result, surface: 'home', destination: 'catalog_item' });

  assert.deepEqual(
    browser.dataLayer.map((event) => event.event),
    [
      'menu_assistant_coverage_checked',
      'menu_assistant_ai_fallback_used',
      'menu_assistant_results_returned',
      'menu_assistant_result_opened',
    ],
  );
  const serialized = JSON.stringify(browser.dataLayer);
  for (const secret of [
    'SECRET_RAW_QUERY',
    'SECRET_REWRITTEN_QUERY',
    'SECRET_REGION_LABEL',
    'SECRET_ITEM_ID',
    'SECRET_RESTAURANT_NAME',
    'secret.example',
  ]) {
    assert.equal(serialized.includes(secret), false, `telemetry leaked ${secret}`);
  }
});
