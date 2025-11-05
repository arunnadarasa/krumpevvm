// EVVM Contract ABIs for different function categories

export const FAUCET_ABI = [
  {
    name: 'faucet',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'tokenAddress', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'getBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'tokenAddress', type: 'address' }
    ],
    outputs: [{ type: 'uint256' }]
  }
] as const;

export const PAYMENT_ABI = [
  {
    name: 'singlePayment',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'tokenAddress', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'priorityFee', type: 'uint256' },
      { name: 'executor', type: 'address' },
      { name: 'nonceType', type: 'uint8' },
      { name: 'nonce', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'dispersePayment',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenAddress', type: 'address' },
      { name: 'recipients', type: 'address[]' },
      { name: 'amounts', type: 'uint256[]' },
      { name: 'priorityFee', type: 'uint256' },
      { name: 'executor', type: 'address' },
      { name: 'nonceType', type: 'uint8' },
      { name: 'nonce', type: 'bytes32' }
    ],
    outputs: []
  }
] as const;

export const STAKING_ABI = [
  {
    name: 'goldenStake',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'action', type: 'uint8' },
      { name: 'amount', type: 'uint256' },
      { name: 'nonceType', type: 'uint8' },
      { name: 'nonce', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'presaleStake',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'action', type: 'uint8' },
      { name: 'stakingNonce', type: 'uint256' },
      { name: 'priorityFee', type: 'uint256' },
      { name: 'nonceType', type: 'uint8' },
      { name: 'evvmNonce', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'publicStake',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'action', type: 'uint8' },
      { name: 'stakingNonce', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'priorityFee', type: 'uint256' },
      { name: 'nonceType', type: 'uint8' },
      { name: 'evvmNonce', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'serviceStake',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'serviceAddress', type: 'address' },
      { name: 'stakingNonce', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'priorityFee', type: 'uint256' },
      { name: 'nonceType', type: 'uint8' },
      { name: 'evvmNonce', type: 'bytes32' }
    ],
    outputs: []
  }
] as const;

export const NAME_SERVICE_ABI = [
  {
    name: 'preRegisterUsername',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'clowNumber', type: 'uint256' },
      { name: 'username', type: 'string' },
      { name: 'priorityFee', type: 'uint256' },
      { name: 'nameServiceNonce', type: 'uint256' },
      { name: 'nonceType', type: 'uint8' },
      { name: 'evvmNonce', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'registerUsername',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'nameServiceNonce', type: 'uint256' },
      { name: 'clowNumber', type: 'uint256' },
      { name: 'username', type: 'string' },
      { name: 'priorityFee', type: 'uint256' },
      { name: 'nonceType', type: 'uint8' },
      { name: 'evvmNonce', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'makeOfferUsername',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'nameServiceNonce', type: 'uint256' },
      { name: 'username', type: 'string' },
      { name: 'offerAmount', type: 'uint256' },
      { name: 'expirationDate', type: 'uint256' },
      { name: 'priorityFee', type: 'uint256' },
      { name: 'nonceType', type: 'uint8' },
      { name: 'evvmNonce', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'withdrawOfferUsername',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'nameServiceNonce', type: 'uint256' },
      { name: 'username', type: 'string' },
      { name: 'offerId', type: 'uint256' },
      { name: 'priorityFee', type: 'uint256' },
      { name: 'nonceType', type: 'uint8' },
      { name: 'evvmNonce', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'acceptOfferUsername',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'nameServiceNonce', type: 'uint256' },
      { name: 'username', type: 'string' },
      { name: 'offerId', type: 'uint256' },
      { name: 'priorityFee', type: 'uint256' },
      { name: 'nonceType', type: 'uint8' },
      { name: 'evvmNonce', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'renewUsername',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'nameServiceNonce', type: 'uint256' },
      { name: 'username', type: 'string' },
      { name: 'renewalCost', type: 'uint256' },
      { name: 'priorityFee', type: 'uint256' },
      { name: 'nonceType', type: 'uint8' },
      { name: 'evvmNonce', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'addCustomMetadata',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'nameServiceNonce', type: 'uint256' },
      { name: 'identity', type: 'string' },
      { name: 'schema', type: 'string' },
      { name: 'subschema', type: 'string' },
      { name: 'value', type: 'string' },
      { name: 'priorityFee', type: 'uint256' },
      { name: 'nonceType', type: 'uint8' },
      { name: 'evvmNonce', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'removeCustomMetadata',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'nameServiceNonce', type: 'uint256' },
      { name: 'identity', type: 'string' },
      { name: 'key', type: 'string' },
      { name: 'priorityFee', type: 'uint256' },
      { name: 'nonceType', type: 'uint8' },
      { name: 'evvmNonce', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'flushCustomMetadata',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'nameServiceNonce', type: 'uint256' },
      { name: 'identity', type: 'string' },
      { name: 'priorityFee', type: 'uint256' },
      { name: 'nonceType', type: 'uint8' },
      { name: 'evvmNonce', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'deleteUsername',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'nameServiceNonce', type: 'uint256' },
      { name: 'identity', type: 'string' },
      { name: 'priorityFee', type: 'uint256' },
      { name: 'nonceType', type: 'uint8' },
      { name: 'evvmNonce', type: 'bytes32' }
    ],
    outputs: []
  }
] as const;
