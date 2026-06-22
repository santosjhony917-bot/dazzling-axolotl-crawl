const fs = require('fs');
const path = require('path');

function cleanLogsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove console.log calls that are just spam
  // Keep console.error and console.warn for debugging
  const consoleLogRegex = /^[ \t]*console\.log\([^;]*\);\s*$/gm;
  content = content.replace(consoleLogRegex, '');

  // Reduce showSuccess spam - we can comment them out or remove them.
  // The user said: "Reduzir chamadas showSuccess/showError desnecessárias, focando na transparência útil para o usuário."
  // It's hard to distinguish automatically which is useful and which is spam using regex.
  // But we can remove the ones like "Processando...", "Enriquecimento de Redes (Fase 2) iniciado!", etc.
  
  const spammySuccessStrings = [
    "showSuccess('Fase A: Buscando horários nativamente no Google...');",
    "showSuccess('Fase A: Buscando contexto no Google Nativo via Extensão...');",
    "showSuccess('Fase B: Buscando candidatos de Instagram...');",
    "showSuccess(`Fase C: Avaliando",
    "showSuccess(`Raspando candidato:",
    "showSuccess(`Validando candidato",
    "showSuccess(`Perfil raspado! Enviando para o banco de dados...`);",
    "showSuccess(`Instagram raspado! Validando...`);",
    "showSuccess(`Instagram validado! Gravando no banco...`);",
    "showSuccess('Enviando contexto completo para Validação IA",
    "showSuccess('Coleta do Google Maps (Fase 1) iniciada!');",
    "showSuccess('Enriquecimento de Redes (Fase 2) iniciado!');",
    "showSuccess('Coleta de Cardápios (Fase 3) iniciada!');",
    "showSuccess('Coleta de Logos (Fase 4) iniciada!');",
    "showSuccess('Iniciando o robô extrator local...');",
    "addLog(\"Iniciando fallback do robô local...\");",
    "addLog(`O robô local falhou:",
    "addLog(\"Falha na comunicação com o servidor local.\");",
    "addLog(\"Cardápio extraído com sucesso pelo robô local"
  ];

  for (const str of spammySuccessStrings) {
    // Regex to match the string with variable interpolation or exact match
    // Better to just remove lines that contain "showSuccess(" and words like "Fase", "Coleta", "Raspando", "Validando"
  }
  
  // Actually, we can use a simpler approach. Let's just remove lines matching certain spam patterns
  const lines = content.split('\n');
  const newLines = lines.filter(line => {
    if (line.includes('console.log(')) return false;
    
    // Some specific spammy logs in GoogleMapsCollector
    if (line.includes('showSuccess(') && (
      line.includes('Fase ') || 
      line.includes('Coleta de') || 
      line.includes('Raspando candidato') ||
      line.includes('Validando candidato') ||
      line.includes('Enviando contexto completo') ||
      line.includes('Processando "')
    )) {
      return false;
    }
    
    if (line.includes('addLog(') && (
      line.includes('Iniciando fallback do robô local') ||
      line.includes('O robô local falhou')
    )) {
      return false;
    }

    return true;
  });

  fs.writeFileSync(filePath, newLines.join('\n'));
  console.log('Logs limpos em', path.basename(filePath));
}

cleanLogsInFile(path.resolve(__dirname, '../src/pages/admin/GoogleMapsCollector.tsx'));
cleanLogsInFile(path.resolve(__dirname, '../src/components/admin/RestaurantDetailsDialog.tsx'));
