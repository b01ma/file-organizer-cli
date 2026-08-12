import path from "path";
import Cleanup from "../cleanup.js";
import { drawProgressBar, formatSize } from "../utils/format.js";
import { getOptionValue, hasFlag, requirePath } from "./args.js";
import { printWarning } from "./output.js";

export async function runCleanup(commandArgs) {
    const directoryPath = commandArgs[0];
    requirePath(directoryPath, "cleanup");

    const optionArgs = commandArgs.slice(1);
    const olderThanRaw = getOptionValue(optionArgs, "--older-than");
    if (!olderThanRaw) {
        throw new Error("Missing required option --older-than <days>");
    }

    const olderThanDays = Number(olderThanRaw);
    if (!Number.isFinite(olderThanDays) || olderThanDays <= 0) {
        throw new Error("Option --older-than must be a positive number");
    }

    const shouldDelete = hasFlag(optionArgs, "--confirm");

    const cleanup = new Cleanup();

    cleanup.on("cleanup-start", ({ directory, olderThanDays: days }) => {
        console.log(`Cleanup: ${directory}`);
        console.log(`Looking for files older than ${days} days...\n`);
    });

    cleanup.on("search-complete", (searchResult) => {
        printFoundFiles(searchResult);

        if (searchResult.totalCandidates > 0 && shouldDelete) {
            console.log(
                `DELETING ${searchResult.totalCandidates} files (${formatSize(searchResult.totalCandidateBytes)}). This action cannot be undone!\n`,
            );
        }
    });

    cleanup.on("file-deleted", ({ processed, total }) => {
        process.stdout.write(`\rDeleting... ${drawProgressBar(processed, total)}`);
    });

    cleanup.on("file-delete-error", ({ message }) => {
        printWarning(message);
    });

    cleanup.on("directory-error", ({ message }) => {
        printWarning(message);
    });

    cleanup.on("cleanup-complete", (result) => {
        printCleanupOutcome(result);
    });

    await cleanup.run(path.resolve(directoryPath), olderThanDays, shouldDelete);
}

function printFoundFiles(searchResult) {
    console.log(`Found ${searchResult.totalCandidates} files to delete:\n`);

    const previewLimit = 20;
    searchResult.candidates.slice(0, previewLimit).forEach((file) => {
        console.log(`${file.path}`);
        console.log(`  Size: ${formatSize(file.size)}`);
        console.log(
            `  Modified: ${Math.floor(file.ageDays)} days ago (${file.mtime.toISOString().slice(0, 10)})\n`,
        );
    });

    if (searchResult.totalCandidates > previewLimit) {
        console.log(`... (${searchResult.totalCandidates - previewLimit} more files)\n`);
    }

    console.log(
        `Total: ${searchResult.totalCandidates} files (${formatSize(searchResult.totalCandidateBytes)})\n`,
    );
}

function printCleanupOutcome(result) {
    if (result.dryRun) {
        console.log("DRY RUN MODE: No files were deleted.");
        console.log("To actually delete these files, run with --confirm flag.");
        return;
    }

    if (result.totalCandidates === 0) {
        return;
    }

    process.stdout.write("\n\n");
    console.log("Cleanup complete.");
    console.log(`Deleted: ${result.deletedCount} files (${formatSize(result.deletedBytes)} freed)`);
}
