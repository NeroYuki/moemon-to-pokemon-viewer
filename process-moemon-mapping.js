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
    alola: 0,
    galar: 0,
    hisui: 0,
    paldea: 0,
    sevii: 0,
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
function getNameSuffix(parsed, dexID) {
    if (!parsed.prefix) {
        // No prefix - check for special base case
        if (parsed.middle && parsed.middle.toLowerCase().startsWith('base')) {
            return null; // Base is canonical-eligible
        }
        return null;
    }
    
    const prefix = parsed.prefix.toLowerCase();
    
    // Special case: DexID 201 (Unown) - (m) and (r) are literal letters, not mega/regional
    if (dexID === 201) {
        if (prefix === 'm' || prefix === 'r') {
            return `-${prefix.toUpperCase()}`;
        }
    }
    
    // Special case: DexID 648 (Meloetta) - (p) is -Pirouette
    if (dexID === 648 && prefix === 'p') {
        return '-Pirouette';
    }
    
    // Special case: DexID 386 (Deoxys) - (a/d/s) are forme specific
    if (dexID === 386) {
        if (prefix === 'a') return '-Attack';
        if (prefix === 'd') return '-Defense';
        if (prefix === 's') return '-Speed';
    }
    
    // Special case: DexID 492 (Shaymin) - (s) is -Sky
    if (dexID === 492 && prefix === 's') {
        return '-Sky';
    }
    
    // Special case: DexID 487 (Giratina) - (o) is -Origin
    if (dexID === 487 && prefix === 'o') {
        return '-Origin';
    }
    
    // Special case: DexID 421 (Cherrim) - (s) is -Sunshine
    if (dexID === 421 && prefix === 's') {
        return '-Sunshine';
    }
    
    // Special case: DexID 412, 413 (Burmy, Wormadam) - (sandy) and (trash) forms
    if ((dexID === 412 || dexID === 413) && prefix === 'sandy') {
        return '-Sandy';
    }
    if ((dexID === 412 || dexID === 413) && prefix === 'trash') {
        return '-Trash';
    }
    
    // Special case: DexID 422, 423 (Shellos, Gastrodon) - (e) is -East
    if ((dexID === 422 || dexID === 423) && prefix === 'e') {
        return '-East';
    }
    
    // Special case: DexID 550 (Basculin) - (blue) form
    if (dexID === 550 && prefix === 'blue') {
        return '-Blue-Striped';
    }
    if (dexID === 550 && prefix === 'white') {
        return '-White-Striped';
    }
    
    // Special case: DexID 585, 586 (Deerling, Sawsbuck) - seasonal forms
    if (dexID === 585 || dexID === 586) {
        if (prefix === 'summer') return '-Summer';
        if (prefix === 'fall') return '-Autumn';
        if (prefix === 'winter') return '-Winter';
    }
    
    // Special case: DexID 669, 670, 671 (Flabébé line) - flower colors
    if (dexID === 669 || dexID === 670 || dexID === 671) {
        if (prefix === 'b') return '-Blue-Flower';
        if (prefix === 'o') return '-Orange-Flower';
        if (prefix === 'w') return '-White-Flower';
        if (prefix === 'y') return '-Yellow-Flower';
    }
    
    // Special case: DexID 670 (Floette) - (e) is -Eternal
    if (dexID === 670 && prefix === 'e') {
        return '-Eternal';
    }
    
    // Special case: DexID 718 (Zygarde) - forms
    if (dexID === 718) {
        if (prefix === '10_') return '-10%';
        if (prefix === '100_') return '-Complete';
    }
    
    // Special case: DexID 745 (Lycanroc) - time forms
    if (dexID === 745) {
        if (prefix === 'dusk') return '-Dusk';
        if (prefix === 'night') return '-Midnight';
    }
    
    // Special case: DexID 849 (Toxtricity) - (low) is -Low-Key
    if (dexID === 849 && prefix === 'low') {
        return '-Low-Key';
    }
    
    // Special case: DexID 898 (Calyrex) - (sr) is -Shadow
    if (dexID === 898 && prefix === 'sr') {
        return '-Shadow';
    }
    
    // Special case: DexID 901 (Ursaluna) - (blood) is -Bloodmoon
    if (dexID === 901 && prefix === 'blood') {
        return '-Bloodmoon';
    }
    
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
    
    // Handle regional forms with new logic
    if (prefix === 'r') {
        // Check what regional forms exist for this DexID
        const regionalForms = pokemonRegionalForms[dexID];
        if (regionalForms && regionalForms.length === 1) {
            // Only one regional form exists, use it
            return `-${regionalForms[0]}`;
        }
        // Multiple or no regional forms - need explicit prefix
        return null; // Will be caught as custom
    }
    
    if (prefix === 'ra') {
        return '-Alola';
    }
    
    if (prefix === 'rg') {
        return '-Galar';
    }
    
    if (prefix === 'rh') {
        return '-Hisui';
    }
    
    if (prefix === 'rp') {
        return '-Paldea';
    }
    
    if (prefix === 'rs') {
        return '-Sevii';
    }
    
    // Generic prefix - capitalize first letter
    const capitalized = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    return `-${capitalized}`;
}

