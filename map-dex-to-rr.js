#!/usr/bin/env node

/**
 * Map Pokedex ID (dexID) to Radical Red IDs
 * Extracts ID, key, order, ancestor, and name for each entry
 * 
 * Usage: node map-dex-to-rr.js [input-file] [output-file]
 * Default: node map-dex-to-rr.js ./Radical-Red-Pokedex-master/data.js ./dex-to-rr-mapping.json
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Get command line arguments
const args = process.argv.slice(2);
const inputFile = args[0] || './Radical-Red-Pokedex-master/data.js';
const outputFile = args[1] || './dex-to-rr-mapping.json';

// Check if input file exists
if (!fs.existsSync(inputFile)) {
    console.error(`Error: File '${inputFile}' not found`);
    process.exit(1);
}

console.log(`Reading ${inputFile}...`);
const dataCode = fs.readFileSync(inputFile, 'utf8');

// Execute the data file to get the object
console.log('Parsing data...');
let data;
try {
    // Create a sandbox context and evaluate the code
    const sandbox = {};
    vm.createContext(sandbox);
    data = vm.runInContext(`(${dataCode})`, sandbox);
} catch (err) {
    console.error('Error parsing data file:', err.message);
    process.exit(1);
}

// Check if we have the species data
if (!data || !data.species) {
    console.error('Error: Could not find species data in the file');
    process.exit(1);
}

const species = data.species;

// Create the mapping: dexID -> array of entries
console.log('Creating dexID to RR ID mapping...');
const dexMapping = {};

for (const rrId in species) {
    const entry = species[rrId];
    
    // Extract required fields
    const dexID = entry.dexID;
    const mappedEntry = {
        ID: entry.ID,
        key: entry.key,
        order: entry.order !== undefined ? entry.order : null,
        ancestor: entry.ancestor,
        name: entry.name
    };
    
    // Initialize array for this dexID if it doesn't exist
    if (!dexMapping[dexID]) {
        dexMapping[dexID] = [];
    }
    
    // Add the entry to the array
    dexMapping[dexID].push(mappedEntry);
}

// Sort entries within each dexID by order (nulls first, then by order value)
console.log('Sorting entries by order...');
for (const dexID in dexMapping) {
    dexMapping[dexID].sort((a, b) => {
        // If both have order values, sort by order
        if (a.order !== null && b.order !== null) {
            return a.order - b.order;
        }
        // If only a has null order, it comes first
        if (a.order === null && b.order !== null) {
            return -1;
        }
        // If only b has null order, it comes first
        if (a.order !== null && b.order === null) {
            return 1;
        }
        // Both are null, maintain original order
        return 0;
    });
}

// Convert to sorted array format for better readability (optional)
const sortedMapping = {};
const sortedKeys = Object.keys(dexMapping).map(Number).sort((a, b) => a - b);
for (const dexID of sortedKeys) {
    sortedMapping[dexID] = dexMapping[dexID];
}

// Write the output
console.log(`Writing mapping to ${outputFile}...`);
fs.writeFileSync(outputFile, JSON.stringify(sortedMapping, null, 2), 'utf8');

// Print statistics
const totalDexEntries = Object.keys(sortedMapping).length;
const totalRREntries = Object.values(sortedMapping).reduce((sum, arr) => sum + arr.length, 0);
const multiFormDex = Object.entries(sortedMapping).filter(([_, arr]) => arr.length > 1).length;

console.log('\n✓ Mapping created successfully!');
console.log(`  Total Pokedex entries: ${totalDexEntries}`);
console.log(`  Total Radical Red entries: ${totalRREntries}`);
console.log(`  Pokedex entries with multiple forms: ${multiFormDex}`);

// Print some examples
console.log('\nExample mappings:');
const exampleDexIds = [1, 6, 25, 150]; // Bulbasaur, Charizard, Pikachu, Mewtwo
for (const dexID of exampleDexIds) {
    if (sortedMapping[dexID]) {
        console.log(`\n  DexID ${dexID} (${sortedMapping[dexID][0].name}):`);
        for (const entry of sortedMapping[dexID]) {
            const orderStr = entry.order !== null ? `order: ${entry.order}` : 'no order';
            console.log(`    - ID ${entry.ID}: ${entry.key} (${orderStr}, ancestor: ${entry.ancestor})`);
        }
    }
}

console.log(`\nFull mapping saved to: ${outputFile}`);
