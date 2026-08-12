import path from "path";
import Scanner from "../scanner.js";
import { drawProgressBar, formatSize, padRight } from "../utils/format.js";
import { requirePath } from "./args.js";

export async function runScan(commandArgs) {
    const directoryPath = commandArgs[0];
    requirePath(directoryPath, "scan");

    const scanner = new Scanner();

    scanner.on("scan-start", ({ directory }) => {
        console.log(`Scanning: ${directory}`);
    });

    scanner.on("scan-discovered", ({ totalFiles }) => {
        if (totalFiles === 0) {
            console.log("No files found.");
        }
    });

    scanner.on("file-found", ({ processed, total }) => {
        process.stdout.write(`\rProcessing... ${drawProgressBar(processed, total)} files`);
    });

    scanner.on("file-error", ({ message }) => {
        process.stdout.write("\n");
        console.error(`Warning: ${message}`);
    });

    scanner.on("directory-error", ({ message }) => {
        process.stdout.write("\n");
        console.error(`Warning: ${message}`);
    });

    scanner.on("scan-complete", (stats) => {
        printScanResults(stats);
    });

    await scanner.scan(path.resolve(directoryPath));
}

function printScanResults(stats) {
    process.stdout.write("\n\nScan Results:\n");
    console.log("----------------------------------------");
    console.log(`Total files: ${stats.totalFiles}`);
    console.log(`Total size: ${formatSize(stats.totalSize)}`);

    const extensions = [...stats.byFileType.entries()].sort(
        (a, b) => b[1].totalSize - a[1].totalSize,
    );

    console.log("\nBy File Type:");
    for (const [extension, extensionStats] of extensions) {
        console.log(
            `  ${padRight(extension, 8)} ${padRight(`${extensionStats.count} files`, 10)} ${formatSize(extensionStats.totalSize)}`,
        );
    }

    console.log("\nFile Age:");
    console.log(`  Last 7 days:    ${stats.ageBuckets.last7Days} files`);
    console.log(`  Last 30 days:   ${stats.ageBuckets.last30Days} files`);
    console.log(`  Older than 90:  ${stats.ageBuckets.olderThan90Days} files`);

    console.log("\nLargest files:");
    stats.largestFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.name} (${formatSize(file.size)})`);
    });

    if (stats.oldestFile) {
        console.log(
            `\nOldest file: ${stats.oldestFile.name} (modified ${Math.floor(stats.oldestFile.ageDays)} days ago)`,
        );
    }
}
