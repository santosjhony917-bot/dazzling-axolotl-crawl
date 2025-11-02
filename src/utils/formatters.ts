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
export const formatPrice = (price: number): string => {
  if (price === undefined || price === null) return 'R$ 0,00';
  return price.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};