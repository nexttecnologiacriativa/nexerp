// Utilitários para validação de CNPJ

export function formatCNPJ(value: string): string {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
  if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
  if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
  
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
}

export function normalizeCNPJ(value: string): string {
  return value.replace(/\D/g, '');
}

export function validateCNPJLength(cnpj: string): boolean {
  const numbers = normalizeCNPJ(cnpj);
  return numbers.length === 14;
}

export function isRepeatedNumbers(cnpj: string): boolean {
  const numbers = normalizeCNPJ(cnpj);
  return /^(\d)\1{13}$/.test(numbers);
}

export function validateCNPJCheckDigits(cnpj: string): boolean {
  const numbers = normalizeCNPJ(cnpj);
  
  if (numbers.length !== 14) return false;
  if (isRepeatedNumbers(numbers)) return false;
  
  // Calcula primeiro dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers[i]) * weights1[i];
  }
  let firstDigit = 11 - (sum % 11);
  if (firstDigit >= 10) firstDigit = 0;
  
  // Calcula segundo dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers[i]) * weights2[i];
  }
  let secondDigit = 11 - (sum % 11);
  if (secondDigit >= 10) secondDigit = 0;
  
  return parseInt(numbers[12]) === firstDigit && parseInt(numbers[13]) === secondDigit;
}

export function validateCNPJ(cnpj: string): { isValid: boolean; error?: string } {
  const numbers = normalizeCNPJ(cnpj);
  
  if (!validateCNPJLength(cnpj)) {
    return { isValid: false, error: "CNPJ deve ter 14 dígitos válidos" };
  }
  
  if (isRepeatedNumbers(numbers)) {
    return { isValid: false, error: "CNPJ deve ter 14 dígitos válidos" };
  }
  
  if (!validateCNPJCheckDigits(numbers)) {
    return { isValid: false, error: "CNPJ deve ter 14 dígitos válidos" };
  }
  
  return { isValid: true };
}