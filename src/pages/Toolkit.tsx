import { useState } from 'react';
import { ToolkitSelector } from '@/components/toolkit/ToolkitSelector';
import { FunctionCategorySelector, FunctionCategory } from '@/components/toolkit/FunctionCategorySelector';
import { FaucetBalanceForms } from '@/components/toolkit/forms/FaucetBalanceForms';
import { PaymentSignatureForms } from '@/components/toolkit/forms/PaymentSignatureForms';

export default function Toolkit() {
  const [selectedEVVM, setSelectedEVVM] = useState<{ address: string; chainId: number } | null>(null);
  const [functionCategory, setFunctionCategory] = useState<FunctionCategory>('');

  const handleEVVMSelected = (address: string, chainId: number) => {
    if (!address) {
      setSelectedEVVM(null);
      setFunctionCategory('');
    } else {
      setSelectedEVVM({ address, chainId });
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-gradient">
              EVVM Signature Constructor Toolkit
            </h1>
            <p className="text-lg text-muted-foreground">
              Build and manage signatures for your EVVM instance
            </p>
          </div>

          <ToolkitSelector
            onEVVMSelected={handleEVVMSelected}
            selectedEVVM={selectedEVVM}
          />

          {selectedEVVM && (
            <>
              <FunctionCategorySelector
                value={functionCategory}
                onChange={setFunctionCategory}
              />

              {functionCategory === 'faucet' && (
                <FaucetBalanceForms
                  evvmAddress={selectedEVVM.address}
                  chainId={selectedEVVM.chainId}
                />
              )}

              {functionCategory === 'payment' && (
                <PaymentSignatureForms
                  evvmAddress={selectedEVVM.address}
                  chainId={selectedEVVM.chainId}
                />
              )}

              {functionCategory === 'staking' && (
                <div className="text-center p-8 border border-dashed rounded-lg">
                  <p className="text-muted-foreground">Staking signatures coming soon...</p>
                </div>
              )}

              {functionCategory === 'nameservice' && (
                <div className="text-center p-8 border border-dashed rounded-lg">
                  <p className="text-muted-foreground">Name service signatures coming soon...</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
