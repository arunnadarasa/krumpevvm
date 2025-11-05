import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arbitrumSepolia, sepolia, mainnet } from 'wagmi/chains';
import { http } from 'wagmi';

// Story Protocol chains
export const storyTestnet = {
  id: 1315,
  name: 'Story Testnet (Aeneid)',
  nativeCurrency: { name: 'IP', symbol: 'IP', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://aeneid.storyrpc.io'] },
    public: { http: ['https://aeneid.storyrpc.io'] },
  },
  blockExplorers: {
    default: { name: 'Story Explorer', url: 'https://aeneid.explorer.story.foundation' },
  },
  testnet: true,
} as const;

export const storyMainnet = {
  id: 1514,
  name: 'Story Mainnet',
  nativeCurrency: { name: 'IP', symbol: 'IP', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://mainnet.storyrpc.io'] },
    public: { http: ['https://mainnet.storyrpc.io'] },
  },
  blockExplorers: {
    default: { name: 'Story Explorer', url: 'https://explorer.story.foundation' },
  },
  testnet: false,
} as const;

export const config = getDefaultConfig({
  appName: 'EVVM Deployer',
  projectId: 'a5ca7e54679de3a0f15c284bb26f428d', // Reown Project ID
  chains: [sepolia, arbitrumSepolia, storyTestnet, storyMainnet, mainnet],
  ssr: false,
  transports: {
    [sepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
    [storyTestnet.id]: http(),
    [storyMainnet.id]: http(),
    [mainnet.id]: http(),
  },
});
