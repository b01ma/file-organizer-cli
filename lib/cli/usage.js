export function printUsage() {
    console.log("Usage:");
    console.log("  node file-organizer.js scan <directory>");
    console.log("  node file-organizer.js duplicates <directory>");
    console.log("  node file-organizer.js organize <source-directory> --output <target-directory>");
    console.log("  node file-organizer.js cleanup <directory> --older-than <days> [--confirm]");
    console.log("");
    console.log("Examples:");
    console.log("  npm run scan -- /path/to/Downloads");
    console.log("  npm run duplicates -- /path/to/Downloads");
    console.log("  npm run organize -- /path/to/Downloads --output /path/to/Organized");
    console.log("  npm run cleanup -- /path/to/Downloads --older-than 90");
    console.log("  npm run cleanup -- /path/to/Downloads --older-than 90 --confirm");
}
