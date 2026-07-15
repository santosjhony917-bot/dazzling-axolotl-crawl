import {
  applyMenuSearchIntentPatch,
  menuIntentCacheKey,
  parseMenuSearchIntent,
} from './parser.ts';
import { MenuSearchIntentSchema } from './schema.ts';
import type { MenuDiscoveryService } from './service.ts';
import {
  clearMenuDiscoverySnapshot,
  loadMenuDiscoverySnapshot,
  menuIntentFromSearchParams,
  saveMenuDiscoverySnapshot,
  type StorageLike,
  type StoredMenuDiscoverySnapshot,
} from './urlSession.ts';
import type {
  MenuAssistantSurface,
  MenuDiscoveryOutcome,
  MenuDiscoveryState,
  MenuDiscoverySubmitInput,
  MenuSearchIntent,
  MenuSearchIntentPatch,
} from './types.ts';

export interface MenuDiscoverySessionStoreOptions {
  service: MenuDiscoveryService;
  storage?: StorageLike | null;
  now?: () => Date;
  maxCacheAgeMs?: number;
  initialSurface?: MenuAssistantSurface;
  hydrate?: boolean;
}

export interface MenuDiscoverySessionStore {
  getSnapshot(): MenuDiscoveryState;
  subscribe(listener: () => void): () => void;
  submit(input: MenuDiscoverySubmitInput): Promise<MenuDiscoveryState>;
  submitIntent(
    intent: MenuSearchIntent,
    surface: MenuAssistantSurface,
    options?: { limit?: number; offset?: number },
  ): Promise<MenuDiscoveryState>;
  refine(patch: MenuSearchIntentPatch, surface?: MenuAssistantSurface): Promise<MenuDiscoveryState>;
  hydrateFromSearchParams(
    params: URLSearchParams | string,
    surface?: MenuAssistantSurface,
  ): MenuSearchIntent | null;
  cancel(): void;
  reset(options?: { clearPersisted?: boolean; surface?: MenuAssistantSurface }): void;
  setSurface(surface: MenuAssistantSurface): void;
}

function emptyState(surface: MenuAssistantSurface): MenuDiscoveryState {
  return {
    status: 'idle',
    surface,
    rawText: '',
    intent: null,
    results: [],
    coverage: null,
    usedAI: false,
    queriesUsed: [],
    unappliedCriteria: [],
    hasMore: false,
    traceId: null,
    error: null,
    requestId: 0,
    isFromCache: false,
    cacheSavedAt: null,
  };
}

function cacheAge(snapshot: StoredMenuDiscoverySnapshot, now: Date): number {
  return Math.max(0, now.getTime() - new Date(snapshot.savedAt).getTime());
}

function classifyInvalidIntent(error: unknown) {
  return {
    code: 'invalid_intent' as const,
    message: error instanceof Error ? error.message : 'A intenção informada é inválida.',
    retryable: false,
  };
}

