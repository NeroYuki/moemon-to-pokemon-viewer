#!/usr/bin/env node

/**
 * Process Moemon mapping with naming rules
 * Applies consistent naming conventions based on moemon key patterns
 * 
 * Usage: node process-moemon-mapping.js [input-file] [output-file]
 * Default: node process-moemon-mapping.js ./dex-to-moemon-mapping.json ./dex-to-moemon-mapping-processed.json
 */

const fs = require('fs');
const path = require('path');

// Get command line arguments
const args = process.argv.slice(2);
const inputFile = args[0] || './dex-to-moemon-mapping.json';
const outputFile = args[1] || './dex-to-moemon-mapping-processed.json';

console.log('Moemon Mapping Processor\n');
console.log('='.repeat(50));

// Check if input file exists
if (!fs.existsSync(inputFile)) {
    console.error(`Error: File '${inputFile}' not found`);
    process.exit(1);
}

// Load the raw mapping
console.log(`Reading ${inputFile}...`);
const rawMapping = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// Process each dexID group
const processedMapping = {};
const stats = {
    canonical: 0,
    versioned: 0,
    male: 0,
    mega: 0,
    megaX: 0,
    megaY: 0,
    female: 0,
    custom: 0
};

/**
 * Parse a moemon key to extract prefix and version
 */
function parseKey(key) {
    // Match pattern: optional prefix in parens, optional middle content, then -digit or just digit at end
    // Examples: "(MX)-1", "-1", "1", "(Masc)-1", etc.
    
    // First, check if there's a prefix in parens
    let prefix = null;
    let remainder = key;
    
    const prefixMatch = key.match(/^\(([^)]+)\)/i);
    if (prefixMatch) {
        prefix = prefixMatch[1];
        remainder = key.substring(prefixMatch[0].length);
    }
    
    // Now parse the remainder: should end with optional dash and digit(s)
    const versionMatch = remainder.match(/^(.*)(-?\d+)$/);
    
    if (!versionMatch) {
        return { prefix: prefix, middle: remainder, version: null, rawKey: key };
    }
    
    return {
        prefix: prefix,
        middle: versionMatch[1],  // Content between prefix and version
        version: versionMatch[2],  // digit(s) at end (with or without dash)
        rawKey: key
    };
}

/**
 * Determine the name suffix based on the key pattern
 */
function getNameSuffix(parsed) {
    if (!parsed.prefix) {
        // No prefix - could be canonical or versioned
        return null;
    }
    
    const prefix = parsed.prefix.toLowerCase();
    
    // Handle special cases
    if (prefix === 'masc') {
        return '-Male';
    }
    if (prefix === 'm') {
        return '-Mega';
    }
    if (prefix === 'mx') {
        return '-Mega-X';
    }
    if (prefix === 'my') {
        return '-Mega-Y';
    }
    if (prefix === 'fem') {
        return null; // Female is canonical
    }
    
    // Generic prefix - capitalize first letter
    const capitalized = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    return `-${capitalized}`;
}

/**
 * Process a dexID group
 */
