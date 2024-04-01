import { expect, test } from 'vitest';
import { STATUS } from '../../src/helpers/codes.js';
import { StatusCodes } from 'http-status-codes';

test('helpers: codes', () => {
    for (const status of Object.keys(STATUS)) {
        expect(STATUS[status]).to.equal(StatusCodes[status]);
    }
});