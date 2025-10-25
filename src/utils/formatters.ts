/**
 * Formats a number into Brazilian Real currency string.
 * @param value The number to format.
 * @returns Formatted currency string (e.g., R$ 1.234,56).
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};