function processDexGroup(dexID, forms, pokemonName) {
    const parsed = forms.map(form => ({
        ...form,
        parsed: parseKey(form.key)
    }));
    
    // Separate forms by type
    const femForms = parsed.filter(f => f.parsed.prefix?.toLowerCase() === 'fem');
    const plainForms = parsed.filter(f => !f.parsed.prefix && (!f.parsed.middle || f.parsed.middle === '-' || f.parsed.middle === ''));
    const otherForms = parsed.filter(f => f.parsed.prefix && f.parsed.prefix.toLowerCase() !== 'fem' || (f.parsed.middle && f.parsed.middle !== '-' && f.parsed.middle !== ''));
    
    // Determine canonical form
    let canonicalForm = null;
    let canonicalIsFemale = false;
    
    // Priority: (fem) forms, then plain forms (highest version)
    if (femForms.length > 0) {
        // Sort by version number (descending)
        femForms.sort((a, b) => {
            const aVer = parseInt(a.parsed.version?.replace(/^-/, '') || '0');
            const bVer = parseInt(b.parsed.version?.replace(/^-/, '') || '0');
            return bVer - aVer;
        });
        canonicalForm = femForms[0];
        canonicalIsFemale = true;
        stats.female++;
    } else if (plainForms.length > 0) {
        // Sort by version number (descending)
        plainForms.sort((a, b) => {
            const aVer = parseInt(a.parsed.version?.replace(/^-/, '') || '0');
            const bVer = parseInt(b.parsed.version?.replace(/^-/, '') || '0');
            return bVer - aVer;
        });
        canonicalForm = plainForms[0];
    }
    
    // Process all forms
    const processedForms = [];
    
    for (const form of parsed) {
        let name = pokemonName || `Dex-${dexID}`;
        let isCanonical = false;
        
        // Check if this is the canonical form
        if (canonicalForm && form.filename === canonicalForm.filename) {
            isCanonical = true;
            stats.canonical++;
        } else {
            // Apply naming rules
            const prefix = form.parsed.prefix?.toLowerCase();
            const middle = form.parsed.middle;
            const hasMiddle = middle && middle !== '-' && middle !== '';
            
            if (!prefix && !hasMiddle) {
                // Plain form but not canonical - it's a version
                const version = parseInt(form.parsed.version?.replace(/^-/, '') || '1');
                name += `-v${version}`;
                stats.versioned++;
            } else if (prefix === 'masc') {
                name += '-Male';
                stats.male++;
            } else if (prefix === 'm') {
                name += '-Mega';
                stats.mega++;
            } else if (prefix === 'mx') {
                name += '-Mega-X';
                stats.megaX++;
            } else if (prefix === 'my') {
                name += '-Mega-Y';
                stats.megaY++;
            } else if (prefix === 'fem') {
                // If canonical is female, this is a version
                if (canonicalIsFemale) {
                    const version = parseInt(form.parsed.version?.replace(/^-/, '') || '1');
                    name += `-v${version}`;
                    stats.versioned++;
                } else {
                    // Female but not canonical - shouldn't happen but handle it
                    name += '-Female';
                    stats.female++;
                }
            } else {
                // Custom prefix or has middle content
                if (prefix) {
                    const suffix = getNameSuffix(form.parsed);
                    if (suffix) {
                        name += suffix;
                    }
                }
                
                // If there's middle content, add it
                if (hasMiddle) {
                    const cleanMiddle = middle.replace(/^[-_]+/, '');
                    if (cleanMiddle) {
                        name += `-${cleanMiddle}`;
                    }
                }
                stats.custom++;
            }
        }
        
        processedForms.push({
            filename: form.filename,
            key: form.key,
            dexID: form.dexID,
            name: name,
            isCanonical: isCanonical
        });
    }
    
    // Sort: canonical first, then alphabetically
    processedForms.sort((a, b) => {
        if (a.isCanonical && !b.isCanonical) return -1;
        if (!a.isCanonical && b.isCanonical) return 1;
        return a.name.localeCompare(b.name);
    });
    
    return processedForms;
}

// Load pokemon names from RR mapping if available
let pokemonNames = {};
const rrMappingPath = './dex-to-rr-mapping.json';
if (fs.existsSync(rrMappingPath)) {
    console.log('Loading Pokemon names from RR mapping...');
    const rrMapping = JSON.parse(fs.readFileSync(rrMappingPath, 'utf8'));
    for (const [dexID, forms] of Object.entries(rrMapping)) {
        if (forms.length > 0) {
            pokemonNames[dexID] = forms[0].name;
        }
    }
}

console.log('Processing moemon forms...\n');

// Process all dex groups
for (const [dexID, forms] of Object.entries(rawMapping)) {
    const pokemonName = pokemonNames[dexID];
    processedMapping[dexID] = processDexGroup(parseInt(dexID), forms, pokemonName);
}

// Write output
console.log(`Writing to ${outputFile}...`);
fs.writeFileSync(outputFile, JSON.stringify(processedMapping, null, 2), 'utf8');

// Print statistics
console.log('\n' + '='.repeat(50));
console.log('\n✓ Processing complete!\n');
console.log('Name assignments:');
console.log(`  Canonical forms: ${stats.canonical}`);
console.log(`  Versioned forms: ${stats.versioned}`);
console.log(`  Male forms: ${stats.male}`);
console.log(`  Mega forms: ${stats.mega}`);
console.log(`  Mega-X forms: ${stats.megaX}`);
console.log(`  Mega-Y forms: ${stats.megaY}`);
console.log(`  Female promoted: ${stats.female}`);
console.log(`  Custom forms: ${stats.custom}`);

// Print some examples
console.log('\n' + '='.repeat(50));
console.log('\nExample processed mappings:');

const exampleDexIds = [6, 25, 150, 3].filter(id => processedMapping[id]);
for (const dexID of exampleDexIds) {
    const forms = processedMapping[dexID];
    console.log(`\n  DexID ${dexID}:`);
    for (const form of forms) {
        const canonicalMark = form.isCanonical ? ' [CANONICAL]' : '';
        console.log(`    - ${form.name}${canonicalMark}`);
        console.log(`      File: ${form.filename}, Key: ${form.key}`);
    }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`\nProcessed mapping saved to: ${outputFile}`);