/**
 * Process a dexID group
 */
function processDexGroup(dexID, forms, pokemonName) {
    // Special case: DexID 666 (Vivillon) - filter out duplicate Gen6 file
    if (dexID === 666) {
        forms = forms.filter(f => !f.key.includes('Gen6'));
    }
    
    // Filter out all entries with (all) key
    forms = forms.filter(f => !f.key.toLowerCase().includes('(all)'));
    
    const parsed = forms.map(form => ({
        ...form,
        parsed: parseKey(form.key)
    }));
    
    // Separate forms by type
    const femForms = parsed.filter(f => f.parsed.prefix?.toLowerCase() === 'fem');
    const baseForms = parsed.filter(f => !f.parsed.prefix && f.parsed.middle && f.parsed.middle.toLowerCase().startsWith('base'));
    const plainForms = parsed.filter(f => !f.parsed.prefix && (!f.parsed.middle || (f.parsed.middle !== '-' && f.parsed.middle !== '' && !f.parsed.middle.toLowerCase().startsWith('base'))));
    const plainNoMiddleForms = parsed.filter(f => !f.parsed.prefix && (!f.parsed.middle || f.parsed.middle === '-' || f.parsed.middle === ''));
    
    // Group mega forms by type for version handling (exclude special cases where m/r are not mega)
    const megaForms = parsed.filter(f => {
        const prefix = f.parsed.prefix?.toLowerCase();
        return prefix === 'm' && dexID !== 201; // Exclude Unown
    });
    const megaXForms = parsed.filter(f => f.parsed.prefix?.toLowerCase() === 'mx');
    const megaYForms = parsed.filter(f => f.parsed.prefix?.toLowerCase() === 'my');
    
    const otherForms = parsed.filter(f => {
        const prefix = f.parsed.prefix?.toLowerCase();
        return f.parsed.prefix && !['fem', 'm', 'mx', 'my'].includes(prefix);
    });
    
    // Determine canonical form
    let canonicalForm = null;
    let canonicalIsFemale = false;
    
    // Special case: DexID 412, 413 (Burmy, Wormadam) - (plant) is canonical
    if ((dexID === 412 || dexID === 413) && !canonicalForm) {
        const plantForm = parsed.find(f => f.parsed.prefix?.toLowerCase() === 'plant');
        if (plantForm) {
            canonicalForm = plantForm;
        }
    }
    
    // Special case: DexID 421 (Cherrim) - (o) is canonical
    if (dexID === 421 && !canonicalForm) {
        const oForm = parsed.find(f => f.parsed.prefix?.toLowerCase() === 'o');
        if (oForm) {
            canonicalForm = oForm;
        }
    }
    
    // Special case: DexID 422, 423 (Shellos, Gastrodon) - (w) is canonical
    if ((dexID === 422 || dexID === 423) && !canonicalForm) {
        const wForm = parsed.find(f => f.parsed.prefix?.toLowerCase() === 'w');
        if (wForm) {
            canonicalForm = wForm;
        }
    }
    
    // Special case: DexID 550 (Basculin) - (red) is canonical
    if (dexID === 550 && !canonicalForm) {
        const redForm = parsed.find(f => f.parsed.prefix?.toLowerCase() === 'red');
        if (redForm) {
            canonicalForm = redForm;
        }
    }
    
    // Special case: DexID 585, 586 (Deerling, Sawsbuck) - (spring) is canonical
    if ((dexID === 585 || dexID === 586) && !canonicalForm) {
        const springForm = parsed.find(f => f.parsed.prefix?.toLowerCase() === 'spring');
        if (springForm) {
            canonicalForm = springForm;
        }
    }
    
    // Special case: DexID 666 (Vivillon) - (mea) is canonical
    if (dexID === 666 && !canonicalForm) {
        const meaForm = parsed.find(f => f.parsed.prefix?.toLowerCase() === 'mea' && !f.key.includes('Gen6'));
        if (meaForm) {
            canonicalForm = meaForm;
        }
    }
    
    // Special case: DexID 669, 670, 671 (Flabébé line) - (r) is canonical
    if ((dexID === 669 || dexID === 670 || dexID === 671) && !canonicalForm) {
        const rForm = parsed.find(f => f.parsed.prefix?.toLowerCase() === 'r');
        if (rForm) {
            canonicalForm = rForm;
        }
    }
    
    // Special case: DexID 711 (Gourgeist) - (xl) is canonical
    if (dexID === 711 && !canonicalForm) {
        const xlForm = parsed.find(f => f.parsed.prefix?.toLowerCase() === 'xl');
        if (xlForm) {
            canonicalForm = xlForm;
        }
    }
    
    // Special case: DexID 718 (Zygarde) - (50_) is canonical
    if (dexID === 718 && !canonicalForm) {
        const form50 = parsed.find(f => f.parsed.prefix?.toLowerCase() === '50_');
        if (form50) {
            canonicalForm = form50;
        }
    }
    
    // Special case: DexID 745 (Lycanroc) - (day) is canonical
    if (dexID === 745 && !canonicalForm) {
        const dayForm = parsed.find(f => f.parsed.prefix?.toLowerCase() === 'day');
        if (dayForm) {
            canonicalForm = dayForm;
        }
    }
    
    // Special case: DexID 771 (Pyukumuku) - (-01) is canonical
    if (dexID === 771 && !canonicalForm) {
        const form01 = parsed.find(f => f.key === '-01');
        if (form01) {
            canonicalForm = form01;
        }
    }
    
    // Special case: DexID 849 (Toxtricity) - (amp) is canonical
    if (dexID === 849 && !canonicalForm) {
        const ampForm = parsed.find(f => f.parsed.prefix?.toLowerCase() === 'amp');
        if (ampForm) {
            canonicalForm = ampForm;
        }
    }
    
    // Special case: DexID 854 (Sinistea) - (antique) is canonical
    if (dexID === 854 && !canonicalForm) {
        const antiqueForm = parsed.find(f => f.parsed.prefix?.toLowerCase() === 'antique');
        if (antiqueForm) {
            canonicalForm = antiqueForm;
        }
    }
    
    // Special case: DexID 888 (Zacian) - (hero) is canonical
    if (dexID === 888 && !canonicalForm) {
        const heroForm = parsed.find(f => f.parsed.prefix?.toLowerCase() === 'hero');
        if (heroForm) {
            canonicalForm = heroForm;
        }
    }
    
    // Special case: DexID 925 (Maushold) - (4) is canonical
    if (dexID === 925 && !canonicalForm) {
        const form4 = parsed.find(f => f.parsed.prefix === '4');
        if (form4) {
            canonicalForm = form4;
        }
    }
    
    // Special case: DexID 999 (Gimmighoul) - (chest) is canonical
    if (dexID === 999 && !canonicalForm) {
        const chestForm = parsed.find(f => f.parsed.prefix?.toLowerCase() === 'chest');
        if (chestForm) {
            canonicalForm = chestForm;
        }
    }
    
    // Special case: DexID 716 (Xerneas) - (neutral) is canonical
    if (dexID === 716 && !canonicalForm) {
        const neutralForm = parsed.find(f => f.parsed.prefix?.toLowerCase() === 'neutral');
        if (neutralForm) {
            canonicalForm = neutralForm;
        }
    }
    
    // Special case: DexID 648 (Meloetta) - (a) is canonical
    if (dexID === 648 && !canonicalForm) {
        const aForm = parsed.find(f => f.parsed.prefix?.toLowerCase() === 'a');
        if (aForm) {
            canonicalForm = aForm;
        }
    }
    
    // Special case: DexID 492 (Shaymin) - (l) is canonical
    if (dexID === 492 && !canonicalForm) {
        const lForm = parsed.find(f => f.parsed.prefix?.toLowerCase() === 'l');
        if (lForm) {
            canonicalForm = lForm;
        }
    }
    
    // Priority: (fem) forms, then base forms, then plain forms (highest version)
    if (!canonicalForm && femForms.length > 0) {
        femForms.sort((a, b) => {
            const aVer = parseInt(a.parsed.version?.replace(/^-/, '') || '0');
            const bVer = parseInt(b.parsed.version?.replace(/^-/, '') || '0');
            return bVer - aVer;
        });
        canonicalForm = femForms[0];
        canonicalIsFemale = true;
        stats.female++;
    } else if (!canonicalForm && baseForms.length > 0) {
        baseForms.sort((a, b) => {
            const aVer = parseInt(a.parsed.version?.replace(/^-/, '') || '0');
            const bVer = parseInt(b.parsed.version?.replace(/^-/, '') || '0');
            return bVer - aVer;
        });
        canonicalForm = baseForms[0];
    } else if (!canonicalForm && plainNoMiddleForms.length > 0) {
        plainNoMiddleForms.sort((a, b) => {
            const aVer = parseInt(a.parsed.version?.replace(/^-/, '') || '0');
            const bVer = parseInt(b.parsed.version?.replace(/^-/, '') || '0');
            return bVer - aVer;
        });
        canonicalForm = plainNoMiddleForms[0];
    }
    
    // Determine canonical mega forms (highest version for each mega type)
    let canonicalMega = null;
    let canonicalMegaX = null;
    let canonicalMegaY = null;
    
    if (megaForms.length > 0) {
        megaForms.sort((a, b) => {
            const aVer = parseInt(a.parsed.version?.replace(/^-/, '') || '0');
            const bVer = parseInt(b.parsed.version?.replace(/^-/, '') || '0');
            return bVer - aVer;
        });
        canonicalMega = megaForms[0];
    }
    
    if (megaXForms.length > 0) {
        megaXForms.sort((a, b) => {
            const aVer = parseInt(a.parsed.version?.replace(/^-/, '') || '0');
            const bVer = parseInt(b.parsed.version?.replace(/^-/, '') || '0');
            return bVer - aVer;
        });
        canonicalMegaX = megaXForms[0];
    }
    
    if (megaYForms.length > 0) {
        megaYForms.sort((a, b) => {
            const aVer = parseInt(a.parsed.version?.replace(/^-/, '') || '0');
            const bVer = parseInt(b.parsed.version?.replace(/^-/, '') || '0');
            return bVer - aVer;
        });
        canonicalMegaY = megaYForms[0];
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
        } else if (canonicalMega && form.filename === canonicalMega.filename) {
            isCanonical = true;
            name += '-Mega';
            stats.mega++;
        } else if (canonicalMegaX && form.filename === canonicalMegaX.filename) {
            isCanonical = true;
            name += '-Mega-X';
            stats.megaX++;
        } else if (canonicalMegaY && form.filename === canonicalMegaY.filename) {
            isCanonical = true;
            name += '-Mega-Y';
            stats.megaY++;
        } else {
            // Apply naming rules
            const prefix = form.parsed.prefix?.toLowerCase();
            const middle = form.parsed.middle;
            const hasMiddle = middle && middle !== '-' && middle !== '' && !middle.toLowerCase().startsWith('base');
            
            if (!prefix && !hasMiddle) {
                // Plain form but not canonical - it's a version
                const version = parseInt(form.parsed.version?.replace(/^-/, '') || '1');
                name += `-v${version}`;
                stats.versioned++;
            } else if (!prefix && middle && middle.toLowerCase().startsWith('base')) {
                // Base form but not canonical - it's a version
                const version = parseInt(form.parsed.version?.replace(/^-/, '') || '1');
                name += `-v${version}`;
                stats.versioned++;
            } else if (prefix === 'masc') {
                name += '-Male';
                stats.male++;
            } else if (prefix === 'm' && dexID !== 201) {
                // Non-canonical mega - add version (exclude Unown where m is a letter)
                name += '-Mega';
                const version = parseInt(form.parsed.version?.replace(/^-/, '') || '1');
                name += `-v${version}`;
                stats.mega++;
                stats.versioned++;
            } else if (prefix === 'mx') {
                // Non-canonical mega-x - add version
                name += '-Mega-X';
                const version = parseInt(form.parsed.version?.replace(/^-/, '') || '1');
                name += `-v${version}`;
                stats.megaX++;
                stats.versioned++;
            } else if (prefix === 'my') {
                // Non-canonical mega-y - add version
                name += '-Mega-Y';
                const version = parseInt(form.parsed.version?.replace(/^-/, '') || '1');
                name += `-v${version}`;
                stats.megaY++;
                stats.versioned++;
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
                    const suffix = getNameSuffix(form.parsed, dexID);
                    if (suffix) {
                        name += suffix;
                        // Track regional forms
                        if (suffix === '-Alola') {
                            stats.alola++;
                        } else if (suffix === '-Galar') {
                            stats.galar++;
                        } else if (suffix === '-Hisui') {
                            stats.hisui++;
                        } else if (suffix === '-Paldea') {
                            stats.paldea++;
                        } else if (suffix === '-Sevii') {
                            stats.sevii++;
                        } else {
                            stats.custom++;
                        }
                    } else {
                        stats.custom++;
                    }
                } else {
                    stats.custom++;
                }
                
                // If there's middle content, add it
                if (hasMiddle) {
                    const cleanMiddle = middle.replace(/^[-_]+/, '');
                    if (cleanMiddle) {
                        name += `-${cleanMiddle}`;
                    }
                }
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
let pokemonRegionalForms = {}; // Track which regional forms each DexID has
const rrMappingPath = './dex-to-rr-mapping.json';
if (fs.existsSync(rrMappingPath)) {
    console.log('Loading Pokemon names from RR mapping...');
    const rrMapping = JSON.parse(fs.readFileSync(rrMappingPath, 'utf8'));
    for (const [dexID, forms] of Object.entries(rrMapping)) {
        if (forms.length > 0) {
            pokemonNames[dexID] = forms[0].name;
        }
        
        // Track regional forms for this DexID
        const regionalForms = new Set();
        for (const form of forms) {
            if (form.key.includes('Alola')) {
                regionalForms.add('Alola');
            }
            if (form.key.includes('Galar')) {
                regionalForms.add('Galar');
            }
            if (form.key.includes('Hisui')) {
                regionalForms.add('Hisui');
            }
            if (form.key.includes('Paldea')) {
                regionalForms.add('Paldea');
            }
            if (form.key.includes('Sevii')) {
                regionalForms.add('Sevii');
            }
        }
        if (regionalForms.size > 0) {
            pokemonRegionalForms[dexID] = Array.from(regionalForms);
        }
    }
    console.log(`Found regional forms for ${Object.keys(pokemonRegionalForms).length} Pokemon`);
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
console.log(`  Alolan forms: ${stats.alola}`);
console.log(`  Galarian forms: ${stats.galar}`);
console.log(`  Hisuian forms: ${stats.hisui}`);
console.log(`  Paldean forms: ${stats.paldea}`);
console.log(`  Sevii forms: ${stats.sevii}`);
console.log(`  Custom forms: ${stats.custom}`);

// Print some examples
console.log('\n' + '='.repeat(50));
console.log('\nExample processed mappings:');

const exampleDexIds = [6, 25, 150, 3, 26, 27, 37, 38, 50, 51, 58, 100, 201, 386, 492, 648, 412, 421, 422, 550, 585, 666, 669, 718, 745, 849].filter(id => processedMapping[id]);
for (const dexID of exampleDexIds) {
    const forms = processedMapping[dexID];
    if (!forms || forms.length === 0) continue;
    console.log(`\n  DexID ${dexID}:`);
    for (const form of forms) {
        const canonicalMark = form.isCanonical ? ' [CANONICAL]' : '';
        console.log(`    - ${form.name}${canonicalMark}`);
        console.log(`      File: ${form.filename}, Key: ${form.key}`);
    }
}

// Check for dexIDs with no canonical forms
const dexIDsWithoutCanonical = [];
for (const [dexID, forms] of Object.entries(processedMapping)) {
    const hasCanonical = forms.some(f => f.isCanonical);
    if (!hasCanonical) {
        dexIDsWithoutCanonical.push({
            dexID: parseInt(dexID),
            name: pokemonNames[dexID] || `Unknown`,
            formCount: forms.length,
            forms: forms.map(f => `${f.name} (${f.key})`)
        });
    }
}

if (dexIDsWithoutCanonical.length > 0) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`\n⚠️  DexIDs WITHOUT canonical forms (${dexIDsWithoutCanonical.length} total):\n`);
    for (const entry of dexIDsWithoutCanonical) {
        console.log(`  DexID ${entry.dexID} (${entry.name}): ${entry.formCount} forms`);
        for (const form of entry.forms) {
            console.log(`    - ${form}`);
        }
    }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`\nProcessed mapping saved to: ${outputFile}`);
