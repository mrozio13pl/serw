import { expect, test } from 'vitest';
import '../src/index.js';
import colors from 'picocolors';

const noop = () => {};

test('graceful exit - SIGINT', () => {
    const originalConsoleLog = console.log;
    const originalProcessExit = process.exit;
    const mockConsoleLog = (...output: string[]) => {
        if (output[0].includes('info')) {
            expect(output).toStrictEqual([colors.magenta('info'), 'Shutting down...']);
        }
    };
    process.exit = noop as never;
    console.log = mockConsoleLog as never;

    process.emit('SIGINT');

    console.log = originalConsoleLog;
    process.exit = originalProcessExit;
});