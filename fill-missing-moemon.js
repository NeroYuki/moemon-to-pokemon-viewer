const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Paths
const NEW_SPRITE_BASE = './moemon_sprite_april_25/Sprite Database';
const SPLIT_OUTPUT = './moemon-sprites-split';
const MAPPING_FILE = './dex-to-moemon-mapping-processed.json';
const LOG_FILE = './fill-missing-moemon-log.txt';

// Store findings
const log = [];
const newSprites = {
    base: {},      // dexID -> filename
    mega: {},      // dexID -> [filenames]
    regional: {},  // dexID -> {A/G/H/P: filename}
    unown: []      // All unown forms
};

const gaps = {
    missingBase: [],    // dexIDs without any base form
    missingMega: [],    // dexIDs without mega but new dataset has it
    missingRegional: [] // dexIDs without regional but new dataset has it
};

const processed = {
    split: [],         // List of files that were split
    skipped: []        // Files that were skipped (already exist, etc.)
};

function logMsg(msg) {
    console.log(msg);
    log.push(msg);
}

// Scan new sprite folders
function scanNewSprites() {
    logMsg('=== SCANNING NEW SPRITE DATASET ===');
    
    // Scan main folder for base forms
    const mainFiles = fs.readdirSync(NEW_SPRITE_BASE);
    const baseFiles = mainFiles.filter(f => f.endsWith('.png') && /^\d+\.png$/.test(f));
    logMsg(`\nFound ${baseFiles.length} base form sprites in main folder`);
    
    baseFiles.forEach(file => {
        const dexID = parseInt(file.replace('.png', ''));
        newSprites.base[dexID] = file;
    });
    
    // Also check for special forms in main folder (e.g., 115-M.png, 555-Z.png, 648-P.png)
    const specialMainFiles = mainFiles.filter(f => f.endsWith('.png') && /^\d+-[A-Z]\.png$/.test(f));
    logMsg(`Found ${specialMainFiles.length} special form sprites in main folder`);
    specialMainFiles.forEach(file => {
        const match = file.match(/^(\d+)-([A-Z])\.png$/);
        if (match) {
            const dexID = parseInt(match[1]);
            const formType = match[2];
            
            if (formType === 'M') {
                // Mega
                if (!newSprites.mega[dexID]) newSprites.mega[dexID] = [];
                newSprites.mega[dexID].push(file);
            } else if (['A', 'G', 'H', 'P'].includes(formType)) {
                // Regional
                if (!newSprites.regional[dexID]) newSprites.regional[dexID] = {};
                newSprites.regional[dexID][formType] = file;
            }
        }
    });
    
    // Scan Megas folder
    const megasPath = path.join(NEW_SPRITE_BASE, 'Megas');
    if (fs.existsSync(megasPath)) {
        const megaFiles = fs.readdirSync(megasPath).filter(f => f.endsWith('.png'));
        logMsg(`\nFound ${megaFiles.length} mega form sprites in Megas folder`);
        
        megaFiles.forEach(file => {
            const match = file.match(/^(\d+)(-[a-z]+)?-(M[XY]?)\.png$/i);
            if (match) {
                const dexID = parseInt(match[1]);
                const formVariant = match[2] || ''; // e.g., '-m' for male variant
                const megaType = match[3]; // M, MX, or MY
                
                if (!newSprites.mega[dexID]) newSprites.mega[dexID] = [];
                newSprites.mega[dexID].push(path.join('Megas', file));
            }
        });
    }
    
    // Scan Regional Forms folder
    const regionalPath = path.join(NEW_SPRITE_BASE, 'Regional Forms');
    if (fs.existsSync(regionalPath)) {
        const regionalFiles = fs.readdirSync(regionalPath).filter(f => f.endsWith('.png'));
        logMsg(`\nFound ${regionalFiles.length} regional form sprites in Regional Forms folder`);
        
        regionalFiles.forEach(file => {
            const match = file.match(/^(\d+)-([AGHP])\.png$/);
            if (match) {
                const dexID = parseInt(match[1]);
                const region = match[2];
                
                if (!newSprites.regional[dexID]) newSprites.regional[dexID] = {};
                newSprites.regional[dexID][region] = path.join('Regional Forms', file);
            }
        });
    }
    
    // Scan Unown folder (all count as base forms)
    const unownPath = path.join(NEW_SPRITE_BASE, 'Unown');
    if (fs.existsSync(unownPath)) {
        const unownFiles = fs.readdirSync(unownPath).filter(f => f.endsWith('.png'));
        logMsg(`\nFound ${unownFiles.length} Unown form sprites in Unown folder`);
        newSprites.unown = unownFiles.map(f => path.join('Unown', f));
    }
    
    // Summary
    logMsg('\n=== NEW SPRITE SUMMARY ===');
    logMsg(`Base forms: ${Object.keys(newSprites.base).length} dexIDs`);
    logMsg(`Mega forms: ${Object.keys(newSprites.mega).length} dexIDs (${Object.values(newSprites.mega).flat().length} total files)`);
    logMsg(`Regional forms: ${Object.keys(newSprites.regional).length} dexIDs`);
    logMsg(`Unown forms: ${newSprites.unown.length}`);
    
    // List regional breakdown
    const regionalBreakdown = { A: 0, G: 0, H: 0, P: 0 };
    Object.values(newSprites.regional).forEach(regions => {
        Object.keys(regions).forEach(r => regionalBreakdown[r]++);
    });
    logMsg(`  - Alola (A): ${regionalBreakdown.A}`);
    logMsg(`  - Galar (G): ${regionalBreakdown.G}`);
    logMsg(`  - Hisui (H): ${regionalBreakdown.H}`);
    logMsg(`  - Paldea/Sevii (P): ${regionalBreakdown.P}`);
}

