if (!process.argv.some((arg) => arg.startsWith('--provider='))) {
  process.argv.push('--provider=dataforseo');
}

await import('./build-menu-queue-from-serpapi-run.mjs');
