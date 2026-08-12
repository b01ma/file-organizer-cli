export function formatSize(bytes) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function drawProgressBar(current, total, width = 20) {
    if (total === 0) {
        return `${"░".repeat(width)} 0/0`;
    }

    const ratio = Math.min(current / total, 1);
    const filled = Math.round(ratio * width);
    const bar = "█".repeat(filled) + "░".repeat(width - filled);

    return `${bar} ${current}/${total}`;
}

export function daysSince(date) {
    const diffMs = Date.now() - date.getTime();
    return diffMs / (1000 * 60 * 60 * 24);
}

export function padRight(value, length) {
    return String(value).padEnd(length, " ");
}
