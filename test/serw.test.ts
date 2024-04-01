import { expect, test } from 'vitest';
import serw from '../src/index.js';
import portfinder from 'portfinder';
import path from 'node:path';
import url from 'node:url';
import net from 'node:net';
import type { Options } from '../src/types.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const defaults: Options = {
    open: false
};

test('correct export', () => {
    expect(serw).toBeTypeOf('function');
});

test('serw', async () => {
    const randomPort = await portfinder.getPortPromise();
    const server = await serw(path.join(__dirname, 'public'), {
        port: randomPort,
        ...defaults
    });

    expect(server.listening).toBeTruthy();
    server.close();
});

test('node version', async () => {
    const originalVersion = process.version;
    const originalConsoleLog = console.log;
    const mockConsoleLog = (...output: string[]) => {
        if (output[0].includes('NODE_VERSION')) {
            expect(output[1]).toBe(`You are using Node ${process.version}! Please upgrade to at least version 14.`);
        }
    };

    console.log = mockConsoleLog as never;
    Object.defineProperty(process, 'version', {
        value: '6.0.0'
    });

    const server = await serw(path.join(__dirname, 'public'), defaults);
    server.close();

    console.log = originalConsoleLog;
    Object.defineProperty(process, 'version', {
        value: originalVersion
    });
});

test('root not found', async () => {
    try {
        await serw('non_existing_path', {
            open: false
        });
    } catch (error) {
        expect(error.message).toBe('non_existing_path doesn\'t exist.');
    }
});

test('root not a directory', async () => {
    const root = path.join(__dirname, './__fixtures__/file.txt');
    try {
        await serw(root, defaults);
    } catch (error) {
        expect(error.message).toBe(root + ' is not a directory.');
    }
});

test('port occupied', async () => {
    const server = net.createServer().listen(0);
    const { port } = server.address() as net.AddressInfo;
    const originalConsoleLog = console.log;
    let portOccupied = false;
    const mockConsoleLog = (...output: string[]) => {
        if (output[0].includes('PORT_OCCUPIED')) {
            portOccupied = true;
        }
    };

    console.log = mockConsoleLog as never;

    await serw(void 0, {
        port,
        ...defaults
    });

    expect(portOccupied).toBeTruthy();
    console.log = originalConsoleLog;
});