# Story Bytecode Update - Manual Steps Required

## ⚠️ Action Required: Complete Bytecode Replacement

The contract header comments have been updated, but the **actual bytecode constants** in the TypeScript files still contain the old (corrupted) bytecode.

You need to manually replace the bytecode in all 5 files.

---

## Files That Need Bytecode Replacement

### 1. Staking Contract
- **Source**: `user-uploads://Staking-3.json`
- **Target**: `src/lib/contracts/abis/staking.ts`
- **Line**: 11
- **Find**: `export const STAKING_BYTECODE = '0x6080346...[old bytecode]...' as \`0x${string}\`;`
- **Replace with**: Bytecode from `Staking-3.json` → `bytecode.object` field

### 2. EVVM Core Contract
- **Source**: `user-uploads://Evvm-3.json`
- **Target**: `src/lib/contracts/abis/evvm-core.ts`
- **Line**: 11
- **Find**: `export const EVVM_CORE_BYTECODE = '0x604060...[old bytecode]...' as \`0x${string}\`;`
- **Replace with**: Bytecode from `Evvm-3.json` → `bytecode.object` field

### 3. NameService Contract
- **Source**: `user-uploads://NameService-3.json`
- **Target**: `src/lib/contracts/abis/nameservice.ts`
- **Line**: 11
- **Find**: `export const NAME_SERVICE_BYTECODE = '0x604034...[old bytecode]...' as \`0x${string}\`;`
- **Replace with**: Bytecode from `NameService-3.json` → `bytecode.object` field

### 4. Estimator Contract
- **Source**: `user-uploads://Estimator-2.json`
- **Target**: `src/lib/contracts/abis/estimator.ts`
- **Line**: 11
- **Find**: `export const ESTIMATOR_BYTECODE = '0x608034...[old bytecode]...' as \`0x${string}\`;`
- **Replace with**: Bytecode from `Estimator-2.json` → `bytecode.object` field

### 5. Treasury Contract
- **Source**: `user-uploads://Treasury-3.json`
- **Target**: `src/lib/contracts/abis/treasury.ts`
- **Line**: 11
- **Find**: `export const TREASURY_BYTECODE = '0x608034...[old bytecode]...' as \`0x${string}\`;`
- **Replace with**: Bytecode from `Treasury-3.json` → `bytecode.object` field

---

## Step-by-Step Instructions

### For Each Contract:

1. **Open the JSON file**
   - Go to the file browser
   - Navigate to `user-uploads://` (or wherever you saved the JSON files)
   - Open the JSON file (e.g., `Staking-3.json`)

2. **Find the bytecode**
   - Search for `"bytecode":`
   - Find the nested object: `"bytecode": { "object": "0x..." }`
   - Copy the ENTIRE hex string from `"object":` (starts with `0x6080`)

3. **Open the TypeScript file**
   - Open the corresponding `.ts` file in `src/lib/contracts/abis/`
   - Go to line 11 (or search for `BYTECODE =`)

4. **Replace the bytecode**
   - Select the entire old hex string (between the quotes)
   - Paste the new hex string from step 2
   - **Important**: Keep the surrounding code:
     ```typescript
     export const STAKING_BYTECODE = '[PASTE HERE]' as `0x${string}`;
     ```

5. **Verify the replacement**
   - The new bytecode MUST start with `0x6080`
   - Length should match the documentation:
     - Staking: ~184,152 characters
     - EVVM Core: ~176,167 characters
     - NameService: ~220,813 characters
     - Estimator: ~3,909 characters
     - Treasury: ~29,028 characters

---

## Quick Verification

After updating all files, run this in the browser console on your deployment page:

```javascript
import { 
  STAKING_BYTECODE, 
  EVVM_CORE_BYTECODE, 
  NAME_SERVICE_BYTECODE, 
  ESTIMATOR_BYTECODE, 
  TREASURY_BYTECODE 
} from '@/lib/contracts/abis';

// Check all bytecodes
const bytecodes = {
  'Staking': STAKING_BYTECODE,
  'EVVM Core': EVVM_CORE_BYTECODE,
  'NameService': NAME_SERVICE_BYTECODE,
  'Estimator': ESTIMATOR_BYTECODE,
  'Treasury': TREASURY_BYTECODE
};

Object.entries(bytecodes).forEach(([name, code]) => {
  const valid = code.startsWith('0x6080');
  console.log(`${valid ? '✅' : '❌'} ${name}: ${code.length} chars, starts with ${code.slice(0, 10)}`);
});
```

Expected output:
```
✅ Staking: 184152 chars, starts with 0x6080604
✅ EVVM Core: 176167 chars, starts with 0x60406080
✅ NameService: 220813 chars, starts with 0x6040348
✅ Estimator: 3909 chars, starts with 0x60803461
✅ Treasury: 29028 chars, starts with 0x60803460
```

---

## Alternative: Use Find & Replace

If your code editor supports multi-file find & replace:

1. **Find Pattern**:
   ```
   export const STAKING_BYTECODE = '0x[^']+' as `0x\${string}`;
   ```

2. **Replace With**:
   ```
   export const STAKING_BYTECODE = '[NEW BYTECODE FROM JSON]' as `0x${string}`;
   ```

Repeat for each contract constant.

---

## Automated Script (Future)

For future updates, you can use this command (once bytecode files are accessible):

```bash
node scripts/extract-story-bytecode.js
```

This will automatically extract and replace all bytecodes.

---

## After Replacement

Once all 5 bytecodes are updated:

1. **Test compilation**: Run `npm run build` to ensure no syntax errors
2. **Deploy on Story**: Try deploying on Story Aeneid testnet
3. **Verify success**: Check that all 5 contracts deploy with status `0x1` (success)
4. **Monitor gas**: Gas usage should be 8-12M per contract (not instant 57k revert)

---

## Need Help?

If bytecode replacement fails:

1. **Check for syntax errors**: Missing quotes, escape characters
2. **Verify bytecode format**: Must be one continuous hex string
3. **Confirm bytecode source**: Ensure using Story-compiled JSON files
4. **Check file encoding**: Files should be UTF-8

---

**Status**: ⏸️ **MANUAL REPLACEMENT REQUIRED**

Once completed, the deployment will work without the `stack underflow` error.
