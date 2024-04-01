import { expect, test } from 'vitest';
import { getLocalHost } from '../../src/helpers/host.js';

test('helpers: getLocalHost', () => {
    const localhost = getLocalHost();
    expect(localhost).toBeTypeOf('string');
});