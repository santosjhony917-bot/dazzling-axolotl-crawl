export const formatPhoneNumber = (phoneNumber: string): string => {
  const cleaned = ('' + phoneNumber).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  // Match for numbers without the 9th digit
  const match2 = cleaned.match(/^(\d{2})(\d{4})(\d{4})$/);
  if (match2) {
    return `(${match2[1]}) ${match2[2]}-${match2[3]}`;
  }
  return phoneNumber;
};