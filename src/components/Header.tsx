import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="border-b border-border/50 backdrop-blur-xl bg-background/80 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="p-2 rounded-lg gradient-primary shadow-glow group-hover:scale-110 transition-transform">
              <Rocket className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gradient">EVVM</h1>
              <p className="text-xs text-muted-foreground">Deployer & Registry</p>
            </div>
          </Link>
          
          <nav className="flex items-center gap-6">
            <Link 
              to="/deploy" 
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Deploy
            </Link>
            <Link 
              to="/registry" 
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Registry
            </Link>
            <ConnectButton />
          </nav>
        </div>
      </div>
    </header>
  );
}
