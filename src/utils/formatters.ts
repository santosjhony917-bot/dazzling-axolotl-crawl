export const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters
  const cleaned = ('' + phoneNumber).replace(/\D/g, '');

  // Apply formatting based on length
  if (cleaned.length === 10) {
    // (XX) XXXX-XXXX
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6, 10)}`;
  } else if (cleaned.length === 11) {
    // (XX) XXXXX-XXXX
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7, 11)}`;
  }
  // Return original if not a standard phone number length
  return phoneNumber;
};

export const formatNumber = (value: number | string): string => {
  if (typeof value === 'string') {
    value = parseFloat(value);
  }
  if (isNaN(value)) {
    return '';
  }
  return value.toLocaleString('pt-BR');
};