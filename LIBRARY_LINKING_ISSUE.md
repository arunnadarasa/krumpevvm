# Library Linking Issue - Action Required

## 🔴 Critical Issue

The EVVM contract bytecode contains **unresolved library placeholders** that prevent deployment.

### What Was Found

- **1 library placeholder** in `EVVM.json` (1 instance)
- **3 library placeholders** in `NameService.json` (same library)
- **All placeholders use the same hash**: `35ea76b460e6affb63c860aedde9e1747c`

### What This Means

The bytecode in your JSON artifacts was compiled with library dependencies that weren't linked. In Solidity, when you use libraries, the compiler leaves placeholders like `__$<hash>$__` that must be replaced with the actual deployed library address before deployment.

### Why Deployment Fails

When you try to deploy, viem/MetaMask tries to convert the bytecode string to bytes, but it encounters invalid characters (underscores) from the placeholder, causing:
```
Cannot convert string to Uint8Array. toBytes only supports 0x-prefixed hex strings
```

## ✅ Solution Options

### Option 1: Get Properly Linked Bytecode from Story (Recommended)

Contact Story Protocol support and request:
- **Properly linked bytecode** for EVVM contracts on Story Network (Aeneid Testnet)
- OR the **library address** for hash `35ea76b460e6affb63c860aedde9e1747c`

Once you have the library address, you can use the fix script:
```bash
node scripts/fix-library-placeholder.mjs
```

### Option 2: Recompile Contracts with Library Linking

If you have the contract source code and the library is deployed:

1. **Find the library address** on Story Network
2. **Link the library** during compilation using Foundry:
   ```bash
   forge build --libraries SignatureRecover:0x<LibraryAddress>
   ```
3. **Extract the linked bytecode** from the new artifacts

### Option 3: Use Zero Address (Temporary Workaround)

⚠️ **NOT RECOMMENDED** - This may cause contract functionality to fail.

If you need to test deployment immediately, you can replace the placeholder with a zero address, but the contract will likely fail at runtime when it tries to call the library.

## 📋 Steps to Fix

### Step 1: Identify the Library

Based on the documentation, the library is likely:
- **`SignatureRecover`** from `@evvm/testnet-contracts/library/SignatureRecover.sol`

### Step 2: Get the Library Address

Ask Story Protocol:
- "What is the deployed address of the SignatureRecover library on Story Aeneid Testnet?"
- OR "What is the library address for hash `35ea76b460e6affb63c860aedde9e1747c`?"

### Step 3: Update the Fix Script

Edit `scripts/fix-library-placeholder.mjs` and add the mapping:

```javascript
const LIBRARY_ADDRESSES = {
  '35ea76b460e6affb63c860aedde9e1747c': '0x<LibraryAddressFromStory>',
};
```

### Step 4: Run the Fix Script

```bash
node scripts/fix-library-placeholder.mjs
```

This will:
1. Replace all placeholders in the JSON artifacts
2. Update the artifacts with properly linked bytecode

### Step 5: Re-extract Bytecode to TypeScript

After fixing the JSON artifacts, re-run the bytecode extraction:

```bash
node scripts/apply-story-bytecode.mjs
```

This will update the TypeScript constants with the fixed bytecode.

## 🔍 Verification

After fixing, verify the bytecode is clean:

```bash
node scripts/fix-library-placeholder.mjs
```

You should see:
```
✅ No placeholders found in EVVM.json
✅ No placeholders found in NameService.json
```

Then verify the bytecode in TypeScript files:
```bash
# The deployment validation will catch any remaining issues
```

## 📞 Next Steps

1. **Contact Story Protocol** to get the library address
2. **Update the fix script** with the library address
3. **Run the fix script** to update artifacts
4. **Re-extract bytecode** to TypeScript files
5. **Try deployment again**

## 📖 References

- [Solidity Library Linking](https://docs.soliditylang.org/en/latest/using-the-compiler.html#library-linking)
- [Foundry Library Linking](https://book.getfoundry.sh/reference/forge/forge-build#library-linking)
- Story Protocol Documentation: Check for library deployment information

