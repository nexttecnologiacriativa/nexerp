import * as React from "react";
import { Input } from "./input";
import { formatPhone, normalizePhone, isValidPhone } from "@/lib/phone-utils";
import { cn } from "@/lib/utils";

interface PhoneInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  onValidityChange?: (isValid: boolean) => void;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, onValidityChange, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(formatPhone(value));

    React.useEffect(() => {
      setDisplayValue(formatPhone(value));
    }, [value]);

    React.useEffect(() => {
      const isValid = value ? isValidPhone(value) : true;
      onValidityChange?.(isValid);
    }, [value, onValidityChange]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const normalizedValue = normalizePhone(inputValue);
      
      // Limit to 11 digits maximum
      if (normalizedValue.length <= 11) {
        const formatted = formatPhone(normalizedValue);
        setDisplayValue(formatted);
        onChange(normalizedValue);
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData('text');
      const normalizedValue = normalizePhone(pastedText);
      
      if (normalizedValue.length <= 11) {
        const formatted = formatPhone(normalizedValue);
        setDisplayValue(formatted);
        onChange(normalizedValue);
      }
    };

    return (
      <Input
        {...props}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder="(00)00000-0000"
        className={cn(
          !isValidPhone(value) && value ? "border-destructive" : "",
          className
        )}
      />
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };