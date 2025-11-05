import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddressInputField } from '../shared/AddressInputField';
import { NonceGeneratorField } from '../shared/NonceGeneratorField';
import { NonceTypeSelector } from '../shared/NonceTypeSelector';
import { generateRandomNonce } from '@/lib/toolkit/nonceGenerator';
import { buildSinglePaymentSignature, buildDispersePaymentSignature, validateAddress } from '@/lib/toolkit/signatureBuilder';
import { useAccount, useWalletClient } from 'wagmi';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2 } from 'lucide-react';

interface PaymentSignatureFormsProps {
  evvmAddress: string;
  chainId: number;
}

export function PaymentSignatureForms({ evvmAddress, chainId }: PaymentSignatureFormsProps) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  
  const [singlePayment, setSinglePayment] = useState({
    evvmID: '1',
    to: '',
    tokenAddress: '',
    amount: '',
    priorityFee: '0',
    executor: '',
    nonceType: 0,
    nonce: ''
  });

  const [dispersePayment, setDispersePayment] = useState({
    evvmID: '1',
    tokenAddress: '',
    priorityFee: '0',
    executor: '',
    nonceType: 0,
    nonce: '',
    recipients: [{ address: '', amount: '' }]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSinglePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !walletClient) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsSubmitting(true);
    try {
      const message = buildSinglePaymentSignature(singlePayment);
      
      // Sign the EIP-191 message string
      const signature = await walletClient.signMessage({
        account: address,
        message: message
      });
      
      const { error } = await supabase.from('evvm_signatures').insert({
        user_id: address,
        evvm_address: evvmAddress,
        chain_id: chainId,
        signature_type: 'single_payment',
        signature_data: singlePayment,
        signature_hash: signature,
        nonce: singlePayment.nonce,
        status: 'created'
      });

      if (error) throw error;

      toast.success('Payment signature created and signed successfully!');
      setSinglePayment({ evvmID: '1', to: '', tokenAddress: '', amount: '', priorityFee: '0', executor: '', nonceType: 0, nonce: '' });
    } catch (error) {
      console.error('Error creating signature:', error);
      toast.error('Failed to create signature');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispersePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !walletClient) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsSubmitting(true);
    try {
      const recipients = dispersePayment.recipients.map(r => r.address);
      const amounts = dispersePayment.recipients.map(r => r.amount);
      
      const message = buildDispersePaymentSignature({
        ...dispersePayment,
        recipients,
        amounts
      });
      
      // Sign the EIP-191 message string
      const signature = await walletClient.signMessage({
        account: address,
        message: message
      });
      
      const { error } = await supabase.from('evvm_signatures').insert({
        user_id: address,
        evvm_address: evvmAddress,
        chain_id: chainId,
        signature_type: 'disperse_payment',
        signature_data: { ...dispersePayment, recipients, amounts },
        signature_hash: signature,
        nonce: dispersePayment.nonce,
        status: 'created'
      });

      if (error) throw error;

      toast.success('Disperse payment signature created and signed successfully!');
      setDispersePayment({ evvmID: '1', tokenAddress: '', priorityFee: '0', executor: '', nonceType: 0, nonce: '', recipients: [{ address: '', amount: '' }] });
    } catch (error) {
      console.error('Error creating signature:', error);
      toast.error('Failed to create signature');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addRecipient = () => {
    setDispersePayment({
      ...dispersePayment,
      recipients: [...dispersePayment.recipients, { address: '', amount: '' }]
    });
  };

  const removeRecipient = (index: number) => {
    setDispersePayment({
      ...dispersePayment,
      recipients: dispersePayment.recipients.filter((_, i) => i !== index)
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Signatures</CardTitle>
        <CardDescription>
          Create single or batch payment signatures
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="single">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Payment</TabsTrigger>
            <TabsTrigger value="disperse">Disperse Payment</TabsTrigger>
          </TabsList>

          <TabsContent value="single">
            <form onSubmit={handleSinglePaymentSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>EVVM ID</Label>
                <Input
                  type="text"
                  value={singlePayment.evvmID}
                  onChange={(e) => setSinglePayment({ ...singlePayment, evvmID: e.target.value })}
                  placeholder="1"
                />
              </div>

              <AddressInputField
                label="Recipient Address"
                value={singlePayment.to}
                onChange={(v) => setSinglePayment({ ...singlePayment, to: v })}
              />

              <AddressInputField
                label="Token Address"
                value={singlePayment.tokenAddress}
                onChange={(v) => setSinglePayment({ ...singlePayment, tokenAddress: v })}
              />

              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  value={singlePayment.amount}
                  onChange={(e) => setSinglePayment({ ...singlePayment, amount: e.target.value })}
                  placeholder="1000000000000000000"
                />
              </div>

              <div className="space-y-2">
                <Label>Priority Fee</Label>
                <Input
                  value={singlePayment.priorityFee}
                  onChange={(e) => setSinglePayment({ ...singlePayment, priorityFee: e.target.value })}
                  placeholder="0"
                />
              </div>

              <AddressInputField
                label="Executor Address"
                value={singlePayment.executor}
                onChange={(v) => setSinglePayment({ ...singlePayment, executor: v })}
              />

              <NonceTypeSelector
                value={singlePayment.nonceType}
                onChange={(v) => setSinglePayment({ ...singlePayment, nonceType: v })}
              />

              <NonceGeneratorField
                label="Nonce"
                value={singlePayment.nonce}
                onChange={(v) => setSinglePayment({ ...singlePayment, nonce: v })}
                onGenerate={() => setSinglePayment({ ...singlePayment, nonce: generateRandomNonce() })}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Payment Signature'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="disperse">
            <form onSubmit={handleDispersePaymentSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>EVVM ID</Label>
                <Input
                  type="text"
                  value={dispersePayment.evvmID}
                  onChange={(e) => setDispersePayment({ ...dispersePayment, evvmID: e.target.value })}
                  placeholder="1"
                />
              </div>

              <AddressInputField
                label="Token Address"
                value={dispersePayment.tokenAddress}
                onChange={(v) => setDispersePayment({ ...dispersePayment, tokenAddress: v })}
              />

              <div className="space-y-2">
                <Label>Priority Fee</Label>
                <Input
                  value={dispersePayment.priorityFee}
                  onChange={(e) => setDispersePayment({ ...dispersePayment, priorityFee: e.target.value })}
                  placeholder="0"
                />
              </div>

              <AddressInputField
                label="Executor Address"
                value={dispersePayment.executor}
                onChange={(v) => setDispersePayment({ ...dispersePayment, executor: v })}
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Recipients</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addRecipient}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Recipient
                  </Button>
                </div>

                {dispersePayment.recipients.map((recipient, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Recipient {index + 1}</span>
                      {dispersePayment.recipients.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRecipient(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <AddressInputField
                      label="Address"
                      value={recipient.address}
                      onChange={(v) => {
                        const newRecipients = [...dispersePayment.recipients];
                        newRecipients[index].address = v;
                        setDispersePayment({ ...dispersePayment, recipients: newRecipients });
                      }}
                    />
                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <Input
                        value={recipient.amount}
                        onChange={(e) => {
                          const newRecipients = [...dispersePayment.recipients];
                          newRecipients[index].amount = e.target.value;
                          setDispersePayment({ ...dispersePayment, recipients: newRecipients });
                        }}
                        placeholder="1000000000000000000"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <NonceTypeSelector
                value={dispersePayment.nonceType}
                onChange={(v) => setDispersePayment({ ...dispersePayment, nonceType: v })}
              />

              <NonceGeneratorField
                label="Nonce"
                value={dispersePayment.nonce}
                onChange={(v) => setDispersePayment({ ...dispersePayment, nonce: v })}
                onGenerate={() => setDispersePayment({ ...dispersePayment, nonce: generateRandomNonce() })}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Disperse Payment Signature'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
