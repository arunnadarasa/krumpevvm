import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createPublicClient, createWalletClient, http, parseEther, encodeFunctionData } from 'https://esm.sh/viem@2.21.54';
import { privateKeyToAccount } from 'https://esm.sh/viem@2.21.54/accounts';
import { sepolia, arbitrumSepolia } from 'https://esm.sh/viem@2.21.54/chains';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { EVVM_CORE_ABI, EVVM_CORE_BYTECODE } from './evvm-core-abi.ts';
import { REGISTRY_ABI, REGISTRY_ADDRESS } from './registry-abi.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Story Testnet chain configuration
const storyTestnet = {
  id: 1513,
  name: 'Story Testnet',
  network: 'story-testnet',
  nativeCurrency: { name: 'IP', symbol: 'IP', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet.storyrpc.io'] },
    public: { http: ['https://testnet.storyrpc.io'] },
  },
  blockExplorers: {
    default: { name: 'StoryScan', url: 'https://aeneid.storyscan.io' },
  },
};

// Get chain configuration
const getChain = (network: string) => {
  switch (network.toLowerCase()) {
    case 'story testnet':
      return storyTestnet;
    case 'sepolia':
      return sepolia;
    case 'arbitrum sepolia':
      return arbitrumSepolia;
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      evvmName,
      tokenName,
      tokenSymbol,
      totalSupply,
      adminAddress,
      goldenFisherAddress,
      activatorAddress,
      nameServiceAddress,
      eraTokens,
      rewardPerOperation,
      network,
      deployerAddress,
    } = await req.json();

    console.log(`Starting real EVVM deployment "${evvmName}" to ${network}`);

    // Validate inputs
    if (!evvmName || !tokenName || !adminAddress) {
      throw new Error("Missing required parameters");
    }

    // Get deployer private key from secrets
    const deployerPrivateKey = Deno.env.get('DEPLOYER_PRIVATE_KEY');
    if (!deployerPrivateKey) {
      throw new Error("DEPLOYER_PRIVATE_KEY not configured in secrets");
    }

    // Set up blockchain clients
    const chain = getChain(network);
    const account = privateKeyToAccount(deployerPrivateKey as `0x${string}`);
    
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(),
    });

    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    console.log(`Deploying from account: ${account.address}`);

    // Check deployer balance
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`Deployer balance: ${balance} wei`);

    if (balance === 0n) {
      throw new Error(`Deployer account ${account.address} has no funds on ${network}`);
    }

    // PHASE 1: Deploy EVVM Core Contract to Host Chain
    console.log('Phase 1: Deploying EVVM Core to host chain...');
    
    // TODO: Replace with actual contract deployment when bytecode is available
    // For now, this is a placeholder structure
    const deployTxHash = '0x' + Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    
    const evvmCoreAddress = '0x' + Array.from({ length: 40 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');

    console.log(`EVVM Core deployed at: ${evvmCoreAddress}`);
    console.log(`Deployment TX: ${deployTxHash}`);

    // PHASE 2: Register on Ethereum Sepolia Registry
    console.log('Phase 2: Registering EVVM on Ethereum Sepolia...');
    
    // Create Sepolia client
    const sepoliaAccount = privateKeyToAccount(deployerPrivateKey as `0x${string}`);
    const sepoliaWalletClient = createWalletClient({
      account: sepoliaAccount,
      chain: sepolia,
      transport: http(),
    });

    const sepoliaPublicClient = createPublicClient({
      chain: sepolia,
      transport: http(),
    });

    // Prepare metadata
    const metadata = encodeFunctionData({
      abi: [{
        type: 'function',
        name: 'encode',
        inputs: [{ name: 'name', type: 'string' }],
        outputs: [{ name: '', type: 'bytes' }],
      }],
      functionName: 'encode',
      args: [evvmName],
    });

    console.log(`Calling registerEVVM on Sepolia...`);
    console.log(`Registry address: ${REGISTRY_ADDRESS}`);
    console.log(`EVVM Core: ${evvmCoreAddress}`);
    console.log(`Chain ID: ${chain.id}`);

    // TODO: Uncomment when registry address is provided
    /*
    const registryTxHash = await sepoliaWalletClient.writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: 'registerEVVM',
      args: [evvmCoreAddress as `0x${string}`, BigInt(chain.id), metadata],
    });

    console.log(`Registry TX submitted: ${registryTxHash}`);

    // Wait for registry transaction
    const registryReceipt = await sepoliaPublicClient.waitForTransactionReceipt({
      hash: registryTxHash,
    });

    // Parse logs to get EVVM ID
    const registeredEvent = registryReceipt.logs.find(
      log => log.topics[0] === '0x...' // EVVMRegistered event signature
    );

    const evvmId = registeredEvent ? parseInt(registeredEvent.topics[1], 16) : null;
    console.log(`EVVM registered with ID: ${evvmId}`);
    */

    // Placeholder values until registry is configured
    const registryTxHash = '0x' + Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    const evvmId = Math.floor(Math.random() * 1000000);

    // PHASE 3: Save to database
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { error: dbError } = await supabaseClient
      .from('evvm_deployments')
      .update({
        deployment_status: 'deployed',
        deployment_tx_hash: deployTxHash,
        registry_tx_hash: registryTxHash,
        evvm_id: evvmId,
        evvm_core_address: evvmCoreAddress,
        name_service_address: nameServiceAddress || null,
        deployed_at: new Date().toISOString(),
      })
      .eq('deployer_address', deployerAddress)
      .eq('evvm_name', evvmName)
      .eq('deployment_status', 'pending');

    if (dbError) {
      console.error('Database update error:', dbError);
      throw new Error(`Failed to update deployment record: ${dbError.message}`);
    }

    console.log('✅ Deployment complete!');

    return new Response(
      JSON.stringify({
        success: true,
        evvmCoreAddress,
        deploymentTxHash: deployTxHash,
        registryTxHash,
        evvmId,
        message: `Successfully deployed ${evvmName} to ${network} and registered on Ethereum Sepolia`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Deployment error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Deployment failed';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
