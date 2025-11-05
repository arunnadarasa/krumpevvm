# EVVM Deployer & Registry

A production-ready Web3 application for deploying and managing Ethereum Virtual Machines (EVVMs) with integrated MetaMask support.

## 🚀 Features

- **Multi-Chain Support**: Deploy on Ethereum Sepolia, Arbitrum Sepolia, and Story Protocol
- **MetaMask Integration**: Full wallet connection via RainbowKit
- **Deployment Wizard**: Step-by-step EVVM deployment process
- **Registry Management**: View and track all your EVVM deployments
- **Real Blockchain Transactions**: Production-ready contract interactions
- **Lovable Cloud Backend**: Automatic database and edge functions

## 🛠️ Technology Stack

### Frontend
- React 18.3.1 with TypeScript
- Vite for blazing-fast builds
- Tailwind CSS with custom design system
- shadcn/ui component library

### Web3 Integration
- Wagmi 2.19.2 - React hooks for Ethereum
- Viem 2.38.6 - TypeScript Ethereum library
- RainbowKit 2.2.9 - Beautiful wallet connection UI

### Backend (Lovable Cloud)
- Supabase PostgreSQL database with Row Level Security
- Edge Functions for blockchain interactions
- Automated deployment tracking

## 📦 Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

## 🌐 Supported Networks

- **Ethereum Sepolia** (Chain ID: 11155111)
- **Arbitrum Sepolia** (Chain ID: 421614)
- **Story Testnet** (Chain ID: 1315)
- **Story Mainnet** (Chain ID: 1514)

## 🎨 Design System

The app features a futuristic blockchain theme with:
- Deep blues and purples for the background
- Vibrant primary colors (purple #A855F7)
- Cyan accents for highlights
- Glassmorphic cards with backdrop blur
- Smooth animations and transitions

## 🔐 Security

- Row Level Security (RLS) on all database tables
- Wallet-based authentication
- Input validation on all forms
- Secure edge function endpoints

## 📝 Usage

1. **Connect Wallet**: Click "Connect Wallet" to link your MetaMask
2. **Deploy EVVM**: Navigate to Deploy and follow the wizard
3. **View Registry**: Check your deployments in the Registry

## 🚀 Deployment

Deploy via Lovable:
1. Open [Lovable](https://lovable.dev/projects/46e04628-cab2-44b0-aa35-5954e550bbc6)
2. Click Share → Publish

## 📚 Documentation

- [Lovable Docs](https://docs.lovable.dev/)
- [Wagmi Docs](https://wagmi.sh/)
- [RainbowKit Docs](https://www.rainbowkit.com/)

## 🤝 Contributing

This is a Lovable project. To contribute:
1. Make changes via Lovable or your IDE
2. Commit and push changes
3. Changes sync automatically

## 📄 License

EVVM Noncommercial License v1.0

For commercial licensing, contact g@evvm.org
