import { Address, Hash, PublicClient, WalletClient, isAddress, formatEther, parseEther, encodeFunctionData } from 'viem';
import {
  EVVM_CORE_ABI,
  EVVM_CORE_BYTECODE,
  NAME_SERVICE_ABI,
  NAME_SERVICE_BYTECODE,
  STAKING_ABI,
  STAKING_BYTECODE,
  ESTIMATOR_ABI,
  ESTIMATOR_BYTECODE,
  TREASURY_ABI,
  TREASURY_BYTECODE
} from './abis';

export interface EVVMDeploymentParams {
  // Administrator addresses
  adminAddress: Address;
  goldenFisherAddress: Address;
  activatorAddress: Address;
  
  // EVVM Metadata
  evvmName: string;
  principalTokenName: string;
  principalTokenSymbol: string;
  totalSupply: bigint;
  eraTokens: bigint;
  rewardPerOperation: bigint;
  
  // Network configuration
  chainId: number;
  
  // Viem clients
  walletClient: WalletClient;
  publicClient: PublicClient;
}

export interface EVVMDeploymentResult {
  evvmCoreAddress: Address;
  nameServiceAddress: Address;
  stakingAddress: Address;
  estimatorAddress: Address;
  treasuryAddress: Address;
  deploymentTxHash: Hash;
}

export type DeploymentStage = 
  | 'deploying-staking'      // 1/7
  | 'deploying-core'         // 2/7
  | 'deploying-nameservice'  // 3/7
  | 'deploying-estimator'    // 4/7
  | 'deploying-treasury'     // 5/7
  | 'setup-evvm'             // 6/7
  | 'setup-staking'          // 7/7
  | 'registering'
  | 'complete';

export interface DeploymentProgress {
  stage: DeploymentStage;
  message: string;
  txHash?: Hash;
}

/**
 * Performs pre-flight checks before deployment
 */
async function performPreFlightChecks(
  walletClient: WalletClient,
  publicClient: PublicClient,
  params: EVVMDeploymentParams
): Promise<{ success: boolean; issues: string[] }> {
  const issues: string[] = [];
  
  // Check 1: Sufficient balance
  try {
    const balance = await publicClient.getBalance({
      address: walletClient.account!.address
    });
    
    const requiredBalance = parseEther('0.15'); // ~0.15 ETH for deployment
    if (balance < requiredBalance) {
      issues.push(`Insufficient balance. You have ${formatEther(balance)} ETH but need ~0.15 ETH`);
    }
  } catch (error) {
    issues.push('Failed to check wallet balance');
  }
  
  // Check 2: Network connectivity
  try {
    await publicClient.getBlockNumber();
  } catch (error) {
    issues.push('Cannot connect to blockchain network');
  }
  
  // Check 3: Valid addresses
  if (!isAddress(params.adminAddress)) {
    issues.push('Invalid admin address');
  }
  if (!isAddress(params.goldenFisherAddress)) {
    issues.push('Invalid golden fisher address');
  }
  if (!isAddress(params.activatorAddress)) {
    issues.push('Invalid activator address');
  }
  
  return {
    success: issues.length === 0,
    issues
  };
}

/**
 * Estimates gas needed for contract deployment
 */
async function estimateDeploymentGas(
  publicClient: PublicClient,
  params: { abi: any; bytecode: `0x${string}`; args: any[] }
): Promise<bigint> {
  try {
    const deployData = encodeFunctionData({
      abi: params.abi,
      args: params.args
    });
    
    // Estimate gas with full deployment bytecode
    const estimate = await publicClient.estimateGas({
      data: `${params.bytecode}${deployData.slice(2)}` as `0x${string}`
    });
    
    // Add 30% buffer for safety
    return (estimate * 130n) / 100n;
  } catch (error) {
    console.warn('Gas estimation failed, using fallback', error);
    // Fallback for large contracts
    return 12_000_000n; // 12M gas
  }
}

/**
 * Checks if a contract was deployed in recent blocks
 */
