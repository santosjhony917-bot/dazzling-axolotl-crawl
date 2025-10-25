export const formatCurrency = (amount: number, includePrefix: boolean = true): string => {
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return includePrefix ? `R$${formatted}` : formatted;
};