const realFetch = global.fetch;
global.fetch = async (url, options = {}) => {
  if (String(url).includes('dataforseo')) {
    console.log(String(options.body || '').slice(0, 1000));
  }
  return realFetch(url, options);
};
const { dataForSeoOrganicSearch } = await import('./scratch/search-provider.mjs');
await dataForSeoOrganicSearch(process.env, 'Bar do Cuscuz João Pessoa cardápio', { numResults: 3, timeoutMs: 60000, languageCode: 'pt', seDomain: 'google.com.br' });