// Load existing moemon mapping
function loadExistingMapping() {
    logMsg('\n=== LOADING EXISTING MOEMON MAPPING ===');
    
    const mappingData = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));
    const stats = {
        totalDexIDs: Object.keys(mappingData).length,
        withBase: 0,
        withMega: 0,
        withRegional: 0,
        withAlola: 0,
        withGalar: 0,
        withHisui: 0,
        withPaldea: 0
    };
    
    Object.entries(mappingData).forEach(([dexID, forms]) => {
        const hasBase = forms.some(f => !f.name.includes('-Mega') && !f.name.includes('-Alola') && 
                                       !f.name.includes('-Galar') && !f.name.includes('-Hisui'));
        const hasMega = forms.some(f => f.name.includes('-Mega'));
        const hasAlola = forms.some(f => f.name.includes('-Alola'));
        const hasGalar = forms.some(f => f.name.includes('-Galar'));
        const hasHisui = forms.some(f => f.name.includes('-Hisui'));
        const hasRegional = hasAlola || hasGalar || hasHisui;
        
        if (hasBase) stats.withBase++;
        if (hasMega) stats.withMega++;
        if (hasRegional) stats.withRegional++;
        if (hasAlola) stats.withAlola++;
        if (hasGalar) stats.withGalar++;
        if (hasHisui) stats.withHisui++;
    });
    
    logMsg(`Total dexIDs in mapping: ${stats.totalDexIDs}`);
    logMsg(`  - With base form: ${stats.withBase}`);
    logMsg(`  - With mega form: ${stats.withMega}`);
    logMsg(`  - With regional forms: ${stats.withRegional}`);
    logMsg(`    * Alola: ${stats.withAlola}`);
    logMsg(`    * Galar: ${stats.withGalar}`);
    logMsg(`    * Hisui: ${stats.withHisui}`);
    
    return mappingData;
}

