const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/pages/admin/GoogleMapsCollector.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remover Injeção de "Deda Lanches"
const dedaStart = content.indexOf("// Injeta Deda Lanches se João Pessoa for a cidade e ele não estiver no resultado");
if (dedaStart !== -1) {
  const isJampaStart = content.indexOf("const isJampa =", dedaStart);
  if (isJampaStart !== -1) {
    const formattedUnshiftStart = content.indexOf("formatted.unshift({", isJampaStart);
    if (formattedUnshiftStart !== -1) {
      // Pega até o fechamento do if (isJampa && !hasDeda)
      // Usaremos expressão regular ou string manipulation bruta
      const stringToRemove = content.substring(dedaStart, content.indexOf("    setResults(formatted);", dedaStart));
      content = content.replace(stringToRemove, "");
      // Atualiza os comentários também
      content = content.replace("// Formata os resultados da busca e garante que o restaurante do colega \"Deda Lanches\" esteja sempre presente para João Pessoa.\n  // IMPORTANTE: NÃO filtra por avaliações aqui — todos os estabelecimentos reais coletados são armazenados.", "// Formata os resultados da busca sem filtrar por avaliações aqui — todos os estabelecimentos reais coletados são armazenados.");
    }
  }
}

// 2. Remover Fallbacks Obsoletos (re-search-social, re-scrape-menu, etc)
// Vamos buscar os case statements dentro de handleRebusca
const handleRebuscaStart = content.indexOf("const handleRebusca = async (restaurantId: string, field: 'instagram' | 'menu' | 'hours' | 'logo' | 'ai-validation' | 'menu-extraction' | 'maps-extraction') => {");

// Deletar os endpoints que não devem mais existir. O usuário pediu para limpar re-search-social, re-scrape-menu, re-scrape-logo
// Wait, is there any case 'menu' or 'logo' calling these endpoints?
// If we look at the file, handleRebusca might have: `else if (field === 'menu')` ...
// Let's just remove them. But wait, I shouldn't just run blind replace. I will read the handleRebusca and rewrite it.

// Let's save what we have for Deda Lanches first
fs.writeFileSync(filePath, content);
console.log("Deda Lanches removido com sucesso!");
