import * as React from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

export interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value?: string; // formato YYYY-MM-DD
  onChange?: (value: string) => void;
}

/**
 * Componente de input de data que aceita apenas formato dd/mm/yyyy
 * Internamente trabalha com formato YYYY-MM-DD para compatibilidade com o backend
 */
const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    // Converte YYYY-MM-DD para dd/mm/yyyy para exibição
    const formatToDisplay = (isoDate: string): string => {
      if (!isoDate) return "";
      const [year, month, day] = isoDate.split("-");
      if (!year || !month || !day) return "";
      return `${day}/${month}/${year}`;
    };

    // Converte dd/mm/yyyy para YYYY-MM-DD para o backend
    const formatToISO = (displayDate: string): string => {
      const cleaned = displayDate.replace(/\D/g, "");
      if (cleaned.length !== 8) return "";
      
      const day = cleaned.substring(0, 2);
      const month = cleaned.substring(2, 4);
      const year = cleaned.substring(4, 8);
      
      // Validação básica
      const dayNum = parseInt(day);
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      
      if (dayNum < 1 || dayNum > 31) return "";
      if (monthNum < 1 || monthNum > 12) return "";
      if (yearNum < 1900 || yearNum > 2100) return "";
      
      return `${year}-${month}-${day}`;
    };

    const [displayValue, setDisplayValue] = React.useState(() => 
      value ? formatToDisplay(value) : ""
    );

    // Atualiza displayValue quando value externo mudar
    React.useEffect(() => {
      if (value !== undefined) {
        setDisplayValue(value ? formatToDisplay(value) : "");
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value;
      
      // Remove caracteres não numéricos
      const numbers = inputValue.replace(/\D/g, "");
      
      // Limita a 8 dígitos (ddmmyyyy)
      const limited = numbers.substring(0, 8);
      
      // Formata com barras automaticamente
      let formatted = limited;
      if (limited.length >= 2) {
        formatted = limited.substring(0, 2) + "/" + limited.substring(2);
      }
      if (limited.length >= 4) {
        formatted = limited.substring(0, 2) + "/" + limited.substring(2, 4) + "/" + limited.substring(4);
      }
      
      setDisplayValue(formatted);
      
      // Se temos 8 dígitos, converte para ISO e notifica
      if (limited.length === 8) {
        const isoDate = formatToISO(formatted);
        if (isoDate && onChange) {
          onChange(isoDate);
        }
      } else if (limited.length === 0 && onChange) {
        // Se o campo foi limpo
        onChange("");
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Ao perder o foco, tenta converter o valor atual
      const isoDate = formatToISO(displayValue);
      if (isoDate && onChange) {
        onChange(isoDate);
      } else if (displayValue && displayValue.length < 10) {
        // Se valor incompleto, limpa
        setDisplayValue("");
        if (onChange) onChange("");
      }
      
      // Chama onBlur original se existir
      if (props.onBlur) {
        props.onBlur(e);
      }
    };

    return (
      <Input
        ref={ref}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="dd/mm/yyyy"
        maxLength={10}
        className={cn(className)}
        {...props}
      />
    );
  }
);

DateInput.displayName = "DateInput";

export { DateInput };
