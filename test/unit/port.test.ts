import { expect, test } from 'vitest';
import { getPort, isPortFree } from '../../src/helpers/port.js';
import net from 'node:net';

test('helpers: isPortFree', async () => {
    const server = net.createServer().listen(0);
    const { port, address } = server.address() as net.AddressInfo;
    const isFree = await isPortFree({ port, host: address });

    expect(isFree).toBeFalsy();
});

test('helpers: getPort', async () => {
    // we might also consider testing the case when the main port is already busy
    const server = net.createServer().listen(0);
    const { port, address } = server.address() as net.AddressInfo;
    const freePort = await getPort({ port, host: address });

    expect(freePort).above(1023).and.lessThanOrEqual(65_535);
});