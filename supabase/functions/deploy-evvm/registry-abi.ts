// Registry Contract ABI for Ethereum Sepolia
// Will be updated with actual registry contract details

export const REGISTRY_ABI = [
  {
    type: 'function',
    name: 'registerEVVM',
    inputs: [
      { name: 'evvmCore', type: 'address' },
      { name: 'chainId', type: 'uint256' },
      { name: 'metadata', type: 'bytes' },
    ],
    outputs: [{ name: 'evvmId', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'EVVMRegistered',
    inputs: [
      { name: 'evvmId', type: 'uint256', indexed: true },
      { name: 'evvmCore', type: 'address', indexed: false },
      { name: 'chainId', type: 'uint256', indexed: false },
    ],
  },
] as const;

// Registry contract address on Ethereum Sepolia - PLACEHOLDER
export const REGISTRY_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`;
