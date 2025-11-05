import { DeploymentWizard } from '@/components/DeploymentWizard';
import { Card } from '@/components/ui/card';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Wallet } from 'lucide-react';

export default function Deploy() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <Card className="glass-card p-8 max-w-md text-center">
          <div className="p-4 rounded-full gradient-primary shadow-glow w-fit mx-auto mb-4">
            <Wallet className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-6">
            Please connect your wallet to deploy an EVVM
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
          <h1 className="text-4xl font-bold text-gradient mb-4">Deploy Your EVVM</h1>
          <p className="text-muted-foreground text-lg">
            Follow the steps below to deploy your Ethereum Virtual Machine
          </p>
        </div>
        <DeploymentWizard />
      </div>
    </div>
  );
}
