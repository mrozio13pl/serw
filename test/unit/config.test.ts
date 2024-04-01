import { expect, test } from 'vitest';
import { loadConfig } from '../../src/helpers/config.js';
import { dirname, join } from 'node:path';
import url from 'node:url';

const __dirname = dirname(url.fileURLToPath(import.meta.url));

test('helpers: loadConfig', async () => {
    const config = await loadConfig(join(__dirname, '__fixtures__/serw.json'));
    expect(config.port).equal(9000);
    expect(await loadConfig()).to.deep.equal({});

    try {
        await loadConfig('./some/non/exisiting/file');
    } catch (error) {
        expect(error.name).equal('CONFIG_ERROR');
    }
});