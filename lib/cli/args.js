export function hasFlag(commandArgs, flagName) {
    return commandArgs.includes(flagName);
}

export function getOptionValue(commandArgs, optionName) {
    const directMatch = commandArgs.find((arg) => arg.startsWith(`${optionName}=`));
    if (directMatch) {
        return directMatch.slice(optionName.length + 1);
    }

    const index = commandArgs.indexOf(optionName);
    if (index === -1 || index === commandArgs.length - 1) {
        return null;
    }

    return commandArgs[index + 1];
}

export function requirePath(directoryPath, commandName) {
    if (!directoryPath || directoryPath.startsWith("--")) {
        throw new Error(`Missing required directory path for '${commandName}' command`);
    }
}
