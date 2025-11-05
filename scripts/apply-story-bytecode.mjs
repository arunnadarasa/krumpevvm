#!/usr/bin/env node
/**
 * Script to apply Story bytecodes from JSON artifacts to TypeScript ABI files
 * This extracts bytecode.object from each JSON and updates the BYTECODE constants
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Contract mappings: JSON filename -> TypeScript file path and constant name
const contracts = [
  { json: 'Staking.json', ts: 'src/lib/contracts/abis/staking.ts', constant: 'STAKING_BYTECODE', name: 'Staking' },
  { json: 'EVVM.json', ts: 'src/lib/contracts/abis/evvm-core.ts', constant: 'EVVM_CORE_BYTECODE', name: 'EVVM Core' },
  { json: 'NameService.json', ts: 'src/lib/contracts/abis/nameservice.ts', constant: 'NAME_SERVICE_BYTECODE', name: 'NameService' },
  { json: 'Estimator.json', ts: 'src/lib/contracts/abis/estimator.ts', constant: 'ESTIMATOR_BYTECODE', name: 'Estimator' },
  { json: 'Treasury.json', ts: 'src/lib/contracts/abis/treasury.ts', constant: 'TREASURY_BYTECODE', name: 'Treasury' },
];

console.log('🔧 Extracting bytecodes from Story JSON artifacts...\n');

contracts.forEach(({ json, ts, constant, name }) => {
  try {
    // Read JSON artifact
    const jsonPath = path.join(rootDir, 'artifacts', json);
    const artifact = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    
    // Extract bytecode
    const bytecode = artifact.bytecode.object;
    
    // Validate bytecode
    if (!bytecode.startsWith('0x6080') && !bytecode.startsWith('0x6040')) {
      console.error(`❌ ${name}: Invalid bytecode (doesn't start with 0x6080 or 0x6040)`);
      return;
    }
    
    console.log(`✅ ${name}:`);
    console.log(`   Length: ${bytecode.length} characters`);
    console.log(`   Starts with: ${bytecode.slice(0, 10)}`);
    console.log(`   Target: ${ts}`);
    console.log(`   Constant: ${constant}\n`);
    
    // Read TypeScript file
    const tsPath = path.join(rootDir, ts);
    let content = fs.readFileSync(tsPath, 'utf-8');
    
    // Find and replace the bytecode constant (line 11)
    // Pattern: export const NAME_BYTECODE = '0x...' as `0x${string}`;
    const pattern = new RegExp(
      `(export const ${constant} = )'0x[a-fA-F0-9]+'( as \`0x\\$\\{string\\}\`;)`,
      'g'
    );
    
    const newContent = content.replace(pattern, `$1'${bytecode}'$2`);
    
    if (newContent === content) {
      console.warn(`⚠️  ${name}: Pattern not found in ${ts}`);
      return;
    }
    
    // Write updated content
    fs.writeFileSync(tsPath, newContent, 'utf-8');
    console.log(`   ✓ Updated ${constant} in ${ts}\n`);
    
  } catch (error) {
    console.error(`❌ ${name}: Error - ${error.message}\n`);
  }
});

console.log('\n✨ Bytecode extraction and replacement complete!\n');
console.log('📋 Summary of expected bytecode lengths:');
console.log('   - Staking: ~184,152 characters');
console.log('   - EVVM Core: ~176,167 characters');
console.log('   - NameService: ~220,813 characters');
console.log('   - Estimator: ~3,909 characters');
console.log('   - Treasury: ~29,028 characters');
console.log('\n🎯 All bytecodes should start with 0x6080 or 0x6040');
console.log('\n✅ Story bytecode fix is now complete!');
