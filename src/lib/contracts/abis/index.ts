/**
 * EVVM Contract ABIs
 * 
 * These ABIs are extracted from @evvm/testnet-contracts package
 * and provide interfaces for deploying and interacting with EVVM contracts.
 * 
 * NOTE: Bytecode needs to be added from compiled contract artifacts
 * to enable actual deployment functionality.
 */

// TODO: Import from @evvm/testnet-contracts when bytecode is available
// For now, these are placeholder structures

export const EVVM_CORE_ABI = [
  {
    type: 'constructor',
    inputs: [
      { name: 'tokenName', type: 'string' },
      { name: 'tokenSymbol', type: 'string' },
      { name: 'totalSupply', type: 'uint256' },
      { name: 'admin', type: 'address' }
    ]
  },
  {
    type: 'function',
    name: 'initialize',
    inputs: [
      { name: 'goldenFisher', type: 'address' },
      { name: 'activator', type: 'address' },
      { name: 'eraTokens', type: 'uint256' },
      { name: 'rewardPerOperation', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  }
] as const;

export const NAME_SERVICE_ABI = [
  {
    type: 'constructor',
    inputs: [
      { name: 'evvmCore', type: 'address' }
    ]
  }
] as const;

export const STAKING_ABI = [
  {
    type: 'constructor',
    inputs: [
      { name: 'evvmCore', type: 'address' }
    ]
  }
] as const;

export const ESTIMATOR_ABI = [
  {
    type: 'constructor',
    inputs: [
      { name: 'evvmCore', type: 'address' },
      { name: 'staking', type: 'address' }
    ]
  }
] as const;

export const TREASURY_ABI = [
  {
    type: 'constructor',
    inputs: [
      { name: 'evvmCore', type: 'address' }
    ]
  }
] as const;

// Bytecode placeholders - need to be replaced with actual compiled bytecode
export const EVVM_CORE_BYTECODE = '0x' as `0x${string}`;
export const NAME_SERVICE_BYTECODE = '0x' as `0x${string}`;
export const STAKING_BYTECODE = '0x' as `0x${string}`;
export const ESTIMATOR_BYTECODE = '0x' as `0x${string}`;
export const TREASURY_BYTECODE = '0x' as `0x${string}`;
