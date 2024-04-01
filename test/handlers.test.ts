import { expect, test } from 'vitest';
import got from 'got';
import etag from 'etag';
import { handleDir, handleError, handleFile, handleMissing } from '../src/handlers.js';
import { createServer } from './createServer.js';
import { STATUS } from '../src/helpers/codes.js';
import { getLocalHost } from '../src/helpers/host.js';
import { assignOptions } from '../src/helpers/options.js';
import { getPort } from '../src/helpers/port';
import path, { dirname, join } from 'node:path';
import { URL, fileURLToPath, format } from 'node:url';
import fs from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localhost = getLocalHost();
const options = await assignOptions({
    root: join(__dirname, 'public'),
    ignoreFiles: ['*.ignore.txt'],
    etag: true,
    open: false
});

test('handler: error', async () => {
    const port = await getPort({ port: 3000, host: localhost });
    const server = await createServer(port);
    const url = format({ protocol: 'http', hostname: localhost, port }).toString();

    server.on('request', (req, res) => {
        res.statusCode = STATUS.BAD_REQUEST;
        handleError('message', req, res);
    });

    const res = await got.get(url, {
        throwHttpErrors: false
    });
    expect(res.statusCode).toBe(STATUS.BAD_REQUEST);

    server.close();
});

test('handler: 404', async () => {
    const port = await getPort({ port: 3000, host: localhost });
    const server = await createServer(port);
    const url = format({ protocol: 'http', hostname: localhost, port }).toString();

    server.on('request', (req, res) => {
        handleMissing(options, req, res);
    });

    const res = await got.get(new URL('/missing-path', url), {
        throwHttpErrors: false
    });
    expect(res.statusCode).toBe(STATUS.NOT_FOUND);
    expect(res.body).toBe(fs.readFileSync(join(__dirname, 'public/404.html'), 'utf8'));

    server.close();
});

test('handler: file', async () => {
    const port = await getPort({ port: 3000, host: localhost });
    const server = await createServer(port);
    const url = format({ protocol: 'http', hostname: localhost, port }).toString();

    server.on('request', (req, res) => {
        const filePath = path.normalize(path.join(options.root, decodeURIComponent(req.url!)));
        handleFile(filePath, options, req, res);
    });

    const res1 = await got.get(new URL('/file.ignore.txt', url), {
        throwHttpErrors: false
    });
    expect(res1.statusCode).toBe(STATUS.NOT_FOUND);

    const readmePath = path.join(__dirname, './public/readme.md');

    /** is the current process running on admin privileges */
    const isAdmin = process.getuid && process.getuid() === 0;

    if (isAdmin) {
        const symlinkPath = path.join(__dirname, './public/symlinktest.md');
        const targetPath = readmePath;
        await fs.promises.symlink(targetPath, symlinkPath, 'file');

        const res = await got.get(new URL('/symlinktest.md', url), {
            throwHttpErrors: false
        });
        expect(res.statusCode).toBe(STATUS.MOVED_TEMPORARILY);
    }

    const res2 = await got.get(new URL('/readme.md', url));
    expect(res2.statusCode).toBe(STATUS.OK);

    // range header
    const res3 = await got.get(new URL('/readme.md', url), {
        headers: {
            range: 'bytes=2-6'
        }
    });
    expect(res3.body).toBe(fs.readFileSync(readmePath, 'utf8').slice(2, 7));

    // etag header
    const stats = await fs.promises.stat(readmePath);
    const fileEtag = etag(stats);
    const res4 = await got.get(new URL('/readme.md', url), {
        headers: {
            'if-none-match': fileEtag
        }
    });
    expect(res4.statusCode).toBe(STATUS.NOT_MODIFIED);

    // brotli, gzip, deflate
    const res5 = await got.get(new URL('/test.gz', url), {
        headers: {
            'Accept-Encoding': 'gzip'
        }
    });

    expect(res5.headers.vary).toBe('Accept-Encoding');
    expect(res5.headers['content-encoding']).toBe('gzip');

    server.close();
});

test('handler: dir', async () => {
    const port = await getPort({ port: 3000, host: localhost });
    const server = await createServer(port);
    const url = format({ protocol: 'http', hostname: localhost, port }).toString();

    server.on('request', (req, res) => {
        const filePath = path.normalize(path.join(options.root, decodeURIComponent(req.url!)));
        handleDir(filePath, options, req, res);
    });

    const res = await got.get(url, {
        throwHttpErrors: false
    });
    expect(res.statusCode).toBe(STATUS.OK);

    server.close();
});