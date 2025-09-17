import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatCPF, validateCPF, normalizeCPF } from "@/lib/cpf-utils";

interface CPFInputProps extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  onValidationChange?: (error: string | null) => void;
  className?: string;
}

const CPFInput = React.forwardRef<HTMLInputElement, CPFInputProps>(
  ({ className, value, onChange, onValidationChange, ...props }, ref) => {
    const [error, setError] = React.useState<string | null>(null);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const formattedValue = formatCPF(inputValue);
      
      // Limita a 14 caracteres (com máscara)
      if (formattedValue.length > 14) return;
      
      const validation = validateCPF(formattedValue);
      const currentError = validation.isValid ? null : validation.error || null;
      
      setError(currentError);
      onValidationChange?.(currentError);
      onChange(formattedValue, validation.isValid);
    };
    
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData('text');
      const normalized = normalizeCPF(pastedText);
      const formatted = formatCPF(normalized);
      
      if (formatted.length <= 14) {
        const validation = validateCPF(formatted);
        const currentError = validation.isValid ? null : validation.error || null;
        
        setError(currentError);
        onValidationChange?.(currentError);
        onChange(formatted, validation.isValid);
      }
    };
    
    return (
      <div className="space-y-1">
        <Input
          type="text"
          className={cn(
            className,
            error && "border-destructive focus-visible:ring-destructive"
          )}
          value={value}
          onChange={handleChange}
          onPaste={handlePaste}
          placeholder="000.000.000-00"
          maxLength={14}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

CPFInput.displayName = "CPFInput";

export { CPFInput };