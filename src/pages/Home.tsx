import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, Rocket, Database, Shield, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen gradient-hero">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="animate-float inline-block mb-6">
          <div className="p-4 rounded-full gradient-primary shadow-glow">
            <Rocket className="w-16 h-16" />
          </div>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold mb-6 text-gradient">
          Deploy Your EVVM
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
          Create and manage your own Ethereum Virtual Machines on Sepolia, Arbitrum, and Story Protocol
        </p>
        
        <div className="flex gap-4 justify-center flex-wrap">
          {isConnected ? (
            <Link to="/deploy">
              <Button size="lg" className="gradient-primary shadow-glow text-lg px-8">
                Start Deploying <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          ) : (
            <Button size="lg" className="gradient-primary shadow-glow text-lg px-8" disabled>
              Connect Wallet First
            </Button>
          )}
          
          <Link to="/registry">
            <Button size="lg" variant="outline" className="text-lg px-8">
              View Registry
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="glass-card p-6 hover:shadow-glow transition-all group">
            <div className="p-3 rounded-lg gradient-primary w-fit mb-4 group-hover:scale-110 transition-transform">
              <Rocket className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Easy Deployment</h3>
            <p className="text-muted-foreground">
              Deploy your EVVM in minutes with our intuitive wizard
            </p>
          </Card>

          <Card className="glass-card p-6 hover:shadow-glow transition-all group">
            <div className="p-3 rounded-lg gradient-primary w-fit mb-4 group-hover:scale-110 transition-transform">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Multi-Chain</h3>
            <p className="text-muted-foreground">
              Deploy on Ethereum Sepolia, Arbitrum Sepolia, or Story
            </p>
          </Card>

          <Card className="glass-card p-6 hover:shadow-glow transition-all group">
            <div className="p-3 rounded-lg gradient-primary w-fit mb-4 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Secure & Verified</h3>
            <p className="text-muted-foreground">
              All contracts are verified and secured
            </p>
          </Card>

          <Card className="glass-card p-6 hover:shadow-glow transition-all group">
            <div className="p-3 rounded-lg gradient-primary w-fit mb-4 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Fast Registry</h3>
            <p className="text-muted-foreground">
              Register and manage your EVVMs effortlessly
            </p>
          </Card>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="glass-card p-12">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-gradient mb-2 animate-pulse-glow">3</div>
              <div className="text-muted-foreground">Supported Networks</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-gradient mb-2 animate-pulse-glow">100%</div>
              <div className="text-muted-foreground">Decentralized</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-gradient mb-2 animate-pulse-glow">∞</div>
              <div className="text-muted-foreground">Possibilities</div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
