import { readFileSync } from 'node:fs';

import { parseMenuSearchIntent } from '../parser.ts';
import type { MenuSearchIntent } from '../types.ts';

export const GOLDEN_DATASET_PATH = new URL('./golden-v1.json', import.meta.url);

export const GOLDEN_FIELD_THRESHOLDS: Readonly<Record<string, number>> = {
  searchText: 0.9,
  dishTerms: 0.9,
  ingredients: 0.9,
  excludedIngredients: 0.95,
  priceMin: 0.9,
  priceMax: 0.95,
  people: 0.95,
  categories: 0.9,
  restrictions: 0.95,
  occasion: 0.9,
  'location.label': 0.9,
  'location.neighborhood': 0.9,
  'location.regionId': 0.9,
  'location.city': 0.9,
  sort: 0.95,
};

const SET_FIELDS = new Set([
  'ingredients',
  'excludedIngredients',
  'categories',
  'restrictions',
]);

export interface GoldenCase {
  id: string;
  prompt: string;
  tags: string[];
  expected: Record<string, unknown>;
}

export interface GoldenDataset {
  schemaVersion: 1;
  datasetVersion: string;
  locale: 'pt-BR';
  description: string;
  cases: GoldenCase[];
}

export interface GoldenMismatch {
  id: string;
  prompt: string;
  field: string;
  expected: unknown;
  actual: unknown;
}

export interface GoldenMetric {
  field: string;
  correct: number;
  total: number;
  accuracy: number;
  threshold: number;
  passed: boolean;
}

export interface GoldenTagMetric {
  tag: string;
  correct: number;
  total: number;
  accuracy: number;
}

export interface GoldenEvaluationReport {
  datasetVersion: string;
  caseCount: number;
  uniquePromptCount: number;
  passedCaseCount: number;
  caseAccuracy: number;
  fieldMetrics: GoldenMetric[];
  tagMetrics: GoldenTagMetric[];
  mismatches: GoldenMismatch[];
}

function assertDataset(value: unknown): asserts value is GoldenDataset {
  if (!value || typeof value !== 'object') throw new Error('Dataset dourado inválido.');
  const dataset = value as Partial<GoldenDataset>;
  if (dataset.schemaVersion !== 1 || dataset.locale !== 'pt-BR' || !Array.isArray(dataset.cases)) {
    throw new Error('Versão ou locale do dataset dourado não suportado.');
  }

  const ids = new Set<string>();
  for (const entry of dataset.cases) {
    if (!entry || typeof entry.id !== 'string' || typeof entry.prompt !== 'string') {
      throw new Error('Caso dourado sem id ou prompt válido.');
    }
    if (ids.has(entry.id)) throw new Error(`ID dourado duplicado: ${entry.id}`);
    ids.add(entry.id);
    if (!Array.isArray(entry.tags) || !entry.expected || typeof entry.expected !== 'object') {
      throw new Error(`Caso dourado incompleto: ${entry.id}`);
    }
  }
}

export function loadGoldenDataset(): GoldenDataset {
  const parsed: unknown = JSON.parse(readFileSync(GOLDEN_DATASET_PATH, 'utf8'));
  assertDataset(parsed);
  return parsed;
}

function actualField(intent: MenuSearchIntent, field: string): unknown {
  if (field.startsWith('location.')) {
    const locationField = field.slice('location.'.length) as keyof NonNullable<MenuSearchIntent['location']>;
    return intent.location?.[locationField] ?? null;
  }
  return intent[field as keyof MenuSearchIntent];
}

function comparable(field: string, value: unknown): unknown {
  if (SET_FIELDS.has(field) && Array.isArray(value)) {
    return [...value].map(String).sort((left, right) => left.localeCompare(right, 'pt-BR'));
  }
  return value;
}

function valuesEqual(field: string, expected: unknown, actual: unknown): boolean {
  return JSON.stringify(comparable(field, expected)) === JSON.stringify(comparable(field, actual));
}

function roundAccuracy(correct: number, total: number): number {
  return total === 0 ? 1 : Number((correct / total).toFixed(4));
}

