import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dices } from 'lucide-react';

interface NonceGeneratorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  placeholder?: string;
}

export function NonceGeneratorField({ label, value, onChange, onGenerate, placeholder }: NonceGeneratorFieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "Enter nonce or generate random"}
          className="flex-1"
        />
        <Button type="button" variant="outline" onClick={onGenerate}>
          <Dices className="w-4 h-4 mr-2" />
          Generate
        </Button>
      </div>
    </div>
  );
}
