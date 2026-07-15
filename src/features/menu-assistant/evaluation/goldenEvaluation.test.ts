import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateGoldenDataset,
  formatGoldenEvaluationReport,
  loadGoldenDataset,
} from './goldenEvaluation.ts';

const MINIMUM_TAG_COVERAGE: Readonly<Record<string, number>> = {
  category: 30,
  dish: 20,
  budget: 20,
  people: 20,
  occasion: 20,
  location: 20,
};

test('dataset dourado tem volume, diversidade e versionamento mínimos', () => {
  const dataset = loadGoldenDataset();
  const uniquePrompts = new Set(dataset.cases.map((entry) => entry.prompt));
  const tags = new Map<string, number>();

  for (const entry of dataset.cases) {
    for (const tag of entry.tags) tags.set(tag, (tags.get(tag) ?? 0) + 1);
  }

  assert.equal(dataset.schemaVersion, 1);
  assert.match(dataset.datasetVersion, /^menu-intent-pt-BR-v\d+\.\d+\.\d+$/);
  assert.ok(dataset.cases.length >= 100, `Esperados ao menos 100 casos; recebidos ${dataset.cases.length}.`);
  assert.ok(uniquePrompts.size >= 100, `Esperados ao menos 100 prompts únicos; recebidos ${uniquePrompts.size}.`);

  for (const [tag, minimum] of Object.entries(MINIMUM_TAG_COVERAGE)) {
    assert.ok((tags.get(tag) ?? 0) >= minimum, `Cobertura insuficiente para ${tag}: ${tags.get(tag) ?? 0}/${minimum}.`);
  }

  assert.ok(
    (tags.get('restriction') ?? 0) + (tags.get('exclusion') ?? 0) >= 20,
    'Dietas, restrições e exclusões precisam somar ao menos 20 casos.',
  );
  assert.ok(
    (tags.get('unsupported') ?? 0) + (tags.get('ambiguous') ?? 0) >= 20,
    'Casos não suportados ou ambíguos precisam somar ao menos 20 casos.',
  );
});

test('parser alcança os gates por campo sem consultar nem simular catálogo', () => {
  const report = evaluateGoldenDataset();
  process.stdout.write(`\n${formatGoldenEvaluationReport(report)}\n\n`);

  const failedMetrics = report.fieldMetrics.filter((metric) => !metric.passed);
  assert.deepEqual(
    failedMetrics.map((metric) => ({
      field: metric.field,
      accuracy: metric.accuracy,
      threshold: metric.threshold,
    })),
    [],
    'Um ou mais campos ficaram abaixo do gate. Consulte o relatório acima.',
  );

  const unsupported = report.tagMetrics.find((metric) => metric.tag === 'unsupported');
  assert.ok(unsupported && unsupported.accuracy >= 0.9, 'Casos não suportados devem evitar inferências falsas em ≥90%.');
});
