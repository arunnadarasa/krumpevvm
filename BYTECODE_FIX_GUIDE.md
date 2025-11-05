# 🔧 EVVM Contract Bytecode Fix Guide

## ✅ Problem Identified

Your contract deployments are **failing in the constructor** because the bytecode from `@evvm/testnet-contracts` v2.1.0 is **INCOMPLETE**.

### Evidence:
- ❌ Transaction Status: **Failed (0x0)**
- ❌ Gas Usage: **57,567 / 12,000,000 (0.48%)** → Instant revert
- ❌ Contract Bytecode: **`0x`** → Nothing deployed
- ❌ All 5 contracts fail the same way

## 🎯 Root Cause

The NPM package provides **constructor-only bytecode**, missing the **runtime bytecode**:

```
❌ WRONG (Current):
[Constructor Code] + [ABI-encoded Constructor Args]

✅ CORRECT (Required):
[Constructor Code] + [Runtime Code] + [ABI-encoded Constructor Args]
```

## ✅ Solution Implemented

I've already fixed **1 of 5 contracts**:

### ✅ Estimator Contract - FIXED
- Updated `src/lib/contracts/abis/estimator.ts`
- Now contains **complete bytecode** (3,766 characters)
- Includes full ABI with 24 functions
- Ready for deployment

## 📋 Next Steps - UPLOAD REMAINING CONTRACTS

To fix the remaining 4 contracts, I need you to upload their **compilation JSON artifacts**:

### Required Files:

1. **Staking.json** - Constructor: `(initialAdmin, initialGoldenFisher)`
2. **EVVM.json** or **EVVMCore.json** - Constructor: `(admin, metadata)`
3. **NameService.json** - Constructor: `(evvmAddress, initialOwner)`
4. **Treasury.json** - Constructor: `(evvmAddress)`

### Where to Find These Files:

#### Option A: From `node_modules/@evvm/testnet-contracts`
```bash
# Look for compiled artifacts in:
node_modules/@evvm/testnet-contracts/artifacts/
node_modules/@evvm/testnet-contracts/out/
node_modules/@evvm/testnet-contracts/dist/
```

#### Option B: Compile Locally with Foundry
```bash
# If source files are available:
cd node_modules/@evvm/testnet-contracts
forge build

# Artifacts will be in:
./out/Staking.sol/Staking.json
./out/EVVM.sol/EVVM.json
./out/NameService.sol/NameService.json
./out/Treasury.sol/Treasury.json
```

#### Option C: From EVVM GitHub Repository
```bash
git clone https://github.com/evvm/testnet-contracts
cd testnet-contracts
forge build
```

### Expected JSON Format:

Each file should look like:
```json
{
  "abi": [
    {"type": "constructor", ...},
    {"type": "function", ...}
  ],
  "bytecode": {
    "object": "0x60806040..."  // ← FULL deployment bytecode
  },
  "deployedBytecode": {
    "object": "0x608060405..."  // ← Runtime bytecode
  }
}
```

## 🚀 Once You Upload the Files

I will:
1. ✅ Extract complete bytecode from each JSON
2. ✅ Update corresponding ABI files in `src/lib/contracts/abis/`
3. ✅ Verify bytecode completeness
4. ✅ Ready for Story blockchain deployment

## 📊 Progress Tracker

- [x] **Estimator** - ✅ COMPLETE (3,766 chars bytecode)
- [ ] **Staking** - ⏳ Waiting for JSON
- [ ] **EVVM Core** - ⏳ Waiting for JSON
- [ ] **NameService** - ⏳ Waiting for JSON
- [ ] **Treasury** - ⏳ Waiting for JSON

## 🔍 How to Verify Bytecode is Complete

A complete deployment bytecode should:
- ✅ Start with `0x6080604052` (constructor)
- ✅ Be **very long** (typically 5,000-50,000+ characters)
- ✅ Include runtime code that deploys on-chain
- ✅ Match the pattern from Estimator.json

Incomplete bytecode (what you have now):
- ❌ Starts with `0x6080346100cd` (truncated)
- ❌ Only 200-500 characters
- ❌ Missing runtime section
- ❌ Causes instant constructor revert

## 📝 Alternative: Manual Bytecode Extraction

If you have access to Story-deployed EVVM contracts, I can extract bytecode from:
- Verified contracts on Story Explorer
- Transaction data from successful deployments
- ABI + bytecode from official EVVM documentation

---

**Upload the 4 JSON files to continue the fix!** 🚀
