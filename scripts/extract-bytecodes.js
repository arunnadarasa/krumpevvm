#!/usr/bin/env node
/**
 * Extract bytecodes from Story JSON artifacts and print them for manual update
 */

const fs = require('fs');
const path = require('path');

// Read JSON files
const stakingJson = JSON.parse(fs.readFileSync('user-uploads://Staking-3.json', 'utf-8'));
const evvmJson = JSON.parse(fs.readFileSync('user-uploads://Evvm-3.json', 'utf-8'));
const nameServiceJson = JSON.parse(fs.readFileSync('user-uploads://NameService-3.json', 'utf-8'));
const estimatorJson = JSON.parse(fs.readFileSync('user-uploads://Estimator-2.json', 'utf-8'));
const treasuryJson = JSON.parse(fs.readFileSync('user-uploads://Treasury-3.json', 'utf-8'));

// Extract bytecodes
const bytecodes = {
  'Staking': stakingJson.bytecode.object,
  'EVVM Core': evvmJson.bytecode.object,
  'NameService': nameServiceJson.bytecode.object,
  'Estimator': estimatorJson.bytecode.object,
  'Treasury': treasuryJson.bytecode.object
};

// Validate and print
Object.entries(bytecodes).forEach(([name, bytecode]) => {
  const isValid = bytecode.startsWith('0x6080') || bytecode.startsWith('0x6040');
  const status = isValid ? '✅' : '❌';
  console.log(`${status} ${name}: ${bytecode.length} chars, starts with ${bytecode.slice(0, 10)}`);
});

// Export for use in other scripts
module.exports = { bytecodes };
