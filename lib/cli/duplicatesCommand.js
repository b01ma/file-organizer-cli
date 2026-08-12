import path from "path";
import DuplicateFinder from "../duplicates.js";
import { drawProgressBar, formatSize } from "../utils/format.js";
import { requirePath } from "./args.js";
import { printWarning } from "./output.js";

export async function runDuplicates(commandArgs) {
    const directoryPath = commandArgs[0];
    requirePath(directoryPath, "duplicates");

    const finder = new DuplicateFinder();

    finder.on("search-start", ({ directory }) => {
        console.log(`Searching for duplicates in: ${directory}`);
    });

    finder.on("file-processed", ({ processed, total }) => {
        process.stdout.write(`\rCalculating hashes... ${drawProgressBar(processed, total)} files`);
    });

    finder.on("file-error", ({ message }) => {
        printWarning(message);
    });

    finder.on("directory-error", ({ message }) => {
        printWarning(message);
    });

    finder.on("duplicates-found", (result) => {
        printDuplicatesResult(result);
    });

    await finder.find(path.resolve(directoryPath));
}

function printDuplicatesResult({ groups, totalWastedSpace }) {
    process.stdout.write("\n\n");

    if (groups.length === 0) {
        console.log("No duplicates found.");
        return;
    }

    console.log(
        `Found ${groups.length} duplicate groups (${formatSize(totalWastedSpace)} wasted):\n`,
    );

    groups.forEach((group, index) => {
        console.log("----------------------------------------");
        console.log(
            `Group ${index + 1} (${group.copies} copies, ${formatSize(group.fileSize)} each):`,
        );
        console.log(`  SHA-256: ${group.hash}`);
        console.log("");

        group.files.forEach((file) => {
            console.log(`  ${file.path}`);
        });

        console.log(`\n  Wasted space: ${formatSize(group.wastedSpace)}\n`);
    });

    console.log("----------------------------------------");
    console.log(`Total wasted space: ${formatSize(totalWastedSpace)}`);
}
