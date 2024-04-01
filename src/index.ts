import fs from 'node:fs';
import path from 'node:path';
import colors from 'picocolors';
import Server from './server.js';
import log, { disableLogger } from './helpers/logger.js';
import { getPort, isPortFree } from './helpers/port.js';
import { assignOptions } from './helpers/options.js';
import { __root, clearConsole, hashPassword } from './utils.js';
import type { Options } from './types.js';

// prevent firing the exit function more than once
let exited = false;

function gracefulExit() {
    if (!exited) {
        exited = true;
        log.log(''); // empty line
        log.info('info', 'Shutting down...');
        process.exit(1);
    }
}

process.on('SIGINT', gracefulExit);
process.on('SIGTERM', gracefulExit);
process.on('exit', gracefulExit);

/* c8 ignore start */
// catch an error and exit
process.once('uncaughtException', error => {
    log.error(error.name, error.stack || error.message);
    exited = true;
    process.exit();
});
/* c8 ignore end */

/**
 * Create HTTP server for static content.
 * @param {string} [root] Directory to serve from.
 * @param {Options} [options_] App options.
 */
export default async function serw(root = __root, options_?: Options) {
    options_.root = root ? (path.isAbsolute(root) ? root : path.join(process.cwd(), root)) : void 0;
    const options = await assignOptions(options_);

    // clear the console before the run
    if (!options.silent && options.clearConsole) clearConsole();

    // outdated node version warning
    const verDiff = new Intl.Collator([], { numeric: true }).compare('14.0.0', process.version.slice(1));
    if (verDiff === 1) {
        log.warn('NODE_VERSION', `You are using Node ${process.version}! Please upgrade to at least version 14.`);
    }

    // check the directory to make sure everything is alright
    if (!fs.existsSync(options.root)) {
        throw new Error(root + ' doesn\'t exist.');
    }

    if (!fs.statSync(options.root).isDirectory()) {
        throw new Error(root + ' is not a directory.');
    }

    // if given port is already being used
    // we are gonna try finding a different one
    if (!await isPortFree(options)) {
        const prevPort = options.port;
        options.port = await getPort(options);
        log.warn('PORT_OCCUPIED', 'port', colors.underline(prevPort), 'is occupied by another process; using', colors.underline(colors.green(options.port)), 'instead.');
    }

    // if password was given we shall also set a salt
    if (options.password) {
        options.password = hashPassword(options.password, options.salt);
    }

    // disable logger
    if (options.silent) disableLogger();

    // create server
    const server = new Server(options);

    return server.createServer();
}