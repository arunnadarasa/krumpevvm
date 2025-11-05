/**
 * Extract Full Bytecode from Compilation Artifacts
 * 
 * This script extracts complete deployment bytecode (constructor + runtime)
 * from JSON compilation artifacts for EVVM contracts.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface CompilationArtifact {
  abi: any[];
  bytecode: {
    object: string;
  };
  deployedBytecode?: {
    object: string;
  };
}

interface ContractConfig {
  name: string;
  jsonPath: string;
  outputPath: string;
  constructorParams: string;
}

const contracts: ContractConfig[] = [
  {
    name: 'Staking',
    jsonPath: 'user-uploads://Staking.json',
    outputPath: 'src/lib/contracts/abis/staking.ts',
    constructorParams: '(initialAdmin, initialGoldenFisher)'
  },
  {
    name: 'EVVM Core',
    jsonPath: 'user-uploads://EVVM.json',
    outputPath: 'src/lib/contracts/abis/evvm-core.ts',
    constructorParams: '(admin, metadata)'
  },
  {
    name: 'NameService',
    jsonPath: 'user-uploads://NameService.json',
    outputPath: 'src/lib/contracts/abis/nameservice.ts',
    constructorParams: '(evvmAddress, initialOwner)'
  },
  {
    name: 'Estimator',
    jsonPath: 'user-uploads://Estimator.json',
    outputPath: 'src/lib/contracts/abis/estimator.ts',
    constructorParams: '(activator, evvmAddress, stakingAddress, admin)'
  },
  {
    name: 'Treasury',
    jsonPath: 'user-uploads://Treasury.json',
    outputPath: 'src/lib/contracts/abis/treasury.ts',
    constructorParams: '(evvmAddress)'
  }
];

function extractBytecode(config: ContractConfig): void {
  console.log(`\n🔍 Processing ${config.name}...`);
  
  try {
    // Read JSON artifact
    const jsonContent = readFileSync(config.jsonPath.replace('user-uploads://', 'user-uploads/'), 'utf-8');
    const artifact: CompilationArtifact = JSON.parse(jsonContent);
    
    // Extract full deployment bytecode
    const fullBytecode = artifact.bytecode.object;
    
    if (!fullBytecode || fullBytecode === '0x' || fullBytecode.length < 100) {
      throw new Error(`Invalid bytecode for ${config.name}: ${fullBytecode}`);
    }
    
    console.log(`  ✅ Full bytecode length: ${fullBytecode.length} characters`);
    console.log(`  ✅ ABI functions: ${artifact.abi.length}`);
    
    // Generate TypeScript file
    const tsContent = `/**
 * ${config.name} Contract ABI
 * Constructor: ${config.constructorParams}
 */
export const ${config.name.toUpperCase().replace(/\s+/g, '_')}_ABI = ${JSON.stringify(artifact.abi, null, 2)} as const;

export const ${config.name.toUpperCase().replace(/\s+/g, '_')}_BYTECODE = '${fullBytecode}' as \`0x\${string}\`;
`;
    
    writeFileSync(config.outputPath, tsContent, 'utf-8');
    console.log(`  ✅ Written to ${config.outputPath}`);
    
  } catch (error) {
    console.error(`  ❌ Failed to process ${config.name}:`, error);
    throw error;
  }
}

// Process all contracts
console.log('📦 Extracting EVVM Contract Bytecode from Compilation Artifacts\n');
console.log('═'.repeat(60));

for (const config of contracts) {
  extractBytecode(config);
}

console.log('\n' + '═'.repeat(60));
console.log('✅ All contracts processed successfully!\n');
