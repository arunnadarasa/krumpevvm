import { useState } from 'react';
import { useAccount, usePublicClient, useWalletClient, useSwitchChain } from 'wagmi';
import { getWalletClient, getPublicClient } from 'wagmi/actions';
import { Address, Hash, keccak256, toHex, hexToNumber, decodeEventLog } from 'viem';
import { deployEVVMContracts, DeploymentProgress } from '@/lib/contracts/evvmDeployment';
import { REGISTRY_ABI, REGISTRY_ADDRESS } from '../../supabase/functions/deploy-evvm/registry-abi';
import { EVVM_CORE_ABI } from '@/lib/contracts/abis/evvm-core';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sepolia } from 'wagmi/chains';
import { config } from '@/lib/wagmi';

export interface DeploymentFormData {
  evvmName: string;
  principalTokenName: string;
  principalTokenSymbol: string;
  hostChainId: number;
  hostChainName: string;
  adminAddress: Address;
  goldenFisherAddress: Address;
  activatorAddress: Address;
  totalSupply: string;
  eraTokens: string;
  rewardPerOperation: string;
}

interface ContractAddresses {
  evvmCore: Address;
  nameService: Address;
  staking: Address;
  estimator: Address;
  treasury: Address;
  deploymentTxHash: Hash;
}

