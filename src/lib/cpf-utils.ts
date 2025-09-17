// Utilitários para validação de CPF

export function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
}

export function normalizeCPF(value: string): string {
  return value.replace(/\D/g, '');
}

export function validateCPFLength(cpf: string): boolean {
  const numbers = normalizeCPF(cpf);
  return numbers.length === 11;
}

export function isRepeatedNumbers(cpf: string): boolean {
  const numbers = normalizeCPF(cpf);
  return /^(\d)\1{10}$/.test(numbers);
}

export function validateCPFCheckDigits(cpf: string): boolean {
  const numbers = normalizeCPF(cpf);
  
  if (numbers.length !== 11) return false;
  if (isRepeatedNumbers(numbers)) return false;
  
  // Calcula primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i);
  }
  let firstDigit = 11 - (sum % 11);
  if (firstDigit >= 10) firstDigit = 0;
  
  // Calcula segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i);
  }
  let secondDigit = 11 - (sum % 11);
  if (secondDigit >= 10) secondDigit = 0;
  
  return parseInt(numbers[9]) === firstDigit && parseInt(numbers[10]) === secondDigit;
}

export function validateCPF(cpf: string): { isValid: boolean; error?: string } {
  const numbers = normalizeCPF(cpf);
  
  if (!validateCPFLength(cpf)) {
    return { isValid: false, error: "CPF deve ter 11 dígitos válidos" };
  }
  
  if (isRepeatedNumbers(numbers)) {
    return { isValid: false, error: "CPF deve ter 11 dígitos válidos" };
  }
  
  if (!validateCPFCheckDigits(numbers)) {
    return { isValid: false, error: "CPF deve ter 11 dígitos válidos" };
  }
  
  return { isValid: true };
}