#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Read JSON files and extract bytecodes
const stakingJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'artifacts/Staking.json'), 'utf-8'));
const evvmJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'artifacts/EVVM.json'), 'utf-8'));
const nameServiceJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'artifacts/NameService.json'), 'utf-8'));
const estimatorJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'artifacts/Estimator.json'), 'utf-8'));
const treasuryJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'artifacts/Treasury.json'), 'utf-8'));

const bytecodes = {
  staking: stakingJson.bytecode.object,
  evvm: evvmJson.bytecode.object,
  nameService: nameServiceJson.bytecode.object,
  estimator: estimatorJson.bytecode.object,
  treasury: treasuryJson.bytecode.object
};

console.log('✅ Extracted bytecodes:');
console.log(`  - Staking: ${bytecodes.staking.length} chars, starts with ${bytecodes.staking.slice(0, 10)}`);
console.log(`  - EVVM: ${bytecodes.evvm.length} chars, starts with ${bytecodes.evvm.slice(0, 10)}`);
console.log(`  - NameService: ${bytecodes.nameService.length} chars, starts with ${bytecodes.nameService.slice(0, 10)}`);
console.log(`  - Estimator: ${bytecodes.estimator.length} chars, starts with ${bytecodes.estimator.slice(0, 10)}`);
console.log(`  - Treasury: ${bytecodes.treasury.length} chars, starts with ${bytecodes.treasury.slice(0, 10)}`);

// Update TypeScript files
const updates = [
  { 
    file: 'src/lib/contracts/abis/staking.ts',
    constant: 'STAKING_BYTECODE',
    bytecode: bytecodes.staking,
    name: 'Staking'
  },
  { 
    file: 'src/lib/contracts/abis/evvm-core.ts',
    constant: 'EVVM_CORE_BYTECODE',
    bytecode: bytecodes.evvm,
    name: 'EVVM Core'
  },
  { 
    file: 'src/lib/contracts/abis/nameservice.ts',
    constant: 'NAME_SERVICE_BYTECODE',
    bytecode: bytecodes.nameService,
    name: 'NameService'
  },
  { 
    file: 'src/lib/contracts/abis/estimator.ts',
    constant: 'ESTIMATOR_BYTECODE',
    bytecode: bytecodes.estimator,
    name: 'Estimator'
  },
  { 
    file: 'src/lib/contracts/abis/treasury.ts',
    constant: 'TREASURY_BYTECODE',
    bytecode: bytecodes.treasury,
    name: 'Treasury'
  }
];

console.log('\n🔄 Updating TypeScript files...\n');

updates.forEach(({ file, constant, bytecode, name }) => {
  const filePath = path.join(rootDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  const pattern = new RegExp(
    `(export const ${constant} = )'0x[a-fA-F0-9]+'( as \`0x\\$\\{string\\}\`;)`,
    'g'
  );
  
  const newContent = content.replace(pattern, `$1'${bytecode}'$2`);
  
  if (newContent === content) {
    console.log(`⚠️  ${name}: Pattern not found`);
  } else {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`✅ ${name}: Updated ${constant}`);
  }
});

console.log('\n🎉 Bytecode update complete!\n');
