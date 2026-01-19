
/**
 * Stockfish Worker for Bun (Node-Direct Pattern)
 */

import { createRequire } from 'module';
import { join, dirname, extname } from 'path';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';

declare var self: any;

// 1. Locate Stockfish Files
const findStockfishFiles = () => {
    // Priority: 17.1 (Lite), 16, Generic
    const candidates = [
        'stockfish-17.1-lite-single-03e3232.js',
        'stockfish-nnue-16-single.js',
        'stockfish.js'
    ];

    const baseDir = join(process.cwd(), 'node_modules', 'stockfish', 'src');

    for (const filename of candidates) {
        const jsPath = join(baseDir, filename);
        if (existsSync(jsPath)) {
            const ext = extname(jsPath);
            const base = jsPath.slice(0, -ext.length);
            const wasmPath = base + '.wasm';
            if (existsSync(wasmPath)) return { jsPath, wasmPath };
        }
    }

    try {
        const require = createRequire(import.meta.url);
        const entry = require.resolve('stockfish');
        const packageDir = dirname(entry);

        for (const filename of candidates) {
            const jsPath = join(packageDir, filename);
            if (existsSync(jsPath)) {
                const ext = extname(jsPath);
                const base = jsPath.slice(0, -ext.length);
                const wasmPath = base + '.wasm';
                if (existsSync(wasmPath)) return { jsPath, wasmPath };
            }
        }

        const ext = extname(entry);
        const base = entry.slice(0, -ext.length);
        const wasmPath = base + '.wasm';
        return { jsPath: entry, wasmPath };

    } catch (e) {
        throw new Error("[Stockfish Worker] Could not resolve stockfish package.");
    }
};

const { jsPath, wasmPath } = findStockfishFiles();

// 2. Load Resources with Patching
const require = createRequire(import.meta.url);

// HACK: Hide onmessage to prevent Stockfish from detecting 'worker' mode
const globalAny = globalThis as any;
const savedOnMessage = globalAny.onmessage;
delete globalAny.onmessage;

// HACK: Polyfill location for Bun
if (typeof self !== 'undefined' && !self.location) {
    self.location = { hash: "", search: "", href: "", origin: "" } as any;
}

// HACK: Patch the file content to bypass worker_threads check
const originalContent = readFileSync(jsPath, 'utf8');
// Replace `!require("worker_threads").isMainThread` with `false`
// This forces it to skip the worker block and go to exports.
const patchedContent = originalContent.replace(/!require\("worker_threads"\)\.isMainThread/g, 'false');

const patchedPath = join(dirname(jsPath), `stockfish-patched-${Date.now()}.js`);
writeFileSync(patchedPath, patchedContent);

let INIT_ENGINE: any;
try {
    INIT_ENGINE = require(patchedPath);
} finally {
    // Cleanup
    try { unlinkSync(patchedPath); } catch (e) { }
    // Restore onmessage
    if (savedOnMessage) globalAny.onmessage = savedOnMessage;
}

const wasmBinary = readFileSync(wasmPath);

// 3. Configure Engine
// 3. Configure Engine
const engine: any = {
    locateFile: (path: string) => {
        if (path.indexOf('.wasm') > -1) {
            return wasmPath;
        }
        return jsPath;
    },
    wasmBinary: wasmBinary,
    print: (line: string) => {
        console.log(`[Engine Stdout]: ${line}`);
    },
    printErr: (line: string) => {
        console.error(`[Engine Stderr]: ${line}`);
    },
    onAbort: (reason: any) => {
        console.error("[Engine Abort]:", reason);
    },
    quit: (status: any, toThrow: any) => {
        console.error("[Engine Quit]:", status, toThrow);
    },
    noExitRuntime: true, // Prevent engine from exiting after main()
    noInitialRun: true // Prevent automatic main() execution which calls exit(0) on idle
};

// 4. Initialize
if (typeof INIT_ENGINE === 'function') {
    const Stockfish = INIT_ENGINE();

    Stockfish(engine).then((instance: any) => {
        // Bridge Messaging
        self.onmessage = (event: MessageEvent) => {
            const cmd = typeof event.data === 'string' ? event.data : event.data.toString();
            instance.sendCommand ? instance.sendCommand(cmd) :
                engine.sendCommand ? engine.sendCommand(cmd) :
                    instance.ccall("command", null, ["string"], [cmd], { async: /^go\b/.test(cmd) });
        };

        if (instance.addMessageListener) {
            instance.addMessageListener((line: string) => self.postMessage(line));
        } else {
            engine.listener = (line: string) => self.postMessage(line);
        }

    }).catch((err: any) => {
        console.error("[Stockfish Worker] Initialization Error:", err);
        process.exit(1);
    });

} else {
    // Fallback if exports is weird
    if ((INIT_ENGINE as any).Stockfish) {
        // ... implementation for this case if needed
    }
    console.error("[Stockfish Worker] Loaded JS is not a function:", typeof INIT_ENGINE);
    console.error("Keys:", Object.keys(INIT_ENGINE));
    process.exit(1);
}
