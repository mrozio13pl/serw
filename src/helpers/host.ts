import os from 'node:os';

/**
 * Get the hostname of localhost.
 * @returns {string}
 */
export function getLocalHost(): string {
    const networkInterfaces = os.networkInterfaces();

    // check each network interface
    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];

        if (!interfaces) continue;

        for (const iface of interfaces) {
            // check if it's a loopback interface
            if (iface.family === 'IPv4' && iface.internal) {
                return iface.address;
            }
        }
    }
    /* c8 ignore next */ return '127.0.0.1';
}