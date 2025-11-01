export function formatPhoneNumber(phoneNumber: string): string {
  // Remove todos os caracteres não numéricos
  const cleaned = ('' + phoneNumber).replace(/\D/g, '');

  // Verifica se é um número de 11 dígitos (com DDD)
  if (cleaned.length === 11) {
    // Formato: (XX) XXXXX-XXXX
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7, 11)}`;
  }
  // Verifica se é um número de 10 dígitos (com DDD)
  if (cleaned.length === 10) {
    // Formato: (XX) XXXX-XXXX
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6, 10)}`;
  }

  // Retorna o original se não corresponder a um formato comum
  return phoneNumber;
}

export function formatNumber(value: number | string): string {
  if (typeof value === 'string') {
    value = parseFloat(value);
  }
  if (isNaN(value)) {
    return 'N/A';
  }
  return value.toLocaleString('pt-BR');
}