import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddressInputField } from '../shared/AddressInputField';
import { NonceGeneratorField } from '../shared/NonceGeneratorField';
import { generateRandomNonce } from '@/lib/toolkit/nonceGenerator';
import { buildFaucetSignature, validateAddress } from '@/lib/toolkit/signatureBuilder';
import { useAccount, useWalletClient } from 'wagmi';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface FaucetBalanceFormsProps {
  evvmAddress: string;
  chainId: number;
}

export function FaucetBalanceForms({ evvmAddress, chainId }: FaucetBalanceFormsProps) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  
  const [faucetForm, setFaucetForm] = useState({
    to: '',
    tokenAddress: '',
    amount: '',
    nonce: ''
  });

  const [balanceForm, setBalanceForm] = useState({
    userAddress: '',
    tokenAddress: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFaucetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !walletClient) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!validateAddress(faucetForm.to) || !validateAddress(faucetForm.tokenAddress)) {
      toast.error('Invalid address');
      return;
    }

    setIsSubmitting(true);
    try {
      // Build the encoded function data
      const encodedData = buildFaucetSignature(faucetForm);
      
      // Sign the message with the wallet
      const signature = await walletClient.signMessage({
        account: address,
        message: { raw: encodedData as `0x${string}` }
      });
      
      // Store signature in database
      const { error } = await supabase.from('evvm_signatures').insert({
        user_id: address,
        evvm_address: evvmAddress,
        chain_id: chainId,
        signature_type: 'faucet',
        signature_data: faucetForm,
        signature_hash: signature,
        nonce: faucetForm.nonce,
        status: 'created'
      });

      if (error) throw error;

      toast.success('Faucet signature created and signed successfully!');
      setFaucetForm({ to: '', tokenAddress: '', amount: '', nonce: '' });
    } catch (error) {
      console.error('Error creating signature:', error);
      toast.error('Failed to create signature');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Faucet & Balance Functions</CardTitle>
        <CardDescription>
          Create signatures for faucet operations or check balances
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="faucet">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="faucet">Faucet</TabsTrigger>
            <TabsTrigger value="balance">Check Balance</TabsTrigger>
          </TabsList>

          <TabsContent value="faucet">
            <form onSubmit={handleFaucetSubmit} className="space-y-4">
              <AddressInputField
                label="Recipient Address"
                value={faucetForm.to}
                onChange={(v) => setFaucetForm({ ...faucetForm, to: v })}
              />

              <AddressInputField
                label="Token Address"
                value={faucetForm.tokenAddress}
                onChange={(v) => setFaucetForm({ ...faucetForm, tokenAddress: v })}
              />

              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="text"
                  value={faucetForm.amount}
                  onChange={(e) => setFaucetForm({ ...faucetForm, amount: e.target.value })}
                  placeholder="1000000000000000000"
                />
              </div>

              <NonceGeneratorField
                label="Nonce"
                value={faucetForm.nonce}
                onChange={(v) => setFaucetForm({ ...faucetForm, nonce: v })}
                onGenerate={() => setFaucetForm({ ...faucetForm, nonce: generateRandomNonce() })}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Faucet Signature'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="balance">
            <div className="space-y-4">
              <AddressInputField
                label="User Address"
                value={balanceForm.userAddress}
                onChange={(v) => setBalanceForm({ ...balanceForm, userAddress: v })}
              />

              <AddressInputField
                label="Token Address"
                value={balanceForm.tokenAddress}
                onChange={(v) => setBalanceForm({ ...balanceForm, tokenAddress: v })}
              />

              <Button className="w-full">
                Check Balance
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
