import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { ExternalLink, Database, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PublicEVVMBrowser } from '@/components/PublicEVVMBrowser';

interface Deployment {
  id: string;
  evvm_name: string;
  principal_token_name: string;
  principal_token_symbol: string;
  host_chain_name: string;
  deployment_status: string;
  deployment_tx_hash: string | null;
  registry_tx_hash: string | null;
  evvm_core_address: string | null;
  name_service_address: string | null;
  staking_address: string | null;
  estimator_address: string | null;
  treasury_address: string | null;
  evvm_id: number | null;
  created_at: string;
}

export default function Registry() {
  const { address, isConnected } = useAccount();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isConnected && address) {
      fetchDeployments();
    } else {
      setLoading(false);
    }
  }, [address, isConnected]);

  const fetchDeployments = async () => {
    if (!address) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('evvm_deployments')
        .select('*')
        .eq('user_id', address.toLowerCase())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeployments(data || []);
    } catch (error) {
      console.error('Error fetching deployments:', error);
      toast.error('Failed to load deployments');
    } finally {
      setLoading(false);
    }
  };

  const getExplorerUrl = (chainName: string, txHash: string) => {
    const explorers: Record<string, string> = {
      'Sepolia': `https://sepolia.etherscan.io/tx/${txHash}`,
      'Arbitrum Sepolia': `https://sepolia.arbiscan.io/tx/${txHash}`,
      'Story Testnet': `https://aeneid.storyscan.io/tx/${txHash}`,
    };
    return explorers[chainName] || '#';
  };

  const getRegistryExplorerUrl = (txHash: string) => {
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      deploying: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      completed: 'bg-green-500/20 text-green-300 border-green-500/30',
      failed: 'bg-red-500/20 text-red-300 border-red-500/30',
    };
    return colors[status] || colors.pending;
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <Card className="glass-card p-8 max-w-md text-center">
          <div className="p-4 rounded-full gradient-primary shadow-glow w-fit mx-auto mb-4">
            <Database className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-6">
            Please connect your wallet to view your deployments
          </p>
          <Link to="/">
            <Button className="gradient-primary">Go to Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gradient mb-4">EVVM Registry</h1>
          <p className="text-muted-foreground text-lg">
            Connect to existing EVVMs or view your deployments
          </p>
        </div>

        <Tabs defaultValue="public" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="public">Public EVVMs</TabsTrigger>
            <TabsTrigger value="mydeployments">My Deployments</TabsTrigger>
          </TabsList>

          <TabsContent value="public">
            <PublicEVVMBrowser />
          </TabsContent>

          <TabsContent value="mydeployments">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : deployments.length === 0 ? (
          <Card className="glass-card p-12 text-center">
            <Database className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-bold mb-2">No Deployments Yet</h3>
            <p className="text-muted-foreground mb-6">
              You haven't deployed any EVVMs yet
            </p>
            <Link to="/deploy">
              <Button className="gradient-primary">Deploy Your First EVVM</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-6">
            {deployments.map((deployment) => (
              <Card key={deployment.id} className="glass-card p-6 hover:shadow-glow transition-all">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <h3 className="text-xl font-bold">{deployment.evvm_name}</h3>
                      <Badge className={getStatusColor(deployment.deployment_status)}>
                        {deployment.deployment_status}
                      </Badge>
                      {deployment.evvm_id !== null && (
                        <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10 font-bold">
                          EVVM ID: {deployment.evvm_id}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
                      <div>
                        <span className="text-muted-foreground">Token:</span>{' '}
                        <span className="font-medium">
                          {deployment.principal_token_name} ({deployment.principal_token_symbol})
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Network:</span>{' '}
                        <span className="font-medium">{deployment.host_chain_name}</span>
                      </div>
                    </div>

                    {/* Contract Addresses */}
                    {(deployment.evvm_core_address || deployment.name_service_address || 
                      deployment.staking_address || deployment.estimator_address || 
                      deployment.treasury_address) && (
                      <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Contract Addresses</h4>
                        <div className="grid gap-2 text-xs">
                          {deployment.evvm_core_address && (
                            <div>
                              <span className="text-muted-foreground">EVVM Core:</span>{' '}
                              <code className="bg-muted px-2 py-1 rounded font-mono text-xs">
                                {deployment.evvm_core_address}
                              </code>
                            </div>
                          )}
                          {deployment.name_service_address && (
                            <div>
                              <span className="text-muted-foreground">Name Service:</span>{' '}
                              <code className="bg-muted px-2 py-1 rounded font-mono text-xs">
                                {deployment.name_service_address}
                              </code>
                            </div>
                          )}
                          {deployment.staking_address && (
                            <div>
                              <span className="text-muted-foreground">Staking:</span>{' '}
                              <code className="bg-muted px-2 py-1 rounded font-mono text-xs">
                                {deployment.staking_address}
                              </code>
                            </div>
                          )}
                          {deployment.estimator_address && (
                            <div>
                              <span className="text-muted-foreground">Estimator:</span>{' '}
                              <code className="bg-muted px-2 py-1 rounded font-mono text-xs">
                                {deployment.estimator_address}
                              </code>
                            </div>
                          )}
                          {deployment.treasury_address && (
                            <div>
                              <span className="text-muted-foreground">Treasury:</span>{' '}
                              <code className="bg-muted px-2 py-1 rounded font-mono text-xs">
                                {deployment.treasury_address}
                              </code>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    {deployment.deployment_tx_hash && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(getExplorerUrl(deployment.host_chain_name, deployment.deployment_tx_hash!), '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Deployment Tx
                      </Button>
                    )}
                    {deployment.registry_tx_hash && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(getRegistryExplorerUrl(deployment.registry_tx_hash!), '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Registry Tx
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
