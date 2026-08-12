import { EventEmitter } from "events";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { pipeline } from "stream/promises";
import { CATEGORY_NAMES, FILE_CATEGORIES, LARGE_FILE_THRESHOLD_BYTES } from "./utils/constants.js";
import {
    collectFilesRecursively,
    ensureDirectoryExists,
    formatFsError,
    pathExists,
} from "./utils/filesystem.js";

export default class Organizer extends EventEmitter {
    async organize(sourceDirectory, targetDirectory) {
        this.emit("organize-start", {
            sourceDirectory,
            targetDirectory,
        });

        try {
            const filePaths = await collectFilesRecursively(sourceDirectory, (error, dirPath) => {
                this.emit("directory-error", {
                    directory: dirPath,
                    message: formatFsError(error, dirPath),
                });
            });
            this.emit("files-discovered", { totalFiles: filePaths.length });

            for (const category of CATEGORY_NAMES) {
                const categoryDir = path.join(targetDirectory, category);
                await ensureDirectoryExists(categoryDir);
                this.emit("folder-created", { category, categoryDir });
            }

            const summary = {
                totalCopied: 0,
                totalBytesCopied: 0,
                byCategory: Object.fromEntries(CATEGORY_NAMES.map((name) => [name, 0])),
            };

            let processed = 0;

            for (const filePath of filePaths) {
                processed += 1;

                try {
                    const fileStats = await fsPromises.stat(filePath);
                    if (!fileStats.isFile()) {
                        continue;
                    }

                    const category = detectCategory(filePath);
                    const destinationDirectory = path.join(targetDirectory, category);
                    const destinationPath = await getUniqueDestinationPath(
                        destinationDirectory,
                        path.basename(filePath),
                    );

                    this.emit("copy-start", {
                        sourcePath: filePath,
                        destinationPath,
                        processed,
                        total: filePaths.length,
                    });

                    if (fileStats.size >= LARGE_FILE_THRESHOLD_BYTES) {
                        await pipeline(
                            fs.createReadStream(filePath),
                            fs.createWriteStream(destinationPath),
                        );
                    } else {
                        await fsPromises.copyFile(filePath, destinationPath);
                    }

                    summary.totalCopied += 1;
                    summary.totalBytesCopied += fileStats.size;
                    summary.byCategory[category] += 1;

                    this.emit("copy-complete", {
                        sourcePath: filePath,
                        destinationPath,
                        category,
                        size: fileStats.size,
                        processed,
                        total: filePaths.length,
                    });
                } catch (error) {
                    this.emit("copy-error", {
                        sourcePath: filePath,
                        processed,
                        total: filePaths.length,
                        message: formatFsError(error, filePath),
                    });
                }
            }

            this.emit("organize-complete", summary);
            return summary;
        } catch (error) {
            this.emit("organize-error", {
                sourceDirectory,
                message: formatFsError(error, sourceDirectory),
                error,
            });
            throw error;
        }
    }
}

function detectCategory(filePath) {
    const extension = path.extname(filePath).toLowerCase();

    for (const [category, extensions] of Object.entries(FILE_CATEGORIES)) {
        if (extensions.includes(extension)) {
            return category;
        }
    }

    return "Other";
}

async function getUniqueDestinationPath(destinationDirectory, originalFileName) {
    const parsed = path.parse(originalFileName);
    let candidateName = originalFileName;
    let attempt = 1;

    while (await pathExists(path.join(destinationDirectory, candidateName))) {
        candidateName = `${parsed.name}(${attempt})${parsed.ext}`;
        attempt += 1;
    }

    return path.join(destinationDirectory, candidateName);
}