async function checkPendingDeployment(
  publicClient: PublicClient,
  fromAddress: Address
): Promise<{ contractAddress: Address } | null> {
  try {
    const latestBlock = await publicClient.getBlockNumber();
    
    for (let i = 0n; i < 10n; i++) {
      const block = await publicClient.getBlock({ 
        blockNumber: latestBlock - i,
        includeTransactions: true 
      });
      
      if (!block.transactions) continue;
      
      for (const tx of block.transactions) {
        if (typeof tx !== 'string' && 
            tx.from.toLowerCase() === fromAddress.toLowerCase() &&
            !tx.to) { // Contract creation
          const receipt = await publicClient.getTransactionReceipt({ 
            hash: tx.hash 
          });
          
          if (receipt.contractAddress) {
            return { contractAddress: receipt.contractAddress };
          }
        }
      }
    }
  } catch (error) {
    console.warn('Failed to check pending deployments:', error);
  }
  
  return null;
}

/**
 * Deploys a contract with retry logic and exponential backoff
 */
async function deployContractWithRetry(
  walletClient: WalletClient,
  publicClient: PublicClient,
  params: {
    abi: any;
    bytecode: `0x${string}`;
    args: any[];
  },
  onProgress?: (txHash: Hash) => void,
  maxRetries: number = 3
): Promise<Address> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Deployment attempt ${attempt}/${maxRetries}`);
      
      return await deployContract(walletClient, publicClient, params, onProgress);
      
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt} failed:`, error);
      
      // Check if it's a user rejection - don't retry
      if (error instanceof Error && 
          (error.message.includes('User rejected') || 
           error.message.includes('user rejected'))) {
        throw error;
      }
      
      // Check if contract was actually deployed despite error
      const receipt = await checkPendingDeployment(publicClient, walletClient.account!.address);
      if (receipt?.contractAddress) {
        console.log('Found deployed contract despite error:', receipt.contractAddress);
        return receipt.contractAddress;
      }
      
      if (attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Deployment failed after ${maxRetries} attempts: ${lastError?.message}`);
}

/**
 * Deploys all 5 EVVM core contracts in sequence
 * 
 * Deployment order:
 * 1. Staking - Must be first (EVVM Core requires its address)
 * 2. EVVM Core - Requires Staking address and EvvmMetadata
 * 3. NameService - Requires EVVM Core address
 * 4. Estimator - Requires EVVM Core and Staking addresses
 * 5. Treasury - Requires EVVM Core address
 * 
 * After deployment, two setup transactions are required:
 * - EVVM Core: Connect NameService and Treasury
 * - Staking: Connect Estimator and EVVM
 */
export async function deployEVVMContracts(
  params: EVVMDeploymentParams,
  onProgress?: (progress: DeploymentProgress) => void
): Promise<EVVMDeploymentResult> {
  const { walletClient, publicClient } = params;
  
  // PHASE 6: Pre-flight checks
  console.log('Running pre-flight checks...');
  const preFlightResult = await performPreFlightChecks(walletClient, publicClient, params);
  
  if (!preFlightResult.success) {
    throw new Error(`Pre-flight checks failed:\n${preFlightResult.issues.join('\n')}`);
  }
  
  // PHASE 3: Get starting nonce for explicit nonce management
  let currentNonce = await publicClient.getTransactionCount({
    address: walletClient.account!.address,
    blockTag: 'pending'
  });
  
  console.log('Starting deployment with nonce:', currentNonce);
  
  try {
    // STEP 1: Deploy Staking (must be first!)
    onProgress?.({
      stage: 'deploying-staking',
      message: 'Deploying Staking contract (1/5)...'
    });
    
    let txHash: Hash | undefined;
    const stakingAddress = await deployContractWithRetry(
      walletClient,
      publicClient,
      {
        abi: STAKING_ABI,
        bytecode: STAKING_BYTECODE,
        args: [
          params.adminAddress,
          params.goldenFisherAddress
        ]
      },
      (hash) => {
        txHash = hash;
        onProgress?.({
          stage: 'deploying-staking',
          message: 'Deploying Staking contract (1/5)...',
          txHash: hash
        });
      }
    );
    
    // Verify nonce incremented
    currentNonce++;
    const actualNonce = await publicClient.getTransactionCount({
      address: walletClient.account!.address,
      blockTag: 'latest'
    });
    
    if (actualNonce < currentNonce) {
      console.warn('Nonce mismatch detected, waiting for synchronization...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // STEP 2: Deploy EVVM Core (requires Staking address)
    onProgress?.({
      stage: 'deploying-core',
      message: 'Deploying EVVM Core contract (2/5)...'
    });
    
    // Construct EvvmMetadata tuple
    const evvmMetadata = {
      EvvmName: params.evvmName,
      EvvmID: 0n, // Will be set later via setEvvmID
      principalTokenName: params.principalTokenName,
      principalTokenSymbol: params.principalTokenSymbol,
      principalTokenAddress: '0x0000000000000000000000000000000000000001', // MATE token placeholder
      totalSupply: params.totalSupply,
      eraTokens: params.eraTokens,
      reward: params.rewardPerOperation
    };
    
    const evvmCoreAddress = await deployContractWithRetry(
      walletClient,
      publicClient,
      {
        abi: EVVM_CORE_ABI,
        bytecode: EVVM_CORE_BYTECODE,
        args: [
          params.adminAddress,
          stakingAddress,
          evvmMetadata
        ]
      },
      (hash) => onProgress?.({
        stage: 'deploying-core',
        message: 'Deploying EVVM Core contract (2/5)...',
        txHash: hash
      })
    );
    
    currentNonce++;
    
    // STEP 3: Deploy NameService
    onProgress?.({
      stage: 'deploying-nameservice',
      message: 'Deploying NameService contract (3/5)...'
    });
    
    const nameServiceAddress = await deployContractWithRetry(
      walletClient,
      publicClient,
      {
        abi: NAME_SERVICE_ABI,
        bytecode: NAME_SERVICE_BYTECODE,
        args: [
          evvmCoreAddress,
          params.adminAddress
        ]
      },
      (hash) => onProgress?.({
        stage: 'deploying-nameservice',
        message: 'Deploying NameService contract (3/5)...',
        txHash: hash
      })
    );
    
    currentNonce++;
    
    // STEP 4: Deploy Estimator
    onProgress?.({
      stage: 'deploying-estimator',
      message: 'Deploying Estimator contract (4/5)...'
    });
    
    const estimatorAddress = await deployContractWithRetry(
      walletClient,
      publicClient,
      {
        abi: ESTIMATOR_ABI,
        bytecode: ESTIMATOR_BYTECODE,
        args: [
          params.activatorAddress,
          evvmCoreAddress,
          stakingAddress,
          params.adminAddress
        ]
      },
      (hash) => onProgress?.({
        stage: 'deploying-estimator',
        message: 'Deploying Estimator contract (4/5)...',
        txHash: hash
      })
    );
    
    currentNonce++;
    
    // STEP 5: Deploy Treasury
    onProgress?.({
      stage: 'deploying-treasury',
      message: 'Deploying Treasury contract (5/5)...'
    });
    
    const treasuryAddress = await deployContractWithRetry(
      walletClient,
      publicClient,
      {
        abi: TREASURY_ABI,
        bytecode: TREASURY_BYTECODE,
        args: [evvmCoreAddress]
      },
      (hash) => onProgress?.({
        stage: 'deploying-treasury',
        message: 'Deploying Treasury contract (5/5)...',
        txHash: hash
      })
    );
    
    currentNonce++;
    
    // STEP 6: Setup NameService and Treasury in EVVM Core
    onProgress?.({
      stage: 'setup-evvm',
      message: 'Connecting NameService and Treasury to EVVM Core...'
    });
    
    const gasPrice = await publicClient.getGasPrice();
    const bufferedGasPrice = (gasPrice * 120n) / 100n;
    
    const setupEvvmTxHash = await walletClient.writeContract({
      address: evvmCoreAddress,
      abi: EVVM_CORE_ABI,
      functionName: '_setupNameServiceAndTreasuryAddress',
      args: [nameServiceAddress, treasuryAddress],
      account: walletClient.account!,
      chain: walletClient.chain,
      gas: 500_000n,
      gasPrice: bufferedGasPrice,
    });
    
    onProgress?.({
      stage: 'setup-evvm',
      message: 'Connecting NameService and Treasury to EVVM Core...',
      txHash: setupEvvmTxHash
    });
    
    await publicClient.waitForTransactionReceipt({ 
      hash: setupEvvmTxHash,
      confirmations: 3,
      timeout: 300_000
    });
    
    currentNonce++;
    
    // STEP 7: Setup Estimator and EVVM in Staking
    onProgress?.({
      stage: 'setup-staking',
      message: 'Connecting Estimator and EVVM to Staking...'
    });
    
    const setupStakingTxHash = await walletClient.writeContract({
      address: stakingAddress,
      abi: STAKING_ABI,
      functionName: '_setupEstimatorAndEvvm',
      args: [estimatorAddress, evvmCoreAddress],
      account: walletClient.account!,
      chain: walletClient.chain,
      gas: 500_000n,
      gasPrice: bufferedGasPrice,
    });
    
    onProgress?.({
      stage: 'setup-staking',
      message: 'Connecting Estimator and EVVM to Staking...',
      txHash: setupStakingTxHash
    });
    
    await publicClient.waitForTransactionReceipt({ 
      hash: setupStakingTxHash,
      confirmations: 3,
      timeout: 300_000
    });
    
    onProgress?.({
      stage: 'complete',
      message: 'EVVM deployment complete!',
      txHash: setupStakingTxHash
    });
    
    return {
      evvmCoreAddress,
      nameServiceAddress,
      stakingAddress,
      estimatorAddress,
      treasuryAddress,
      deploymentTxHash: setupStakingTxHash
    };
    
  } catch (error) {
    console.error('EVVM deployment failed:', error);
    
    // PHASE 4: Better error messages
    let errorMessage = 'Deployment failed';
    
    if (error instanceof Error) {
      if (error.message.includes('User rejected') || error.message.includes('user rejected')) {
        errorMessage = 'Transaction was rejected in MetaMask. Please approve all transactions to complete deployment.';
      } else if (error.message.includes('gas') || error.message.includes('Gas')) {
        errorMessage = 'Transaction ran out of gas. Try increasing gas limit in MetaMask or check if you have enough ETH.';
      } else if (error.message.includes('network') || error.message.includes('Network')) {
        errorMessage = 'Network connection issue. Please check your internet connection and try again.';
      } else if (error.message.includes('dropped') || error.message.includes('replaced')) {
        errorMessage = 'Transaction was dropped or replaced. This usually means gas price was too low. Please try again with higher gas.';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds. You need at least ~0.15 ETH for deployment.';
      } else {
        errorMessage = error.message;
      }
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Deploys a single contract with optimized gas settings
 * PHASE 1: Robust gas estimation and configuration
 */
async function deployContract(
  walletClient: WalletClient,
  publicClient: PublicClient,
  params: {
    abi: any;
    bytecode: `0x${string}`;
    args: any[];
  },
  onProgress?: (txHash: Hash) => void
): Promise<Address> {
  console.log('Deploying contract with args:', params.args);
  
  // Get current gas prices with 20% buffer
  const gasPrice = await publicClient.getGasPrice();
  const bufferedGasPrice = (gasPrice * 120n) / 100n; // 20% buffer
  
  // Estimate gas needed with 30% buffer
  const gasLimit = await estimateDeploymentGas(publicClient, params);
  
  console.log('Gas configuration:', {
    gasLimit: gasLimit.toString(),
    gasPrice: bufferedGasPrice.toString(),
    estimatedCost: formatEther((gasLimit * bufferedGasPrice))
  });
  
  const hash = await walletClient.deployContract({
    abi: params.abi,
    bytecode: params.bytecode,
    args: params.args,
    account: walletClient.account!,
    chain: walletClient.chain,
    gas: gasLimit,
    gasPrice: bufferedGasPrice, // Use legacy gas pricing for compatibility
  });
  
  console.log('Deployment transaction submitted:', hash);
  onProgress?.(hash);
  
  // Wait with more confirmations for safety (PHASE 1)
  const receipt = await publicClient.waitForTransactionReceipt({ 
    hash,
    confirmations: 3, // Increased from 2
    timeout: 300_000 // 5 minute timeout
  });
  
  if (!receipt.contractAddress) {
    throw new Error('Contract deployment failed - no address returned');
  }
  
  // Verify contract code exists (PHASE 1)
  const deployedCode = await publicClient.getBytecode({
    address: receipt.contractAddress
  });
  
  if (!deployedCode || deployedCode === '0x') {
    throw new Error(`No code deployed at ${receipt.contractAddress}`);
  }
  
  console.log('Contract deployed and verified at:', receipt.contractAddress);
  return receipt.contractAddress;
}
