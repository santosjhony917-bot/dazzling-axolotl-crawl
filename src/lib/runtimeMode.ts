/**
 * Demo data must be explicitly enabled at build time. Keeping this check strict
 * prevents values such as "1" or "yes" from accidentally enabling fixtures.
 */
export const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

/** Local fixtures are available for development or an explicitly labelled demo build only. */
export const ALLOW_LOCAL_FIXTURES = import.meta.env.DEV || IS_DEMO_MODE;

export const DEMO_LABEL = '[DEMO]';
