import net from 'node:net';
import type { RequiredOptions } from '../types.js';

type PortOptions = Pick<RequiredOptions, 'host' | 'port'>;

const PORT_MIN = 1024;
const PORT_MAX = 65_535;

/**
 * Get random number between `1024` and `65535`.
 * @returns {number}
 */
/* c8 ignore start */
function getRandomPort(): number {
    return ~~(Math.random() * (PORT_MAX - PORT_MIN + 1)) + PORT_MIN;
}
/* c8 ignore end */

/**
 * Check if a given port is free.
 * @param {PortOptions} options Port and hostname.
 * @returns {Promise<boolean>}
 */
export function isPortFree({ host, port }: PortOptions): Promise<boolean> {
    return new Promise(resolve => {
        const socket = new net.Socket();
        socket.unref();

        const onError = () => {
            socket.destroy();
            resolve(true);
        };

        socket.setTimeout(1e4);
        socket.once('error', onError);
        socket.once('timeout', onError);

        socket.connect(port, host, () => {
            socket.end();
            resolve(false);
        });
    });
}

/**
 * Get an available port by incrementing the given port, unless it reaches the maximum.
 * @param {PortOptions} options Port and hostname.
 * @returns {Promise<number>}
 */
export async function getPort({ host, port }: PortOptions): Promise<number> {
    while (!await isPortFree({ host, port })) {
        if (port >= PORT_MAX) port = getRandomPort();
        else port += 1;
    }

    return port;
}