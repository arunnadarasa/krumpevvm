# Files to Upload to GitHub

This document lists all files that will be committed to the repository.

## Summary
- **Total files**: ~130+ source files
- **Excluded**: `node_modules/`, `dist/`, `.env` files (as per `.gitignore`)

## File Structure

### Configuration Files (Root)
- `.gitignore`
- `package.json`
- `package-lock.json`
- `bun.lockb`
- `components.json`
- `eslint.config.js`
- `foundry.toml`
- `index.html`
- `postcss.config.js`
- `tailwind.config.ts`
- `tsconfig.json`
- `tsconfig.app.json`
- `tsconfig.node.json`
- `vite.config.ts`

### Documentation Files
- `README.md`
- `README_DEPLOYMENT.md`
- `BYTECODE_FIX_GUIDE.md`
- `BYTECODE_REPLACEMENT_INSTRUCTIONS.md`
- `DEPLOYMENT_READY.md`
- `IMPLEMENTATION_SUMMARY.md`
- `LIBRARY_LINKING_ISSUE.md`
- `STORY_BYTECODE_FIX.md`
- `llms-full.txt` (large documentation file - consider excluding if too large)

### Artifacts (Contract ABIs)
- `artifacts/Estimator.json`
- `artifacts/EVVM.json`
- `artifacts/NameService.json`
- `artifacts/Staking.json`
- `artifacts/Treasury.json`

### Public Assets
- `public/favicon.ico`
- `public/placeholder.svg`
- `public/robots.txt`
- `public/story-logo.svg`

### Scripts
- `scripts/apply-story-bytecode.mjs`
- `scripts/extract-and-apply.mjs`
- `scripts/extract-bytecode.ts`
- `scripts/extract-bytecodes.js`
- `scripts/extract-story-bytecode.js`
- `scripts/fix-library-placeholder.mjs`
- `scripts/run-bytecode-extract.sh`
- `scripts/update-story-bytecode.ts`

### Source Code (`src/`)

#### Root Source Files
- `src/main.tsx`
- `src/App.tsx`
- `src/index.css`
- `src/vite-env.d.ts`

#### Components (`src/components/`)
- `src/components/Header.tsx`
- `src/components/DeploymentWizard.tsx`
- `src/components/PublicEVVMBrowser.tsx`
- `src/components/Web3Provider.tsx`
- `src/components/toolkit/ToolkitSelector.tsx`
- `src/components/toolkit/FunctionCategorySelector.tsx`
- `src/components/toolkit/forms/FaucetBalanceForms.tsx`
- `src/components/toolkit/forms/PaymentSignatureForms.tsx`
- `src/components/toolkit/shared/AddressInputField.tsx`
- `src/components/toolkit/shared/NonceGeneratorField.tsx`
- `src/components/toolkit/shared/NonceTypeSelector.tsx`
- `src/components/ui/*` (40+ UI component files)

#### Pages (`src/pages/`)
- `src/pages/Home.tsx`
- `src/pages/Deploy.tsx`
- `src/pages/Toolkit.tsx`
- `src/pages/Registry.tsx`
- `src/pages/NotFound.tsx`

#### Hooks (`src/hooks/`)
- `src/hooks/use-mobile.tsx`
- `src/hooks/use-toast.ts`
- `src/hooks/useEVVMDeployment.ts`

#### Libraries (`src/lib/`)
- `src/lib/utils.ts`
- `src/lib/wagmi.ts`
- `src/lib/contracts/evvmDeployment.ts`
- `src/lib/contracts/abis/index.ts`
- `src/lib/contracts/abis/evvm-core.ts`
- `src/lib/contracts/abis/estimator.ts`
- `src/lib/contracts/abis/nameservice.ts`
- `src/lib/contracts/abis/staking.ts`
- `src/lib/contracts/abis/treasury.ts`
- `src/lib/toolkit/evvmABI.ts`
- `src/lib/toolkit/nonceGenerator.ts`
- `src/lib/toolkit/signatureBuilder.ts`

#### Integrations (`src/integrations/`)
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`

### Supabase (`supabase/`)
- `supabase/config.toml`
- `supabase/functions/deploy-evvm/index.ts`
- `supabase/functions/deploy-evvm/evvm-core-abi.ts`
- `supabase/functions/deploy-evvm/registry-abi.ts`
- `supabase/migrations/20251105043654_8386a0d1-cfcc-4f3b-9225-93496b30440d.sql`
- `supabase/migrations/20251105044912_1160a970-90d4-431d-9001-3632e4f39ed8.sql`
- `supabase/migrations/20251105101149_4c44d05d-2d83-44cb-a4e9-00dfee336b93.sql`

## Next Steps

To commit and push these files to GitHub:

1. **Add all files to staging:**
   ```bash
   git add .
   ```

2. **Commit the files:**
   ```bash
   git commit -m "Initial commit: EVVM deployment and toolkit application"
   ```

3. **Add remote repository (if not already added):**
   ```bash
   git remote add origin <your-github-repo-url>
   ```

4. **Push to GitHub:**
   ```bash
   git push -u origin master
   ```

## Notes

- `.env` files are automatically excluded via `.gitignore`
- `node_modules/` and `dist/` folders are excluded
- Consider excluding `llms-full.txt` if it's too large (>100MB) by adding it to `.gitignore`

