import { expect, test } from 'vitest';
import { auth } from '../src/middlewares/auth.js';
import got from 'got';
import portfinder from 'portfinder';
import { assignOptions } from '../src/helpers/options.js';
import { getLocalHost } from '../src/helpers/host.js';
import { STATUS } from '../src/helpers/codes.js';
import { fileURLToPath, format, URL } from 'node:url';
import { hashPassword } from '../src/utils.js';
import { dirname } from 'node:path';
import { createServer } from './createServer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('auth', async () => {
    const options = await assignOptions({
        root: __dirname,
        open: false,
        password: hashPassword('abc', '100'),
        cors: true,
        salt: '100'
    });

    const port = await portfinder.getPortPromise();
    const server = await createServer(port);
    const url = format({ protocol: 'http', hostname: getLocalHost(), port }).toString();

    server.on('request', (req, res) => {
        auth(options, req, res, () => {
            res.statusCode = STATUS.OK;
            res.end();
        });
    });

    // unauthorized
    const res = await got.get(url, { throwHttpErrors: false });
    expect(res.statusCode).toBe(STATUS.UNAUTHORIZED);

    // password is missing
    const res2 = await got.post(new URL('/login', url), { throwHttpErrors: false });
    expect(res2.statusCode).toBe(STATUS.FORBIDDEN);

    // invalid password
    const res3 = await got.post(new URL('/login', url), {
        throwHttpErrors: false,
        body: 'password=wrongpass'
    });
    expect(res3.statusCode).toBe(STATUS.FORBIDDEN);

    // correct password, thus redirect
    const res4 = await got.post(new URL('/login', url), {
        throwHttpErrors: false,
        body: 'password=abc&page=/index',
        followRedirect: false
    });
    expect(res4.statusCode).toBe(STATUS.MOVED_TEMPORARILY);

    // page param is missing
    const res5 = await got.post(new URL('/login', url), {
        throwHttpErrors: false,
        body: 'password=abc',
        followRedirect: false
    });
    expect(res5.statusCode).toBe(STATUS.OK);

    // session
    const res6 = await got.post(url, {
        throwHttpErrors: false,
        body: 'password=abc&page=/index',
        followRedirect: true,
        headers: {
            cookie: res5.headers['set-cookie']?.at(0)?.split(';')[0]
        }
    });
    expect(res6.statusCode).toBe(STATUS.OK);

    server.close();
});