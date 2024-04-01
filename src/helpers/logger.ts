import colors from 'picocolors';
import type { Formatter } from 'picocolors/types.js';

// very simple logger :)

type LOG_TYPE = 'info' | 'error' | 'warn' | 'log';
type LOG_FN = (label: string, ...msg: unknown[]) => void;

const LABELS: Record<LOG_TYPE, Formatter> = {
    info: colors.magenta,
    warn: colors.yellow,
    error: colors.red,
    log: str => str.toString()
};

let isLoggingDisabled: boolean;

function log(type: LOG_TYPE, label: string, ...msg: unknown[]): void {
    if (isLoggingDisabled) return;

    switch (type) {
        case 'error': {
            console.error(LABELS[type](label), ...msg);
            break;
        }
        default: {
            console.log(LABELS[type](label), ...msg);
            break;
        }
    }
}

const logger: Record<LOG_TYPE, LOG_FN> = {
    info: (label, ...msg) => {
        log('info', label, ...msg);
    },
    warn: (label, ...msg) => {
        log('warn', label, ...msg);
    },
    error: (label, ...msg) => {
        log('error', label, ...msg);
    },
    log: (label: unknown, ...msg) => {
        if (isLoggingDisabled) return;

        console.log(label, ...msg);
    }
};

export function disableLogger(): void {
    isLoggingDisabled = true;
}

export default logger;