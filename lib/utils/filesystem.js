import fs from "fs/promises";
import path from "path";

export async function ensureDirectoryExists(directoryPath) {
    await fs.mkdir(directoryPath, { recursive: true });
}

export async function pathExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

export async function collectFilesRecursively(directoryPath, onDirectoryError) {
    const foundFiles = [];
    await walk(directoryPath, foundFiles, onDirectoryError, true);
    return foundFiles;
}

async function walk(currentPath, foundFiles, onDirectoryError, isRoot) {
    let entries;

    try {
        entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch (error) {
        if (isRoot) {
            throw error;
        }

        if (onDirectoryError) {
            onDirectoryError(error, currentPath);
        }

        return;
    }

    for (const entry of entries) {
        const absolutePath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
            await walk(absolutePath, foundFiles, onDirectoryError, false);
            continue;
        }

        if (entry.isFile()) {
            foundFiles.push(absolutePath);
        }
    }
}

export function getFileExtension(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    return extension || "(noext)";
}

export function formatFsError(error, targetPath) {
    if (!error || typeof error !== "object") {
        return `Unexpected error for ${targetPath}`;
    }

    switch (error.code) {
        case "ENOENT":
            return `Path not found: ${targetPath}`;
        case "EACCES":
            return `Permission denied: ${targetPath}`;
        case "EPERM":
            return `Operation not permitted: ${targetPath}`;
        case "EISDIR":
            return `Expected file but got directory: ${targetPath}`;
        case "ENOTDIR":
            return `Expected directory but got file: ${targetPath}`;
        default:
            return `Unexpected filesystem error for ${targetPath}: ${error.message}`;
    }
}
