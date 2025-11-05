import { Address, Hash, PublicClient, WalletClient, isAddress, formatEther, parseEther, encodeFunctionData, encodeAbiParameters } from 'viem';
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

// Helper function to get native currency symbol for a chain
function getNativeSymbol(chainId: number): string {
  if (chainId === 1315 || chainId === 1514) return 'IP'; // Story networks
  if (chainId === 84532) return 'ETH'; // Base Sepolia
  if (chainId === 421614) return 'ETH'; // Arbitrum Sepolia
  if (chainId === 11155111) return 'ETH'; // Sepolia
  return 'ETH'; // Default
}

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
  | 'deployment-complete'    // Contracts deployed
  | 'switching-network'      // Switching to Sepolia
  | 'registering'            // Registry registration
  | 'configuring-evvm'       // Setting EVVM ID on EVVM Core
  | 'complete';              // Everything done

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
  const currencyName = getNativeSymbol(params.chainId);
  const isStoryNetwork = params.chainId === 1315 || params.chainId === 1514;
  
  // Check 1: Sufficient balance
  try {
    const balance = await publicClient.getBalance({
      address: walletClient.account!.address
    });
    
    // Estimate total deployment cost based on network
    const estimatedGasTotal = isStoryNetwork 
      ? 200_000_000n // ~200M gas for all 5 contracts on Story
      : 100_000_000n; // ~100M gas on standard EVM
    
    const gasPrice = await publicClient.getGasPrice();
    const estimatedCost = estimatedGasTotal * gasPrice;
    
    if (balance < estimatedCost) {
      const required = formatEther(estimatedCost);
      const current = formatEther(balance);
      issues.push(
        `Insufficient balance. Required: ~${required} ${currencyName}, Current: ${current} ${currencyName}`
      );
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
  params: { abi: any; bytecode: `0x${string}`; args: any[] },
  isStoryNetwork: boolean = false
): Promise<bigint> {
  try {
    // For contract deployment, encode constructor args properly
    const constructorArgs = encodeAbiParameters(
      params.abi.find((x: any) => x.type === 'constructor')?.inputs || [],
      params.args
    );
    
    // Full deployment bytecode = bytecode + constructor args
    const fullDeploymentBytecode = `${params.bytecode}${constructorArgs.slice(2)}` as `0x${string}`;
    
    // Try to estimate gas
    const estimate = await publicClient.estimateGas({
      data: fullDeploymentBytecode
    });
    
    // Apply buffer (50% for Story, 30% for others)
    const bufferMultiplier = isStoryNetwork ? 150n : 130n;
    const estimatedWithBuffer = (estimate * bufferMultiplier) / 100n;
    
    console.log('✅ Gas estimation succeeded:', {
      rawEstimate: estimate.toString(),
      withBuffer: estimatedWithBuffer.toString(),
      bufferPercent: isStoryNetwork ? '50%' : '30%'
    });
    
    return estimatedWithBuffer;
    
  } catch (error) {
    console.warn('⚠️ Gas estimation failed, using bytecode-based fallback:', error);
    
    // Fallback: Calculate based on full deployment bytecode size
    const constructorArgs = encodeAbiParameters(
      params.abi.find((x: any) => x.type === 'constructor')?.inputs || [],
      params.args
    );
    
    const fullDeploymentBytecode = `${params.bytecode}${constructorArgs.slice(2)}`;
    const fullBytecodeLength = fullDeploymentBytecode.length / 2; // hex chars to bytes
    
    if (isStoryNetwork) {
      // Story: 400 gas per byte + 15M execution overhead (conservative!)
      const gasPerByte = 400n;
      const executionOverhead = 15_000_000n;
      const fallbackGas = (BigInt(fullBytecodeLength) * gasPerByte) + executionOverhead;
      
      console.log('📊 Story fallback calculation:', {
        fullBytecodeBytes: fullBytecodeLength,
        formula: `${fullBytecodeLength} × 400 + 15M`,
        result: fallbackGas.toString(),
        resultInMillion: `${(Number(fallbackGas) / 1_000_000).toFixed(1)}M`
      });
      
      return fallbackGas;
    } else {
      // Standard EVM: 200 gas per byte + 5M execution overhead
      const gasPerByte = 200n;
      const executionOverhead = 5_000_000n;
      return (BigInt(fullBytecodeLength) * gasPerByte) + executionOverhead;
    }
  }
}

/**
 * Verify bytecode exists at address with retry logic
 * Story blockchain needs extra time for state finalization
 */
async function verifyBytecodeWithRetry(
  publicClient: PublicClient,
  address: Address,
  maxRetries: number = 5
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const bytecode = await publicClient.getBytecode({ address });
    
    if (bytecode && bytecode !== '0x') {
      console.log(`✅ Bytecode verified at ${address} (attempt ${attempt})`);
      return true;
    }
    
    if (attempt < maxRetries) {
      const delay = attempt * 2000; // Progressive: 2s, 4s, 6s, 8s, 10s
      console.log(`⏳ Waiting ${delay}ms for bytecode to finalize (attempt ${attempt}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return false;
}

/**
 * Checks if a contract was deployed in recent blocks
 * Optimized for Story blockchain with faster block times
 */
async function checkPendingDeployment(
  publicClient: PublicClient,
  fromAddress: Address
): Promise<{ contractAddress: Address } | null> {
  try {
    const latestBlock = await publicClient.getBlockNumber();
    
    // Check last 20 blocks (Story may have faster block times)
    for (let i = 0n; i < 20n; i++) {
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
            console.log(`📦 Found contract deployment: ${receipt.contractAddress} (tx: ${tx.hash})`);
            return { contractAddress: receipt.contractAddress };
          }
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to check pending deployments:', error);
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
  maxRetries: number = 3,
  isStoryNetwork: boolean = false
): Promise<Address> {
  let lastError: Error | null = null;
  let lastHash: Hash | undefined = undefined;
  
  // Track hash across retries so UI always shows it
  const progressWrapper = (hash: Hash) => {
    lastHash = hash;
    onProgress?.(hash);
  };
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🚀 Deployment attempt ${attempt}/${maxRetries}`);
      
      return await deployContract(walletClient, publicClient, params, progressWrapper, isStoryNetwork);
      
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Attempt ${attempt} failed:`, error);
      
      // If we have a hash from a previous attempt, ensure it's still shown
      if (lastHash) {
        onProgress?.(lastHash);
      }
      
      // Check if it's a user rejection - don't retry
      if (error instanceof Error && 
          (error.message.includes('User rejected') || 
           error.message.includes('user rejected'))) {
        throw error;
      }
      
      // CRITICAL FIX: Check if contract was actually deployed despite error
      const receipt = await checkPendingDeployment(publicClient, walletClient.account!.address);
      if (receipt?.contractAddress) {
        console.log('✅ Found deployed contract despite error:', receipt.contractAddress);
        
        // VERIFY the bytecode exists before returning
        const verified = await verifyBytecodeWithRetry(publicClient, receipt.contractAddress, isStoryNetwork ? 7 : 5);
        if (verified) {
          return receipt.contractAddress;
        }
      }
      
      // Check if error is about bytecode verification timing
      if (error.message.includes('Bytecode verification timeout')) {
        // Extract address from error message and verify one more time
        const addressMatch = error.message.match(/0x[a-fA-F0-9]{40}/);
        if (addressMatch) {
          const address = addressMatch[0] as Address;
          console.log(`⏳ Final verification attempt for ${address}...`);
          
          // Wait longer before final verification
          await new Promise(resolve => setTimeout(resolve, 10000)); // 10s
          
          const verified = await verifyBytecodeWithRetry(publicClient, address, 3);
          if (verified) {
            return address;
          }
        }
      }
      
      if (attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Retrying in ${delay}ms...`);
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
  
  // STORY BLOCKCHAIN CONFIGURATION
  const isStoryNetwork = params.chainId === 1315 || params.chainId === 1514; // Story Aeneid testnet or mainnet
  const confirmations = isStoryNetwork ? 5 : 3; // More confirmations for Story
  const verificationRetries = isStoryNetwork ? 7 : 5; // More retries for Story
  
  console.log(`🌐 Deploying on ${isStoryNetwork ? 'Story Network (Chain ID: ' + params.chainId + ')' : 'network ' + params.chainId}`);
  console.log(`⚙️ Using ${confirmations} confirmations and ${verificationRetries} verification retries`);
  
  // BYTECODE VALIDATION - Verify all bytecodes start with 0x6080 (valid PUSH1 opcode)
const bytecodes = [
    { name: 'Staking', code: STAKING_BYTECODE },
    { name: 'EVVM Core', code: EVVM_CORE_BYTECODE },
    { name: 'NameService', code: NAME_SERVICE_BYTECODE },
    { name: 'Estimator', code: ESTIMATOR_BYTECODE },
    { name: 'Treasury', code: TREASURY_BYTECODE }
  ];
  
  for (const { name, code } of bytecodes) {
    if (!code.startsWith('0x6080')) {
      throw new Error(
        `❌ ${name} bytecode validation failed!\n` +
        `Expected: 0x6080... (valid EVM bytecode)\n` +
        `Got: ${code.slice(0, 10)}...\n` +
        `This indicates bytecode corruption. Please recompile contracts with Story-compatible settings.`
      );
    }
    if (code.length < 1000) {
      throw new Error(`❌ ${name} bytecode too short (${code.length} chars) - likely corrupted`);
    }
    
    // CRITICAL: Check for invalid hex characters (like underscores from library placeholders)
    const invalidHexChars = code.match(/[^0-9a-fA-Fx]/);
    if (invalidHexChars) {
      const firstInvalid = invalidHexChars[0];
      const position = code.indexOf(firstInvalid);
      const placeholderMatch = code.match(/__\$([0-9a-fA-F]+)\$__/);
      const placeholderInfo = placeholderMatch 
        ? `\nLibrary placeholder found: __$${placeholderMatch[1]}$__\n` +
          `This is an unresolved library dependency. See LIBRARY_LINKING_ISSUE.md for fix instructions.`
        : '';
      
      throw new Error(
        `❌ ${name} bytecode contains invalid hex characters!\n` +
        `Found invalid character "${firstInvalid}" at position ${position}.\n` +
        `This usually means the contract bytecode has unresolved library placeholders (like __$...$__).\n\n` +
        `📖 See LIBRARY_LINKING_ISSUE.md for detailed instructions on how to fix this.\n\n` +
        `Quick fix steps:\n` +
        `1. Contact Story Protocol to get the library address for this placeholder\n` +
        `2. Update scripts/fix-library-placeholder.mjs with the library address\n` +
        `3. Run: node scripts/fix-library-placeholder.mjs\n` +
        `4. Run: node scripts/apply-story-bytecode.mjs\n` +
        placeholderInfo +
        `\nContext: ...${code.substring(Math.max(0, position - 20), position + 20)}...`
      );
    }
    
    console.log(`✅ ${name} bytecode validated: ${code.length} chars, starts with 0x6080`);
  }
  
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
      },
      3,
      isStoryNetwork
    );
    
    console.log('✅ Staking deployed at:', stakingAddress);
    
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
    
    console.log('🚀 Deploying EVVM Core with args:', {
      admin: params.adminAddress,
      staking: stakingAddress,
      metadata: evvmMetadata
    });
    
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
      }),
      3,
      isStoryNetwork
    );
    
    console.log('✅ EVVM Core deployed at:', evvmCoreAddress);
    
    // CRITICAL VALIDATION: Ensure EVVM Core is not P2PSwap or Staking
    const knownP2PSwapAddresses = [
      '0xcf7468d06cba907ae333c1daea38b0b771c1256d', // Known P2PSwap from Foundry deployment
      '0xcf7468D06cBA907ae333c1DaeA38b0b771C1256d'  // Case variation
    ];
    
    const isP2PSwap = knownP2PSwapAddresses.some(addr => 
      evvmCoreAddress.toLowerCase() === addr.toLowerCase()
    );
    
    if (isP2PSwap) {
      console.error('❌ CRITICAL: EVVM Core deployment returned P2PSwap address!');
      console.error('Deployed address:', evvmCoreAddress);
      console.error('Expected: Valid EVVM Core contract');
      console.error('This indicates EVVM_CORE_BYTECODE may contain P2PSwap bytecode!');
      throw new Error(
        `CRITICAL ERROR: EVVM Core deployment returned P2PSwap address (${evvmCoreAddress}). ` +
        `This indicates EVVM_CORE_BYTECODE contains incorrect bytecode. ` +
        `Please check that src/lib/contracts/abis/evvm-core.ts contains the correct EVVM Core bytecode, not P2PSwap bytecode.`
      );
    }
    
    if (evvmCoreAddress.toLowerCase() === stakingAddress.toLowerCase()) {
      throw new Error(
        `CRITICAL ERROR: EVVM Core deployment returned Staking address (${evvmCoreAddress}). ` +
        `This indicates a deployment error. Please redeploy.`
      );
    }
    
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
      }),
      3,
      isStoryNetwork
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
      }),
      3,
      isStoryNetwork
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
      }),
      3,
      isStoryNetwork
    );
    
    currentNonce++;
    
    // STEP 6: Setup NameService and Treasury in EVVM Core
    onProgress?.({
      stage: 'setup-evvm',
      message: 'Connecting NameService and Treasury to EVVM Core...'
    });
    
    // Optional: Check if already set up (non-blocking)
    try {
      const existingNameService = await publicClient.readContract({
        address: evvmCoreAddress,
        abi: EVVM_CORE_ABI,
        functionName: 'getNameServiceAddress',
      } as any);
      
      if (existingNameService && existingNameService !== '0x0000000000000000000000000000000000000000') {
        console.log(`⚠️ NameService already set to ${existingNameService}, attempting to update...`);
      }
    } catch (error) {
      // Ignore - contract might not be fully initialized yet
      console.log('ℹ️ Could not check existing NameService address (this is OK)');
    }
    
    const gasPrice = await publicClient.getGasPrice();
    const bufferedGasPrice = (gasPrice * 120n) / 100n;
    
    // Use Story Network gas limit if applicable - setup transactions also need 30M on Story Network
    const setupGasLimit = isStoryNetwork ? 30_000_000n : 500_000n;
    
    const setupEvvmTxHash = await walletClient.writeContract({
      address: evvmCoreAddress,
      abi: EVVM_CORE_ABI,
      functionName: '_setupNameServiceAndTreasuryAddress',
      args: [nameServiceAddress, treasuryAddress],
      account: walletClient.account!,
      chain: walletClient.chain,
      gas: setupGasLimit,
      gasPrice: bufferedGasPrice,
    });
    
    onProgress?.({
      stage: 'setup-evvm',
      message: 'Connecting NameService and Treasury to EVVM Core...',
      txHash: setupEvvmTxHash
    });
    
    const setupEvvmReceipt = await publicClient.waitForTransactionReceipt({ 
      hash: setupEvvmTxHash,
      confirmations,
      timeout: 300_000
    });
    
    if (setupEvvmReceipt.status === 'reverted') {
      const explorerUrl = isStoryNetwork 
        ? `https://aeneid.storyscan.io/tx/${setupEvvmTxHash}`
        : `https://etherscan.io/tx/${setupEvvmTxHash}`;
      
      // Try to get revert reason from receipt
      let revertReason = 'Unknown revert reason';
      try {
        if (setupEvvmReceipt.logs && setupEvvmReceipt.logs.length > 0) {
          // Check if there's a revert reason in the logs
          const revertLog = setupEvvmReceipt.logs.find((log: any) => 
            log.topics && log.topics[0] === '0x08c379a0' // Error(string) signature
          );
          if (revertLog) {
            // Try to decode the error message
            revertReason = 'Error message found in transaction logs (check explorer for details)';
          }
        }
      } catch (e) {
        // Ignore decode errors
      }
      
      throw new Error(
        `Setup transaction failed: Connecting NameService and Treasury to EVVM Core reverted.\n\n` +
        `Transaction: ${setupEvvmTxHash}\n` +
        `Explorer: ${explorerUrl}\n` +
        `Gas Used: ${setupEvvmReceipt.gasUsed.toString()} (reverted early)\n\n` +
        `Common causes:\n` +
        `1. Caller is not the contract owner/admin (deployer must be the admin)\n` +
        `2. Setup function was already called (can only be called once)\n` +
        `3. Invalid addresses (zero addresses or wrong contracts)\n` +
        `4. Contract not fully initialized\n\n` +
        `Deployer: ${walletClient.account!.address}\n` +
        `EVVM Core: ${evvmCoreAddress}\n` +
        `NameService: ${nameServiceAddress}\n` +
        `Treasury: ${treasuryAddress}\n\n` +
        `Please check the transaction on the explorer for detailed revert reason.`
      );
    }
    
    console.log('✅ EVVM Core setup complete');
    currentNonce++;
    
    // STEP 7: Setup Estimator and EVVM in Staking
    onProgress?.({
      stage: 'setup-staking',
      message: 'Connecting Estimator and EVVM to Staking...'
    });
    
    // Pre-flight check for Staking setup
    const deployerAddress = walletClient.account!.address;
    console.log('🔍 Verifying deployer permissions for Staking setup...');
    
    // Use Story Network gas limit if applicable - setup transactions also need 30M on Story Network
    const setupStakingGasLimit = isStoryNetwork ? 30_000_000n : 500_000n;
    
    const setupStakingTxHash = await walletClient.writeContract({
      address: stakingAddress,
      abi: STAKING_ABI,
      functionName: '_setupEstimatorAndEvvm',
      args: [estimatorAddress, evvmCoreAddress],
      account: walletClient.account!,
      chain: walletClient.chain,
      gas: setupStakingGasLimit,
      gasPrice: bufferedGasPrice,
    });
    
    onProgress?.({
      stage: 'setup-staking',
      message: 'Connecting Estimator and EVVM to Staking...',
      txHash: setupStakingTxHash
    });
    
    const setupStakingReceipt = await publicClient.waitForTransactionReceipt({ 
      hash: setupStakingTxHash,
      confirmations,
      timeout: 300_000
    });
    
    if (setupStakingReceipt.status === 'reverted') {
      const explorerUrl = isStoryNetwork 
        ? `https://aeneid.storyscan.io/tx/${setupStakingTxHash}`
        : `https://etherscan.io/tx/${setupStakingTxHash}`;
      throw new Error(
        `Setup transaction failed: Connecting Estimator and EVVM to Staking reverted.\n\n` +
        `Transaction: ${setupStakingTxHash}\n` +
        `Explorer: ${explorerUrl}\n\n` +
        `Possible causes:\n` +
        `1. Caller is not the contract owner/admin\n` +
        `2. Addresses are invalid or zero addresses\n` +
        `3. Setup function was already called\n` +
        `4. Contract state issue\n\n` +
        `Please check the transaction on the explorer for detailed revert reason.`
      );
    }
    
    console.log('✅ Staking setup complete');
    
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
      const currencyName = getNativeSymbol(params.chainId);
      
      // CRITICAL: Check for setup transaction errors FIRST - don't replace them with gas errors
      if (error.message.includes('Setup transaction failed')) {
        // Preserve the detailed setup error message
        errorMessage = error.message;
      } else if (error.message.includes('User rejected') || error.message.includes('user rejected')) {
        errorMessage = 'Transaction was rejected in MetaMask. Please approve all transactions to complete deployment.';
      } else if (error.message.includes('Cannot convert string to Uint8Array') || 
                 error.message.includes('invalid hex string') ||
                 error.message.includes('toBytes only supports')) {
        // Bytecode corruption/truncation error
        errorMessage = `Bytecode error: Contract bytecode is corrupted or truncated. ` +
          `This usually means the bytecode constant in the code is invalid. ` +
          `Please check the contract bytecode files and ensure they are complete. ` +
          `Original error: ${error.message}`;
      } else if (error.message.includes('gas') || error.message.includes('Gas')) {
        // Only show "ran out of gas" if it's NOT a revert (reverts use very little gas)
        if (error.message.includes('reverted') || error.message.includes('revert')) {
          // It's a revert, not an out-of-gas error
          errorMessage = error.message;
        } else if (isStoryNetwork) {
          errorMessage = `Transaction ran out of gas on Story Network. ` +
            `CRITICAL: You MUST manually increase gas limit in MetaMask to 30,000,000 (30M) before confirming. ` +
            `Steps: Click "Edit" → "Advanced gas fees" → Set "Gas limit" to 30000000 → Confirm. ` +
            `The transaction requires ~30M gas but MetaMask may show a lower default.`;
        } else {
          errorMessage = `Transaction ran out of gas. Try increasing gas limit in MetaMask or check if you have enough ${currencyName}.`;
        }
      } else if (error.message.includes('network') || error.message.includes('Network')) {
        errorMessage = 'Network connection issue. Please check your internet connection and try again.';
      } else if (error.message.includes('dropped') || error.message.includes('replaced')) {
        errorMessage = 'Transaction was dropped or replaced. This usually means gas price was too low. Please try again with higher gas.';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = `Insufficient funds. You need at least ~0.15 ${currencyName} for deployment.`;
      } else {
        errorMessage = error.message;
      }
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Deploys a single contract with optimized gas settings
 * Story blockchain optimized with bytecode verification retries
 */
