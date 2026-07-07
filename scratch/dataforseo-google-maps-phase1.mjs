if (!process.argv.some((arg) => arg.startsWith('--provider='))) {
  process.argv.push('--provider=dataforseo');
}

await import('./serpapi-google-maps-phase1.mjs');
