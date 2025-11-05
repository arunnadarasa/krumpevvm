// Registry Contract ABI for Ethereum Sepolia
// Will be updated with actual registry contract details

export const REGISTRY_ABI = [
  {
    type: 'function',
    name: 'registerEvvm',
    inputs: [
      { name: 'chainId', type: 'uint256' },
      { name: 'evvmAddress', type: 'address' },
    ],
    outputs: [{ name: 'evvmId', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getEvvmIdMetadata',
    inputs: [{ name: 'evvmId', type: 'uint256' }],
    outputs: [
      {
        name: 'metadata',
        type: 'tuple',
        components: [
          { name: 'chainId', type: 'uint256' },
          { name: 'evvmAddress', type: 'address' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPublicEvvmIdActive',
    inputs: [],
    outputs: [{ name: 'evvmIds', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isChainIdRegistered',
    inputs: [{ name: 'chainId', type: 'uint256' }],
    outputs: [{ name: 'registered', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isAddressRegistered',
    inputs: [
      { name: 'chainId', type: 'uint256' },
      { name: 'evvmAddress', type: 'address' },
    ],
    outputs: [{ name: 'registered', type: 'bool' }],
    stateMutability: 'view',
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

// Registry contract address on Ethereum Sepolia
export const REGISTRY_ADDRESS = '0x389dC8fb09211bbDA841D59f4a51160dA2377832' as `0x${string}`;
