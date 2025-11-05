import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type FunctionCategory = 'faucet' | 'payment' | 'staking' | 'nameservice' | '';

interface FunctionCategorySelectorProps {
  value: FunctionCategory;
  onChange: (value: FunctionCategory) => void;
  disabled?: boolean;
}

export function FunctionCategorySelector({ value, onChange, disabled }: FunctionCategorySelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Function Category</CardTitle>
        <CardDescription>
          Choose the type of signature you want to create
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Select value={value} onValueChange={(v) => onChange(v as FunctionCategory)} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a function category..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="faucet">Faucet & Balance Functions</SelectItem>
            <SelectItem value="payment">Payment Signatures</SelectItem>
            <SelectItem value="staking">Staking Signatures</SelectItem>
            <SelectItem value="nameservice">Name Service Signatures</SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
