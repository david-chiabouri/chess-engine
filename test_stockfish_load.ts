
import { join } from 'path';
import { Worker } from 'worker_threads';

console.log("Attempting to find stockfish file...");

// Using the lite version
const stockfishPath = "./node_modules/stockfish/src/stockfish-17.1-lite-single-03e3232.js";
const absolutePath = join(process.cwd(), stockfishPath);

console.log(`Loading worker from: ${absolutePath}`);

try {
    const worker = new Worker(absolutePath);

    worker.on('message', (data) => {
        console.log("Received message from worker:", data);
        if (typeof data === 'string' && data.includes("Stockfish")) {
            console.log("SUCCESS: Stockfish loaded!");
            worker.terminate();
            process.exit(0);
        }
    });

    worker.on('error', (err) => {
        console.error("Worker error:", err);
        process.exit(1);
    });

    // Send uci command to trigger a response
    worker.postMessage("uci");

    // Timeout
    setTimeout(() => {
        console.error("Timeout waiting for response");
        process.exit(1);
    }, 5000);

} catch (e) {
    console.error("Failed to create worker:", e);
}
