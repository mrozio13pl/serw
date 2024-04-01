import { expect, test } from 'vitest';
import logger, { disableLogger } from '../../src/helpers/logger.js';
import colors from 'picocolors';

test('helpers: logger', () => {
    // Capture console.log and console.error
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleInfo = console.info;

    // mock console.log and console.error
    const mockConsoleLog = (output: string) => {
        expect(output).toContain(colors.magenta('INFO'));
    };
    const mockConsoleError = (output: string) => {
        expect(output).toContain(colors.red('ERROR'));
    };
    const mockConsoleWarn = (output: string) => {
        expect(output).toContain(colors.yellow('WARN'));
    };
    const mockDisabledLogger = (output: string) => {
        expect(output).toBeNull();
    };

    // Override console.log and console.error
    console.log = mockConsoleLog as never;
    console.error = mockConsoleError as never;

    // Test logger functions
    logger.info('INFO', 'Test message for info');
    logger.log(colors.magenta('INFO'));
    logger.error('ERROR', 'Test message for error');

    // warn
    console.log = mockConsoleWarn as never;
    logger.warn('WARN');

    // disable logger
    disableLogger();
    console.log = mockDisabledLogger as never;
    logger.info('INFO', 'something');
    logger.log('INFO', 'something');

    // Restore original console.log and console.error
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.info = originalConsoleInfo;
});
