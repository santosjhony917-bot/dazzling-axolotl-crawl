if (!process.argv.some((arg) => arg.startsWith('--provider='))) {
  process.argv.push('--provider=dataforseo');
}

await import('./review-cabedelo-unsafe-instagrams.mjs');
