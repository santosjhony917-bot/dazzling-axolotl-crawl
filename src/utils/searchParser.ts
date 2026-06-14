interface ParsedQuery {
  cleanedQuery: string;
  neighborhood: string | null;
  regionId: string | null;
  category: string | null;
}

const NEIGHBORHOODS_MAPPING: { [key: string]: string } = {
  'tambau': 'Tambaú',
  'cabo branco': 'Cabo Branco',
  'manaira': 'Manaíra',
  'bessa': 'Bessa',
  'bancarios': 'Bancários',
  'mangabeira': 'Mangabeira',
  'geisel': 'Geisel',
  'ernesto geisel': 'Geisel',
  'valentina': 'Valentina',
  'centro': 'Centro',
  'torre': 'Torre',
  'tambia': 'Tambiá',
  'bairro dos estados': 'Bairro dos Estados',
  'estados': 'Bairro dos Estados',
  'jaguaribe': 'Jaguaribe',
  'mandacaru': 'Mandacaru',
  'roger': 'Roger',
  'padre ze': 'Padre Zé',
  'padre zé': 'Padre Zé',
  'miramar': 'Miramar',
  'tambauzinho': 'Tambauzinho',
  'altiplano': 'Altiplano',
  'jardim oceania': 'Jardim Oceania',
  'aeroclube': 'Aeroclube',
  'castelo branco': 'Castelo Branco',
  'portal do sol': 'Portal do Sol',
  'jose americo': 'José Américo',
  'josé américo': 'José Américo',
  'cidade universitaria': 'Cidade Universitária',
  'cidade universitária': 'Cidade Universitária',
  'expedicionarios': 'Expedicionários',
  'expedicionários': 'Expedicionários',
};

const REGIONS_MAPPING: { [key: string]: string } = {
  'orla': 'orla',
  'praia': 'orla',
  'mar': 'orla',
  'zona sul': 'zona_sul',
  'sul': 'zona_sul',
  'centro': 'centro_norte',
  'norte': 'centro_norte',
};

const CATEGORIES_MAPPING: { [key: string]: string } = {
  'pizza': 'Pizzaria',
  'pizzaria': 'Pizzaria',
  'hamburguer': 'Hamburgueria',
  'hamburgueria': 'Hamburgueria',
  'burger': 'Hamburgueria',
  'burguer': 'Hamburgueria',
  'lanche': 'Hamburgueria',
  'japonesa': 'Japonesa',
  'sushi': 'Japonesa',
  'japa': 'Japonesa',
  'temaki': 'Japonesa',
  'cafe': 'Cafeteria',
  'cafeteria': 'Cafeteria',
  'churrasco': 'Churrascaria',
  'churrascaria': 'Churrascaria',
  'carne': 'Churrascaria',
  'sobremesa': 'Doceria / Sobremesas',
  'doce': 'Doceria / Sobremesas',
  'doceria': 'Doceria / Sobremesas',
  'chocolate': 'Doceria / Sobremesas',
  'bolo': 'Doceria / Sobremesas',
  'sorvete': 'Açaí / Sorveteria',
  'sorveteria': 'Açaí / Sorveteria',
  'acai': 'Açaí / Sorveteria',
  'açaí': 'Açaí / Sorveteria',
  'saudavel': 'Saudável / Fit',
  'saudável': 'Saudável / Fit',
  'fit': 'Saudável / Fit',
  'salada': 'Saudável / Fit',
  'vegano': 'Saudável / Fit',
  'vegetariano': 'Saudável / Fit',
  'restaurante': 'Restaurante',
};

export function parseSearchQuery(query: string): ParsedQuery {
  if (!query) {
    return { cleanedQuery: '', neighborhood: null, regionId: null, category: null };
  }

  // Normaliza o texto removendo acentuação e deixando lowercase
  const normalized = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  let neighborhood: string | null = null;
  let regionId: string | null = null;
  let category: string | null = null;
  const cleanedTokens: string[] = [];

  // Remove preposições comuns de localidade para facilitar tokenização
  const cleanText = normalized
    .replace(/\b(no\s+bairro\s+do|no\s+bairro\s+de|no\s+bairro\s+|nos\s+|no\s+|na\s+|nas\s+|em\s+|de\s+|do\s+|da\s+praia\s+de|na\s+praia\s+de|perto\s+de|proximo\s+a)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleanText.split(' ');

  // 1. Detectar bairros (incluindo compostos de duas palavras, ex: "cabo branco")
  let skipNext = false;
  for (let i = 0; i < words.length; i++) {
    if (skipNext) {
      skipNext = false;
      continue;
    }

    const currentWord = words[i];
    const nextWord = i < words.length - 1 ? words[i + 1] : '';
    const twoWords = `${currentWord} ${nextWord}`;

    if (NEIGHBORHOODS_MAPPING[twoWords]) {
      neighborhood = NEIGHBORHOODS_MAPPING[twoWords];
      skipNext = true; // pula a próxima palavra
      continue;
    }

    if (NEIGHBORHOODS_MAPPING[currentWord]) {
      neighborhood = NEIGHBORHOODS_MAPPING[currentWord];
      continue;
    }

    // 2. Detectar macro-região
    if (REGIONS_MAPPING[twoWords]) {
      regionId = REGIONS_MAPPING[twoWords];
      skipNext = true;
      continue;
    }

    if (REGIONS_MAPPING[currentWord]) {
      regionId = REGIONS_MAPPING[currentWord];
      continue;
    }

    // 3. Detectar Categoria
    if (CATEGORIES_MAPPING[currentWord]) {
      category = CATEGORIES_MAPPING[currentWord];
    }

    cleanedTokens.push(currentWord);
  }

  // Junta o termo de busca sem os termos de localização ou categorias identificadas
  const cleanedQuery = cleanedTokens
    .filter(word => {
      const wordNorm = word.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const isNeigh = Object.keys(NEIGHBORHOODS_MAPPING).some(k => k.includes(wordNorm));
      const isCat = Object.keys(CATEGORIES_MAPPING).some(k => k === wordNorm);
      const isRegion = Object.keys(REGIONS_MAPPING).some(k => k === wordNorm);
      return !isNeigh && !isCat && !isRegion;
    })
    .join(' ');

  return {
    cleanedQuery: cleanedQuery.trim(),
    neighborhood,
    regionId,
    category
  };
}
