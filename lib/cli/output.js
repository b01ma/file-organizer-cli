export function printWarning(message) {
    process.stdout.write("\n");
    console.error(`Warning: ${message}`);
}
