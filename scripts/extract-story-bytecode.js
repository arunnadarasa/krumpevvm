#!/usr/bin/env node
/**
 * Extract Story-optimized bytecode from JSON artifacts and update TypeScript ABI files
 * 
 * Usage: node scripts/extract-story-bytecode.js
 */

const fs = require('fs');
const path = require('path');

// Contract mappings: JSON file -> TS file
const contracts = [
  {
    jsonPath: 'user-uploads://Staking-3.json',
    tsPath: 'src/lib/contracts/abis/staking.ts',
    constant: 'STAKING_BYTECODE',
    name: 'Staking'
  },
  {
    jsonPath: 'user-uploads://Evvm-3.json',
    tsPath: 'src/lib/contracts/abis/evvm-core.ts',
    constant: 'EVVM_CORE_BYTECODE',
    name: 'EVVM Core'
  },
  {
    jsonPath: 'user-uploads://NameService-3.json',
    tsPath: 'src/lib/contracts/abis/nameservice.ts',
    constant: 'NAME_SERVICE_BYTECODE',
    name: 'NameService'
  },
  {
    jsonPath: 'user-uploads://Estimator-2.json',
    tsPath: 'src/lib/contracts/abis/estimator.ts',
    constant: 'ESTIMATOR_BYTECODE',
    name: 'Estimator'
  },
  {
    jsonPath: 'user-uploads://Treasury-3.json',
    tsPath: 'src/lib/contracts/abis/treasury.ts',
    constant: 'TREASURY_BYTECODE',
    name: 'Treasury'
  }
];

console.log('🔧 Extracting Story-optimized bytecode from JSON artifacts...\n');

for (const contract of contracts) {
  try {
    console.log(`📦 Processing ${contract.name}...`);
    
    // Note: This script is a template. The actual bytecode replacement
    // needs to be done manually by:
    // 1. Opening each JSON file
    // 2. Copying the "bytecode.object" value
    // 3. Replacing the BYTECODE constant in the corresponding .ts file
    
    console.log(`   JSON: ${contract.jsonPath}`);
    console.log(`   Target: ${contract.tsPath}`);
    console.log(`   Constant: ${contract.constant}`);
    console.log(`   ⚠️  Manual update required - JSON files are in user-uploads://`);
    console.log('');
    
  } catch (error) {
    console.error(`❌ Error processing ${contract.name}:`, error.message);
  }
}

console.log('\n📝 Manual Update Instructions:\n');
console.log('For each contract, update the bytecode constant:');
console.log('');
console.log('1. Open the JSON file (e.g., user-uploads://Staking-3.json)');
console.log('2. Find the "bytecode": { "object": "0x..." } field');
console.log('3. Copy the entire hex string');
console.log('4. Open the corresponding .ts file');
console.log('5. Find the BYTECODE export line (line 11 in each file)');
console.log('6. Replace the old bytecode string with the new one');
console.log('');
console.log('Example:');
console.log('export const STAKING_BYTECODE = \'0x608034620000ba...\' as `0x${string}`;');
console.log('                                  ^^^^^^^^^^^^^^^^^^^^');
console.log('                                  Replace this part');
console.log('');
console.log('✅ All bytecodes must start with 0x6080 (valid EVM bytecode)');
