#!/usr/bin/env node

/**
 * Map Pokedex ID (dexID) to Moemon sprites
 * Reads filenames from moemon-sprites/front directory
 * First 4 characters should be digits (dexID), rest is the moemon key
 * 
 * Usage: node map-dex-to-moemon.js [input-dir] [output-file]
 * Default: node map-dex-to-moemon.js ./moemon-sprites/front ./dex-to-moemon-mapping.json
 */

const fs = require('fs');
const path = require('path');

// Get command line arguments
const args = process.argv.slice(2);
const inputDir = args[0] || './moemon-sprites-split/front';
const outputFile = args[1] || './dex-to-moemon-mapping.json';

// Check if input directory exists
if (!fs.existsSync(inputDir)) {
    console.error(`Error: Directory '${inputDir}' not found`);
    process.exit(1);
}

console.log('Moemon Mapping Generator\n');
console.log('='.repeat(50));
console.log(`\nReading files from: ${inputDir}`);

// Read all files from directory
const files = fs.readdirSync(inputDir);
const imageFiles = files.filter(file => /\.(png|jpg|jpeg|gif|bmp)$/i.test(file));

console.log(`Found ${imageFiles.length} image files\n`);

// Create the mapping
const dexMapping = {};
const warnings = [];
const stats = {
    processed: 0,
    warnings: 0
};

for (const filename of imageFiles) {
    const nameWithoutExt = path.basename(filename, path.extname(filename));
    
    let dexID;
    let moeKey;
    
    // Try 4 digits first
    const firstFour = nameWithoutExt.substring(0, 4);
    if (/^\d{4}$/.test(firstFour)) {
        dexID = parseInt(firstFour, 10);
        moeKey = nameWithoutExt.substring(4) || 'base';
    } else {
        // Fallback: try 3 digits
        const firstThree = nameWithoutExt.substring(0, 3);
        if (/^\d{3}$/.test(firstThree)) {
            dexID = parseInt(firstThree, 10);
            moeKey = nameWithoutExt.substring(3) || 'base';
        } else {
            // Neither worked, log warning
            warnings.push({
                filename: filename,
                reason: `First characters "${firstFour}" are not 3 or 4 digits`
            });
            stats.warnings++;
            continue;
        }
    }
    
    // Initialize array for this dexID if it doesn't exist
    if (!dexMapping[dexID]) {
        dexMapping[dexID] = [];
    }
    
    // Add the entry
    dexMapping[dexID].push({
        filename: filename,
        key: moeKey,
        dexID: dexID
    });
    
    stats.processed++;
}

// Sort entries within each dexID by key
for (const dexID in dexMapping) {
    dexMapping[dexID].sort((a, b) => a.key.localeCompare(b.key));
}

// Convert to sorted object
const sortedMapping = {};
const sortedKeys = Object.keys(dexMapping).map(Number).sort((a, b) => a - b);
for (const dexID of sortedKeys) {
    sortedMapping[dexID] = dexMapping[dexID];
}

// Write the output
console.log('Writing mapping...');
fs.writeFileSync(outputFile, JSON.stringify(sortedMapping, null, 2), 'utf8');

// Print statistics
console.log('\n' + '='.repeat(50));
console.log('\n✓ Mapping created successfully!');
console.log(`  Processed: ${stats.processed}`);
console.log(`  Warnings: ${stats.warnings}`);
console.log(`  Unique Dex IDs: ${Object.keys(sortedMapping).length}`);

// Print warnings if any
if (warnings.length > 0) {
    console.log('\n' + '='.repeat(50));
    console.log('\n⚠ Warnings (files not matching pattern):');
    console.log('='.repeat(50));
    for (const warning of warnings) {
        console.log(`\n  File: ${warning.filename}`);
        console.log(`  Reason: ${warning.reason}`);
    }
}

// Print some examples
console.log('\n' + '='.repeat(50));
console.log('\nExample mappings:');
const exampleDexIds = [1, 6, 25, 150].filter(id => sortedMapping[id]);
for (const dexID of exampleDexIds) {
    console.log(`\n  DexID ${dexID}:`);
    for (const entry of sortedMapping[dexID]) {
        console.log(`    - ${entry.filename} (key: "${entry.key}")`);
    }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`\nFull mapping saved to: ${outputFile}`);
