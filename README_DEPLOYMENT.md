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

## Why Two Networks?

Your EVVM deployment involves **TWO blockchains**:

1. **Host Chain** (Story Testnet, Arbitrum Sepolia, or Ethereum Sepolia)
   - Where your EVVM contracts are deployed
   - Where your EVVM executes operations
   - Where gas fees are paid in the native token

2. **Registry Chain** (Always Ethereum Sepolia)
   - Global registry of all EVVMs
   - Assigns unique EVVM IDs
   - Enables cross-chain discovery

### Deployment Flow

```
Step 1-3: Deploy contracts → Your chosen network (e.g., Story Testnet)
          ↓
Step 4:   Switch wallet → Ethereum Sepolia
          ↓
Step 5:   Register → Sepolia Registry Contract
          ↓
Result:   EVVM ID assigned (1000+)
```

### Estimated Costs

- **Deployment** (Story Testnet): ~0.12 IP tokens
- **Deployment** (Arbitrum Sepolia): ~0.08 ETH
- **Registration** (Ethereum Sepolia): ~0.003 ETH
- **Total networks**: 2 different testnets

---

## Troubleshooting Deployment Issues

### Common Errors and Solutions

#### "Transaction dropped or replaced" / "Transaction 30 failed"

**Cause**: Gas price too low, network congestion, or MetaMask transaction queue issues

**Immediate Solutions**:
1. **Reset MetaMask Account** (clears pending transactions):
   - Settings → Advanced → Clear activity tab data
   - Or: Settings → Advanced → Reset account (safer for testnets)

2. **Increase Gas Settings** in MetaMask:
   - Click "Market" → "Advanced"
   - Set **Max base fee**: 40-50 Gwei
   - Set **Priority fee**: 2-3 Gwei
   - For Story Testnet: Use default settings

3. **Get Fresh Testnet ETH**:
   - You need ~0.15-0.2 ETH for full deployment
   - [Sepolia Faucet](https://sepoliafaucet.com/)
   - [Arbitrum Sepolia Faucet](https://faucet.quicknode.com/arbitrum/sepolia)
   - Wait 5-10 minutes after resetting before deploying

4. **Deploy During Low Traffic**:
   - Best times: Early morning UTC (2-6 AM)
   - Avoid: Weekday afternoons UTC (2-6 PM)

#### "Insufficient funds" / "Gas estimation failed"

**Cause**: Not enough ETH in wallet

**Solution**:
- Check balance: You need minimum 0.15 ETH
- Get more from faucet (see links above)
- Ensure you're on correct network in MetaMask

#### "User rejected transaction"

**Cause**: You declined a transaction in MetaMask

**Solution**:
- Start deployment again
- You must approve all 7 transactions for complete deployment
- Transaction sequence:
  1. Deploy Staking (largest contract)
  2. Deploy EVVM Core
  3. Deploy NameService
  4. Deploy Estimator
  5. Deploy Treasury
  6. Setup EVVM Core
  7. Setup Staking

#### "Pre-flight checks failed: Invalid address"

**Cause**: One or more addresses are not valid Ethereum addresses

**Solution**:
- All addresses must start with `0x`
- All addresses must be exactly 42 characters
- Use checksummed addresses when possible
- Common mistake: Missing `0x` prefix

#### Deployment Hangs / Takes Too Long

**Cause**: Network issues or low gas price

**Solution**:
1. Check block explorer to see if transactions are pending
2. If pending for >5 minutes, increase gas and retry
3. If transaction shows as failed, check error message on block explorer
4. Reset MetaMask and start fresh if stuck

### Optimal MetaMask Settings for Deployment

**For Ethereum Sepolia / Arbitrum Sepolia**:
- Gas Limit: Auto (let wallet estimate)
- Max Base Fee: 40-50 Gwei
- Priority Fee: 2-3 Gwei
- Advanced: Enable "Customize transaction nonce" if deploying multiple times

**For Story Testnet**:
- Use default gas settings
- Network handles gas pricing automatically

### Pre-Deployment Checklist

✅ Wallet has at least 0.15 ETH  
✅ Connected to correct network  
✅ All addresses are valid (42 chars, start with 0x)  
✅ MetaMask has no pending transactions  
✅ Browser console shows no errors  
✅ Network is not congested (check block explorer)

### Recovery from Failed Deployment

If deployment fails mid-way:

1. **Check what deployed**: Look at recent transactions in MetaMask
2. **Note deployed addresses**: Save any successful contract deployments
3. **Don't retry immediately**: Wait 5 minutes for blockchain to settle
4. **Reset and start fresh**: Clear MetaMask activity and deploy again
5. **Contact support**: If repeated failures, share transaction hashes

### Getting Help

If you continue to experience issues:

1. **Collect Information**:
   - Network name
   - Failed transaction hashes
   - Error messages from console (F12)
   - Screenshots of MetaMask prompts

2. **Check Block Explorer**:
   - [Sepolia Etherscan](https://sepolia.etherscan.io/)
   - [Arbitrum Sepolia](https://sepolia.arbiscan.io/)
   - [Story Explorer](https://aeneid.explorer.story.foundation/)

3. **Debug Mode**:
   - Open browser console (F12)
   - Look for red error messages
   - Check Network tab for failed requests

## Documentation References

- [EVVM QuickStart](https://docs.evvm.org/quickstart)
- [Registry EVVM Contract](https://docs.evvm.org/registry)
- [NPM Package](https://www.npmjs.com/package/@evvm/testnet-contracts)
- [MetaMask Troubleshooting](https://support.metamask.io/hc/en-us/articles/360015489251)
