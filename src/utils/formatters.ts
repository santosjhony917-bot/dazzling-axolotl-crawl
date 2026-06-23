/**
 * Formats a number with locale-specific separators.
 * @param num The number to format.
 * @returns The formatted string.
 */
export const formatNumber = (num: number): string => {
  if (num === undefined || num === null) return '0';
  return num.toLocaleString('pt-BR');
};

/**
 * Formats a price number into currency format (R$).
 * @param price The price to format.
 * @returns The formatted currency string.
 */
export const formatPrice = (price: number | null | undefined): string => {
  if (price === undefined || price === null) return 'Preço sob consulta';
  return price.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

/**
 * Sanitizes a restaurant name by removing trailing neighborhood names.
 * e.g., "3A Salgados - Oitizeiro" -> "3A Salgados"
 * @param name The restaurant name to sanitize.
 * @returns The sanitized restaurant name.
 */
export const cleanRestaurantName = (name: string): string => {
  if (!name) return 'Sem Nome';
  const nameParts = name.split(' - ');
  if (nameParts.length >= 2) {
    const lastPart = nameParts[nameParts.length - 1].trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
      
    const neighborhoods = new Set([
      'jose americo', 'cristo redentor', 'cruz das armas', 'portal do sol',
      'jardim cidade universitaria', 'ernani satiro', 'mangabeira', 'gramame',
      'sao jose', 'cuia', 'roger', 'bancarios', 'anatolia', 'manaira',
      'aeroclube', 'centro', 'bairro dos estados', 'torre', 'agua fria',
      'geisel', 'tambau', 'miramar', 'cabo branco', 'joao pessoa', 'estados',
      'bessa', 'altiplano', 'valentina', 'castelo branco', 'jardim oceania',
      'jaguaribe', 'mandacaru', 'padre ze', 'varadouro', 'alto do mateus',
      'ilha do bispo', 'oitizeiro', 'bairro das industrias', 'mussumago',
      'colinas do sul', 'paratibe', 'planalto da boa esperanca', 'cidade verde',
      'penha', 'seixas', 'ponte de terra', 'grotas', 'jacare', 'intermares',
      'tambauzinho', 'expedicionarios', 'ipes', 'estados', 'treze de maio',
      'distrito industrial'
    ]);
    
    if (neighborhoods.has(lastPart)) {
      let tempName = nameParts.slice(0, -1).join(' - ');
      const tempParts = tempName.split(' - ');
      if (tempParts.length >= 2) {
        const nextLast = tempParts[tempParts.length - 1].trim().toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
        if (neighborhoods.has(nextLast)) {
          tempName = tempParts.slice(0, -1).join(' - ');
        }
      }
      return tempName;
    }
  }
  return name;
};