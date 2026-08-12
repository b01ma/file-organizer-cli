import { EventEmitter } from "events";
import crypto from "crypto";
import fs from "fs";
import fsPromises from "fs/promises";
import { collectFilesRecursively, formatFsError } from "./utils/filesystem.js";

export default class DuplicateFinder extends EventEmitter {
    async find(directoryPath) {
        this.emit("search-start", { directory: directoryPath });

        try {
            const filePaths = await collectFilesRecursively(directoryPath, (error, dirPath) => {
                this.emit("directory-error", {
                    directory: dirPath,
                    message: formatFsError(error, dirPath),
                });
            });
            this.emit("files-discovered", { totalFiles: filePaths.length });

            const hashGroups = new Map();
            let processedFiles = 0;

            for (const filePath of filePaths) {
                try {
                    const fileStats = await fsPromises.stat(filePath);
                    if (!fileStats.isFile()) {
                        continue;
                    }

                    const hash = await calculateHash(filePath);

                    if (!hashGroups.has(hash)) {
                        hashGroups.set(hash, []);
                    }

                    hashGroups.get(hash).push({
                        path: filePath,
                        size: fileStats.size,
                    });

                    processedFiles += 1;
                    this.emit("file-processed", {
                        filePath,
                        hash,
                        processed: processedFiles,
                        total: filePaths.length,
                    });
                } catch (error) {
                    this.emit("file-error", {
                        filePath,
                        message: formatFsError(error, filePath),
                    });
                }
            }

            const groups = [];
            let totalWastedSpace = 0;

            for (const [hash, files] of hashGroups.entries()) {
                if (files.length <= 1) {
                    continue;
                }

                const fileSize = files[0].size;
                const wastedSpace = fileSize * (files.length - 1);
                totalWastedSpace += wastedSpace;

                groups.push({
                    hash,
                    files,
                    fileSize,
                    copies: files.length,
                    wastedSpace,
                });
            }

            const result = {
                groups,
                totalWastedSpace,
                totalGroups: groups.length,
                processedFiles,
            };

            this.emit("duplicates-found", result);
            return result;
        } catch (error) {
            this.emit("search-error", {
                directory: directoryPath,
                message: formatFsError(error, directoryPath),
                error,
            });
            throw error;
        }
    }
}

function calculateHash(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash("sha256");
        const stream = fs.createReadStream(filePath);

        stream.on("data", (chunk) => hash.update(chunk));
        stream.on("end", () => resolve(hash.digest("hex")));
        stream.on("error", reject);
    });
}
