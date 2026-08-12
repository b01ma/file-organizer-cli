import { EventEmitter } from "events";
import fs from "fs/promises";
import { collectFilesRecursively, formatFsError } from "./utils/filesystem.js";
import { daysSince } from "./utils/format.js";

export default class Cleanup extends EventEmitter {
    async run(directoryPath, olderThanDays, shouldDelete = false) {
        this.emit("cleanup-start", {
            directory: directoryPath,
            olderThanDays,
            shouldDelete,
        });

        try {
            const filePaths = await collectFilesRecursively(directoryPath, (error, dirPath) => {
                this.emit("directory-error", {
                    directory: dirPath,
                    message: formatFsError(error, dirPath),
                });
            });
            const candidates = [];

            for (const filePath of filePaths) {
                try {
                    const fileStats = await fs.stat(filePath);
                    if (!fileStats.isFile()) {
                        continue;
                    }

                    const fileAgeDays = daysSince(fileStats.mtime);
                    if (fileAgeDays > olderThanDays) {
                        const candidate = {
                            path: filePath,
                            size: fileStats.size,
                            mtime: fileStats.mtime,
                            ageDays: fileAgeDays,
                        };

                        candidates.push(candidate);
                        this.emit("file-found", candidate);
                    }
                } catch (error) {
                    this.emit("file-error", {
                        filePath,
                        message: formatFsError(error, filePath),
                    });
                }
            }

            const totalCandidateBytes = candidates.reduce((sum, file) => sum + file.size, 0);

            this.emit("search-complete", {
                candidates,
                totalCandidates: candidates.length,
                totalCandidateBytes,
            });

            let deletedCount = 0;
            let deletedBytes = 0;

            if (shouldDelete) {
                for (const [index, candidate] of candidates.entries()) {
                    try {
                        await fs.unlink(candidate.path);
                        deletedCount += 1;
                        deletedBytes += candidate.size;

                        this.emit("file-deleted", {
                            ...candidate,
                            processed: index + 1,
                            total: candidates.length,
                        });
                    } catch (error) {
                        this.emit("file-delete-error", {
                            filePath: candidate.path,
                            message: formatFsError(error, candidate.path),
                        });
                    }
                }
            }

            const result = {
                candidates,
                totalCandidates: candidates.length,
                totalCandidateBytes,
                deletedCount,
                deletedBytes,
                dryRun: !shouldDelete,
            };

            this.emit("cleanup-complete", result);
            return result;
        } catch (error) {
            this.emit("cleanup-error", {
                directory: directoryPath,
                message: formatFsError(error, directoryPath),
                error,
            });
            throw error;
        }
    }
}
