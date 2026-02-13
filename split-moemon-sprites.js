#!/usr/bin/env node

/**
 * Split Moemon sprite sheets into individual sprites
 * Each sprite sheet contains 4 sprites: front, front shiny, back, back shiny
 * 
 * Usage: node split-moemon-sprites.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SPRITESETS_DIR = './moemon_sprite';
const OUTPUT_DIR = './moemon-sprites-split';

// Output subdirectories matching Radical Red structure
const OUTPUT_FOLDERS = {
    front: path.join(OUTPUT_DIR, 'front'),
    frontShiny: path.join(OUTPUT_DIR, 'front shiny'),
    back: path.join(OUTPUT_DIR, 'back'),
    backShiny: path.join(OUTPUT_DIR, 'back shiny')
};

// Track file processing
const stats = {
    processed: 0,
    failed: 0,
    duplicates: [],
    errors: []
};

// Track filenames to detect duplicates
const filenameRegistry = new Map();

/**
 * Recursively get all image files from a directory
 */
function getAllImageFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) {
        return fileList;
    }

    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            getAllImageFiles(filePath, fileList);
        } else if (/\.(png|jpg|jpeg|gif|bmp)$/i.test(file)) {
            fileList.push(filePath);
        }
    }
    
    return fileList;
}

/**
 * Get a unique filename if there's a duplicate
 */
function getUniqueFilename(basename, folder, originalPath) {
    const ext = path.extname(basename);
    const nameWithoutExt = path.basename(basename, ext);
    
    if (!filenameRegistry.has(basename)) {
        filenameRegistry.set(basename, [originalPath]);
        return basename;
    }
    
    // Duplicate found - append folder path info to make it unique
    const existingPaths = filenameRegistry.get(basename);
    const relativeFolder = path.relative(SPRITESETS_DIR, path.dirname(originalPath));
    const folderPart = relativeFolder.replace(/[\\\/]/g, '-').replace(/\s+/g, '_');
    
    let uniqueName = `${nameWithoutExt}_${folderPart}${ext}`;
    let counter = 1;
    
    // If still duplicate, add counter
    while (filenameRegistry.has(uniqueName)) {
        uniqueName = `${nameWithoutExt}_${folderPart}_${counter}${ext}`;
        counter++;
    }
    
    existingPaths.push(originalPath);
    filenameRegistry.set(basename, existingPaths);
    filenameRegistry.set(uniqueName, [originalPath]);
    
    stats.duplicates.push({
        original: basename,
        unique: uniqueName,
        path: originalPath,
        conflictsWith: existingPaths[0]
    });
    
    return uniqueName;
}

/**
 * Split a sprite sheet into 4 individual sprites
 */
async function splitSpriteSheet(inputPath) {
    try {
        const image = sharp(inputPath);
        const metadata = await image.metadata();
        
        // Calculate sprite dimensions
        // 4 sprites in 1 row: front, front shiny, back, back shiny
        const spriteWidth = Math.floor(metadata.width / 4);
        const spriteHeight = metadata.height;
        
        const basename = path.basename(inputPath);
        const uniqueBasename = getUniqueFilename(basename, path.dirname(inputPath), inputPath);
        
        // Define the 4 sprite positions: front, front shiny, back, back shiny
        const sprites = [
            { x: 0, y: 0, folder: OUTPUT_FOLDERS.front, name: 'front' },
            { x: spriteWidth, y: 0, folder: OUTPUT_FOLDERS.frontShiny, name: 'front shiny' },
            { x: spriteWidth * 2, y: 0, folder: OUTPUT_FOLDERS.back, name: 'back' },
            { x: spriteWidth * 3, y: 0, folder: OUTPUT_FOLDERS.backShiny, name: 'back shiny' }
        ];
        
        // Extract and save each sprite
        for (const sprite of sprites) {
            const outputPath = path.join(sprite.folder, uniqueBasename);
            
            await sharp(inputPath)
                .extract({
                    left: sprite.x,
                    top: sprite.y,
                    width: spriteWidth,
                    height: spriteHeight
                })
                .toFile(outputPath);
        }
        
        stats.processed++;
        
        if (stats.processed % 50 === 0) {
            console.log(`Processed ${stats.processed} files...`);
        }
        
    } catch (error) {
        stats.failed++;
        stats.errors.push({
            file: inputPath,
            error: error.message
        });
        console.error(`Error processing ${inputPath}: ${error.message}`);
    }
}

