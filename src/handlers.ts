import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { lookup } from 'mrmime';
import etag from 'etag';
import templite_ from 'templite';
import { shouldIgnore, shouldRedirect, __dirname, niceTry, isDir } from './utils.js';
import { STATUS } from './helpers/codes.js';
import log from './helpers/logger.js';
import type http from 'node:http';
import type { RequiredOptions } from './types.js';

// typescript interprets this as a non callable expression for some reason
// looks very ugly, but we have to go around it somehow
const templite = templite_ as unknown as typeof templite_.default;

// data about a file, used when rendering files in a directory.
interface File {
    type: 'directory' | 'file';
    base: string;
    relative: string;
    title: string;
    ext?: string;
}

// fs.ReadStreamOptions
interface ReadStreamOptions {
    start?: number;
    end?: number;
}

// html templates
const templates = {
    directories: fs.readFileSync(path.join(__dirname, '../templates/list.html'), 'utf8'), // directory listing
    error: fs.readFileSync(path.join(__dirname, '../templates/error.html'), 'utf8')       // error page
};

/**
 * Validate path to the error page.\
 * Returns `undefined` if it is invalid.
 * @param {string} pagePath Path to the error page file.
 * @returns {string | undefined}
 */
function validateErrorPagePath(pagePath?: string): string | undefined {
    if (!pagePath) return;

    if (!fs.existsSync(pagePath)) {
        log.warn('ERROR_PAGE_MISSING', `${pagePath} doesn't exist.`);
        return;
    }

    if (isDir(pagePath)) {
        log.warn('ERROR_PAGE_INVALID', `${pagePath} is a directory.`);
        return;
    }

    return pagePath;
}

/**
 * HTTP error handler.
 * @param {string} message Error message.
 * @param {http.IncomingMessage} req HTTP client request.
 * @param {http.ServerResponse} res HTTP server response.
 */
export function handleError(message: string, req: http.IncomingMessage, res: http.ServerResponse): void {
    const title = res.statusCode + ' ' + (req.url || '/');

    res.writeHead(res.statusCode, { 'Content-Type': 'text/html;charset=utf-8' });
    res.end(templite(templates.error, { title, message, statusCode: res.statusCode }));
}

/**
 * Simple HTTP handler for missing files.
 * @param {RequiredOptions} options App options.
 * @param {http.IncomingMessage} req HTTP client request.
 * @param {http.ServerResponse} res HTTP server response.
 */
export function handleMissing(options: RequiredOptions, req: http.IncomingMessage, res: http.ServerResponse): void {
    res.statusCode = STATUS.NOT_FOUND;
    const PAGE_NOT_FOUND = validateErrorPagePath(options.errorPage) || path.join(options.root, '404.html');

    if (fs.existsSync(PAGE_NOT_FOUND) && !isDir(PAGE_NOT_FOUND)) {
        res.setHeader('Content-Type', 'text/html;charset=utf-8');
        res.end(fs.readFileSync(PAGE_NOT_FOUND));
        return;
    }

    handleError(req.url! + ' was not found!', req, res);
}

const ENCODING: Record<string, string> = {
    '.br': 'br',           // Brotli
    '.gz': 'gzip',         // Gzip
    '.deflate': 'deflate', // Deflate
};

/**
 * HTTP handler for displaying files.
 * @param {string} filePath User's file path.
 * @param {RequiredOptions} options App options.
 * @param {http.IncomingMessage} req HTTP client request.
 * @param {http.ServerResponse} res HTTP server response.
 */
