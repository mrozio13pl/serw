/* eslint-disable unicorn/consistent-destructuring */
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import fs from 'node:fs';
import opener from 'opener';
import localAccess from 'local-access';
import colors from 'picocolors';
import log from './helpers/logger.js';
import { auth } from './middlewares/auth.js';
import { handleDir, handleError, handleFile, handleMissing } from './handlers.js';
import { formatStatusCode, getUnicode, isDir, isFileAccessible, timestamp } from './utils.js';
import { STATUS } from './helpers/codes.js';
import type { RequiredOptions } from './types.js';

// typescript interprets this as a non callable expression for some reason
// looks very ugly, but we have to go around it somehow
const laccess = localAccess as unknown as typeof localAccess.default;

/**
 * Validate and return SSL/TLS credentials.
 * @param {RequiredOptions} options App options.
 */
function getCredentials({ ssl, key, cert }: RequiredOptions) {
    if (!ssl) return;

    if (!fs.existsSync(key)) {
        log.warn('SSL_KEY', colors.underline(key), 'doesn\'t exists.');
        return;
    }

    if (!fs.existsSync(cert)) {
        log.warn('SSL_CERT', colors.underline(cert), 'doesn\'t exists.');
        return;
    }

    if (!fs.statSync(key).isFile()) {
        log.warn('SSL_KEY', colors.underline(key), 'is not a file.');
        return;
    }

    if (!fs.statSync(cert).isFile()) {
        log.warn('SSL_CERT', colors.underline(cert), 'is not a file.');
        return;
    }

    return {
        key: fs.readFileSync(key, 'utf8'),
        cert: fs.readFileSync(cert, 'utf8'),
    };
}

export default class Server {
    private server: http.Server | https.Server;
    private readonly options: RequiredOptions;

    constructor(options: RequiredOptions) {
        this.options = options;
    }

    public createServer(): Promise<Server['server']> {
        if (this.server && this.server.listening) return;

        const { port, host, ssl } = this.options;
        const credentials = ssl ? getCredentials(this.options) : void 0;
        const isHTTPS = ssl && !!credentials;
        const protocol = (isHTTPS ? https : http) as typeof https;

        this.server = protocol.createServer(credentials);

        return new Promise(resolve => {
            const { server } = this;

            server.on('request', this.onRequest.bind(this));
            server.once('listening', () => {
                const { local, network } = laccess({ port, hostname: host, https: isHTTPS });

                log.log(`
    ${colors.green(colors.bold('Your app is ready!')) + getUnicode(' 🚀')}

    ■ ${colors.cyan('Local:')}    ${colors.bold(local)}
    ■ ${colors.cyan('Network:')}  ${/localhost/i.test(host) ? `add ${colors.bold('--host')} to expose` + getUnicode(' 💡') : colors.bold(network)}
    ${this.options.password ? colors.gray(getUnicode('→', '-') + ' Protected by a password.') + '\n' : ''}
    ${'─'.repeat(36)}
        `);

                // open in the browser
                if (this.options.open) opener(local, void 0, error => {
                    if (error) log.error(error.name, error.stack || error.message);
                });

                resolve(this.server);
            });

            server.listen(this.options.port, this.options.host);
        });
    }

    private async onRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        const { options } = this;
        const startTime = process.hrtime.bigint();

        if (!req.url) {
            res.statusCode = STATUS.BAD_REQUEST;
            handleError('Missing URL Parameter.', req, res);
            return;
        }

        // fix double slashes
        if (req.url.includes('//')) {
            res.writeHead(STATUS.MOVED_TEMPORARILY, { Location: req.url.replace(/\/+/g, '/') });
            res.end();
            return;
        }

        let filePath = path.normalize(path.join(options.root, decodeURIComponent(req.url)));

        // check if the requested path is a directory
        if (isDir(filePath)) {
            // if the URL doesn't end with '/', redirect to the same URL with '/' at the end
            if (!req.url.endsWith('/')) {
                res.writeHead(STATUS.MOVED_TEMPORARILY, { Location: req.url + '/' });
                res.end();
                return;
            }

            const htmlPath = path.join(filePath, 'index.html');
            if (fs.existsSync(htmlPath) && !isDir(htmlPath)) filePath = htmlPath;
            // if the URL doesn't have an extension, check for .html or .htm file
        } else if (!path.extname(filePath)) {
            const htmlPath = filePath + '.html';
            const htmPath = filePath + '.htm';

            if (fs.existsSync(htmlPath) && !isDir(htmlPath)) {
                filePath = htmlPath;
            } else if (fs.existsSync(htmPath) && !isDir(htmPath)) {
                filePath = htmPath;
            }
        }

        if (options.cors) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            // allow specific HTTP methods
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
            res.setHeader('Access-Control-Allow-Headers', '*');
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.setHeader('Access-Control-Allow-Private-Network', 'true');
        }

        // robots
        if (req.url === '/robots.txt' && options.robots) {
            const robots = 'User-agent: *\nDisallow: /';
            res.setHeader('Content-Type', 'text/plain');
            res.end(robots);
        // we put everything into a try-catch block
        // cause there are many things that can go wrong
        // most likely with stuff like files not being accessible etc.
        } else try {
            // we want to make it asynchronous to easily create logs later on
            await auth(options, req, res, () => {
                switch (true) {
                    // assuming most of the content is static
                    // we shall only use GET method, unless user wants to log in
                    // thus if any other method is used, respond with status 405
                    case req.method !== 'GET': {
                        res.statusCode = STATUS.METHOD_NOT_ALLOWED;
                        handleError('Method not allowed!', req, res);
                        break;
                    }
                    // if a file simply doesn't exists
                    // we can pass it to the missing handler
                    case !fs.existsSync(filePath): {
                        handleMissing(options, req, res);
                        break;
                    }
                    // handle non-accessible files
                    case !isFileAccessible(filePath): {
                        res.statusCode = STATUS.FORBIDDEN;
                        handleError('No permission.', req, res);
                        break;
                    }
                    // render a list of files in a directory
                    case fs.statSync(filePath).isDirectory(): {
                        handleDir(filePath, options, req, res);
                        break;
                    }
                    // otherwise just show the file
                    default: {
                        handleFile(filePath, options, req, res);
                        break;
                    }
                }
            });
        } catch (error) {
            // this means we probably couldn't access some folder
            // log.error(error.name, error.stack || error.message);
            const message = error.code === 'EPERM' ? 'File not accessible.' : 'Internal server error.';
            res.statusCode = STATUS.INTERNAL_SERVER_ERROR;
            handleError(message, req, res);
        }

        log.log(
            (options.logTimestamp ? '[' + colors.gray(timestamp()) + '] ' : '')
            + formatStatusCode(res.statusCode)
            // request ip
            + (options.logIp ? ' ' + colors.yellow(req.socket.remoteAddress) : ''),
            req.method, // method
            decodeURIComponent(req.url) // visited url
            // user agent
            + (options.logAgent && req.headers['user-agent'] ? colors.blue(' "' + req.headers['user-agent'] + '"') : ''),
            colors.gray((Number(process.hrtime.bigint() - startTime) / 1e6).toFixed(3) + 'ms') // show execution time
        );
    }

    public get instance() {
        return this.server;
    }
}