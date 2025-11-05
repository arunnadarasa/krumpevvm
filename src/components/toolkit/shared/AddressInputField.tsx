import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validateAddress } from '@/lib/toolkit/signatureBuilder';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface AddressInputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export function AddressInputField({ label, value, onChange, placeholder, required = true }: AddressInputFieldProps) {
  const isValid = !value || validateAddress(value);

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "0x..."}
          className={!isValid ? 'border-destructive' : ''}
        />
        {value && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isValid ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-destructive" />
            )}
          </div>
        )}
      </div>
      {value && !isValid && (
        <p className="text-sm text-destructive">Invalid Ethereum address</p>
      )}
    </div>
  );
}
