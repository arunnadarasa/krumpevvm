import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';

type Step = 'setup' | 'configure' | 'deploy';

export function DeploymentWizard() {
  const { address } = useAccount();
  const [step, setStep] = useState<Step>('setup');
  const [deploying, setDeploying] = useState(false);

  // Form state
  const [evvmName, setEvvmName] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [totalSupply, setTotalSupply] = useState('');
  const [adminAddress, setAdminAddress] = useState('');
  const [goldenFisherAddress, setGoldenFisherAddress] = useState('');
  const [activatorAddress, setActivatorAddress] = useState('');
  const [nameServiceAddress, setNameServiceAddress] = useState('');
  const [eraTokens, setEraTokens] = useState('');
  const [rewardPerOperation, setRewardPerOperation] = useState('');
  const [network, setNetwork] = useState('');

  const isValidAddress = (addr: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  };

  const getChainId = (networkName: string): number => {
    const chainIds: Record<string, number> = {
      'Sepolia': 11155111,
      'Arbitrum Sepolia': 421614,
      'Story Testnet': 1315,
    };
    return chainIds[networkName] || 11155111;
  };

  const validateSetup = (): boolean => {
    if (!evvmName.trim()) {
      toast.error('Please enter an EVVM name');
      return false;
    }
    if (!tokenName.trim() || !tokenSymbol.trim()) {
      toast.error('Please enter token details');
      return false;
    }
    return true;
  };

  const validateConfigure = (): boolean => {
    if (!isValidAddress(adminAddress)) {
      toast.error('Please enter a valid admin address');
      return false;
    }
    if (!isValidAddress(goldenFisherAddress)) {
      toast.error('Please enter a valid Golden Fisher address');
      return false;
    }
    if (!isValidAddress(activatorAddress)) {
      toast.error('Please enter a valid Activator address');
      return false;
    }
    if (nameServiceAddress && !isValidAddress(nameServiceAddress)) {
      toast.error('Please enter a valid Name Service address');
      return false;
    }
    return true;
  };

  const handleDeploy = async () => {
    if (!network) {
      toast.error('Please select a network');
      return;
    }

    setDeploying(true);
    try {
      // Call edge function to deploy
      const { data: functionData, error: functionError } = await supabase.functions.invoke('deploy-evvm', {
        body: {
          evvmName,
          tokenName,
          tokenSymbol,
          totalSupply: totalSupply || null,
          adminAddress,
          goldenFisherAddress,
          activatorAddress,
          nameServiceAddress: nameServiceAddress || null,
          eraTokens: eraTokens || null,
          rewardPerOperation: rewardPerOperation || null,
          network,
          deployerAddress: address,
        },
      });

      if (functionError) throw functionError;

      // Save to database
      const { error: dbError } = await supabase.from('evvm_deployments').insert({
        user_id: address!.toLowerCase(),
        evvm_name: evvmName,
        principal_token_name: tokenName,
        principal_token_symbol: tokenSymbol,
        total_supply: totalSupply ? Number(totalSupply) : null,
        host_chain_name: network,
        host_chain_id: getChainId(network),
        admin_address: adminAddress,
        golden_fisher_address: goldenFisherAddress,
        activator_address: activatorAddress,
        name_service_address: nameServiceAddress || null,
        era_tokens: eraTokens ? Number(eraTokens) : null,
        reward_per_operation: rewardPerOperation ? Number(rewardPerOperation) : null,
        deployment_status: 'completed',
        deployment_tx_hash: functionData?.txHash,
        evvm_core_address: functionData?.contractAddress,
      });

      if (dbError) throw dbError;

      toast.success('EVVM deployed successfully!');
      
      // Reset form
      resetForm();
    } catch (error: any) {
      console.error('Deployment error:', error);
      toast.error(error.message || 'Deployment failed');
    } finally {
      setDeploying(false);
    }
  };

  const resetForm = () => {
    setStep('setup');
    setEvvmName('');
    setTokenName('');
    setTokenSymbol('');
    setTotalSupply('');
    setAdminAddress('');
    setGoldenFisherAddress('');
    setActivatorAddress('');
    setNameServiceAddress('');
    setEraTokens('');
    setRewardPerOperation('');
    setNetwork('');
  };

  return (
    <Card className="glass-card p-8 max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="flex justify-between mb-8">
        {(['setup', 'configure', 'deploy'] as Step[]).map((s, index) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`flex items-center gap-2 ${step === s ? 'text-primary' : step > s ? 'text-accent' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                step === s ? 'border-primary bg-primary/20' : 
                step > s ? 'border-accent bg-accent/20' : 
                'border-border'
              }`}>
                {step > s ? <CheckCircle2 className="w-5 h-5" /> : index + 1}
              </div>
              <span className="font-medium capitalize hidden sm:inline">{s}</span>
            </div>
            {index < 2 && (
              <div className={`flex-1 h-0.5 mx-4 ${step > s ? 'bg-accent' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Setup */}
      {step === 'setup' && (
        <div className="space-y-6">
          <div>
            <Label htmlFor="evvmName">EVVM Name *</Label>
            <Input
              id="evvmName"
              value={evvmName}
              onChange={(e) => setEvvmName(e.target.value)}
              placeholder="My EVVM"
            />
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tokenName">Principal Token Name *</Label>
              <Input
                id="tokenName"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder="My Token"
              />
            </div>
            <div>
              <Label htmlFor="tokenSymbol">Token Symbol *</Label>
              <Input
                id="tokenSymbol"
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value)}
                placeholder="MTK"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="totalSupply">Total Supply (Optional)</Label>
            <Input
              id="totalSupply"
              type="number"
              value={totalSupply}
              onChange={(e) => setTotalSupply(e.target.value)}
              placeholder="1000000"
            />
          </div>

          <Button
            className="w-full gradient-primary"
            onClick={() => {
              if (validateSetup()) setStep('configure');
            }}
          >
            Continue <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Step 2: Configure */}
      {step === 'configure' && (
        <div className="space-y-6">
          <div>
            <Label htmlFor="adminAddress">Admin Address *</Label>
            <Input
              id="adminAddress"
              value={adminAddress}
              onChange={(e) => setAdminAddress(e.target.value)}
              placeholder="0x..."
            />
          </div>

          <div>
            <Label htmlFor="goldenFisherAddress">Golden Fisher Address *</Label>
            <Input
              id="goldenFisherAddress"
              value={goldenFisherAddress}
              onChange={(e) => setGoldenFisherAddress(e.target.value)}
              placeholder="0x..."
            />
          </div>

          <div>
            <Label htmlFor="activatorAddress">Activator Address *</Label>
            <Input
              id="activatorAddress"
              value={activatorAddress}
              onChange={(e) => setActivatorAddress(e.target.value)}
              placeholder="0x..."
            />
          </div>

          <div>
            <Label htmlFor="nameServiceAddress">Name Service Address (Optional)</Label>
            <Input
              id="nameServiceAddress"
              value={nameServiceAddress}
              onChange={(e) => setNameServiceAddress(e.target.value)}
              placeholder="0x..."
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="eraTokens">Era Tokens (Optional)</Label>
              <Input
                id="eraTokens"
                type="number"
                value={eraTokens}
                onChange={(e) => setEraTokens(e.target.value)}
                placeholder="1000"
              />
            </div>
            <div>
              <Label htmlFor="rewardPerOperation">Reward Per Operation (Optional)</Label>
              <Input
                id="rewardPerOperation"
                type="number"
                value={rewardPerOperation}
                onChange={(e) => setRewardPerOperation(e.target.value)}
                placeholder="10"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setStep('setup')}
            >
              <ArrowLeft className="mr-2 w-4 h-4" /> Back
            </Button>
            <Button
              className="flex-1 gradient-primary"
              onClick={() => {
                if (validateConfigure()) setStep('deploy');
              }}
            >
              Continue <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Deploy */}
      {step === 'deploy' && (
        <div className="space-y-6">
          <div>
            <Label htmlFor="network">Select Network *</Label>
            <Select value={network} onValueChange={setNetwork}>
              <SelectTrigger>
                <SelectValue placeholder="Choose deployment network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sepolia">Ethereum Sepolia</SelectItem>
                <SelectItem value="Arbitrum Sepolia">Arbitrum Sepolia</SelectItem>
                <SelectItem value="Story Testnet">Story Testnet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="p-4 bg-muted/50 border-border">
            <h3 className="font-semibold mb-2">Deployment Summary</h3>
            <div className="space-y-1 text-sm">
              <div><span className="text-muted-foreground">EVVM:</span> {evvmName}</div>
              <div><span className="text-muted-foreground">Token:</span> {tokenName} ({tokenSymbol})</div>
              <div><span className="text-muted-foreground">Admin:</span> {adminAddress.slice(0, 10)}...</div>
            </div>
          </Card>

          <div className="flex gap-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setStep('configure')}
              disabled={deploying}
            >
              <ArrowLeft className="mr-2 w-4 h-4" /> Back
            </Button>
            <Button
              className="flex-1 gradient-primary shadow-glow"
              onClick={handleDeploy}
              disabled={deploying || !network}
            >
              {deploying ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Deploying...
                </>
              ) : (
                'Deploy EVVM'
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
