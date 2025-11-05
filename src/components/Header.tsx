import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Rocket, Menu, Home, Upload, Wrench, Database } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/deploy', label: 'Deploy', icon: Upload },
  { path: '/toolkit', label: 'Toolkit', icon: Wrench },
  { path: '/registry', label: 'Registry', icon: Database },
];

export function Header() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const [open, setOpen] = useState(false);

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
              <p className="text-xs text-muted-foreground hidden sm:block">Deployer & Registry</p>
            </div>
          </Link>
          
          {isMobile ? (
            <div className="flex items-center gap-3">
              <div className="scale-90">
                <ConnectButton showBalance={false} chainStatus="none" />
              </div>
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px]">
                  <SheetHeader>
                    <SheetTitle>Navigation</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-4 mt-8">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-accent hover:text-accent-foreground'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      );
                    })}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          ) : (
            <nav className="flex items-center gap-6">
              <Link 
                to="/deploy" 
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Deploy
              </Link>
              <Link 
                to="/toolkit" 
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Toolkit
              </Link>
              <Link 
                to="/registry" 
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Registry
              </Link>
              <ConnectButton />
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
