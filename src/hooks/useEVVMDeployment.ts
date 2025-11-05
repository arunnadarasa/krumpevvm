import { useState } from 'react';
import { useAccount, usePublicClient, useWalletClient, useSwitchChain } from 'wagmi';
import { Address, Hash, keccak256, toHex, hexToNumber } from 'viem';
import { deployEVVMContracts, DeploymentProgress } from '@/lib/contracts/evvmDeployment';
import { REGISTRY_ABI, REGISTRY_ADDRESS } from '../../supabase/functions/deploy-evvm/registry-abi';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sepolia } from 'wagmi/chains';

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

  const { address: userAddress } = useAccount();
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
        message: 'Preparing to switch to Ethereum Sepolia...'
      });

      await switchChainAsync({ chainId: 11155111 }); // Sepolia

      // Wait for clients to update after chain switch
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (!sepoliaWalletClient || !sepoliaPublicClient) {
        throw new Error('Failed to get Sepolia clients. Please ensure you are connected to Ethereum Sepolia.');
      }

      // Verify we're on Sepolia
      const currentChain = await sepoliaPublicClient.getChainId();
      if (currentChain !== 11155111) {
        throw new Error(`Wrong network. Expected Ethereum Sepolia (11155111), currently on chain ${currentChain}. Please switch to Sepolia manually.`);
      }

      setProgress({
        stage: 'registering',
        message: 'Registering EVVM in global registry...'
      });

      const registryHash = await sepoliaWalletClient.writeContract({
        address: REGISTRY_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: 'registerEvvm',
        args: [BigInt(formData.hostChainId), contracts.evvmCore],
        chain: sepolia,
        account: sepoliaWalletClient.account!
      });

      setProgress({
        stage: 'registering',
        message: 'Waiting for registry confirmation...',
        txHash: registryHash
      });

      const registryReceipt = await sepoliaPublicClient.waitForTransactionReceipt({
        hash: registryHash,
        confirmations: 3,
        timeout: 300_000
      });

      // Extract EVVM ID from events
      const evvmId = extractEvvmIdFromReceipt(registryReceipt);

      setProgress({
        stage: 'complete',
        message: 'Saving deployment data...'
      });

      // Save to database
      const { error: dbError } = await supabase
        .from('evvm_deployments')
        .insert([{
          user_id: userAddress,
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
          evvm_id: evvmId,
          deployment_status: 'deployed'
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
        if (error.message.includes('chain') || error.message.includes('Chain')) {
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

function extractEvvmIdFromReceipt(receipt: any): number {
  // Calculate keccak256 hash of the event signature
  // EVVMRegistered(uint256 indexed evvmId, address evvmCore, uint256 chainId)
  const eventSignature = keccak256(toHex('EVVMRegistered(uint256,address,uint256)'));
  
  // Find the EVVMRegistered event in the logs
  const event = receipt.logs.find((log: any) => 
    log.topics[0] === eventSignature
  );
  
  if (!event || !event.topics || event.topics.length < 2) {
    console.error('EVVM ID extraction failed. Receipt logs:', receipt.logs);
    throw new Error('EVVMRegistered event not found in transaction receipt. The registry transaction may have failed.');
  }
  
  // The evvmId is the first indexed parameter, stored in topics[1]
  // topics[0] = event signature hash
  // topics[1] = evvmId (uint256, indexed)
  const evvmId = hexToNumber(event.topics[1]);
  
  console.log('Extracted EVVM ID:', evvmId);
  return evvmId;
}
