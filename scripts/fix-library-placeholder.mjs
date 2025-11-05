#!/usr/bin/env node
/**
 * Script to fix unresolved library placeholders in bytecode
 * Replaces __$<hex>$__ placeholders with actual library addresses
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Library placeholder to address mapping
// AdvancedStrings library deployed on Story Aeneid Testnet
const LIBRARY_ADDRESSES = {
  '35ea76b460e6affb63c860aedde9e1747c': '0xB75C3Baf51281e205adD2d2B62a78561a01d1A09', // AdvancedStrings library
};

// Find all placeholders in a bytecode string
function findPlaceholders(bytecode) {
  const placeholderPattern = /__\$([0-9a-fA-F]+)\$__/g;
  const placeholders = [];
  let match;
  
  while ((match = placeholderPattern.exec(bytecode)) !== null) {
    placeholders.push({
      fullMatch: match[0],
      hash: match[1],
      position: match.index
    });
  }
  
  return placeholders;
}

// Replace placeholder with library address
function replacePlaceholder(bytecode, placeholder, libraryAddress) {
  // Convert library address to hex format (remove 0x, pad to 40 chars)
  const addrHex = libraryAddress.toLowerCase().replace('0x', '').padStart(40, '0');
  
  // Replace the placeholder with the address
  return bytecode.replace(placeholder.fullMatch, addrHex);
}

// Process a single contract
function fixContract(artifactPath) {
  try {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
    let bytecode = artifact.bytecode.object;
    
    const placeholders = findPlaceholders(bytecode);
    
    if (placeholders.length === 0) {
      console.log(`✅ No placeholders found in ${path.basename(artifactPath)}`);
      return { fixed: false, placeholders: [] };
    }
    
    console.log(`\n📋 Found ${placeholders.length} placeholder(s) in ${path.basename(artifactPath)}:`);
    placeholders.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.fullMatch} at position ${p.position}`);
      console.log(`      Hash: ${p.hash}`);
      
      if (LIBRARY_ADDRESSES[p.hash]) {
        console.log(`      ✅ Library address found: ${LIBRARY_ADDRESSES[p.hash]}`);
        bytecode = replacePlaceholder(bytecode, p, LIBRARY_ADDRESSES[p.hash]);
      } else {
        console.log(`      ⚠️  No library address mapped for this hash`);
        console.log(`      💡 Add mapping: '${p.hash}': '0xYourLibraryAddress'`);
      }
    });
    
    // Validate result
    const invalidChars = bytecode.match(/[^0-9a-fA-Fx]/);
    if (invalidChars) {
      console.error(`\n❌ Still has invalid characters after replacement: ${invalidChars[0]}`);
      return { fixed: false, placeholders, bytecode: null };
    }
    
    // Always update the artifact in-place
    artifact.bytecode.object = bytecode;
    fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2), 'utf-8');
    console.log(`\n✅ Updated artifact saved to ${path.basename(artifactPath)}`);
    
    return { fixed: true, placeholders, bytecode };
    
  } catch (error) {
    console.error(`❌ Error processing ${artifactPath}:`, error.message);
    return { fixed: false, placeholders: [], error: error.message };
  }
}

// Main execution
console.log('🔧 Library Placeholder Fixer\n');
console.log('📝 This script helps identify and fix unresolved library placeholders in bytecode.\n');

const artifactsDir = path.join(rootDir, 'artifacts');
const contracts = [
  'Staking.json',
  'EVVM.json',
  'NameService.json',
  'Estimator.json',
  'Treasury.json'
];

let totalPlaceholders = 0;
const results = {};

contracts.forEach(jsonFile => {
  const artifactPath = path.join(artifactsDir, jsonFile);
  if (!fs.existsSync(artifactPath)) {
    console.warn(`⚠️  ${jsonFile} not found, skipping...`);
    return;
  }
  
  const result = fixContract(artifactPath);
  results[jsonFile] = result;
  
  if (result.placeholders) {
    totalPlaceholders += result.placeholders.length;
  }
});

console.log('\n' + '='.repeat(60));
console.log('📊 Summary:');
console.log(`   Total placeholders found: ${totalPlaceholders}`);
console.log(`   Contracts with placeholders: ${Object.values(results).filter(r => r.placeholders?.length > 0).length}`);

if (totalPlaceholders > 0) {
  console.log('\n⚠️  ACTION REQUIRED:');
  console.log('   1. Identify the library contract address for each placeholder hash');
  console.log('   2. Add mappings to LIBRARY_ADDRESSES in this script');
  console.log('   3. Run this script again to apply fixes');
  console.log('\n💡 To find library addresses:');
  console.log('   - Check Story Protocol documentation');
  console.log('   - Contact Story Protocol support');
  console.log('   - Check if any of the provided addresses match the library');
  console.log('   - Look for deployed library contracts on Story Explorer');
} else {
  console.log('\n✅ All bytecodes are clean! No placeholders found.');
}

console.log('\n📖 For more information, see:');
console.log('   - Solidity Library Linking: https://docs.soliditylang.org/en/latest/using-the-compiler.html#library-linking');
console.log('   - Foundry Library Linking: https://book.getfoundry.sh/reference/forge/forge-build#library-linking');

