import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import querystring from 'node:querystring';
import log from '../helpers/logger.js';
import { handleError } from '../handlers.js';
import { hashPassword, __dirname } from '../utils.js';
import { STATUS } from '../helpers/codes.js';
import type http from 'node:http';
import type { RequiredOptions } from '../types.js';

type NextFunction = () => unknown;

// this is where all valid sessions will be stored
const sessions: Record<string, number> = {};

const ONE_DAY = 1e3 * 60 * 60 * 24;
const LOGIN_PAGE = fs.readFileSync(path.join(__dirname, '../templates/login.html'), 'utf8');

/**
 * Clean up invalid/old sessions to prevent a memory leak.
 */
function cleanUpSessions() {
    for (const sessionId in sessions) {
        if (Object.prototype.hasOwnProperty.call(sessions, sessionId) && sessions[sessionId] < Date.now()) {
            delete sessions[sessionId];
        }
    }
}

/**
 * Create a token for session.
 * @returns {string}
 */
function generateToken(): string {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Handle authentication.
 * @param {RequiredOptions} options App options
 * @param {http.IncomingMessage} req HTTP client request.
 * @param {http.ServerResponse} res HTTP server response.
 * @param {NextFunction} next Function to fire if password/session is valid.
 * @returns {Promise<void>}
 */
export function auth(options: RequiredOptions, req: http.IncomingMessage, res: http.ServerResponse, next: NextFunction): Promise<void> {
    // if password was not set, let the request pass
    if (!options.password) {
        next();
        return;
    }

    // clean sessions
    cleanUpSessions();

    // get session id from a cookie
    const cookieSessionId = req.headers.cookie?.replace('sessionId=', '');

    // pass the request if session is valid and has not expired yet
    if (cookieSessionId && sessions[cookieSessionId] && sessions[cookieSessionId] >= Date.now()) {
        next();
        return;
    }

    // handle login attempt
    if (req.method === 'POST' && req.url === '/login') {
        return new Promise<void>(resolve => {
            let body = '';

            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.once('end', () => {
                // form from the login page
                // `page` is used to later redirect the user
                const { password, page } = querystring.parse(body);

                // validate the password
                if (hashPassword(String(password), options.salt) === options.password) {
                    // create a session id, store it in sessions, assing it to the request via cookies
                    const sessionId = generateToken();
                    sessions[sessionId] = Date.now() + ONE_DAY;
                    res.setHeader('Set-Cookie', `sessionId=${sessionId}; HttpOnly`);

                    // if somehow previous page is missing, just don't redirect
                    if (typeof page === 'string') {
                        res.writeHead(STATUS.MOVED_TEMPORARILY, { Location: page });
                        res.end();
                    } else {
                        next();
                    }
                } else {
                    res.setHeader('WWW-Authenticate', 'Basic realm="Restricted Area"');
                    if (typeof page === 'string') res.setHeader('Location', page);
                    res.statusCode = STATUS.FORBIDDEN;
                    handleError('Access denied.', req, res);
                }

                // mark the request as complete
                resolve();
            });

            // well... ¯\_(ツ)_/¯
            req.once('error', err => {
                handleError('Woops something went wrong! Please try again later.', req, res);
                log.error(err.name, err.stack || err.message);
                resolve();
            });
        });
    }

    // otherwise render the login page
    res.writeHead(STATUS.UNAUTHORIZED, { 'Content-Type': 'text/html;charset=utf-8' });
    res.end(LOGIN_PAGE);
}