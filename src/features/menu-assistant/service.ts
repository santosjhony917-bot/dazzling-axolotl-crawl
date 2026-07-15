import { MenuDiscoveryResultSchema, QueryRewriteResponseSchema } from './schema.ts';
import {
  buildDeterministicQueryVariants,
  normalizeMenuSearchText,
} from './parser.ts';
import type {
  MenuCatalogGateway,
  MenuCatalogSearchPage,
  MenuDiscoveryError,
  MenuDiscoveryOutcome,
  MenuDiscoveryResult,
  MenuDiscoveryStatus,
  MenuSearchIntent,
  QueryRewriteGateway,
  UnappliedCriterion,
} from './types.ts';

export interface MenuDiscoveryServiceOptions {
  catalog: MenuCatalogGateway;
  rewriter?: QueryRewriteGateway | null;
  isOnline?: () => boolean;
  now?: () => Date;
  createTraceId?: () => string;
}

export interface DiscoverMenuOptions {
  intent: MenuSearchIntent;
  signal: AbortSignal;
  limit?: number;
  offset?: number;
  minimumUsefulResults?: number;
  onStatus?: (status: MenuDiscoveryStatus) => void;
}

export interface MenuDiscoveryService {
  discover(options: DiscoverMenuOptions): Promise<MenuDiscoveryOutcome>;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function createFallbackTraceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `menu-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new DOMException('A busca foi cancelada.', 'AbortError');
  }
}

function normalizeQuery(value: string): string {
  return normalizeMenuSearchText(value)
    .replace(/[.,$]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function resultIdentity(result: MenuDiscoveryResult): string {
  return `${result.itemId}:${normalizeQuery(result.itemName)}:${result.price.value}`;
}

/**
 * Esta validação é a última fronteira entre qualquer gateway e a UI. Objetos
 * sem IDs reais do catálogo, preço válido e evidência correspondente somem da
 * resposta em vez de serem "corrigidos" ou preenchidos por inferência.
 */
export function keepGroundedResults(values: unknown[]): MenuDiscoveryResult[] {
  const grounded: MenuDiscoveryResult[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const parsed = MenuDiscoveryResultSchema.safeParse(value);
    if (!parsed.success) continue;
    const result = parsed.data as MenuDiscoveryResult;
    const identity = resultIdentity(result);
    if (seen.has(identity)) continue;
    seen.add(identity);
    grounded.push(result);
  }

  return grounded;
}

function mergePages(pages: MenuCatalogSearchPage[], limit: number): MenuCatalogSearchPage {
  const results = keepGroundedResults(pages.flatMap((page) => page.results)).slice(0, limit);
  return {
    results,
    hasMore: pages.some((page) => page.hasMore) || pages.flatMap((page) => page.results).length > limit,
    unappliedCriteria: unique(pages.flatMap((page) => page.unappliedCriteria)),
    stale: pages.some((page) => page.stale),
  };
}

function categoryAnchorTokens(intent: MenuSearchIntent): string[] {
  const families: Record<string, string[]> = {
    hamburgueria: ['hamburguer', 'hamburgueria', 'burger', 'burguer', 'lanche', 'sanduiche'],
    pizzaria: ['pizza', 'pizzaria'],
    japonesa: ['japonesa', 'sushi', 'temaki', 'japa'],
    cafeteria: ['cafe', 'cafeteria'],
    churrascaria: ['churrasco', 'churrascaria', 'carne'],
    italiana: ['italiana', 'massa', 'macarrao', 'lasanha'],
    brasileira: ['brasileira', 'marmita'],
    'acai sorveteria': ['acai', 'sorvete', 'sorveteria'],
    'doceria sobremesas': ['doce', 'doceria', 'sobremesa', 'bolo'],
    'saudavel fit': ['saudavel', 'fit', 'salada', 'vegano', 'vegetariano'],
  };

  return unique(
    intent.categories.flatMap((category) => {
      const normalized = normalizeQuery(category).replace(/\//g, ' ');
      return [...normalized.split(' '), ...(families[normalized] ?? [])];
    }),
  ).filter((token) => token.length >= 3);
}

/**
 * O modelo pode ampliar vocabulário de busca, mas não pode trocar o assunto.
 * Exigimos ao menos uma âncora da intenção (ou uma variante local exata) e não
 * aceitamos números novos, que poderiam introduzir preço/quantidade inventados.
 */
export function isSafeRewriteVariant(
  candidate: string,
  intent: MenuSearchIntent,
  localFallbacks: string[],
): boolean {
  const normalized = normalizeQuery(candidate);
  if (normalized.length < 3) return false;
  if (localFallbacks.map(normalizeQuery).includes(normalized)) return true;

  const candidateTokens = normalized.split(' ').filter(Boolean);
  const anchorTokens = unique([
    ...normalizeQuery(intent.searchText).split(' '),
    ...intent.dishTerms.flatMap((term) => normalizeQuery(term).split(' ')),
    ...intent.ingredients.flatMap((term) => normalizeQuery(term).split(' ')),
    ...categoryAnchorTokens(intent),
  ]).filter((token) => token.length >= 3);
  const originalNumbers = new Set(intent.normalizedText.match(/\d+(?:[.,]\d+)?/g) ?? []);
  const candidateNumbers = candidate.match(/\d+(?:[.,]\d+)?/g) ?? [];

  return (
    candidateNumbers.every((number) => originalNumbers.has(number)) &&
    candidateTokens.some((token) => anchorTokens.includes(token))
  );
}

function classifyError(error: unknown): MenuDiscoveryError {
  const message = error instanceof Error ? error.message : 'Não foi possível consultar o catálogo.';
  const normalized = message.toLowerCase();
  const isNetwork = /network|fetch|offline|conex|timeout/.test(normalized);
  return {
    code: isNetwork ? 'network' : 'catalog',
    message,
    retryable: true,
  };
}

function baseOutcome(
  intent: MenuSearchIntent,
  traceId: string,
  completedAt: string,
): Omit<MenuDiscoveryOutcome, 'status'> {
  return {
    intent,
    results: [],
    coverage: null,
    usedAI: false,
    queriesUsed: [],
    unappliedCriteria: [],
    hasMore: false,
    traceId,
    completedAt,
    error: null,
  };
}

export function createMenuDiscoveryService({
  catalog,
  rewriter = null,
  isOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine),
  now = () => new Date(),
  createTraceId = createFallbackTraceId,
}: MenuDiscoveryServiceOptions): MenuDiscoveryService {
  return {
    async discover({
      intent,
      signal,
      limit = 20,
      offset = 0,
      minimumUsefulResults = 3,
      onStatus,
    }): Promise<MenuDiscoveryOutcome> {
      const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
      const safeOffset = Math.max(Math.trunc(offset), 0);
      const minimum = Math.min(Math.max(Math.trunc(minimumUsefulResults), 1), safeLimit);
      const traceId = createTraceId();
      const completedAt = () => now().toISOString();
      const emit = (status: MenuDiscoveryStatus) => onStatus?.(status);

      if (!isOnline()) {
        emit('offline');
        return { ...baseOutcome(intent, traceId, completedAt()), status: 'offline' };
      }

      try {
        throwIfAborted(signal);
        emit('checking_coverage');
        const coverage = await catalog.checkCoverage(intent, signal);
        throwIfAborted(signal);

        if (coverage.status === 'unavailable') {
          emit('no_coverage');
          return {
            ...baseOutcome(intent, traceId, completedAt()),
            status: 'no_coverage',
            coverage,
          };
        }

        const deterministicQueries = buildDeterministicQueryVariants(intent);
        const primaryQuery = deterministicQueries[0] ?? '';
        if (!primaryQuery && intent.categories.length === 0) {
          emit('no_result');
          return {
            ...baseOutcome(intent, traceId, completedAt()),
            status: 'no_result',
            coverage,
            unappliedCriteria: ['query'],
          };
        }

        emit('searching');
        const primaryPage = await catalog.search({
          intent,
          queries: [primaryQuery],
          limit: safeLimit,
          offset: safeOffset,
          signal,
        });
        throwIfAborted(signal);
        let mergedPage = mergePages([primaryPage], safeLimit);
        let queriesUsed = primaryQuery ? [primaryQuery] : [];
        let usedAI = false;

        const canExpand =
          safeOffset === 0 &&
          mergedPage.results.length < minimum &&
          intent.normalizedText.length >= 4;

        if (canExpand) {
          const localFallbacks = deterministicQueries.slice(1);
          let expandedQueries = localFallbacks;

          if (rewriter) {
            emit('rewriting');
            try {
              const rawRewrite = await rewriter.rewrite(
                {
                  rawQuery: intent.rawText,
                  dbQuery: primaryQuery,
                  existingResultCount: mergedPage.results.length,
                  localFallbacks,
                },
                signal,
              );
              throwIfAborted(signal);
              const parsedRewrite = QueryRewriteResponseSchema.safeParse(rawRewrite);
              if (parsedRewrite.success) {
                const safeAIQueries = parsedRewrite.data.expandedQueries.filter((query) =>
                  isSafeRewriteVariant(query, intent, localFallbacks),
                );
                expandedQueries = unique([...safeAIQueries, ...localFallbacks]).slice(0, 5);
                usedAI = parsedRewrite.data.usedAI && safeAIQueries.length > 0;
              }
            } catch (error) {
              if (isAbortError(error) || signal.aborted) throw error;
              // A indisponibilidade do modelo não derruba a busca determinística.
              expandedQueries = localFallbacks;
              usedAI = false;
            }
          }

          const missingQueries = expandedQueries
            .map(normalizeQuery)
            .filter((query) => query && !queriesUsed.includes(query))
            .slice(0, 5);

          if (missingQueries.length > 0) {
            emit('searching');
            const expandedPage = await catalog.search({
              intent,
              queries: missingQueries,
              limit: safeLimit,
              offset: 0,
              signal,
            });
            throwIfAborted(signal);
            mergedPage = mergePages([primaryPage, expandedPage], safeLimit);
            queriesUsed = unique([...queriesUsed, ...missingQueries]);
          }
        }

        if (mergedPage.results.length === 0) {
          emit('no_result');
          return {
            ...baseOutcome(intent, traceId, completedAt()),
            status: 'no_result',
            coverage,
            usedAI,
            queriesUsed,
            unappliedCriteria: mergedPage.unappliedCriteria,
          };
        }

        const locationWasRequested = intent.location !== null;
        const isPartial =
          mergedPage.results.length < minimum ||
          mergedPage.unappliedCriteria.length > 0 ||
          coverage.status === 'limited' ||
          (locationWasRequested && coverage.status === 'unknown');
        const status: MenuDiscoveryOutcome['status'] = mergedPage.stale
          ? 'stale'
          : isPartial
            ? 'partial'
            : 'success';
        emit(status);

        return {
          status,
          intent,
          results: mergedPage.results,
          coverage,
          usedAI,
          queriesUsed,
          unappliedCriteria: mergedPage.unappliedCriteria,
          hasMore: mergedPage.hasMore,
          traceId,
          completedAt: completedAt(),
          error: null,
        };
      } catch (error) {
        if (isAbortError(error) || signal.aborted) {
          emit('cancelled');
          return { ...baseOutcome(intent, traceId, completedAt()), status: 'cancelled' };
        }

        emit('error');
        return {
          ...baseOutcome(intent, traceId, completedAt()),
          status: 'error',
          error: classifyError(error),
        };
      }
    },
  };
}
