# file-organizer-cli

Node.js CLI application for scanning directories, finding duplicate files,
organizing files by category, and cleaning up old files.

## Requirements

- Node.js 18+

## Installation

1. Clone the repository.
2. Open the project folder.
3. Run commands with Node.js directly or through npm scripts.

## Commands

### Scan directory

Analyze all files in a directory recursively and show:

- total file count and size
- statistics by extension
- file age buckets
- top 3 largest files
- oldest file

```bash
node file-organizer.js scan /path/to/directory
```

or

```bash
npm run scan -- /path/to/directory
```

### Find duplicates

Find files with identical content using SHA-256 hashes.

```bash
node file-organizer.js duplicates /path/to/directory
```

or

```bash
npm run duplicates -- /path/to/directory
```

### Organize files by category

Copy files from source to target by category:

- Documents
- Images
- Archives
- Code
- Videos
- Other

Large files (>= 10 MB) are copied using streams.
Name collisions are resolved using suffixes like `file(1).pdf`.

```bash
node file-organizer.js organize /source/directory --output /target/directory
```

or

```bash
npm run organize -- /source/directory --output /target/directory
```

### Cleanup old files

Find files older than N days.

Dry run (default, no deletion):

```bash
node file-organizer.js cleanup /path/to/directory --older-than 90
```

Delete mode:

```bash
node file-organizer.js cleanup /path/to/directory --older-than 90 --confirm
```

or with npm:

```bash
npm run cleanup -- /path/to/directory --older-than 90
npm run cleanup -- /path/to/directory --older-than 90 --confirm
```

## Architecture

Each command is implemented as a separate class extending EventEmitter:

- Scanner
- DuplicateFinder
- Organizer
- Cleanup

The command classes emit progress and result events. Console output is handled
in the CLI entrypoint.

## Error handling

Filesystem operations are wrapped in try/catch blocks and common filesystem
errors are mapped to readable messages.

## NPM scripts

```bash
npm run scan -- <directory>
npm run duplicates -- <directory>
npm run organize -- <source> --output <target>
npm run cleanup -- <directory> --older-than <days> [--confirm]
```

## Command arguments

| Command | Argument | Required | Description |
|---|---|---|---|
| `scan` | `<directory>` | yes | Directory to scan recursively. |
| `duplicates` | `<directory>` | yes | Directory to search for duplicate file content. |
| `organize` | `<source-directory>` | yes | Directory containing files to organize. Files here are never deleted or modified. |
| `organize` | `--output <target-directory>` | yes | Destination directory where category folders are created and files are copied into. |
| `cleanup` | `<directory>` | yes | Directory to search for old files. |
| `cleanup` | `--older-than <days>` | yes | Age threshold in days. Files with a modification time older than this are candidates for deletion. |
| `cleanup` | `--confirm` | no | If present, matched files are actually deleted. Without it, the command only lists what would be deleted (dry run). |

## Project structure

```
file-organizer/
├── package.json          # Project metadata, ES module config, npm scripts
├── .gitignore
├── README.md
├── file-organizer.js      # CLI entrypoint: parses argv and dispatches to command handlers
└── lib/
    ├── scanner.js         # Scanner class (EventEmitter) - scan command logic
    ├── duplicates.js      # DuplicateFinder class (EventEmitter) - duplicates command logic
    ├── organizer.js       # Organizer class (EventEmitter) - organize command logic
    ├── cleanup.js         # Cleanup class (EventEmitter) - cleanup command logic
    ├── cli/
    │   ├── args.js            # Shared argv parsing helpers (flags, options, required path)
    │   ├── usage.js           # Help/usage text
    │   ├── scanCommand.js     # Wires Scanner events to console output
    │   ├── duplicatesCommand.js
    │   ├── organizeCommand.js
    │   └── cleanupCommand.js
    └── utils/
        ├── constants.js       # File category mapping, large-file threshold
        ├── format.js          # Size formatting, progress bar, age calculation
        └── filesystem.js      # Recursive file collection, fs error message mapping
```

Each command class in `lib/` extends `EventEmitter` and only contains business
logic (no `console.log`). The matching file under `lib/cli/` subscribes to
those events and is responsible for all console output (progress bars,
formatted reports). This keeps the core logic reusable outside of a CLI
context (for example in a future GUI or web server).