export function useEVVMDeployment() {
  const [deploying, setDeploying] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [progress, setProgress] = useState<DeploymentProgress | null>(null);
  const [deployedContracts, setDeployedContracts] = useState<ContractAddresses | null>(null);
  const [deploymentResult, setDeploymentResult] = useState<{
    evvmId: number;
    addresses: {
      evvmCore: Address;
      nameService: Address;
      staking: Address;
      estimator: Address;
      treasury: Address;
    };
    txHashes: {
      deployment: Hash;
      registry: Hash;
    };
  } | null>(null);

  const { address: userAddress, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { data: sepoliaWalletClient } = useWalletClient({ chainId: 11155111 });
  const sepoliaPublicClient = usePublicClient({ chainId: 11155111 });
  const { switchChainAsync } = useSwitchChain();
  const { toast } = useToast();

  // Phase A: Deploy EVVM contracts on host chain
  const deployContracts = async (formData: DeploymentFormData) => {
    if (!walletClient || !publicClient || !userAddress) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to deploy',
        variant: 'destructive'
      });
      return null;
    }

    setDeploying(true);
    setProgress(null);
    setDeployedContracts(null);
    setDeploymentResult(null);

    try {
      // Deploy EVVM contracts on host chain
      const contracts = await deployEVVMContracts(
        {
          adminAddress: formData.adminAddress,
          goldenFisherAddress: formData.goldenFisherAddress,
          activatorAddress: formData.activatorAddress,
          evvmName: formData.evvmName,
          principalTokenName: formData.principalTokenName,
          principalTokenSymbol: formData.principalTokenSymbol,
          totalSupply: BigInt(formData.totalSupply),
          eraTokens: BigInt(formData.eraTokens),
          rewardPerOperation: BigInt(formData.rewardPerOperation),
          chainId: formData.hostChainId,
          walletClient,
          publicClient
        },
        (p) => setProgress(p)
      );

      setProgress({
        stage: 'deployment-complete',
        message: 'Contracts deployed successfully! Ready for registry registration.'
      });

      const contractAddresses: ContractAddresses = {
        evvmCore: contracts.evvmCoreAddress,
        nameService: contracts.nameServiceAddress,
        staking: contracts.stakingAddress,
        estimator: contracts.estimatorAddress,
        treasury: contracts.treasuryAddress,
        deploymentTxHash: contracts.deploymentTxHash
      };

      // Validate addresses before storing
      console.log('📋 Storing deployed contract addresses:', {
        evvmCore: contractAddresses.evvmCore,
        staking: contractAddresses.staking,
        nameService: contractAddresses.nameService,
        estimator: contractAddresses.estimator,
        treasury: contractAddresses.treasury
      });

      // Verify EVVM Core is not the same as Staking
      if (contractAddresses.evvmCore.toLowerCase() === contractAddresses.staking.toLowerCase()) {
        console.error('❌ CRITICAL: EVVM Core address matches Staking address!', {
          address: contractAddresses.evvmCore
        });
        throw new Error(
          `Deployment returned invalid addresses: EVVM Core (${contractAddresses.evvmCore}) matches Staking address. ` +
          `This indicates a deployment error. Please redeploy.`
        );
      }

      setDeployedContracts(contractAddresses);

      toast({
        title: 'Contracts Deployed!',
        description: 'Now switch to Ethereum Sepolia to register in the global registry'
      });

      return contractAddresses;

    } catch (error) {
      console.error('Deployment error:', error);
      
      let userMessage = 'Deployment failed';
      let technicalDetails = '';
      
      if (error instanceof Error) {
        if (error.message.includes('User rejected') || error.message.includes('user rejected')) {
          userMessage = 'Transaction was rejected in MetaMask';
          technicalDetails = 'Please approve all transactions to complete deployment';
        } else if (error.message.includes('gas') || error.message.includes('Gas')) {
          userMessage = 'Transaction ran out of gas';
          technicalDetails = 'Try increasing gas limit in MetaMask or check if you have enough ETH';
        } else if (error.message.includes('network') || error.message.includes('Network')) {
          userMessage = 'Network connection issue';
          technicalDetails = 'Please check your internet connection and try again';
        } else if (error.message.includes('dropped') || error.message.includes('replaced')) {
          userMessage = 'Transaction was dropped or replaced';
          technicalDetails = 'This usually means gas price was too low. Try again with higher gas.';
        } else {
          technicalDetails = error.message;
        }
      }
      
      toast({
        title: userMessage,
        description: technicalDetails,
        variant: 'destructive',
        duration: 10000
      });

      return null;
    } finally {
      setDeploying(false);
    }
  };

  // Phase B: Register in Sepolia Registry (always on Sepolia)
  const registerInRegistry = async (formData: DeploymentFormData, contracts: ContractAddresses) => {
    if (!userAddress) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet',
        variant: 'destructive'
      });
      return;
    }

    setRegistering(true);

    try {
      // Get fresh wallet and public clients for Sepolia
      setProgress({
        stage: 'switching-network',
        message: 'Switching to Ethereum Sepolia...'
      });

      // Check current chain first
      const currentChainId = chain?.id;
      if (currentChainId !== 11155111) {
        console.log(`🔄 Current chain: ${currentChainId}, switching to Sepolia (11155111)...`);
        
        try {
          await switchChainAsync({ chainId: 11155111 }); // Sepolia
          console.log('✅ Chain switch initiated, waiting for confirmation...');
        } catch (switchError: any) {
          console.error('❌ Chain switch failed:', switchError);
          throw new Error(
            `Failed to switch to Ethereum Sepolia: ${switchError?.message || 'User rejected or network error'}. ` +
            `Please switch to Ethereum Sepolia (Chain ID: 11155111) manually in your wallet and try again.`
          );
        }

        // Wait for chain switch to complete and clients to be available
        console.log('⏳ Waiting for chain switch to complete...');
        let attempts = 0;
        let sepoliaClient: ReturnType<typeof getPublicClient> | null = null;
        
        // Poll for Sepolia client to become available (max 10 seconds)
        while (attempts < 20) {
          await new Promise(resolve => setTimeout(resolve, 500));
          try {
            sepoliaClient = getPublicClient(config, { chainId: 11155111 });
            const activeChainId = await sepoliaClient.getChainId();
            if (activeChainId === 11155111) {
              console.log('✅ Chain switch confirmed, Sepolia client available');
              break;
            }
          } catch (e) {
            // Client not ready yet, continue polling
          }
          attempts++;
        }
        
        if (!sepoliaClient) {
          throw new Error('Chain switch timeout. Please ensure you are connected to Ethereum Sepolia.');
        }
      } else {
        console.log('✅ Already on Ethereum Sepolia');
      }

      // Get Sepolia clients dynamically (works even if hooks haven't updated)
      let finalSepoliaWalletClient = sepoliaWalletClient;
      let finalSepoliaPublicClient = sepoliaPublicClient;
      
      // If hooks haven't updated yet, get clients directly from wagmi core
      if (!finalSepoliaWalletClient || !finalSepoliaPublicClient) {
        console.log('⚠️ Hooks not updated yet, getting clients directly from wagmi core...');
        try {
          finalSepoliaWalletClient = await getWalletClient(config, { chainId: 11155111 });
          finalSepoliaPublicClient = getPublicClient(config, { chainId: 11155111 });
          console.log('✅ Got Sepolia clients from wagmi core');
        } catch (e: any) {
          console.error('❌ Failed to get Sepolia clients:', e);
          throw new Error('Failed to get Sepolia clients. Please ensure you are connected to Ethereum Sepolia.');
        }
      }

      if (!finalSepoliaWalletClient || !finalSepoliaPublicClient) {
        throw new Error('Failed to get Sepolia clients. Please ensure you are connected to Ethereum Sepolia.');
      }

      // Verify we're actually on Sepolia by checking the active chain
      const activeChainId = await finalSepoliaPublicClient.getChainId();
      if (activeChainId !== 11155111) {
        throw new Error(
          `Wrong network detected. Expected Ethereum Sepolia (11155111), but wallet is on chain ${activeChainId}. ` +
          `Please switch to Ethereum Sepolia manually in your wallet and try again.`
        );
      }
      
      console.log('✅ Confirmed on Ethereum Sepolia (Chain ID: 11155111)');

      // Pre-flight validation: Check chain ID is whitelisted
      setProgress({
        stage: 'registering',
        message: `Validating ${contracts.evvmCore} on ${getChainName(formData.hostChainId)}...`
      });

      const isChainWhitelisted = await finalSepoliaPublicClient.readContract({
        address: REGISTRY_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: 'isChainIdRegistered',
        args: [BigInt(formData.hostChainId)]
      } as any);

      if (!isChainWhitelisted) {
        throw new Error(
          `Chain ID ${formData.hostChainId} (${getChainName(formData.hostChainId)}) is not whitelisted for EVVM registration. ` +
          `Only approved testnet chains can be registered. ` +
          `Supported chains: Story Aeneid (1315), Story Mainnet (1514).`
        );
      }

      // Pre-flight validation: Check EVVM address is not already registered
      const isAlreadyRegistered = await finalSepoliaPublicClient.readContract({
        address: REGISTRY_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: 'isAddressRegistered',
        args: [BigInt(formData.hostChainId), contracts.evvmCore]
      } as any);

      // Declare evvmId once at function scope
      let evvmId: number | null = null;

      if (isAlreadyRegistered) {
        console.log('ℹ️ EVVM is already registered. Reading EVVM ID from EVVM Core contract...');
        
        setProgress({
          stage: 'registering',
          message: `EVVM already registered. Retrieving EVVM ID from contract...`
        });

        // Switch back to deployment chain to read EVVM ID
        await switchChainAsync({ chainId: formData.hostChainId });
        await new Promise(resolve => setTimeout(resolve, 2000));

        if (!walletClient || !publicClient) {
          throw new Error('Failed to reconnect to deployment chain. Please switch manually.');
        }

        // Verify we're on the correct chain
        const deploymentChain = await publicClient.getChainId();
        if (deploymentChain !== formData.hostChainId) {
          throw new Error(`Failed to switch to chain ${formData.hostChainId}. Please switch manually.`);
        }

        // Read EVVM ID from EVVM Core contract
        try {
          const evvmIdBigInt = await publicClient.readContract({
            address: contracts.evvmCore,
            abi: EVVM_CORE_ABI,
            functionName: 'getEvvmID',
          } as any);

          evvmId = Number(evvmIdBigInt);
          
          if (evvmId === 0) {
            throw new Error(
              `EVVM Core contract ${contracts.evvmCore} is registered in the registry but has no EVVM ID set. ` +
              `This indicates an incomplete registration. Please contact support.`
            );
          }

          console.log(`✅ Retrieved existing EVVM ID: ${evvmId}`);
          
          // Skip registration and proceed to save deployment result
          setProgress({
            stage: 'complete',
            message: 'Saving deployment data...'
          });

          // Save to database
          const { error: dbError } = await supabase
            .from('evvm_deployments')
            .insert([{
              user_id: userAddress?.toLowerCase(),
              evvm_name: formData.evvmName,
              principal_token_name: formData.principalTokenName,
              principal_token_symbol: formData.principalTokenSymbol,
              host_chain_id: formData.hostChainId,
              host_chain_name: formData.hostChainName,
              admin_address: formData.adminAddress,
              golden_fisher_address: formData.goldenFisherAddress,
              activator_address: formData.activatorAddress,
              total_supply: Number(formData.totalSupply),
              era_tokens: Number(formData.eraTokens),
              reward_per_operation: Number(formData.rewardPerOperation),
              evvm_core_address: contracts.evvmCore,
              name_service_address: contracts.nameService,
              staking_address: contracts.staking,
              estimator_address: contracts.estimator,
              treasury_address: contracts.treasury,
              deployment_status: 'completed',
              deployment_tx_hash: contracts.deploymentTxHash,
              registry_tx_hash: null, // Already registered, no new tx
              set_evvm_id_tx_hash: null, // Already set during previous registration
              evvm_id: evvmId,
              deployed_at: new Date().toISOString(),
            }]);

          if (dbError) {
            console.error('Database save error:', dbError);
            throw new Error(`Failed to save deployment data: ${dbError.message}`);
          }

          // Set deployment result (matching the structure used in the normal registration flow)
          setDeploymentResult({
            evvmId,
            addresses: {
              evvmCore: contracts.evvmCore,
              nameService: contracts.nameService,
              staking: contracts.staking,
              estimator: contracts.estimator,
              treasury: contracts.treasury
            },
            txHashes: {
              deployment: contracts.deploymentTxHash,
              registry: null // Already registered, no new tx
            }
          });
          
          toast({
            title: 'EVVM Already Registered',
            description: `Using existing EVVM ID: ${evvmId}. Your EVVM is ready to use!`,
            variant: 'default',
            duration: 5000
          });

          return;
        } catch (error) {
          console.error('Failed to read EVVM ID:', error);
          throw new Error(
            `EVVM Core contract ${contracts.evvmCore} is already registered but could not retrieve EVVM ID. ` +
            `Please check the contract on ${getExplorerUrl(formData.hostChainId)} and call getEvvmID() manually.`
          );
        }
      }

      console.log('✅ Pre-flight validation passed - chain whitelisted, address not registered');

      // Validate EVVM Core address before registration
      console.log('🔍 Registry registration details:', {
        chainId: formData.hostChainId,
        evvmCoreAddress: contracts.evvmCore,
        stakingAddress: contracts.staking,
        nameServiceAddress: contracts.nameService,
        estimatorAddress: contracts.estimator,
        treasuryAddress: contracts.treasury
      });
      
      // Verify we're registering the EVVM Core, not Staking
      if (contracts.evvmCore.toLowerCase() === contracts.staking.toLowerCase()) {
        throw new Error(
          `Invalid configuration: EVVM Core address matches Staking address (${contracts.evvmCore}). ` +
          `This indicates a deployment error. Please redeploy your contracts.`
        );
      }

      // CRITICAL: Verify we're not trying to register P2PSwap as EVVM Core
      const knownP2PSwapAddresses = [
        '0xcf7468d06cba907ae333c1daea38b0b771c1256d',
        '0xcf7468D06cBA907ae333c1DaeA38b0b771C1256d'
      ];
      
      const isP2PSwap = knownP2PSwapAddresses.some(addr =>
        contracts.evvmCore.toLowerCase() === addr.toLowerCase()
      );
      
      if (isP2PSwap) {
        throw new Error(
          `❌ CRITICAL ERROR: Cannot register P2PSwap contract as EVVM Core!\n\n` +
          `The address ${contracts.evvmCore} is the P2PSwap contract, not the EVVM Core contract.\n\n` +
          `Based on your Foundry deployment, the correct EVVM Core address should be:\n` +
          `0x9B3828290d0E6E77857e6122bCD7957Eabd5ee20\n\n` +
          `Please check your deployment logs or redeploy your contracts. The EVVM Core address must be different from P2PSwap.`
        );
      }

      // Additional validation: Ensure EVVM Core is not the Staking address
      // This is a safety check to catch any state corruption or deployment errors
      console.log('🔍 Pre-registration validation:', {
        'contracts.evvmCore': contracts.evvmCore,
        'contracts.staking': contracts.staking,
        'Are they equal?': contracts.evvmCore.toLowerCase() === contracts.staking.toLowerCase()
      });

      setProgress({
        stage: 'registering',
        message: `Registering ${contracts.evvmCore} in global registry...`
      });

      console.log('🚀 Sending registry transaction with:', {
        chainId: formData.hostChainId,
        evvmAddress: contracts.evvmCore,
        registryAddress: REGISTRY_ADDRESS
      });

      // Simulate the call first to get the EVVM ID that will be returned
      // This works even if the EVVM is already registered (idempotent function)
      let evvmIdFromSimulation: number | null = null;
      try {
        console.log('🔍 Simulating registry call to get EVVM ID...');
        const simulationResult = await finalSepoliaPublicClient.simulateContract({
          address: REGISTRY_ADDRESS,
          abi: REGISTRY_ABI,
          functionName: 'registerEvvm',
          args: [BigInt(formData.hostChainId), contracts.evvmCore],
          account: finalSepoliaWalletClient.account!,
        });
        
        // registerEvvm returns the evvmId directly (single output)
        evvmIdFromSimulation = Number(simulationResult.result);
        console.log(`✅ Simulated call returned EVVM ID: ${evvmIdFromSimulation}`);
      } catch (simError: any) {
        console.warn('⚠️ Could not simulate registry call:', simError?.message || simError);
        // Continue anyway - we'll try to extract from events or fallback
      }

      const registryHash = await finalSepoliaWalletClient.writeContract({
        address: REGISTRY_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: 'registerEvvm',
        args: [BigInt(formData.hostChainId), contracts.evvmCore],
        chain: sepolia,
        account: finalSepoliaWalletClient.account!
      });

      setProgress({
        stage: 'registering',
        message: 'Waiting for registry confirmation...',
        txHash: registryHash
      });

      const registryReceipt = await finalSepoliaPublicClient.waitForTransactionReceipt({
        hash: registryHash,
        confirmations: 3,
        timeout: 300_000
      });

      console.log('📋 Registry transaction receipt:', {
        status: registryReceipt.status,
        transactionHash: registryReceipt.transactionHash,
        blockNumber: registryReceipt.blockNumber,
        logsCount: registryReceipt.logs?.length || 0,
        gasUsed: registryReceipt.gasUsed.toString()
      });

      // Check transaction status first
      if (registryReceipt.status === 'reverted') {
        console.error('❌ Registry transaction reverted. Receipt:', registryReceipt);
        throw new Error(
          'Registry registration transaction failed (reverted). ' +
          `Check transaction ${registryReceipt.transactionHash} on Etherscan for details. ` +
          'The transaction may have failed due to insufficient gas or a revert in the registry contract.'
        );
      }

      // Extract EVVM ID - try multiple methods in order of preference
      // (evvmId already declared above)
      
      // Method 1: Use the simulated result if available (most reliable)
      if (evvmIdFromSimulation !== null && evvmIdFromSimulation > 0) {
        evvmId = evvmIdFromSimulation;
        console.log('✅ Using EVVM ID from simulation:', evvmId);
      } else {
        // Method 2: Try to extract from events
        try {
          evvmId = extractEvvmIdFromReceipt(registryReceipt, finalSepoliaPublicClient);
          console.log('✅ Registry registration complete. EVVM ID from event:', evvmId);
        } catch (eventError) {
          // Method 3: Simulate the call again after transaction to get the return value
          console.warn('⚠️ No EVVMRegistered event found, simulating call to get EVVM ID...');
          try {
            const postTxSimulation = await finalSepoliaPublicClient.simulateContract({
              address: REGISTRY_ADDRESS,
              abi: REGISTRY_ABI,
              functionName: 'registerEvvm',
              args: [BigInt(formData.hostChainId), contracts.evvmCore],
              account: finalSepoliaWalletClient.account!,
            });
            evvmId = Number(postTxSimulation.result);
            console.log(`✅ Retrieved EVVM ID from post-transaction simulation: ${evvmId}`);
          } catch (simError: any) {
            console.warn('⚠️ Post-transaction simulation failed:', simError?.message || simError);
            
            // Method 4: Verify registration and try to find EVVM ID by querying registry
            const isNowRegistered = await finalSepoliaPublicClient.readContract({
              address: REGISTRY_ADDRESS,
              abi: REGISTRY_ABI,
              functionName: 'isAddressRegistered',
              args: [BigInt(formData.hostChainId), contracts.evvmCore]
            } as any);

            if (isNowRegistered) {
              console.log('✅ EVVM is registered. Searching for EVVM ID in registry...');
              
              // Try to find EVVM ID by querying all public EVVM IDs and checking metadata
              try {
                const publicEvvmIds = await finalSepoliaPublicClient.readContract({
                  address: REGISTRY_ADDRESS,
                  abi: REGISTRY_ABI,
                  functionName: 'getPublicEvvmIdActive',
                  args: []
                } as any) as bigint[];

                // Search through public EVVM IDs to find the one matching our address
                for (const id of publicEvvmIds) {
                  try {
                    const metadata = await finalSepoliaPublicClient.readContract({
                      address: REGISTRY_ADDRESS,
                      abi: REGISTRY_ABI,
                      functionName: 'getEvvmIdMetadata',
                      args: [id]
                    } as any) as { chainId: bigint; evvmAddress: Address };

                    if (
                      Number(metadata.chainId) === formData.hostChainId &&
                      metadata.evvmAddress.toLowerCase() === contracts.evvmCore.toLowerCase()
                    ) {
                      evvmId = Number(id);
                      console.log(`✅ Found EVVM ID ${evvmId} by searching registry metadata`);
                      break;
                    }
                  } catch (metaError) {
                    // Continue searching
                    continue;
                  }
                }

                if (!evvmId) {
                  throw new Error('Could not find EVVM ID in registry');
                }
              } catch (searchError: any) {
                console.error('Failed to search registry for EVVM ID:', searchError);
                throw new Error(
                  `EVVM is registered but could not retrieve EVVM ID. ` +
                  `Transaction: ${registryReceipt.transactionHash}\n` +
                  `Please check the transaction on Etherscan and manually query the registry for your EVVM ID.`
                );
              }
            } else {
              // EVVM is not registered and no event was emitted - this is unexpected
              throw new Error(
                `Registration transaction succeeded but EVVM is not registered and no event was emitted.\n\n` +
                `Transaction: ${registryReceipt.transactionHash}\n` +
                `Status: ${registryReceipt.status}\n` +
                `View on Etherscan: https://sepolia.etherscan.io/tx/${registryReceipt.transactionHash}\n\n` +
                `This may indicate:\n` +
                `1. The registry contract logic changed\n` +
                `2. The chain ID ${formData.hostChainId} is not whitelisted\n` +
                `3. The registration function requires additional parameters\n\n` +
                `Please check the transaction on Etherscan for detailed information.`
              );
            }
          }
        }
      }

      // Ensure we have an EVVM ID at this point
      if (!evvmId || evvmId === 0) {
        throw new Error(
          `Failed to retrieve EVVM ID after registration. ` +
          `Transaction succeeded but EVVM ID could not be determined. ` +
          `Transaction: ${registryReceipt.transactionHash}`
        );
      }

      // PHASE C: Switch back to original chain and set EVVM ID on EVVM Core
      setProgress({
        stage: 'configuring-evvm',
        message: 'Switching back to deployment chain to configure EVVM ID...'
      });

      await switchChainAsync({ chainId: formData.hostChainId });

      // Wait for chain switch to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (!walletClient || !publicClient) {
        throw new Error('Failed to reconnect to deployment chain after switching back');
      }

      // Verify we're back on the correct chain
      const deploymentChain = await publicClient.getChainId();
      if (deploymentChain !== formData.hostChainId) {
        throw new Error(`Failed to switch back to chain ${formData.hostChainId}. Please switch manually and call setEvvmID(${evvmId}) on your EVVM Core contract at ${contracts.evvmCore}.`);
      }

      setProgress({
        stage: 'configuring-evvm',
        message: `Setting EVVM ID ${evvmId} on EVVM Core contract...`
      });

      // Call setEvvmID on EVVM Core contract
      const setIdHash = await walletClient.writeContract({
        address: contracts.evvmCore,
        abi: EVVM_CORE_ABI,
        functionName: 'setEvvmID',
        args: [BigInt(evvmId)]
      } as any);

      setProgress({
        stage: 'configuring-evvm',
        message: 'Waiting for EVVM ID configuration...',
        txHash: setIdHash
      });

      // Determine confirmations based on host chain (not Sepolia)
      const isStoryChain = formData.hostChainId === 1315 || formData.hostChainId === 1514;
      const setIdReceipt = await publicClient.waitForTransactionReceipt({
        hash: setIdHash,
        confirmations: isStoryChain ? 5 : 3,
        timeout: 300_000
      });

      if (setIdReceipt.status !== 'success') {
        throw new Error('Failed to set EVVM ID on EVVM Core contract');
      }

      // Verify the ID was set correctly
      setProgress({
        stage: 'configuring-evvm',
        message: 'Verifying EVVM ID configuration...'
      });

      const verifiedEvvmId = await publicClient.readContract({
        address: contracts.evvmCore,
        abi: EVVM_CORE_ABI,
        functionName: 'getEvvmID'
      } as any) as bigint;

      if (Number(verifiedEvvmId) !== evvmId) {
        throw new Error(
          `EVVM ID verification failed. Expected ${evvmId}, got ${verifiedEvvmId}. ` +
          `The EVVM ID may not have been set correctly.`
        );
      }

      console.log(`✅ EVVM ID ${evvmId} successfully configured and verified!`);

      setProgress({
        stage: 'complete',
        message: 'Saving deployment data...'
      });

      // Save to database
      const { error: dbError } = await supabase
        .from('evvm_deployments')
        .insert([{
          user_id: userAddress?.toLowerCase(),
          evvm_name: formData.evvmName,
          principal_token_name: formData.principalTokenName,
          principal_token_symbol: formData.principalTokenSymbol,
          host_chain_id: formData.hostChainId,
          host_chain_name: formData.hostChainName,
          admin_address: formData.adminAddress,
          golden_fisher_address: formData.goldenFisherAddress,
          activator_address: formData.activatorAddress,
          total_supply: Number(formData.totalSupply),
          era_tokens: Number(formData.eraTokens),
          reward_per_operation: Number(formData.rewardPerOperation),
          evvm_core_address: contracts.evvmCore,
          name_service_address: contracts.nameService,
          staking_address: contracts.staking,
          estimator_address: contracts.estimator,
          treasury_address: contracts.treasury,
          deployment_tx_hash: contracts.deploymentTxHash,
          registry_tx_hash: registryHash,
          set_evvm_id_tx_hash: setIdHash,
          evvm_id: evvmId,
          deployment_status: 'completed'
        }]);

      if (dbError) throw dbError;

      setDeploymentResult({
        evvmId,
        addresses: {
          evvmCore: contracts.evvmCore,
          nameService: contracts.nameService,
          staking: contracts.staking,
          estimator: contracts.estimator,
          treasury: contracts.treasury
        },
        txHashes: {
          deployment: contracts.deploymentTxHash,
          registry: registryHash
        }
      });

      toast({
        title: 'EVVM Registered Successfully!',
        description: `Your EVVM has been assigned ID: ${evvmId}`
      });

    } catch (error) {
      console.error('Registration error:', error);
      
      let userMessage = 'Registry registration failed';
      let technicalDetails = '';
      
      if (error instanceof Error) {
        // Specific error handling for pre-flight validation
        if (error.message.includes('already registered')) {
          userMessage = 'EVVM Already Registered';
          technicalDetails = error.message;
        } else if (error.message.includes('not whitelisted')) {
          userMessage = 'Chain Not Supported';
          technicalDetails = error.message;
        }
        // Specific error handling for setEvvmID issues
        else if (error.message.includes('OnlyAdmin')) {
          userMessage = 'Not authorized to set EVVM ID';
          technicalDetails = `Only the admin address (${formData.adminAddress}) can set the EVVM ID. Please connect with the correct wallet.`;
        } else if (error.message.includes('WindowToChangeEvvmIDExpired')) {
          userMessage = 'EVVM ID window expired';
          technicalDetails = 'The 1-hour window to set EVVM ID has expired. The EVVM ID is now permanent.';
        } else if (error.message.includes('chain') || error.message.includes('Chain')) {
          userMessage = 'Network Mismatch';
          technicalDetails = 'Please make sure you are connected to Ethereum Sepolia (Chain ID: 11155111) before registering.';
        } else if (error.message.includes('User rejected') || error.message.includes('user rejected')) {
          userMessage = 'Transaction rejected in MetaMask';
          technicalDetails = 'Please approve the transaction to complete registration';
        } else {
          technicalDetails = error.message;
        }
      }
      
      toast({
        title: userMessage,
        description: technicalDetails,
        variant: 'destructive',
        duration: 10000
      });
    } finally {
      setRegistering(false);
    }
  };

  return {
    deploying,
    registering,
    progress,
    deployedContracts,
    deploymentResult,
    deployContracts,
    registerInRegistry
  };
}