export function evaluateGoldenDataset(dataset = loadGoldenDataset()): GoldenEvaluationReport {
  const fieldCounts = new Map<string, { correct: number; total: number }>();
  const tagCounts = new Map<string, { correct: number; total: number }>();
  const mismatches: GoldenMismatch[] = [];
  let passedCaseCount = 0;

  for (const entry of dataset.cases) {
    const intent = parseMenuSearchIntent(entry.prompt);
    let casePassed = true;

    for (const [field, expected] of Object.entries(entry.expected)) {
      const actual = actualField(intent, field);
      const correct = valuesEqual(field, expected, actual);
      const fieldCount = fieldCounts.get(field) ?? { correct: 0, total: 0 };
      fieldCount.total += 1;
      if (correct) fieldCount.correct += 1;
      fieldCounts.set(field, fieldCount);

      for (const tag of entry.tags) {
        const tagCount = tagCounts.get(tag) ?? { correct: 0, total: 0 };
        tagCount.total += 1;
        if (correct) tagCount.correct += 1;
        tagCounts.set(tag, tagCount);
      }

      if (!correct) {
        casePassed = false;
        mismatches.push({ id: entry.id, prompt: entry.prompt, field, expected, actual });
      }
    }

    if (casePassed) passedCaseCount += 1;
  }

  const fieldMetrics = [...fieldCounts.entries()]
    .map(([field, count]): GoldenMetric => {
      const accuracy = roundAccuracy(count.correct, count.total);
      const threshold = GOLDEN_FIELD_THRESHOLDS[field] ?? 0.9;
      return { field, ...count, accuracy, threshold, passed: accuracy >= threshold };
    })
    .sort((left, right) => left.field.localeCompare(right.field));

  const tagMetrics = [...tagCounts.entries()]
    .map(([tag, count]): GoldenTagMetric => ({
      tag,
      ...count,
      accuracy: roundAccuracy(count.correct, count.total),
    }))
    .sort((left, right) => left.tag.localeCompare(right.tag));

  return {
    datasetVersion: dataset.datasetVersion,
    caseCount: dataset.cases.length,
    uniquePromptCount: new Set(dataset.cases.map((entry) => entry.prompt)).size,
    passedCaseCount,
    caseAccuracy: roundAccuracy(passedCaseCount, dataset.cases.length),
    fieldMetrics,
    tagMetrics,
    mismatches,
  };
}

export function formatGoldenEvaluationReport(report: GoldenEvaluationReport): string {
  const lines = [
    `Dataset: ${report.datasetVersion}`,
    `Casos: ${report.caseCount} (${report.uniquePromptCount} prompts únicos)`,
    `Casos integralmente corretos: ${report.passedCaseCount}/${report.caseCount} (${(
      report.caseAccuracy * 100
    ).toFixed(1)}%)`,
    '',
    'Campo                    Corretos  Total  Acurácia  Gate',
  ];

  for (const metric of report.fieldMetrics) {
    lines.push(
      `${metric.field.padEnd(24)} ${String(metric.correct).padStart(8)} ${String(metric.total).padStart(
        6,
      )} ${(metric.accuracy * 100).toFixed(1).padStart(8)}%  ${(metric.threshold * 100).toFixed(0)}% ${
        metric.passed ? '✓' : '✗'
      }`,
    );
  }

  lines.push('', 'Cobertura por tag (comparações anotadas):');
  for (const metric of report.tagMetrics) {
    lines.push(
      `${metric.tag.padEnd(18)} ${String(metric.correct).padStart(4)}/${String(metric.total).padEnd(4)} ${(
        metric.accuracy * 100
      ).toFixed(1)}%`,
    );
  }

  if (report.mismatches.length > 0) {
    lines.push('', `Divergências (${report.mismatches.length}; primeiras 20):`);
    for (const mismatch of report.mismatches.slice(0, 20)) {
      lines.push(
        `- ${mismatch.id} [${mismatch.field}] ${JSON.stringify(mismatch.prompt)}: esperado ${JSON.stringify(
          mismatch.expected,
        )}; obtido ${JSON.stringify(mismatch.actual)}`,
      );
    }
  }

  return lines.join('\n');
}
