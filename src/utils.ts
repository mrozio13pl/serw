/* eslint-disable no-use-before-define */
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import url from 'node:url';
import colors from 'picocolors';
import isUnicodeSupported from 'is-unicode-supported';
import globalyzer from 'globalyzer';
import globrex from 'globrex';
import isPathInside from 'path-is-inside';
import type { Colors } from 'picocolors/types.js';
import type { RequiredOptions } from './types.js';

export function niceTry<T>(fn: () => T): T | undefined {
    try {
        return fn();
    } catch { /** EMPTY */ }
}

export const __filename = url.fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
const __public = path.join(process.cwd(), './public');
export const __root = fs.existsSync(__public) && isDir(__public) ? __public : process.cwd();

export function clearConsole(): void {
    process.stdout.write(('\n'.repeat(process.stdout.rows || 20) + '\x1B[H\x1B[2J'));
}

export function formatStatusCode(code: number): string {
    let color: keyof Colors;

    if (code >= 500) {
        color = 'cyan';
    } else if (code >= 400) {
        color = 'red';
    } else if (code >= 200 && code <= 207) {
        color = 'green';
    } else {
        color = 'yellow';
    }

    // it's tough
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (colors as any)[color]('(' + String(code) + ')');
}

export function getUnicode(charThatSupportsUnicode: string, second = ''): string {
    return isUnicodeSupported() ? charThatSupportsUnicode : second;
}

export function timestamp(): string {
    return new Date().toLocaleTimeString('en-US', { hour12: false });
}

export function shouldIgnore(filename: string, options: RequiredOptions): boolean {
    const ignorePatterns = ['*.env', '.git', ...options.ignoreFiles];
    if (filename.startsWith(path.sep)) filename = filename.slice(1);
    if (filename.endsWith(path.sep)) filename = filename.slice(0, -1);

    return (!options.dotFiles && filename.startsWith('.')) || ignorePatterns.some(pattern => {
        const { base, isGlob } = globalyzer(pattern);

        return (isGlob && globrex(pattern).regex.test(filename)) || (base && isPathInside(filename, pattern)) || (base && isPathInside(filename, base));
    });
}

export function isFileAccessible(filepath: string): boolean {
    try {
        fs.accessSync(filepath, fs.constants.F_OK);
        fs.accessSync(filepath, fs.constants.R_OK);
        return true;
    } catch {
        return false;
    }
}

export function isDir(filepath: string): boolean {
    return niceTry(() => fs.statSync(filepath))?.isDirectory();
}

export function shouldRedirect(filepath: string): boolean {
    return !!niceTry(() => fs.lstatSync(filepath).isSymbolicLink());
}

export function hashPassword(password: string, salt: string) {
    return crypto.pbkdf2Sync(password, salt, 10_000, 64, 'sha512').toString('hex');
}