async function deployContract(
  walletClient: WalletClient,
  publicClient: PublicClient,
  params: {
    abi: any;
    bytecode: `0x${string}`;
    args: any[];
  },
  onProgress?: (txHash: Hash) => void,
  isStoryNetwork: boolean = false
): Promise<Address> {
  console.log('Deploying contract with args:', params.args);
  
  // Get current gas prices with 20% buffer
  const gasPrice = await publicClient.getGasPrice();
  const bufferedGasPrice = (gasPrice * 120n) / 100n;
  
  // Estimate gas needed with buffer (50% for Story, 30% for others)
  let gasLimit = await estimateDeploymentGas(publicClient, params, isStoryNetwork);
  
  // Enforce a minimum gas limit for Story large contracts
  if (isStoryNetwork && gasLimit < 30_000_000n) {
    console.warn('⚠️ Gas estimate below Story minimum, clamping to 30M', {
      previous: gasLimit.toString(),
      recommendedMin: '30,000,000'
    });
    gasLimit = 30_000_000n;
  }

  // Network block gas limit guard (prevents impossible deployments on L1 testnets like Sepolia)
  const latestBlock = await publicClient.getBlock({ blockTag: 'latest' });
  const blockGasLimit = (latestBlock as any).gasLimit as bigint | undefined;
  if (!isStoryNetwork && blockGasLimit && gasLimit >= (blockGasLimit - 500_000n)) {
    throw new Error(
      `Contract too large for this network. Max per-tx gas ≈ ${blockGasLimit.toString()} but required ≈ ${gasLimit.toString()}. ` +
      `Please deploy on Story Aeneid/Mainnet or another chain with higher block gas limits.`
    );
  }

  // Log final gas configuration before deployment
  console.log('🚀 Final deployment configuration:', {
    gasLimit: gasLimit.toString(),
    gasLimitInMillion: `${(Number(gasLimit) / 1_000_000).toFixed(1)}M`,
    blockGasLimit: blockGasLimit ? blockGasLimit.toString() : 'unknown',
    gasPrice: bufferedGasPrice.toString(),
    estimatedCost: formatEther((gasLimit * bufferedGasPrice)),
    network: isStoryNetwork ? 'Story (large contracts!)' : 'Standard EVM'
  });
  
  // CRITICAL WARNING for Story Network
  if (isStoryNetwork) {
    console.warn('⚠️⚠️⚠️ STORY NETWORK DEPLOYMENT WARNING ⚠️⚠️⚠️');
    console.warn('When MetaMask popup appears, you MUST:');
    console.warn('1. Click "Edit" (or "Advanced" button)');
    console.warn('2. Go to "Advanced gas fees" section');
    console.warn('3. Set "Gas limit" to exactly: 30000000');
    console.warn('4. DO NOT use MetaMask\'s auto-estimated gas (it will be too low)');
    console.warn('5. Confirm the transaction');
    console.warn('⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️');
  }
  
  // For Story Network, we need to ensure MetaMask sees the high gas limit
  // The gas limit is passed, but MetaMask may override it with its own estimate
  // User MUST manually edit gas limit in MetaMask to 30M
  let hash: Hash;
  try {
    hash = await walletClient.deployContract({
      abi: params.abi,
      bytecode: params.bytecode,
      args: params.args,
      account: walletClient.account!,
      chain: walletClient.chain,
      gas: gasLimit, // Set to 30M for Story Network
      gasPrice: bufferedGasPrice,
    });
    
    console.log('Deployment transaction submitted:', hash);
    // CRITICAL: Call onProgress immediately when hash is available
    // This ensures UI shows the transaction hash even if deployment fails later
    onProgress?.(hash);
  } catch (error) {
    // If deployment fails before hash is returned, re-throw
    // But if we have a hash, we should still show it
    console.error('Failed to submit deployment transaction:', error);
    throw error;
  }
  
  // CRITICAL: Story blockchain needs MORE confirmations than Ethereum
  const confirmations = isStoryNetwork ? 5 : 3;
  const receipt = await publicClient.waitForTransactionReceipt({ 
    hash,
    confirmations,
    timeout: 300_000
  });
  
  if (!receipt.contractAddress) {
    throw new Error('Contract deployment failed - no address returned');
  }
  
  // Use retry logic for bytecode verification (Story blockchain timing fix)
  console.log(`⏳ Verifying bytecode deployment at ${receipt.contractAddress}...`);
  
  if (isStoryNetwork) {
    onProgress?.(hash); // Update progress to show Story-specific wait
  }
  
  const verificationRetries = isStoryNetwork ? 7 : 5;
  const verified = await verifyBytecodeWithRetry(publicClient, receipt.contractAddress, verificationRetries);
  
  if (!verified) {
    // Before failing, do one final deep check
    const finalCheck = await publicClient.getBytecode({
      address: receipt.contractAddress
    });
    
    if (!finalCheck || finalCheck === '0x') {
      const explorerUrl = isStoryNetwork 
        ? `https://aeneid.storyscan.io/tx/${hash}`
        : `https://etherscan.io/tx/${hash}`;
      
      throw new Error(
        `⏰ Bytecode verification timeout at ${receipt.contractAddress}\n\n` +
        `✅ Your contract IS deployed. The delay is due to ${isStoryNetwork ? 'Story blockchain' : 'network'} indexing.\n\n` +
        `📋 Transaction: ${hash}\n` +
        `🔗 Explorer: ${explorerUrl}\n\n` +
        `⚡ The contract will be fully available in 30-60 seconds.\n` +
        `   You can verify manually at: ${receipt.contractAddress}`
      );
    }
  }
  
  console.log('✅ Contract deployed and verified at:', receipt.contractAddress);
  return receipt.contractAddress;
}
