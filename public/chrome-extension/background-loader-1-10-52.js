// __FILTERFOOD_DEV_RELOAD_BOOTSTRAP__
try {
  importScripts('dev-reload-config.js');
  if (self.__FILTERFOOD_EXTENSION_DEV_RELOAD__ && self.__FILTERFOOD_EXTENSION_DEV_RELOAD__.enabled) {
    importScripts('dev-reload-client.js');
  }
} catch (_) {
  // Local dev reload is optional and disabled when dev-reload-config.js is absent.
}
// __FILTERFOOD_DEV_RELOAD_BOOTSTRAP_END__
importScripts('background.js?v=1.10.52');
