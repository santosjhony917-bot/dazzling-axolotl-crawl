import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';

const edgeSource = await readFile(
  new URL('../supabase/functions/rewrite-search-query-ai/index.ts', import.meta.url),
  'utf8',
);
const sourceWithoutRemoteImport = edgeSource.replace(
  /^import\s+\{\s*serve\s*\}\s+from\s+"https:\/\/[^\n]+;\s*$/m,
  '',
);
const transpiled = ts.transpileModule(sourceWithoutRemoteImport, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.None,
  },
  reportDiagnostics: true,
});
assert.deepEqual(
  (transpiled.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error),
  [],
  'Edge Function must be valid TypeScript syntax',
);

function createRuntime(environment = {}, fetchImplementation = async () => {
  throw new Error('provider fetch should not have been called');
}) {
  let handler = null;
  const logs = [];
  const mockConsole = { info: (value) => logs.push(String(value)) };
  const execute = new Function(
    'serve',
    'Deno',
    'fetch',
    'crypto',
    'performance',
    'Request',
    'Response',
    'TextEncoder',
    'DOMException',
    'setTimeout',
    'clearTimeout',
    'console',
    transpiled.outputText,
  );
  execute(
    (candidate) => { handler = candidate; },
    { env: { get: (key) => environment[key] }, },
    fetchImplementation,
    webcrypto,
    performance,
    Request,
    Response,
    TextEncoder,
    DOMException,
    setTimeout,
    clearTimeout,
    mockConsole,
  );
  assert.equal(typeof handler, 'function');
  return { handler, logs };
}

function request(body, headers = {}) {
  return new Request('https://example.supabase.co/functions/v1/rewrite-search-query-ai', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:8080',
      'x-forwarded-for': '203.0.113.10',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

const validBody = {
  rawQuery: 'pizza pequena de calabresa',
  dbQuery: 'pizza pequena calabresa',
  existingResultCount: 1,
  localFallbacks: ['pizza calabresa'],
};

test('invalid origins and oversized inputs are rejected before provider use', async () => {
  const { handler } = createRuntime();
  const forbidden = await handler(request(validBody, { origin: 'https://attacker.invalid' }));
  assert.equal(forbidden.status, 403);

  const oversized = await handler(request({ ...validBody, rawQuery: 'x'.repeat(241) }));
  assert.equal(oversized.status, 400);
});

test('missing provider configuration returns the deterministic two-field contract', async () => {
  const { handler, logs } = createRuntime();
  const response = await handler(request({
    ...validBody,
    rawQuery: 'pizza calabresa teste@example.com 83999998888',
  }));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(Object.keys(payload).sort(), ['expandedQueries', 'usedAI']);
  assert.equal(payload.usedAI, false);
  assert.ok(payload.expandedQueries.length <= 5);
  const serializedLogs = logs.join('\n');
  assert.equal(serializedLogs.includes('teste@example.com'), false);
  assert.equal(serializedLogs.includes('83999998888'), false);
});

test('successful structured rewrite is bounded, cacheable and uses only an allowed model', async () => {
  let providerCalls = 0;
  let requestedModel = null;
  const providerFetch = async (_url, options) => {
    providerCalls += 1;
    requestedModel = JSON.parse(options.body).model;
    return new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({
        expandedQueries: ['calabresa', 'pizza calabresa', 'pizza sabor calabresa', 'calabresa assada', 'pizza tradicional calabresa'],
      }) } }],
      usage: { prompt_tokens: 40, completion_tokens: 20, total_tokens: 60 },
    }), { status: 200 });
  };
  const { handler, logs } = createRuntime({
    OPENAI_API_KEY: 'test-key-never-logged',
    SEARCH_REWRITE_ALLOWED_MODELS: 'safe-rewrite-model',
    SEARCH_REWRITE_MODEL: 'model-not-in-allowlist',
  }, providerFetch);

  const first = await handler(request(validBody));
  const second = await handler(request(validBody));
  const firstPayload = await first.json();
  const secondPayload = await second.json();
  assert.equal(firstPayload.usedAI, true);
  assert.ok(firstPayload.expandedQueries.length <= 5);
  assert.deepEqual(secondPayload, firstPayload);
  assert.equal(second.headers.get('x-filterfood-rewrite-reason'), 'cache_hit');
  assert.equal(providerCalls, 1);
  assert.equal(requestedModel, 'safe-rewrite-model');
  assert.equal(logs.join('\n').includes('test-key-never-logged'), false);
});

test('rate limit rejects excess traffic without consuming the provider', async () => {
  let providerCalls = 0;
  const { handler } = createRuntime({}, async () => {
    providerCalls += 1;
    return new Response('{}', { status: 500 });
  });
  let lastResponse = null;
  for (let index = 0; index < 21; index += 1) {
    lastResponse = await handler(request(validBody));
  }
  assert.equal(lastResponse.status, 429);
  assert.equal(lastResponse.headers.get('retry-after') !== null, true);
  assert.equal(providerCalls, 0);
});

test('three provider failures open the circuit and preserve deterministic fallback', async () => {
  let providerCalls = 0;
  const { handler } = createRuntime({ OPENAI_API_KEY: 'test-key' }, async () => {
    providerCalls += 1;
    return new Response('{}', { status: 503 });
  });

  for (let index = 0; index < 3; index += 1) {
    const response = await handler(request({ ...validBody, rawQuery: `${validBody.rawQuery} ${index}` }));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).usedAI, false);
  }
  const circuitResponse = await handler(request({ ...validBody, rawQuery: `${validBody.rawQuery} circuit` }));
  assert.equal(circuitResponse.headers.get('x-filterfood-rewrite-reason'), 'circuit_open');
  assert.equal(providerCalls, 3);
});