export function createMenuDiscoverySessionStore({
  service,
  storage = null,
  now = () => new Date(),
  maxCacheAgeMs = 24 * 60 * 60 * 1_000,
  initialSurface = 'home',
  hydrate = true,
}: MenuDiscoverySessionStoreOptions): MenuDiscoverySessionStore {
  const listeners = new Set<() => void>();
  let activeController: AbortController | null = null;
  let state = emptyState(initialSurface);

  const initialCache = hydrate ? loadMenuDiscoverySnapshot(storage) : null;
  if (initialCache && cacheAge(initialCache, now()) <= maxCacheAgeMs) {
    state = {
      ...state,
      status: initialCache.results.length > 0 ? 'stale' : 'idle',
      rawText: initialCache.intent.rawText,
      intent: initialCache.intent,
      results: initialCache.results,
      coverage: initialCache.coverage,
      usedAI: initialCache.usedAI,
      queriesUsed: initialCache.queriesUsed,
      hasMore: initialCache.hasMore,
      isFromCache: initialCache.results.length > 0,
      cacheSavedAt: initialCache.savedAt,
    };
  }

  const notify = () => listeners.forEach((listener) => listener());
  const replaceState = (next: MenuDiscoveryState) => {
    state = next;
    notify();
  };
  const patchState = (patch: Partial<MenuDiscoveryState>) => {
    replaceState({ ...state, ...patch });
  };

  const cacheForIntent = (intent: MenuSearchIntent): StoredMenuDiscoverySnapshot | null => {
    const cached = loadMenuDiscoverySnapshot(storage);
    if (!cached || cached.results.length === 0) return null;
    if (cacheAge(cached, now()) > maxCacheAgeMs) return null;
    return menuIntentCacheKey(cached.intent) === menuIntentCacheKey(intent) ? cached : null;
  };

  const persistOutcome = (outcome: MenuDiscoveryOutcome) => {
    if (['cancelled', 'error', 'offline'].includes(outcome.status)) return null;
    const savedAt = now().toISOString();
    const didSave = saveMenuDiscoverySnapshot(storage, {
      version: 1,
      savedAt,
      intent: outcome.intent,
      results: outcome.results,
      coverage: outcome.coverage,
      usedAI: outcome.usedAI,
      queriesUsed: outcome.queriesUsed,
      hasMore: outcome.hasMore,
    });
    return didSave ? savedAt : null;
  };

  const runIntent = async (
    intent: MenuSearchIntent,
    surface: MenuAssistantSurface,
    options: { limit?: number; offset?: number } = {},
  ): Promise<MenuDiscoveryState> => {
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;
    const requestId = state.requestId + 1;

    replaceState({
      ...emptyState(surface),
      status: 'parsing',
      rawText: intent.rawText,
      intent,
      requestId,
    });

    const outcome = await service.discover({
      intent,
      signal: controller.signal,
      limit: options.limit,
      offset: options.offset,
      onStatus: (status) => {
        if (requestId !== state.requestId || controller.signal.aborted) return;
        patchState({ status });
      },
    });

    if (requestId !== state.requestId) return state;
    if (activeController === controller) activeController = null;

    const cached = cacheForIntent(intent);
    if (outcome.status === 'offline') {
      replaceState({
        ...state,
        status: 'offline',
        results: cached?.results ?? [],
        coverage: cached?.coverage ?? null,
        usedAI: cached?.usedAI ?? false,
        queriesUsed: cached?.queriesUsed ?? [],
        hasMore: cached?.hasMore ?? false,
        traceId: outcome.traceId,
        error: null,
        isFromCache: Boolean(cached),
        cacheSavedAt: cached?.savedAt ?? null,
      });
      return state;
    }

    if (outcome.status === 'error' && cached) {
      replaceState({
        ...state,
        status: 'stale',
        results: cached.results,
        coverage: cached.coverage,
        usedAI: cached.usedAI,
        queriesUsed: cached.queriesUsed,
        hasMore: cached.hasMore,
        traceId: outcome.traceId,
        error: outcome.error,
        isFromCache: true,
        cacheSavedAt: cached.savedAt,
      });
      return state;
    }

    const savedAt = persistOutcome(outcome);
    replaceState({
      ...state,
      status: outcome.status,
      intent: outcome.intent,
      rawText: outcome.intent.rawText,
      results: outcome.results,
      coverage: outcome.coverage,
      usedAI: outcome.usedAI,
      queriesUsed: outcome.queriesUsed,
      unappliedCriteria: outcome.unappliedCriteria,
      hasMore: outcome.hasMore,
      traceId: outcome.traceId,
      error: outcome.error,
      isFromCache: false,
      cacheSavedAt: savedAt,
    });
    return state;
  };

  return {
    getSnapshot: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async submit(input) {
      activeController?.abort();
      const requestId = state.requestId + 1;
      replaceState({
        ...emptyState(input.surface),
        status: 'parsing',
        rawText: String(input.text ?? ''),
        requestId,
      });
      try {
        const intent = parseMenuSearchIntent(input.text, input.intentPatch);
        // runIntent gera o ID seguinte; a guarda evita que o request cancelado
        // publique qualquer estado terminal.
        return runIntent(intent, input.surface, { limit: input.limit, offset: input.offset });
      } catch (error) {
        if (requestId !== state.requestId) return state;
        replaceState({
          ...state,
          status: 'error',
          error: classifyInvalidIntent(error),
        });
        return state;
      }
    },

    async submitIntent(intent, surface, options = {}) {
      try {
        return runIntent(MenuSearchIntentSchema.parse(intent) as MenuSearchIntent, surface, options);
      } catch (error) {
        activeController?.abort();
        replaceState({
          ...emptyState(surface),
          status: 'error',
          rawText: intent?.rawText ?? '',
          requestId: state.requestId + 1,
          error: classifyInvalidIntent(error),
        });
        return state;
      }
    },

    async refine(patch, surface = state.surface) {
      if (!state.intent) {
        replaceState({
          ...state,
          status: 'error',
          error: {
            code: 'invalid_intent',
            message: 'Não há uma busca anterior para refinar.',
            retryable: false,
          },
        });
        return state;
      }
      try {
        return runIntent(applyMenuSearchIntentPatch(state.intent, patch), surface);
      } catch (error) {
        patchState({ status: 'error', error: classifyInvalidIntent(error) });
        return state;
      }
    },

    hydrateFromSearchParams(params, surface = state.surface) {
      const intent = menuIntentFromSearchParams(params);
      if (!intent) return null;
      activeController?.abort();
      replaceState({
        ...emptyState(surface),
        rawText: intent.rawText,
        intent,
        requestId: state.requestId + 1,
      });
      return intent;
    },

    cancel() {
      if (!activeController) return;
      activeController.abort();
      activeController = null;
      patchState({
        status: 'cancelled',
        error: null,
        hasMore: false,
      });
    },

    reset(options = {}) {
      activeController?.abort();
      activeController = null;
      if (options.clearPersisted) clearMenuDiscoverySnapshot(storage);
      replaceState(emptyState(options.surface ?? state.surface));
    },

    setSurface(surface) {
      if (surface !== state.surface) patchState({ surface });
    },
  };
}
