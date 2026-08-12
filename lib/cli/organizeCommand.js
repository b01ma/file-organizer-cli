import path from "path";
import Organizer from "../organizer.js";
import { drawProgressBar, formatSize, padRight } from "../utils/format.js";
import { CATEGORY_NAMES } from "../utils/constants.js";
import { getOptionValue, requirePath } from "./args.js";

export async function runOrganize(commandArgs) {
    const sourceDirectory = commandArgs[0];
    requirePath(sourceDirectory, "organize");

    const outputDirectory = getOptionValue(commandArgs.slice(1), "--output");
    if (!outputDirectory) {
        throw new Error("Missing required option --output <target-directory>");
    }

    const organizer = new Organizer();

    organizer.on("organize-start", ({ sourceDirectory: source, targetDirectory: target }) => {
        console.log(`Organizing: ${source}`);
        console.log(`Target: ${target}\n`);
        console.log("Creating folders...");
    });

    organizer.on("folder-created", ({ category }) => {
        console.log(`  OK ${category}/`);
    });

    organizer.on("copy-start", ({ processed, total }) => {
        process.stdout.write(`\rCopying files... ${drawProgressBar(processed, total)}`);
    });

    organizer.on("copy-error", ({ message }) => {
        process.stdout.write("\n");
        console.error(`Warning: ${message}`);
    });

    organizer.on("directory-error", ({ message }) => {
        process.stdout.write("\n");
        console.error(`Warning: ${message}`);
    });

    organizer.on("organize-complete", (summary) => {
        printOrganizeSummary(summary);
    });

    await organizer.organize(path.resolve(sourceDirectory), path.resolve(outputDirectory));
}

function printOrganizeSummary(summary) {
    process.stdout.write("\n\nOrganization complete.\n\n");
    console.log("Summary:");

    CATEGORY_NAMES.forEach((category) => {
        console.log(`  ${padRight(`${category}:`, 12)} ${summary.byCategory[category]} files`);
    });

    console.log(
        `\nTotal copied: ${summary.totalCopied} files (${formatSize(summary.totalBytesCopied)})`,
    );
}
