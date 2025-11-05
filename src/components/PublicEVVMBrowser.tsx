import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Network, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Registry contract on Ethereum Sepolia
const REGISTRY_ADDRESS = '0x389dC8fb09211bbDA841D59f4a51160dA2377832' as const;
const REGISTRY_ABI = [
  {
    type: 'function',
    name: 'getPublicEvvmIdActive',
    inputs: [],
    outputs: [{ name: 'evvmIds', type: 'uint256[]' }],
    stateMutability: 'view',
  },
] as const;

interface EVVMMetadata {
  chainId: bigint;
  evvmAddress: string;
}

interface PublicEVVM {
  evvmId: number;
  metadata: EVVMMetadata | null;
  isConnected: boolean;
}

// Pre-deployed EVVM instances
const KNOWN_EVVMS = [
  {
    chainId: 11155111,
    evvmAddress: '0x5c66EB3CAAD38851C9c6291D77510b0Eaa8B3c84',
    name: 'Official Sepolia EVVM',
    description: 'Production-ready EVVM instance on Ethereum Sepolia testnet'
  },
  {
    chainId: 421614,
    evvmAddress: '0xaBee6F8014468e88035041E94d530838d2ce025C',
    name: 'Official Arbitrum Sepolia EVVM',
    description: 'Production-ready EVVM instance on Arbitrum Sepolia testnet'
  }
];

export function PublicEVVMBrowser() {
  const { address, isConnected } = useAccount();
  const [evvms, setEvvms] = useState<PublicEVVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<number | null>(null);

  // Fetch public EVVM IDs from Registry
  const { data: publicEvvmIds } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: 'getPublicEvvmIdActive',
    chainId: 11155111, // Registry is on Sepolia
  });

  useEffect(() => {
    if (isConnected && address) {
      loadEVVMs();
    } else {
      setLoading(false);
    }
  }, [address, isConnected, publicEvvmIds]);

  const loadEVVMs = async () => {
    setLoading(true);
    try {
      // Load user's connected EVVMs from database
      const { data: userDeployments } = await supabase
        .from('evvm_deployments')
        .select('evvm_core_address, host_chain_id')
        .eq('user_id', address!.toLowerCase());

      const connectedAddresses = new Set(
        userDeployments?.map(d => d.evvm_core_address?.toLowerCase()) || []
      );

      // Map known EVVMs with connection status
      const knownEvvmsList = KNOWN_EVVMS.map((evvm, idx) => ({
        evvmId: 1000 + idx, // Placeholder IDs
        metadata: {
          chainId: BigInt(evvm.chainId),
          evvmAddress: evvm.evvmAddress
        },
        isConnected: connectedAddresses.has(evvm.evvmAddress.toLowerCase()),
        name: evvm.name,
        description: evvm.description
      }));

      setEvvms(knownEvvmsList as any);
    } catch (error) {
      console.error('Error loading EVVMs:', error);
      toast.error('Failed to load EVVMs');
    } finally {
      setLoading(false);
    }
  };

  const connectToEVVM = async (evvm: any) => {
    if (!address) return;
    
    setConnecting(evvm.evvmId);
    try {
      const chainId = Number(evvm.metadata.chainId);
      const chainName = chainId === 11155111 ? 'Sepolia' : 
                       chainId === 421614 ? 'Arbitrum Sepolia' : 
                       'Unknown';

      // Save connection to database
      const { error } = await supabase
        .from('evvm_deployments')
        .insert({
          user_id: address.toLowerCase(),
          evvm_name: evvm.name || `Public EVVM ${evvm.evvmId}`,
          principal_token_name: 'Mate token',
          principal_token_symbol: 'MATE',
          host_chain_name: chainName,
          host_chain_id: chainId,
          admin_address: address,
          golden_fisher_address: address,
          activator_address: address,
          evvm_core_address: evvm.metadata.evvmAddress,
          deployment_status: 'completed',
          evvm_id: evvm.evvmId
        });

      if (error) throw error;

      toast.success(`Connected to ${evvm.name || 'EVVM'}`);
      loadEVVMs();
    } catch (error: any) {
      console.error('Error connecting to EVVM:', error);
      toast.error(error.message || 'Failed to connect to EVVM');
    } finally {
      setConnecting(null);
    }
  };

  const getChainName = (chainId: bigint) => {
    const id = Number(chainId);
    if (id === 11155111) return 'Ethereum Sepolia';
    if (id === 421614) return 'Arbitrum Sepolia';
    if (id === 1315) return 'Story Testnet';
    return `Chain ${id}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gradient mb-2">Public EVVMs</h2>
        <p className="text-muted-foreground">
          Connect to production-ready EVVM instances on testnets
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {evvms.map((evvm: any) => (
          <Card key={evvm.evvmId} className="glass-card hover:shadow-glow transition-all">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Network className="w-5 h-5 text-primary" />
                  <CardTitle className="text-xl">{evvm.name}</CardTitle>
                </div>
                {evvm.isConnected && (
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                )}
              </div>
              <CardDescription>{evvm.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Network:</span>{' '}
                  <span className="font-medium">
                    {evvm.metadata && getChainName(evvm.metadata.chainId)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">EVVM Address:</span>{' '}
                  <code className="bg-muted px-2 py-1 rounded font-mono text-xs block mt-1 break-all">
                    {evvm.metadata?.evvmAddress}
                  </code>
                </div>
              </div>

              <Button
                onClick={() => connectToEVVM(evvm)}
                disabled={!isConnected || evvm.isConnected || connecting === evvm.evvmId}
                className="w-full gradient-primary"
              >
                {connecting === evvm.evvmId ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : evvm.isConnected ? (
                  'Already Connected'
                ) : (
                  'Connect to this EVVM'
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
