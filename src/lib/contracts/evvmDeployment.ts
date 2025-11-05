import { Address, Hash, PublicClient, WalletClient } from 'viem';
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
  
  try {
    // STEP 1: Deploy Staking (must be first!)
    onProgress?.({
      stage: 'deploying-staking',
      message: 'Deploying Staking contract (1/5)...'
    });
    
    const stakingAddress = await deployContract(walletClient, publicClient, {
      abi: STAKING_ABI,
      bytecode: STAKING_BYTECODE,
      args: [
        params.adminAddress,
        params.goldenFisherAddress
      ]
    });
    
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
    
    const evvmCoreAddress = await deployContract(walletClient, publicClient, {
      abi: EVVM_CORE_ABI,
      bytecode: EVVM_CORE_BYTECODE,
      args: [
        params.adminAddress,
        stakingAddress,
        evvmMetadata
      ]
    });
    
    // STEP 3: Deploy NameService
    onProgress?.({
      stage: 'deploying-nameservice',
      message: 'Deploying NameService contract (3/5)...'
    });
    
    const nameServiceAddress = await deployContract(walletClient, publicClient, {
      abi: NAME_SERVICE_ABI,
      bytecode: NAME_SERVICE_BYTECODE,
      args: [
        evvmCoreAddress,
        params.adminAddress
      ]
    });
    
    // STEP 4: Deploy Estimator
    onProgress?.({
      stage: 'deploying-estimator',
      message: 'Deploying Estimator contract (4/5)...'
    });
    
    const estimatorAddress = await deployContract(walletClient, publicClient, {
      abi: ESTIMATOR_ABI,
      bytecode: ESTIMATOR_BYTECODE,
      args: [
        params.activatorAddress,
        evvmCoreAddress,
        stakingAddress,
        params.adminAddress
      ]
    });
    
    // STEP 5: Deploy Treasury
    onProgress?.({
      stage: 'deploying-treasury',
      message: 'Deploying Treasury contract (5/5)...'
    });
    
    const treasuryAddress = await deployContract(walletClient, publicClient, {
      abi: TREASURY_ABI,
      bytecode: TREASURY_BYTECODE,
      args: [evvmCoreAddress]
    });
    
    // STEP 6: Setup NameService and Treasury in EVVM Core
    onProgress?.({
      stage: 'setup-evvm',
      message: 'Connecting NameService and Treasury to EVVM Core...'
    });
    
    const setupEvvmTxHash = await walletClient.writeContract({
      address: evvmCoreAddress,
      abi: EVVM_CORE_ABI,
      functionName: '_setupNameServiceAndTreasuryAddress',
      args: [nameServiceAddress, treasuryAddress],
      account: walletClient.account!,
      chain: walletClient.chain,
    });
    
    await publicClient.waitForTransactionReceipt({ 
      hash: setupEvvmTxHash,
      confirmations: 2
    });
    
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
    });
    
    await publicClient.waitForTransactionReceipt({ 
      hash: setupStakingTxHash,
      confirmations: 2
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
    throw new Error(`Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function deployContract(
  walletClient: WalletClient,
  publicClient: PublicClient,
  params: {
    abi: any;
    bytecode: `0x${string}`;
    args: any[];
  }
): Promise<Address> {
  console.log('Deploying contract with args:', params.args);
  
  const hash = await walletClient.deployContract({
    abi: params.abi,
    bytecode: params.bytecode,
    args: params.args,
    account: walletClient.account!,
    chain: walletClient.chain,
  });
  
  console.log('Deployment transaction:', hash);
  
  const receipt = await publicClient.waitForTransactionReceipt({ 
    hash,
    confirmations: 2
  });
  
  if (!receipt.contractAddress) {
    throw new Error('Contract deployment failed - no address returned');
  }
  
  console.log('Contract deployed at:', receipt.contractAddress);
  return receipt.contractAddress;
}
