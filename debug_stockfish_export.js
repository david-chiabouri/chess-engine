
const { createRequire } = require('module');
const { join } = require('path');
const fs = require('fs');

const candidates = [
    'stockfish-17.1-lite-single-03e3232.js',
    'stockfish-nnue-16-single.js',
    'stockfish.js'
];

const baseDir = join(process.cwd(), 'node_modules', 'stockfish', 'src');

// Polyfill for Bun compatibility
if (typeof self !== 'undefined' && !self.location) {
    console.log("Polyfilling self.location for Bun");
    self.location = { hash: "" };
}

for (const filename of candidates) {
    const jsPath = join(baseDir, filename);
    if (fs.existsSync(jsPath)) {
        console.log("Found:", jsPath);
        const mod = require(jsPath);
        console.log("Type:", typeof mod);
        if (typeof mod === 'object') {
            console.log("Keys:", Object.keys(mod));
            if (mod.Stockfish) console.log("Has Stockfish property");
        }
    }
}