// Identify gaps
function identifyGaps(existingMapping) {
    logMsg('\n=== IDENTIFYING GAPS ===');
    
    // Check for missing base forms
    Object.keys(newSprites.base).forEach(dexID => {
        const existing = existingMapping[dexID];
        
        if (!existing || existing.length === 0) {
            // No entry at all for this dexID
            gaps.missingBase.push({
                dexID: parseInt(dexID),
                reason: 'No entry in mapping',
                available: newSprites.base[dexID]
            });
        } else {
            // Check if there's a base form (non-mega, non-regional)
            const hasBase = existing.some(f => 
                !f.name.includes('-Mega') && 
                !f.name.includes('-Alola') && 
                !f.name.includes('-Galar') && 
                !f.name.includes('-Hisui')
            );
            
            if (!hasBase) {
                gaps.missingBase.push({
                    dexID: parseInt(dexID),
                    reason: 'Has forms but no base',
                    available: newSprites.base[dexID]
                });
            }
        }
    });
    
    // Check for missing megas
    Object.keys(newSprites.mega).forEach(dexID => {
        const existing = existingMapping[dexID];
        
        if (!existing || !existing.some(f => f.name.includes('-Mega'))) {
            gaps.missingMega.push({
                dexID: parseInt(dexID),
                available: newSprites.mega[dexID]
            });
        }
    });
    
    // Check for missing regionals
    Object.entries(newSprites.regional).forEach(([dexID, regions]) => {
        const existing = existingMapping[dexID];
        
        Object.entries(regions).forEach(([regionCode, filename]) => {
            const regionName = {
                'A': 'Alola',
                'G': 'Galar',
                'H': 'Hisui',
                'P': 'Sevii' // Assuming P is Paldea/Sevii
            }[regionCode];
            
            if (!existing || !existing.some(f => f.name.includes(`-${regionName}`))) {
                gaps.missingRegional.push({
                    dexID: parseInt(dexID),
                    region: regionName,
                    regionCode: regionCode,
                    available: filename
                });
            }
        });
    });
    
    logMsg(`Missing base forms: ${gaps.missingBase.length}`);
    gaps.missingBase.forEach(gap => {
        logMsg(`  - DexID ${gap.dexID}: ${gap.reason} (available: ${gap.available})`);
    });
    
    logMsg(`\nMissing mega forms: ${gaps.missingMega.length}`);
    gaps.missingMega.forEach(gap => {
        logMsg(`  - DexID ${gap.dexID}: ${gap.available.join(', ')}`);
    });
    
    logMsg(`\nMissing regional forms: ${gaps.missingRegional.length}`);
    const regionalByRegion = { Alola: [], Galar: [], Hisui: [], Sevii: [] };
    gaps.missingRegional.forEach(gap => {
        regionalByRegion[gap.region].push(gap);
    });
    Object.entries(regionalByRegion).forEach(([region, items]) => {
        logMsg(`  ${region}: ${items.length}`);
        items.forEach(gap => {
            logMsg(`    - DexID ${gap.dexID} (available: ${gap.available})`);
        });
    });
}

// Split sprite sheet (4-in-1 horizontal layout)
async function splitSpriteSheet(inputPath, dexID, key) {
    try {
        const fullPath = path.join(NEW_SPRITE_BASE, inputPath);
        const image = sharp(fullPath);
        const metadata = await image.metadata();
        
        const width = metadata.width;
        const height = metadata.height;
        const spriteWidth = Math.floor(width / 4);
        
        const types = ['front', 'front shiny', 'back', 'back shiny'];
        const outputs = [];
        
        for (let i = 0; i < 4; i++) {
            const outputDir = path.join(SPLIT_OUTPUT, types[i]);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            
            const outputFilename = `${String(dexID).padStart(4, '0')}${key}.png`;
            const outputPath = path.join(outputDir, outputFilename);
            
            // Check if file already exists
            if (fs.existsSync(outputPath)) {
                logMsg(`    Skipped ${types[i]}/${outputFilename} (already exists)`);
                processed.skipped.push(`${types[i]}/${outputFilename}`);
                continue;
            }
            
            await sharp(fullPath)
                .extract({ 
                    left: i * spriteWidth, 
                    top: 0, 
                    width: spriteWidth, 
                    height: height 
                })
                .toFile(outputPath);
            
            outputs.push(`${types[i]}/${outputFilename}`);
            processed.split.push(`${types[i]}/${outputFilename}`);
        }
        
        return outputs;
    } catch (error) {
        logMsg(`    ERROR splitting ${inputPath}: ${error.message}`);
        return [];
    }
}

