import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface NonceTypeSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

export function NonceTypeSelector({ value, onChange }: NonceTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>Nonce Type</Label>
      <Select value={value.toString()} onValueChange={(v) => onChange(parseInt(v))}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0">Synchronous</SelectItem>
          <SelectItem value="1">Asynchronous</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
