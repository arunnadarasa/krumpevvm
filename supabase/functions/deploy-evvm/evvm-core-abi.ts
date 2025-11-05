// EVVM Core Contract ABI - Placeholder for actual contract ABI
// This will need to be updated with the real ABI from your contract compilation
export const EVVM_CORE_ABI = [
  {
    type: 'constructor',
    inputs: [
      { name: 'tokenName', type: 'string' },
      { name: 'tokenSymbol', type: 'string' },
      { name: 'totalSupply', type: 'uint256' },
      { name: 'admin', type: 'address' },
    ],
  },
  {
    type: 'function',
    name: 'initialize',
    inputs: [
      { name: 'goldenFisher', type: 'address' },
      { name: 'activator', type: 'address' },
      { name: 'eraTokens', type: 'uint256' },
      { name: 'rewardPerOperation', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

// Placeholder bytecode - needs to be replaced with actual compiled bytecode
export const EVVM_CORE_BYTECODE = '0x' as `0x${string}`;
