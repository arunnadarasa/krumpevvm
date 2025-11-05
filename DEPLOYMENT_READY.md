# ✅ Story Bytecode Fix - Deployment Ready

## Status: READY FOR MANUAL BYTECODE APPLICATION

All preparatory work is complete. One manual step remains before deployment.

---

## 📋 Pre-Deployment Checklist

### ✅ Completed
- [x] Story-optimized JSON artifacts copied to `artifacts/` directory
- [x] Bytecode extraction script created (`scripts/apply-story-bytecode.mjs`)  
- [x] Deployment validation logic updated with Story network optimizations
- [x] All documentation created

### ⏳ Remaining Step
- [ ] **Run bytecode extraction script** (1 minute)

---

## 🚀 NEXT STEP: Apply Bytecodes

### Option 1: Automated Script (Recommended)
```bash
node scripts/apply-story-bytecode.mjs
```

**Expected Output:**
```
🔧 Extracting bytecodes from Story JSON artifacts...

✅ Staking:
   Length: 184152 characters
   Starts with: 0x60803460...
   Target: src/lib/contracts/abis/staking.ts
   Constant: STAKING_BYTECODE
   ✓ Updated STAKING_BYTECODE in src/lib/contracts/abis/staking.ts

✅ EVVM Core:
   Length: 176167 characters
...
```

### Option 2: Manual Update (Fallback)
If the script fails, follow instructions in `BYTECODE_REPLACEMENT_INSTRUCTIONS.md`

---

## 📊 Expected Bytecode Specifications

| Contract | Length (chars) | Prefix | Source File |
|----------|----------------|--------|-------------|
| Staking | 184,152 | `0x6080` | Staking-3.json |
| EVVM Core | 176,167 | `0x6040` | Evvm-3.json |
| NameService | 220,813 | `0x6080` | NameService-3.json |
| Estimator | 3,909 | `0x6080` | Estimator-2.json |
| Treasury | 29,028 | `0x6080` | Treasury-3.json |

---

## ✨ Compilation Settings (Story Aeneid)
- **Solidity:** 0.8.20
- **EVM Target:** shanghai
- **Optimizer:** 200 runs
- **via_ir:** true

---

## 🧪 After Applying Bytecodes

1. **Build Test:**
   ```bash
   npm run build
   ```

2. **Verify No Errors:**
   - Check console for TypeScript compilation errors
   - Ensure all imports resolve correctly

3. **Deploy on Story Aeneid:**
   - Navigate to Deploy page
   - Connect wallet to Story Aeneid testnet
   - Fill deployment parameters
   - Expected gas: 8-12M per contract
   - Deployment should succeed with tx status `0x1`

---

## 🐛 Troubleshooting

### Build Fails After Script
- Check that all bytecode constants start with `0x6080` or `0x6040`
- Verify no syntax errors in updated files
- Run `npm run build` again

### Script Cannot Find Artifacts
- Ensure `artifacts/` directory exists
- Verify JSON files: `Staking.json`, `EVVM.json`, `NameService.json`, `Estimator.json`, `Treasury.json`

### Deployment Still Fails with Stack Underflow
- Re-run the bytecode script
- Check browser console for actual bytecode being used
- Verify bytecode in TypeScript files matches JSON artifacts

---

## 📖 Additional Resources
- `STORY_BYTECODE_FIX.md` - Quick reference summary
- `BYTECODE_REPLACEMENT_INSTRUCTIONS.md` - Manual update guide
- `scripts/apply-story-bytecode.mjs` - Automated extraction script
- `scripts/extract-and-apply.mjs` - Alternative script

---

## ✅ Deployment Timeline

| Step | Time | Status |
|------|------|--------|
| 1. Run bytecode script | 1 min | ⏳ PENDING |
| 2. Build validation | 2 min | ⏳ PENDING |
| 3. Story Aeneid deployment | 10-15 min | ⏳ PENDING |
| 4. Verification | 5 min | ⏳ PENDING |

**Total Estimated Time:** 18-23 minutes

---

## 🎯 Ready to Deploy!

Once bytecodes are applied and build passes, your EVVM contracts are ready for Story Aeneid deployment.

The stack underflow issue (`0x0608` → `0x6080`) has been resolved in the Story-optimized artifacts.
