const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const SCRATCH_DIR = __dirname;

const filesToReset = [
  path.join(ROOT_DIR, 'scraped_restaurants_google.json'),
  path.join(ROOT_DIR, 'scraped_menus.json'),
];

const filesToDelete = [
  path.join(SCRATCH_DIR, 'google_maps_scraper_state.json'),
  path.join(SCRATCH_DIR, 'menu_analysis_results.json'),
];

filesToReset.forEach(file => {
  try {
    fs.writeFileSync(file, '[]', 'utf-8');
    console.log(`🧹 Resetado: ${path.basename(file)}`);
  } catch (err) {
    console.log(`⚠️ Não foi possível resetar ${path.basename(file)}:`, err.message);
  }
});

filesToDelete.forEach(file => {
  try {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`🗑️ Excluído: ${path.basename(file)}`);
    } else {
      console.log(`ℹ️ Arquivo não existente para exclusão: ${path.basename(file)}`);
    }
  } catch (err) {
    console.log(`⚠️ Não foi possível excluir ${path.basename(file)}:`, err.message);
  }
});

console.log('✨ Limpeza concluída com sucesso!');
