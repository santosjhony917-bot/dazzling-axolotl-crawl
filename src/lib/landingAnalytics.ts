export type LandingEventName =
  | 'cta_click'
  | 'demo_submit'
  | 'demo_suggestion'
  | 'demo_result_click'
  | 'navigation_click'
  | 'restaurant_cta_click'
  | 'newsletter_intent';

type LandingEventProperties = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function trackLandingEvent(name: LandingEventName, properties: LandingEventProperties = {}) {
  if (typeof window === 'undefined') return;

  const detail = {
    event: `landing_${name}`,
    page: 'landing',
    timestamp: new Date().toISOString(),
    ...properties,
  };

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(detail);
  window.dispatchEvent(new CustomEvent('filterfood:landing-event', { detail }));
}
