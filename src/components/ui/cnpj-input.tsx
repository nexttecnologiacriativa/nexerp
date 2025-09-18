import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatCNPJ, normalizeCNPJ, validateCNPJ } from "@/lib/cnpj-utils";
import { cn } from "@/lib/utils";

export interface CNPJInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string, normalizedValue: string) => void;
  onValidationChange?: (isValid: boolean, error?: string) => void;
  showError?: boolean;
}

const CNPJInput = React.forwardRef<HTMLInputElement, CNPJInputProps>(
  ({ className, value = "", onChange, onValidationChange, showError = true, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(formatCNPJ(value));
    const [error, setError] = React.useState<string>("");

    React.useEffect(() => {
      setDisplayValue(formatCNPJ(value));
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const normalized = normalizeCNPJ(inputValue);
      
      // Limita a 14 dígitos
      if (normalized.length > 14) return;
      
      const formatted = formatCNPJ(normalized);
      setDisplayValue(formatted);

      // Validação
      if (normalized.length === 0) {
        setError("");
        onValidationChange?.(false, "CNPJ deve ter 14 dígitos válidos");
      } else if (normalized.length < 14) {
        setError("CNPJ deve ter 14 dígitos válidos");
        onValidationChange?.(false, "CNPJ deve ter 14 dígitos válidos");
      } else {
        const validation = validateCNPJ(normalized);
        setError(validation.error || "");
        onValidationChange?.(validation.isValid, validation.error);
      }

      onChange?.(formatted, normalized);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData('text');
      const normalized = normalizeCNPJ(pastedText);
      
      if (normalized.length <= 14) {
        const formatted = formatCNPJ(normalized);
        setDisplayValue(formatted);
        
        if (normalized.length === 14) {
          const validation = validateCNPJ(normalized);
          setError(validation.error || "");
          onValidationChange?.(validation.isValid, validation.error);
        } else {
          setError("CNPJ deve ter 14 dígitos válidos");
          onValidationChange?.(false, "CNPJ deve ter 14 dígitos válidos");
        }
        
        onChange?.(formatted, normalized);
      }
    };

    return (
      <div className="space-y-1">
        <Input
          {...props}
          ref={ref}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onPaste={handlePaste}
          placeholder="00.000.000/0000-00"
          className={cn(
            error && showError ? "border-destructive focus-visible:ring-destructive" : "",
            className
          )}
        />
        {error && showError && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

CNPJInput.displayName = "CNPJInput";

export { CNPJInput };