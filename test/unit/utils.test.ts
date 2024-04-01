import { expect, test } from 'vitest';
import * as utils from '../../src/utils.js';
import colors from 'picocolors';
import isUnicodeSupported from 'is-unicode-supported';
import { dirname, join, sep } from 'node:path';
import url from 'node:url';
import type { RequiredOptions } from '../../src/types.js';

const __dirname = dirname(url.fileURLToPath(import.meta.url));

test('utils: __filename, __dirname and __root', () => {
    expect(utils.__filename).toBeTypeOf('string');
    expect(utils.__dirname).toBeTypeOf('string');
    expect(utils.__root).toBeTypeOf('string');
});

test('utils: niceTry', () => {
    const tried = utils.niceTry(() => { throw new Error('yup') });
    expect(tried).toBeUndefined();
});

test('utils: clearConsole', () => {
    // mock process.stdout.write
    const originalWrite = process.stdout.write;
    let capturedOutput = '';
    process.stdout.write = str => {
        capturedOutput += str;
        return true;
    };

    utils.clearConsole();

    process.stdout.write = originalWrite;

    expect(capturedOutput).to.include('\x1B[H\x1B[2J');
});

test('utils: formatStatusCode', () => {
    expect(utils.formatStatusCode(500)).toEqual(colors.cyan('(500)'));
    expect(utils.formatStatusCode(404)).toEqual(colors.red('(404)'));
    expect(utils.formatStatusCode(202)).toEqual(colors.green('(202)'));
    expect(utils.formatStatusCode(303)).toEqual(colors.yellow('(303)'));
});

test('utils: getUnicode', () => {
    const unicode = utils.getUnicode('🎉', 'nope');

    expect(unicode).toEqual(isUnicodeSupported() ? '🎉' : 'nope');
});

test('utils: timestamp', () => {
    const result = utils.timestamp();
    expect(/^\d{2}:\d{2}:\d{2}$/.test(result)).to.be.true;
});

test('utils: isFileAccessible', () => {
    const result = utils.isFileAccessible(process.cwd());
    expect(result).to.be.true;
    const result2 = utils.isFileAccessible('missing_file.txt');
    expect(result2).to.be.false;
});

test('utils: isDir', () => {
    expect(utils.isDir(join(process.cwd(), 'test'))).to.be.true;
});

test('utils: shouldRedirect', () => {
    expect(utils.shouldRedirect(join(__dirname, '__fixtures__/symlink'))).to.be.true;
    expect(utils.shouldRedirect(join(__dirname, '__fixtures__/file.txt'))).to.be.false;
    expect(utils.shouldRedirect('missing-file.txt')).to.be.false;
});

test('utils: hashPassword', () => {
    const password = 'password';
    const salt = 'supersecret123';

    expect(utils.hashPassword(password, salt)).to.not.eq(password);
});

test('utils: shouldIgnore', () => {
    const defaults = {
        dotFiles: false,
        ignoreFiles: [] as string[]
    } as RequiredOptions;

    // dotfiles
    expect(
        utils.shouldIgnore(sep + '.dotfile', { ...defaults, dotFiles: false })
    ).to.be.true;
    expect(
        utils.shouldIgnore('.dotfile' + sep, { ...defaults, dotFiles: true })
    ).to.be.false;

    // globs
    expect(
        utils.shouldIgnore('file.txt', { ...defaults, ignoreFiles: ['*.txt'] })
    ).to.be.true;
});