function extractEvvmIdFromReceipt(receipt: any, publicClient: any): number {
  console.log('📋 Parsing receipt for EVVMRegistered event...');
  console.log('Receipt status:', receipt.status);
  console.log('Receipt logs count:', receipt.logs?.length || 0);
  
  // Try using viem's decodeEventLog for proper event parsing
  try {
    // Find the EVVMRegistered event using viem's decodeEventLog
    for (const log of receipt.logs || []) {
      try {
        // Check if this log is from the registry contract
        if (log.address.toLowerCase() !== REGISTRY_ADDRESS.toLowerCase()) {
          continue;
        }

        // Try to decode as EVVMRegistered event
        const decoded = decodeEventLog({
          abi: REGISTRY_ABI,
          data: log.data,
          topics: log.topics,
        });

        if (decoded.eventName === 'EVVMRegistered') {
          const evvmId = Number(decoded.args.evvmId);
          console.log('✅ Extracted EVVM ID using decodeEventLog:', evvmId);
          console.log('Event details:', decoded.args);
          return evvmId;
        }
      } catch (decodeError) {
        // Not the event we're looking for, continue
        continue;
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to decode events with viem, trying manual parsing:', error);
  }

  // Fallback: Manual topic matching
  console.log('🔄 Falling back to manual topic matching...');
  
  // Calculate keccak256 hash of the event signature
  // EVVMRegistered(uint256 indexed evvmId, address evvmCore, uint256 chainId)
  const eventSignature = keccak256(toHex('EVVMRegistered(uint256,address,uint256)'));
  console.log('Looking for event signature:', eventSignature);
  
  // Find the EVVMRegistered event in the logs
  const event = receipt.logs?.find((log: any) => {
    const isRegistryContract = log.address.toLowerCase() === REGISTRY_ADDRESS.toLowerCase();
    const matchesSignature = log.topics?.[0] === eventSignature;
    console.log('Log check:', { address: log.address, isRegistry: isRegistryContract, matchesSignature, topics: log.topics?.[0] });
    return isRegistryContract && matchesSignature;
  });
  
  if (!event || !event.topics || event.topics.length < 2) {
    console.error('❌ EVVM ID extraction failed.');
    console.error('Transaction status:', receipt.status);
    console.error('Registry address:', REGISTRY_ADDRESS);
    console.error('Expected event signature:', eventSignature);
    
    // Check if there are any logs from the registry contract
    const registryLogs = receipt.logs?.filter((log: any) => 
      log.address.toLowerCase() === REGISTRY_ADDRESS.toLowerCase()
    );
    console.error('Logs from registry contract:', registryLogs?.length || 0);
    
    if (registryLogs && registryLogs.length > 0) {
      console.error('Registry contract logs:', registryLogs.map((log: any) => ({
        address: log.address,
        topics: log.topics,
        data: log.data
      })));
    }
    
    // Log all receipt logs for debugging
    console.error('All receipt logs:', receipt.logs?.map((log: any) => ({
      address: log.address,
      topic0: log.topics?.[0],
      topicsCount: log.topics?.length
    })));
    
    // Provide helpful error message with transaction link
    const etherscanUrl = `https://sepolia.etherscan.io/tx/${receipt.transactionHash}`;
    throw new Error(
      `EVVMRegistered event not found in transaction receipt.\n\n` +
      `Transaction: ${receipt.transactionHash}\n` +
      `Status: ${receipt.status}\n` +
      `View on Etherscan: ${etherscanUrl}\n\n` +
      `Possible causes:\n` +
      `1. The transaction reverted (check Etherscan for revert reason)\n` +
      `2. The registry contract doesn't emit the expected event\n` +
      `3. The EVVM address is already registered\n` +
      `4. Chain ID ${receipt.chainId || 'unknown'} is not whitelisted\n\n` +
      `Please check the transaction on Etherscan for detailed error information.`
    );
  }
  
  // The evvmId is the first indexed parameter, stored in topics[1]
  // topics[0] = event signature hash
  // topics[1] = evvmId (uint256, indexed)
  const evvmId = hexToNumber(event.topics[1]);
  
  console.log('✅ Extracted EVVM ID (manual):', evvmId);
  return evvmId;
}

// Helper: Get block explorer URL based on chain ID
function getExplorerUrl(chainId: number): string {
  switch (chainId) {
    case 1315: return 'https://aeneid.storyscan.io';
    case 1514: return 'https://explorer.story.foundation';
    case 11155111: return 'https://sepolia.etherscan.io';
    case 421614: return 'https://sepolia.arbiscan.io';
    default: return `https://explorer.chain${chainId}.com`;
  }
}

// Helper: Get human-readable chain name
function getChainName(chainId: number): string {
  switch (chainId) {
    case 1315: return 'Story Aeneid Testnet';
    case 1514: return 'Story Mainnet';
    case 11155111: return 'Ethereum Sepolia';
    case 421614: return 'Arbitrum Sepolia';
    default: return `Chain ${chainId}`;
  }
}
