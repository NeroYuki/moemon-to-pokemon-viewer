#!/usr/bin/env node

/**
 * JavaScript Pretty Printer
 * Usage: node format-js.js <input-file> [output-file]
 * If output-file is omitted, it will overwrite the input file
 */

const fs = require('fs');
const path = require('path');

// Get command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
    console.error('Usage: node format-js.js <input-file> [output-file]');
    console.error('Example: node format-js.js data.js');
    console.error('Example: node format-js.js data.js formatted-data.js');
    process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1] || inputFile;

// Check if input file exists
if (!fs.existsSync(inputFile)) {
    console.error(`Error: File '${inputFile}' not found`);
    process.exit(1);
}

// Read the file
console.log(`Reading ${inputFile}...`);
const code = fs.readFileSync(inputFile, 'utf8');

// Try to use prettier if available, otherwise use basic formatting
let formattedCode;
try {
    const prettier = require('prettier');
    console.log('Using Prettier for formatting...');
    formattedCode = prettier.format(code, {
        parser: 'babel',
        semi: true,
        singleQuote: true,
        tabWidth: 2,
        useTabs: false,
        trailingComma: 'es5',
        printWidth: 100,
    });
} catch (err) {
    console.log('Prettier not available, using basic formatting...');
    formattedCode = basicFormat(code);
}

// Write the formatted code
console.log(`Writing to ${outputFile}...`);
fs.writeFileSync(outputFile, formattedCode, 'utf8');

console.log(`✓ Successfully formatted ${inputFile}`);
if (outputFile !== inputFile) {
    console.log(`  Output saved to ${outputFile}`);
}

// Basic formatting function (fallback)
function basicFormat(code) {
    let formatted = '';
    let indent = 0;
    let inString = false;
    let stringChar = '';
    let inComment = false;
    let inMultiLineComment = false;
    
    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        const nextChar = code[i + 1] || '';
        const prevChar = code[i - 1] || '';
        
        // Handle comments
        if (!inString) {
            if (!inMultiLineComment && char === '/' && nextChar === '/') {
                inComment = true;
            }
            if (!inComment && char === '/' && nextChar === '*') {
                inMultiLineComment = true;
            }
            if (inMultiLineComment && char === '*' && nextChar === '/') {
                formatted += char;
                i++;
                formatted += code[i];
                inMultiLineComment = false;
                continue;
            }
        }
        
        // Handle strings
        if (!inComment && !inMultiLineComment) {
            if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                }
            }
        }
        
        // Reset comment flag at newline
        if (inComment && char === '\n') {
            inComment = false;
        }
        
        // Skip formatting inside strings and comments
        if (inString || inComment || inMultiLineComment) {
            formatted += char;
            continue;
        }
        
        // Handle indentation
        if (char === '{' || char === '[') {
            formatted += char;
            if (nextChar !== '}' && nextChar !== ']') {
                formatted += '\n' + '  '.repeat(++indent);
            }
        } else if (char === '}' || char === ']') {
            formatted += '\n' + '  '.repeat(--indent) + char;
        } else if (char === ';') {
            formatted += char;
            if (nextChar !== '\n' && nextChar !== ' ' && nextChar) {
                formatted += '\n' + '  '.repeat(indent);
            }
        } else if (char === ',') {
            formatted += char;
            if (nextChar !== '\n' && nextChar !== ' ' && nextChar) {
                formatted += ' ';
            }
        } else if (char === '\n') {
            // Skip excessive newlines
            if (prevChar !== '\n') {
                formatted += char + '  '.repeat(indent);
            }
        } else if (char === ' ' || char === '\t') {
            // Skip whitespace, we'll add our own
            continue;
        } else {
            formatted += char;
        }
    }
    
    // Clean up excessive newlines
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    formatted = formatted.trim() + '\n';
    
    return formatted;
}