// Process gaps and fill them
async function processGaps() {
    logMsg('\n=== PROCESSING GAPS ===');
    
    // Process missing base forms
    if (gaps.missingBase.length > 0) {
        logMsg(`\nProcessing ${gaps.missingBase.length} missing base forms...`);
        
        for (const gap of gaps.missingBase) {
            logMsg(`  Processing DexID ${gap.dexID}...`);
            const key = ''; // Base forms typically have no key suffix
            const outputs = await splitSpriteSheet(gap.available, gap.dexID, key);
            if (outputs.length > 0) {
                logMsg(`    ✓ Split to: ${outputs.join(', ')}`);
            }
        }
    }
    
    // Process missing megas
    if (gaps.missingMega.length > 0) {
        logMsg(`\nProcessing ${gaps.missingMega.length} missing mega forms...`);
        
        for (const gap of gaps.missingMega) {
            logMsg(`  Processing DexID ${gap.dexID} megas...`);
            
            for (const filename of gap.available) {
                // Extract mega type from filename
                const match = filename.match(/(\d+)(-[a-z]+)?-(M[XY]?)\.png$/i);
                if (match) {
                    const megaType = match[3]; // M, MX, or MY
                    const variant = match[2] || ''; // e.g., -m for male
                    
                    let key = '';
                    if (megaType === 'MX') key = '(mx)';
                    else if (megaType === 'MY') key = '(my)';
                    else key = '(m)';
                    
                    // Add variant if present
                    if (variant) {
                        key = `${variant}${key}`;
                    }
                    
                    logMsg(`    Mega type: ${megaType}, key: ${key}`);
                    const outputs = await splitSpriteSheet(filename, gap.dexID, key);
                    if (outputs.length > 0) {
                        logMsg(`      ✓ Split to: ${outputs.join(', ')}`);
                    }
                }
            }
        }
    }
    
    // Process missing regionals
    if (gaps.missingRegional.length > 0) {
        logMsg(`\nProcessing ${gaps.missingRegional.length} missing regional forms...`);
        
        for (const gap of gaps.missingRegional) {
            logMsg(`  Processing DexID ${gap.dexID} ${gap.region}...`);
            
            // Map region to key format
            const regionKey = {
                'Alola': '(ra)',
                'Galar': '(rg)',
                'Hisui': '(rh)',
                'Sevii': '(r)' // Assuming Sevii uses (r)
            }[gap.region];
            
            const outputs = await splitSpriteSheet(gap.available, gap.dexID, regionKey);
            if (outputs.length > 0) {
                logMsg(`    ✓ Split to: ${outputs.join(', ')}`);
            }
        }
    }
    
    // Special case: Unown forms (dexID 201)
    if (newSprites.unown.length > 0) {
        logMsg(`\n\nProcessing ${newSprites.unown.length} Unown forms (DexID 201)...`);
        
        for (const filename of newSprites.unown) {
            // Extract form letter/symbol from filename (e.g., 201-a.png -> a)
            const match = filename.match(/201-([a-z]+|exclamation|question)\.png$/i);
            if (match) {
                const formLetter = match[1];
                logMsg(`  Processing Unown-${formLetter}...`);
                
                // Create key in format (letter) or (exclamation)/(question)
                const key = `(${formLetter})`;
                
                const outputs = await splitSpriteSheet(filename, 201, key);
                if (outputs.length > 0) {
                    logMsg(`    ✓ Split to: ${outputs.join(', ')}`);
                }
            }
        }
    }
}

// Main execution
async function main() {
    logMsg('========================================');
    logMsg('FILL MISSING MOEMON SPRITES');
    logMsg(`Started: ${new Date().toISOString()}`);
    logMsg('========================================');
    
    scanNewSprites();
    const existingMapping = loadExistingMapping();
    identifyGaps(existingMapping);
    await processGaps();
    
    logMsg('\n=== SUMMARY ===');
    logMsg(`Total files split: ${processed.split.length}`);
    logMsg(`Total files skipped: ${processed.skipped.length}`);
    
    if (processed.split.length > 0) {
        logMsg('\nFiles split:');
        processed.split.forEach(file => logMsg(`  - ${file}`));
    }
    
    if (processed.skipped.length > 0) {
        logMsg('\nFiles skipped (already exist):');
        processed.skipped.forEach(file => logMsg(`  - ${file}`));
    }
    
    logMsg('\n========================================');
    logMsg(`Completed: ${new Date().toISOString()}`);
    logMsg('========================================');
    
    // Write log to file
    fs.writeFileSync(LOG_FILE, log.join('\n'), 'utf8');
    console.log(`\nLog written to: ${LOG_FILE}`);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
