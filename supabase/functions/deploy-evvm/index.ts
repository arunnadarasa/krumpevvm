import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      evvmName,
      deployerAddress,
      deploymentTxHash,
      evvmCoreAddress,
      registryTxHash,
      evvmId,
      nameServiceAddress,
      stakingAddress,
      estimatorAddress,
      treasuryAddress,
    } = await req.json();

    console.log(`Saving deployment data for "${evvmName}"`);

    // Validate inputs
    if (!evvmName || !deployerAddress || !deploymentTxHash || !evvmCoreAddress) {
      throw new Error("Missing required deployment parameters");
    }

    // Save to database
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { error: dbError } = await supabaseClient
      .from('evvm_deployments')
      .update({
        deployment_status: 'deployed',
        deployment_tx_hash: deploymentTxHash,
        registry_tx_hash: registryTxHash || null,
        evvm_id: evvmId || null,
        evvm_core_address: evvmCoreAddress,
        name_service_address: nameServiceAddress || null,
        staking_address: stakingAddress || null,
        estimator_address: estimatorAddress || null,
        treasury_address: treasuryAddress || null,
        deployed_at: new Date().toISOString(),
      })
      .eq('deployer_address', deployerAddress)
      .eq('evvm_name', evvmName)
      .eq('deployment_status', 'pending');

    if (dbError) {
      console.error('Database update error:', dbError);
      throw new Error(`Failed to update deployment record: ${dbError.message}`);
    }

    console.log('✅ Deployment data saved!');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully saved deployment data for ${evvmName}`,
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
