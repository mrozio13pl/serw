import crypto from 'node:crypto';
import { getLocalHost } from './host.js';
import { loadConfig } from './config.js';
import type { Options, RequiredOptions } from '../types.js';

const host = getLocalHost();
const defaults = {
    host: getLocalHost() || /^127\.0\.0\.1$/i.test(host) ? 'localhost' : host,
    port: 3000,
    index: 'index.html',
    cors: false,
    etag: false,
    dotFiles: false,
    open: true,
    dirListing: true,
    robots: false,
    logIp: false,
    logAgent: false,
    logTimestamp: true,
    clearConsole: true,
    silent: false,
    ignoreFiles: [],
    ssl: false,
    key: 'key.pem',
    cert: 'cert.pem',
    maxAge: void 0,
    immutable: false,
    salt: crypto.randomBytes(16).toString('hex'),
} satisfies Options;

export async function assignOptions(options: Options): Promise<RequiredOptions> {
    const config = await loadConfig(options.config);

    return {
        root: options.root!,
        ...defaults,
        ...options,
        ...config
    };
}