export function handleFile(filePath: string, options: RequiredOptions, req: http.IncomingMessage, res: http.ServerResponse): void {
    // if a file should be ignored, interpret as missing
    if (!fs.existsSync(filePath) || shouldIgnore(filePath, options)) {
        handleMissing(options, req, res);
        return;
    }

    // if file is a symlink, redirect
    if (shouldRedirect(filePath)) {
        const symlinkTarget = fs.readlinkSync(filePath);
        res.writeHead(STATUS.MOVED_TEMPORARILY, { Location: symlinkTarget });
        res.end();
        return;
    }

    const stats = fs.statSync(filePath);

    // handle etag
    if (options.etag) {
        const fileEtag = etag(stats);
        const clientETag = req.headers['if-none-match'];

        if (clientETag && fileEtag === clientETag) {
            res.writeHead(STATUS.NOT_MODIFIED, 'Not Modified');
            res.end();
            return;
        }
    }

    const headers: http.OutgoingHttpHeaders = {
        'Content-Length': stats.size,
        'Last-Modified': stats.mtime.toUTCString(),
    };

    // cache control
    // eslint-disable-next-line unicorn/no-null
    let cc = options.maxAge != null && `public,max-age=${options.maxAge}`;
    if (cc && options.immutable) cc += ',immutable';
    else if (cc && options.maxAge === 0) cc += ',must-revalidate';
    cc && (headers['Cache-Control'] = cc);

    // content type
    const extname = path.extname(filePath), enc = ENCODING[extname], fsOpt: ReadStreamOptions = {};
    let ctype = lookup(extname) || 'text/plain';
    if (ctype === 'text/html') ctype += ';charset=utf-8';
    headers['Content-Type'] = ctype;

    // assign an etag header to the request if enabled
    if (options.etag) headers.etag = etag(stats);

    if (enc && !req.headers['Content-Encoding']) {
        headers.vary = 'Accept-Encoding';
        headers['Content-Encoding'] = enc;
    }

    // handle range header
    const { range } = req.headers;
    if (range) {
        const [x, y] = range.replace(/bytes=/, '').split('-');
        const start = Number.parseInt(x, 10);
        let end = y ? Number.parseInt(y, 10) : stats.size - 1;
        const chunksize = end - start + 1;

        if (end >= stats.size) {
            end = stats.size - 1;
        }

        if (start >= stats.size) {
            headers['Content-Range'] = `bytes */${stats.size}`;
            res.writeHead(STATUS.REQUESTED_RANGE_NOT_SATISFIABLE, headers);
            res.end();
            return;
        }

        headers['Content-Range'] = `bytes ${start}-${end}/${stats.size}`;
        headers['Accept-Ranges'] = 'bytes';
        headers['Content-Length'] = chunksize;

        res.writeHead(STATUS.PARTIAL_CONTENT, headers);

        fsOpt.start = start;
        fsOpt.end = end;
    } else {
        // if range header wasn't set
        // respond with OK status
        res.writeHead(STATUS.OK, headers);
    }

    fs.createReadStream(filePath, fsOpt).pipe(res);
}

/**
 * HTTP handler for directories.
 * @param {string} filePath User's file path.
 * @param {RequiredOptions} options App options.
 * @param {http.IncomingMessage} req HTTP client request.
 * @param {http.ServerResponse} res HTTP server response.
 */
export function handleDir(filePath: string, options: RequiredOptions, req: http.IncomingMessage, res: http.ServerResponse): void {
    // if disabled or ignored, interpret as missing
    if (!options.dirListing || shouldIgnore(filePath, options)) {
        handleMissing(options, req, res);
        return;
    }

    const MAIN_PAGE = path.join(options.root, options.index);

    if (req.url === '/' && fs.existsSync(MAIN_PAGE)) {
        handleFile(MAIN_PAGE, options, req, res);
        return;
    }

    const relativePath = decodeURIComponent(url.parse(req.url!).pathname!);

    const title = decodeURIComponent(req.url || path.relative(options.root, filePath));
    const files: File[] = fs.readdirSync(filePath)
        .filter(file => !shouldIgnore(path.join(relativePath, file), options))
        .map(file => {
            const dirFilePath = path.join(filePath, file);
            const fileData: Partial<File> = {};
            const details = path.parse(dirFilePath);

            // also nodejs/node#48673
            const stats = niceTry(() => fs.lstatSync(dirFilePath));

            fileData.relative = path.join(relativePath, details.base);
            fileData.base = details.base;
            fileData.type = stats?.isSymbolicLink() ? 'directory' : 'file';

            if (stats?.isDirectory()) {
                fileData.base = details.base + '/';
                fileData.relative += '/';
                fileData.type = 'directory';
            } else {
                // since it's not a directory, it is a file that might have an extension
                // we shouldn't let directories have an extension
                fileData.ext = details.ext?.slice(1);
            }
            fileData.title = details.base;

            return fileData as File;
        })
        // sort files
        .sort((fileA, fileB) => {
            // make sure directories are first
            if (fileA.type === 'directory' && fileB.type === 'file') {
                return -1;
            } else if (fileA.type === 'file' && fileB.type === 'directory') {
                return 1;
            }
            // sort alphabetically
            return fileA.base.localeCompare(fileB.base);
        });

    const relative = path.dirname(req.url!);

    if (relative !== req.url) {
        files.unshift({
            type: 'directory',
            base: '..',
            relative,
            title: relative,
            ext: ''
        });
    }

    res.writeHead(res.statusCode, { 'Content-Type': 'text/html' });
    res.end(templite(templates.directories, {
        files: JSON.stringify(files),
        title,
        nodeVersion: process.version
    }));
}