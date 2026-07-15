import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

import { createMenuDiscoverySessionStore } from './sessionStore.ts';
import { createSupabaseMenuDiscoveryService } from './supabaseGateway.ts';
import {
  createMenuTelemetryOperation,
  describeMenuIntentForTelemetry,
  trackMenuDiscoveryOutcome,
  trackMenuQuerySubmitted,
} from './telemetry.ts';
import type { MenuDiscoverySessionStore } from './sessionStore.ts';
import type {
  MenuAssistantSurface,
  MenuDiscoveryState,
  MenuSearchIntent,
  MenuSearchIntentPatch,
} from './types.ts';

export interface UseMenuDiscoverySessionOptions {
  surface: MenuAssistantSurface;
  store?: MenuDiscoverySessionStore;
}

export interface MenuDiscoverySessionController extends MenuDiscoveryState {
  submit(
    text: string,
    options?: { intentPatch?: MenuSearchIntentPatch; limit?: number; offset?: number },
  ): Promise<MenuDiscoveryState>;
  submitIntent(
    intent: MenuSearchIntent,
    options?: { limit?: number; offset?: number },
  ): Promise<MenuDiscoveryState>;
  refine(patch: MenuSearchIntentPatch): Promise<MenuDiscoveryState>;
  hydrateFromSearchParams(params: URLSearchParams | string): MenuSearchIntent | null;
  cancel(): void;
  reset(options?: { clearPersisted?: boolean }): void;
}

let defaultStore: MenuDiscoverySessionStore | null = null;

/**
 * Singleton intencional: home, busca e chat observam a mesma sessão. A
 * superfície indica onde a ação aconteceu, não cria três fontes de verdade.
 */
export function getMenuDiscoverySessionStore(): MenuDiscoverySessionStore {
  if (!defaultStore) {
    defaultStore = createMenuDiscoverySessionStore({
      service: createSupabaseMenuDiscoveryService(),
      storage: typeof window === 'undefined' ? null : window.sessionStorage,
      initialSurface: 'home',
    });
  }
  return defaultStore;
}

export function useMenuDiscoverySession({
  surface,
  store: providedStore,
}: UseMenuDiscoverySessionOptions): MenuDiscoverySessionController {
  const store = providedStore ?? getMenuDiscoverySessionStore();
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  useEffect(() => {
    store.setSurface(surface);
  }, [store, surface]);

  const submit = useCallback(
    async (
      text: string,
      options: { intentPatch?: MenuSearchIntentPatch; limit?: number; offset?: number } = {},
    ) => {
      const operation = createMenuTelemetryOperation(surface);
      trackMenuQuerySubmitted({
        operation,
        trigger: 'text',
        queryLength: String(text ?? '').trim().length,
        intent: describeMenuIntentForTelemetry(null, options.intentPatch),
      });
      const pending = store.submit({
        text,
        surface,
        intentPatch: options.intentPatch,
        limit: options.limit,
        offset: options.offset,
      });
      const requestId = store.getSnapshot().requestId;
      const nextState = await pending;
      if (nextState.requestId === requestId) trackMenuDiscoveryOutcome(nextState, operation);
      return nextState;
    },
    [store, surface],
  );

  const submitIntent = useCallback(
    async (intent: MenuSearchIntent, options: { limit?: number; offset?: number } = {}) => {
      const operation = createMenuTelemetryOperation(surface);
      trackMenuQuerySubmitted({
        operation,
        trigger: 'intent',
        queryLength: intent.rawText.trim().length,
        intent: describeMenuIntentForTelemetry(intent),
      });
      const pending = store.submitIntent(intent, surface, options);
      const requestId = store.getSnapshot().requestId;
      const nextState = await pending;
      if (nextState.requestId === requestId) trackMenuDiscoveryOutcome(nextState, operation);
      return nextState;
    },
    [store, surface],
  );

  const refine = useCallback(
    async (patch: MenuSearchIntentPatch) => {
      const current = store.getSnapshot();
      const operation = createMenuTelemetryOperation(surface);
      trackMenuQuerySubmitted({
        operation,
        trigger: 'refinement',
        queryLength: current.rawText.trim().length,
        intent: describeMenuIntentForTelemetry(current.intent, patch),
      });
      const pending = store.refine(patch, surface);
      const requestId = store.getSnapshot().requestId;
      const nextState = await pending;
      if (nextState.requestId === requestId) trackMenuDiscoveryOutcome(nextState, operation);
      return nextState;
    },
    [store, surface],
  );

  const hydrateFromSearchParams = useCallback(
    (params: URLSearchParams | string) => store.hydrateFromSearchParams(params, surface),
    [store, surface],
  );

  const cancel = useCallback(() => store.cancel(), [store]);
  const reset = useCallback(
    (options: { clearPersisted?: boolean } = {}) => store.reset({ ...options, surface }),
    [store, surface],
  );

  return useMemo(
    () => ({
      ...state,
      submit,
      submitIntent,
      refine,
      hydrateFromSearchParams,
      cancel,
      reset,
    }),
    [state, submit, submitIntent, refine, hydrateFromSearchParams, cancel, reset],
  );
}