/**
 * Main function
 */
async function main() {
    console.log('Moemon Sprite Splitter\n');
    console.log('='.repeat(50));
    
    // Create output directories
    console.log('\nCreating output directories...');
    for (const folder of Object.values(OUTPUT_FOLDERS)) {
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
            console.log(`  Created: ${folder}`);
        }
    }
    
    // Scan for all Gen folders
    console.log('\nScanning for sprite files...');
    const genFolders = [];
    
    if (fs.existsSync(SPRITESETS_DIR)) {
        const folders = fs.readdirSync(SPRITESETS_DIR);
        for (const folder of folders) {
            const folderPath = path.join(SPRITESETS_DIR, folder);
            if (fs.statSync(folderPath).isDirectory()) {
                genFolders.push(folderPath);
            }
        }
    } else {
        console.error(`Error: Spritesets directory not found: ${SPRITESETS_DIR}`);
        process.exit(1);
    }
    
    console.log(`Found ${genFolders.length} folders to process`);
    
    // Get all image files
    let allImages = [];
    for (const folder of genFolders) {
        const images = getAllImageFiles(folder);
        allImages = allImages.concat(images);
        console.log(`  ${path.basename(folder)}: ${images.length} images`);
    }
    
    console.log(`\nTotal images to process: ${allImages.length}`);
    
    // Process all images
    console.log('\nProcessing sprite sheets...\n');
    
    for (const imagePath of allImages) {
        await splitSpriteSheet(imagePath);
    }
    
    // Print results
    console.log('\n' + '='.repeat(50));
    console.log('\nProcessing complete!\n');
    console.log(`✓ Successfully processed: ${stats.processed}`);
    console.log(`✗ Failed: ${stats.failed}`);
    console.log(`⚠ Duplicates found: ${stats.duplicates.length}`);
    
    if (stats.duplicates.length > 0) {
        console.log('\n' + '='.repeat(50));
        console.log('\nDuplicate filenames (renamed):');
        console.log('='.repeat(50));
        for (const dup of stats.duplicates) {
            const relPath = path.relative(SPRITESETS_DIR, dup.path);
            const conflictPath = path.relative(SPRITESETS_DIR, dup.conflictsWith);
            console.log(`\n  Original: ${dup.original}`);
            console.log(`  Renamed to: ${dup.unique}`);
            console.log(`  Location: ${relPath}`);
            console.log(`  Conflicts with: ${conflictPath}`);
        }
    }
    
    if (stats.errors.length > 0) {
        console.log('\n' + '='.repeat(50));
        console.log('\nErrors encountered:');
        console.log('='.repeat(50));
        for (const error of stats.errors) {
            const relPath = path.relative(SPRITESETS_DIR, error.file);
            console.log(`\n  File: ${relPath}`);
            console.log(`  Error: ${error.error}`);
        }
    }
    
    console.log(`\nOutput saved to: ${OUTPUT_DIR}`);
    console.log('\nFolder structure:');
    console.log('  - front/');
    console.log('  - front shiny/');
    console.log('  - back/');
    console.log('  - back shiny/');
}

// Check if Sharp is installed
try {
    require.resolve('sharp');
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
} catch (e) {
    console.error('Error: Sharp library not found.');
    console.error('Please install it by running: npm install sharp');
    console.error('\nAlternatively, run: npm install');
    process.exit(1);
}
