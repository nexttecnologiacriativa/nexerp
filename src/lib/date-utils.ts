/**
 * Funções utilitárias para manipulação de datas sem problemas de timezone
 */

/**
 * Formata uma data no formato YYYY-MM-DD para exibição em dd/MM/yyyy
 * Evita problemas de timezone ao não criar um objeto Date
 */
export function formatDateForDisplay(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  
  const [year, month, day] = dateString.split('-');
  if (!year || !month || !day) return '-';
  
  return `${day}/${month}/${year}`;
}

/**
 * Converte uma data Date para o formato YYYY-MM-DD sem afetar o dia
 * Usa o fuso horário local para evitar mudanças de data
 */
export function dateToISOString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Cria um objeto Date a partir de uma string YYYY-MM-DD no fuso horário local
 * Evita problemas com UTC que podem mudar o dia
 */
export function parseISODate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Compara duas datas no formato YYYY-MM-DD
 * Retorna: -1 se date1 < date2, 0 se iguais, 1 se date1 > date2
 */
export function compareDates(date1: string, date2: string): number {
  if (date1 === date2) return 0;
  return date1 < date2 ? -1 : 1;
}

/**
 * Obtém a data de hoje no formato YYYY-MM-DD
 */
export function getTodayISO(): string {
  return dateToISOString(new Date());
}
