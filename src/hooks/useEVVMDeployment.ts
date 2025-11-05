import { useState } from 'react';
import { useAccount, usePublicClient, useWalletClient, useSwitchChain } from 'wagmi';
import { Address, Hash } from 'viem';
import { deployEVVMContracts, DeploymentProgress } from '@/lib/contracts/evvmDeployment';
import { REGISTRY_ABI, REGISTRY_ADDRESS } from '../../supabase/functions/deploy-evvm/registry-abi';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sepolia } from 'wagmi/chains';

interface DeploymentFormData {
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

export function useEVVMDeployment() {
  const [deploying, setDeploying] = useState(false);
  const [progress, setProgress] = useState<DeploymentProgress | null>(null);
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
  const { switchChainAsync } = useSwitchChain();
  const { toast } = useToast();

  const deployEVVM = async (formData: DeploymentFormData) => {
    if (!walletClient || !publicClient || !userAddress) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to deploy',
        variant: 'destructive'
      });
      return;
    }

    setDeploying(true);
    setProgress(null);
    setDeploymentResult(null);

    try {
      // Step 1: Deploy EVVM contracts on host chain
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

      // Step 2: Switch to Ethereum Sepolia for registry
      setProgress({
        stage: 'complete',
        message: 'Switching to Ethereum Sepolia for registration...'
      });

      await switchChainAsync({ chainId: 11155111 }); // Sepolia

      // Step 3: Register in Registry
      setProgress({
        stage: 'complete',
        message: 'Registering EVVM in Registry...'
      });

      const registryHash = await walletClient.writeContract({
        address: REGISTRY_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: 'registerEvvm',
        args: [BigInt(formData.hostChainId), contracts.evvmCoreAddress]
      } as any);

      const registryReceipt = await publicClient.waitForTransactionReceipt({
        hash: registryHash
      });

      // Extract EVVM ID from events
      const evvmId = extractEvvmIdFromReceipt(registryReceipt);

      // Step 4: Save to database
      setProgress({
        stage: 'complete',
        message: 'Saving deployment data...'
      });

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
          evvm_core_address: contracts.evvmCoreAddress,
          name_service_address: contracts.nameServiceAddress,
          staking_address: contracts.stakingAddress,
          estimator_address: contracts.estimatorAddress,
          treasury_address: contracts.treasuryAddress,
          deployment_tx_hash: contracts.deploymentTxHash,
          registry_tx_hash: registryHash,
          evvm_id: evvmId,
          deployment_status: 'deployed'
        }]);

      if (dbError) throw dbError;

      setDeploymentResult({
        evvmId,
        addresses: {
          evvmCore: contracts.evvmCoreAddress,
          nameService: contracts.nameServiceAddress,
          staking: contracts.stakingAddress,
          estimator: contracts.estimatorAddress,
          treasury: contracts.treasuryAddress
        },
        txHashes: {
          deployment: contracts.deploymentTxHash,
          registry: registryHash
        }
      });

      toast({
        title: 'EVVM Deployed Successfully!',
        description: `Your EVVM has been assigned ID: ${evvmId}`
      });

    } catch (error) {
      console.error('Deployment error:', error);
      toast({
        title: 'Deployment Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setDeploying(false);
    }
  };

  return {
    deploying,
    progress,
    deploymentResult,
    deployEVVM
  };
}

function extractEvvmIdFromReceipt(receipt: any): number {
  // Extract EVVM ID from EVVMRegistered event
  const event = receipt.logs.find((log: any) => 
    log.topics[0] === '0x...' // EVVMRegistered event signature
  );
  
  if (!event) {
    throw new Error('EVVM ID not found in transaction receipt');
  }
  
  // Parse event data to get evvmId
  // This is a placeholder - actual implementation depends on event structure
  return 1000; // Placeholder
}
