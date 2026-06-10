function cleanRestaurantNameForSearch(name) {
  if (!name) return '';
  let clean = name.replace(/\*/g, '');
  
  const neighborhoods = [
    'tambaú', 'tambau', 'bancários', 'bancarios', 'manaíra', 'manaira', 
    'cabo branco', 'altiplano', 'bessa', 'miramar', 'torre', 'centro', 
    'jaguaribe', 'castelo branco', 'geisel', 'mangabeira', 'valentina', 
    'portal do sol', 'aeroclube', 'intermares', 'expedicionários', 'expedicionarios',
    'bairro dos estados', 'estados', 'jose americo', 'josé américo', 'cristo redentor',
    'cristo', 'cruz das armas', 'funcionarios', 'funcionários'
  ];
  
  const neighborhoodPattern = new RegExp(`\\s*(?:-|\\|)\\s*(?:${neighborhoods.join('|')})(?![a-z0-9])`, 'i');
  clean = clean.replace(neighborhoodPattern, '');
  
  const trailingNeighborhoodPattern = new RegExp(`\\s+(?:${neighborhoods.join('|')})(?![a-z0-9])\\s*$`, 'i');
  clean = clean.replace(trailingNeighborhoodPattern, '');

  // Clean trailing hyphens or bars
  clean = clean.replace(/\s*(?:-|\|)\s*$/, '');

  return clean.trim();
}

console.log('Hope Burger - Tambaú ->', cleanRestaurantNameForSearch('Hope Burger - Tambaú'));
console.log('Brutus American Food - Tambaú ->', cleanRestaurantNameForSearch('Brutus American Food - Tambaú'));
console.log('Gaúcho Burger Original - Tambaú ->', cleanRestaurantNameForSearch('Gaúcho Burger Original - Tambaú'));
console.log('Hambúrguer Insano Tambaú ->', cleanRestaurantNameForSearch('Hambúrguer Insano Tambaú'));
console.log('Geisel Burger - Bancários - Hamburgueria antesanal delivery - Tambaú ->', cleanRestaurantNameForSearch('Geisel Burger - Bancários - Hamburgueria antesanal delivery - Tambaú'));
