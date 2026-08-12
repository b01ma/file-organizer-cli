#!/usr/bin/env node

import { formatFsError } from "./lib/utils/filesystem.js";
import { printUsage } from "./lib/cli/usage.js";
import { runScan } from "./lib/cli/scanCommand.js";
import { runDuplicates } from "./lib/cli/duplicatesCommand.js";
import { runOrganize } from "./lib/cli/organizeCommand.js";
import { runCleanup } from "./lib/cli/cleanupCommand.js";

const COMMAND_HANDLERS = {
    scan: runScan,
    duplicates: runDuplicates,
    organize: runOrganize,
    cleanup: runCleanup,
};

await main();

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === "--help" || command === "-h") {
        printUsage();
        return;
    }

    const handler = COMMAND_HANDLERS[command];

    if (!handler) {
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }

    try {
        await handler(args.slice(1));
    } catch (error) {
        console.error(`Error: ${formatCliError(error, args[1])}`);
        process.exit(1);
    }
}

function formatCliError(error, targetPath) {
    if (error && typeof error === "object" && error.code) {
        return formatFsError(error, targetPath || process.cwd());
    }

    return error instanceof Error ? error.message : String(error);
}
