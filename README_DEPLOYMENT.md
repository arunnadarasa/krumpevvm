# EVVM Deployment Implementation

This project integrates with `@evvm/testnet-contracts` NPM package for EVVM deployment.

## Current Status

✅ NPM package installed: `@evvm/testnet-contracts`
✅ Deployment infrastructure created
✅ Registry integration implemented
⚠️ **Bytecode required** for actual contract deployment

## Missing Components

To complete the deployment functionality, you need to provide compiled contract bytecode:

### Required Bytecode Files

The following contracts need their compiled bytecode added to `src/lib/contracts/abis/index.ts`:

1. **EVVM Core** (`Evvm.sol`)
2. **NameService** (`NameService.sol`)
3. **Staking** (`Staking.sol`)
4. **Estimator** (`Estimator.sol`)
5. **Treasury** (`Treasury.sol`)

### How to Get Bytecode

#### Option 1: From Foundry Compilation

If you have the EVVM contracts source code:

```bash
cd Testnet-Contracts
forge build
```

Bytecode location: `out/[ContractName].sol/[ContractName].json`

Extract the `bytecode.object` field from each JSON file.

#### Option 2: From Existing Deployment

If you have already deployed contracts, you can:
1. View the contract on Etherscan/Arbiscan
2. Copy the contract creation bytecode
3. Note: This includes constructor args, you'll need to separate them

#### Option 3: Use Edge Function for Deployment

Instead of client-side deployment, create a Supabase edge function that:
1. Uses Foundry's `forge create` command
2. Executes the deployment script server-side
3. Returns the deployed contract addresses

This is recommended for production use as it's more secure and reliable.

## Architecture

### Deployment Flow

```
1. User fills deployment wizard form
2. DeploymentWizard calls useEVVMDeployment hook
3. Hook calls deployEVVMContracts utility
4. Contracts deployed in sequence:
   - EVVM Core
   - NameService (references EVVM Core)
   - Staking (references EVVM Core)
   - Estimator (references EVVM Core + Staking)
   - Treasury (references EVVM Core)
5. EVVM Core initialized with all addresses
6. Switch to Ethereum Sepolia
7. Register in Registry contract
8. Save deployment data to Supabase
```

### Files Structure

```
src/
├── lib/
│   └── contracts/
│       ├── abis/
│       │   └── index.ts          # Contract ABIs and bytecode
│       └── evvmDeployment.ts     # Deployment logic
├── hooks/
│   └── useEVVMDeployment.ts      # React hook for deployment
└── components/
    └── DeploymentWizard.tsx       # UI component

supabase/
└── functions/
    └── deploy-evvm/
        └── registry-abi.ts        # Registry contract ABI
```

## Next Steps

### Immediate (Required for Deployment)

1. **Add Contract Bytecode**
   - Compile contracts using Foundry
   - Extract bytecode from compilation output
   - Add to `src/lib/contracts/abis/index.ts`

2. **Test Deployment**
   - Deploy to testnet (Sepolia or Arbitrum Sepolia)
   - Verify all 5 contracts deploy correctly
   - Confirm initialization works
   - Test registry registration

### Future Enhancements

1. **Contract Verification**
   - Create edge function using ETHERSCAN_API_KEY
   - Verify contracts automatically after deployment
   - Display verification status in UI

2. **Deployment Recovery**
   - Handle partial deployment failures
   - Allow resuming from failed step
   - Save intermediate state to database

3. **Gas Estimation**
   - Calculate deployment costs before execution
   - Show gas estimates to user
   - Optimize deployment transaction settings

4. **Multi-Chain Support**
   - Add more host chain options
   - Handle chain-specific deployment parameters
   - Support custom RPC URLs

## Alternative: Server-Side Deployment

For production use, consider implementing server-side deployment:

### Create Edge Function

```typescript
// supabase/functions/deploy-evvm-contracts/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { deploymentParams } = await req.json();
  
  // Execute Foundry deployment script
  const process = Deno.run({
    cmd: ["forge", "script", "script/DeployTestnet.s.sol", "--broadcast"],
    env: {
      // Pass deployment parameters as env vars
    }
  });
  
  const status = await process.status();
  
  // Parse deployment output
  // Extract contract addresses
  // Return results
});
```

This approach:
- ✅ More secure (private keys stay server-side)
- ✅ More reliable (uses official deployment scripts)
- ✅ Easier bytecode management
- ✅ Better error handling
- ❌ Requires Foundry in edge function environment

## Documentation References

- [EVVM QuickStart](https://docs.evvm.org/quickstart)
- [Registry EVVM Contract](https://docs.evvm.org/registry)
- [NPM Package](https://www.npmjs.com/package/@evvm/testnet-contracts)
