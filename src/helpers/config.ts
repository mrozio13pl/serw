import fs from 'node:fs';
import type { Options } from '../types.js';

// eslint-disable-next-line unicorn/custom-error-definition
class ConfigError extends Error {
    name = 'CONFIG_ERROR' as const;
}

/**
 * Load the config file.\
 * Only JSON allowed.
 * @param {string} [configPath] Path to the config file. (default: `serw.json`)
 * @returns {Promise<Options>}
 */
export async function loadConfig(configPath?: string): Promise<Options> {
    const strict = !!configPath, prevConfigPath = configPath;
    configPath ??= 'serw.json';

    if (!fs.existsSync(configPath) || !(await fs.promises.stat(configPath)).isFile()) {
        if (strict) {
            throw new ConfigError('Couldn\'t find the config file in ' + prevConfigPath);
        }
        else return {};
    }

    return JSON.parse(await fs.promises.readFile(configPath, 'utf8'));
}