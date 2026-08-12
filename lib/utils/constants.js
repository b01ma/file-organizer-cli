export const LARGE_FILE_THRESHOLD_BYTES = 10 * 1024 * 1024;

export const FILE_CATEGORIES = {
    Documents: [".pdf", ".docx", ".doc", ".txt", ".md", ".xlsx", ".pptx"],
    Images: [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".bmp"],
    Archives: [".zip", ".rar", ".tar", ".gz", ".7z"],
    Code: [".js", ".py", ".java", ".cpp", ".html", ".css", ".json"],
    Videos: [".mp4", ".avi", ".mkv", ".mov", ".webm"],
    Other: [],
};

export const CATEGORY_NAMES = Object.keys(FILE_CATEGORIES);
