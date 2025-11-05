import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddressInputField } from './shared/AddressInputField';
import { validateAddress } from '@/lib/toolkit/signatureBuilder';
import { CheckCircle2 } from 'lucide-react';

interface ToolkitSelectorProps {
  onEVVMSelected: (evvmAddress: string, chainId: number) => void;
  selectedEVVM: { address: string; chainId: number } | null;
}

export function ToolkitSelector({ onEVVMSelected, selectedEVVM }: ToolkitSelectorProps) {
  const [evvmAddress, setEvvmAddress] = useState('');
  const [chainId, setChainId] = useState<number>(1315); // Story Testnet default

  const handleUseEVVM = () => {
    if (validateAddress(evvmAddress)) {
      onEVVMSelected(evvmAddress, chainId);
    }
  };

  const chains = [
    { id: 11155111, name: 'Sepolia' },
    { id: 421614, name: 'Arbitrum Sepolia' },
    { id: 1315, name: 'Story Testnet (Aeneid)' },
    { id: 1514, name: 'Story Mainnet' },
    { id: 1, name: 'Ethereum Mainnet' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select EVVM Instance</CardTitle>
        <CardDescription>
          Enter the address of the EVVM you want to interact with
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedEVVM ? (
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">EVVM Connected</span>
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground">Address:</p>
              <p className="font-mono break-all">{selectedEVVM.address}</p>
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground">Chain:</p>
              <p>{chains.find(c => c.id === selectedEVVM.chainId)?.name}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEVVMSelected('', 0)}
              className="w-full mt-2"
            >
              Change EVVM
            </Button>
          </div>
        ) : (
          <>
            <AddressInputField
              label="EVVM Contract Address"
              value={evvmAddress}
              onChange={setEvvmAddress}
              placeholder="0x..."
            />
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Chain</label>
              <Select value={chainId.toString()} onValueChange={(v) => setChainId(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {chains.map(chain => (
                    <SelectItem key={chain.id} value={chain.id.toString()}>
                      {chain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleUseEVVM}
              disabled={!validateAddress(evvmAddress)}
              className="w-full"
            >
              Use this EVVM
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
