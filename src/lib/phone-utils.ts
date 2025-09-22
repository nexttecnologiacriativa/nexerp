// Phone formatting and validation utilities

export const normalizePhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

export const formatPhone = (phone: string): string => {
  const digits = normalizePhone(phone);
  
  if (digits.length === 0) return '';
  
  if (digits.length <= 10) {
    // Landline format: (00)0000-0000
    if (digits.length <= 2) {
      return `(${digits}`;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 2)})${digits.slice(2)}`;
    } else {
      return `(${digits.slice(0, 2)})${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
    }
  } else {
    // Mobile format: (00)00000-0000
    if (digits.length <= 2) {
      return `(${digits}`;
    } else if (digits.length <= 7) {
      return `(${digits.slice(0, 2)})${digits.slice(2)}`;
    } else {
      return `(${digits.slice(0, 2)})${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }
  }
};

export const validatePhone = (phone: string): boolean => {
  const digits = normalizePhone(phone);
  
  // Must have 10 (landline) or 11 (mobile) digits
  if (digits.length !== 10 && digits.length !== 11) {
    return false;
  }
  
  // Check for repeated digit patterns
  const invalidPatterns = [
    /^(\d)\1+$/, // All same digit
    /^11+$/, // All 1s
    /^00+$/, // All 0s
    /^99+$/, // All 9s
    /^44+$/, // All 4s
  ];
  
  return !invalidPatterns.some(pattern => pattern.test(digits));
};

export const isValidPhone = (phone: string): boolean => {
  const digits = normalizePhone(phone);
  return digits.length >= 10 && digits.length <= 11 && validatePhone(phone);
};