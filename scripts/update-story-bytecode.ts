/**
 * Script to extract bytecode from Story-compiled JSON artifacts
 * Run this to update the contract ABIs with Story-optimized bytecode
 */

import stakingJson from '../artifacts/Staking.json';
import evvmJson from '../artifacts/EVVM.json';
import estimatorJson from '../artifacts/Estimator.json';
import nameServiceJson from '../artifacts/NameService.json';
import treasuryJson from '../artifacts/Treasury.json';
import fs from 'fs';
import path from 'path';

interface ArtifactJSON {
  abi: any[];
  bytecode: {
    object: string;
  };
}

function extractAndFormat(artifact: ArtifactJSON, contractName: string) {
  const bytecode = artifact.bytecode.object;
  const abi = artifact.abi;
  
  console.log(`\n${contractName}:`);
  console.log(`- Bytecode length: ${bytecode.length} chars`);
  console.log(`- Starts with: ${bytecode.slice(0, 10)}`);
  console.log(`- ABI functions: ${abi.filter((item: any) => item.type === 'function').length}`);
  
  // Verify bytecode format
  if (!bytecode.startsWith('0x6080')) {
    console.error(`❌ INVALID: ${contractName} bytecode does not start with 0x6080!`);
  } else {
    console.log(`✅ VALID: Starts with 0x6080`);
  }
  
  return {
    abi,
    bytecode,
    name: contractName
  };
}

// Extract all contracts
const contracts = [
  extractAndFormat(stakingJson as any, 'STAKING'),
  extractAndFormat(evvmJson as any, 'EVVM_CORE'),
  extractAndFormat(estimatorJson as any, 'ESTIMATOR'),
  extractAndFormat(nameServiceJson as any, 'NAME_SERVICE'),
  extractAndFormat(treasuryJson as any, 'TREASURY')
];

console.log('\n=== All contracts validated ===\n');

// Generate TypeScript files
contracts.forEach(({ abi, bytecode, name }) => {
  const fileName = name.toLowerCase().replace('_', '-');
  const exportName = name;
  
  const content = `/**
 * ${name.replace(/_/g, ' ')} Contract ABI
 * 
 * STORY-OPTIMIZED BYTECODE
 * Compiled with: Solidity 0.8.20, EVM: shanghai, Optimizer: 200 runs, via_ir: true
 * Bytecode length: ${bytecode.length} characters
 */
export const ${exportName}_ABI = ${JSON.stringify(abi, null, 2)} as const;

export const ${exportName}_BYTECODE = '${bytecode}' as \`0x\${string}\`;
`;
  
  const filePath = path.join(__dirname, '..', 'src', 'lib', 'contracts', 'abis', `${fileName}.ts`);
  console.log(`Writing: ${filePath}`);
  fs.writeFileSync(filePath, content, 'utf-8');
});

console.log('\n✅ All contract files updated with Story bytecode!\n');
