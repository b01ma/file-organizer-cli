import { EventEmitter } from "events";
import fs from "fs/promises";
import path from "path";
import { collectFilesRecursively, formatFsError, getFileExtension } from "./utils/filesystem.js";
import { daysSince } from "./utils/format.js";

export default class Scanner extends EventEmitter {
    async scan(directoryPath) {
        this.emit("scan-start", { directory: directoryPath });

        try {
            const filePaths = await collectFilesRecursively(directoryPath, (error, dirPath) => {
                this.emit("directory-error", {
                    directory: dirPath,
                    message: formatFsError(error, dirPath),
                });
            });
            this.emit("scan-discovered", { totalFiles: filePaths.length });

            const extensionStats = new Map();
            const largestFiles = [];
            let oldestFile = null;

            const statistics = {
                totalFiles: 0,
                totalSize: 0,
                byFileType: extensionStats,
                ageBuckets: {
                    last7Days: 0,
                    last30Days: 0,
                    olderThan90Days: 0,
                },
                largestFiles,
                oldestFile,
            };

            for (let index = 0; index < filePaths.length; index += 1) {
                const filePath = filePaths[index];

                try {
                    const fileStats = await fs.stat(filePath);
                    if (!fileStats.isFile()) {
                        continue;
                    }

                    const size = fileStats.size;
                    const extension = getFileExtension(filePath);
                    const ageDays = daysSince(fileStats.mtime);

                    statistics.totalFiles += 1;
                    statistics.totalSize += size;

                    if (!extensionStats.has(extension)) {
                        extensionStats.set(extension, { count: 0, totalSize: 0 });
                    }

                    const extensionData = extensionStats.get(extension);
                    extensionData.count += 1;
                    extensionData.totalSize += size;

                    if (ageDays <= 7) {
                        statistics.ageBuckets.last7Days += 1;
                    }

                    if (ageDays <= 30) {
                        statistics.ageBuckets.last30Days += 1;
                    }

                    if (ageDays > 90) {
                        statistics.ageBuckets.olderThan90Days += 1;
                    }

                    updateLargestFiles(largestFiles, {
                        path: filePath,
                        name: path.basename(filePath),
                        size,
                    });

                    if (!statistics.oldestFile || fileStats.mtime < statistics.oldestFile.mtime) {
                        statistics.oldestFile = {
                            path: filePath,
                            name: path.basename(filePath),
                            mtime: fileStats.mtime,
                            ageDays,
                        };
                    }

                    this.emit("file-found", {
                        filePath,
                        size,
                        processed: index + 1,
                        total: filePaths.length,
                    });
                } catch (error) {
                    this.emit("file-error", {
                        filePath,
                        message: formatFsError(error, filePath),
                    });
                }
            }

            this.emit("scan-complete", statistics);
            return statistics;
        } catch (error) {
            this.emit("scan-error", {
                directory: directoryPath,
                message: formatFsError(error, directoryPath),
                error,
            });
            throw error;
        }
    }
}

function updateLargestFiles(largestFiles, candidate) {
    largestFiles.push(candidate);
    largestFiles.sort((a, b) => b.size - a.size);

    if (largestFiles.length > 3) {
        largestFiles.pop();
    }
}
