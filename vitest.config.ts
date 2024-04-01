import { configDefaults, defineConfig } from 'vitest/config';

// https://github.com/eslint/eslintrc/blob/fb8d7ffbb27214686318a07e16ac8878aaafc805/lib/config-array-factory.js#L66
const eslintConfigFilenames = [
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.eslintrc.yaml',
    '.eslintrc.yml',
    '.eslintrc.json',
    '.eslintrc',
    'package.json'
];

export default defineConfig({
    test: {
        testTimeout: 30_000,
        exclude: [
            ...configDefaults.exclude
        ],
        coverage: {
            provider: 'v8',
            exclude: [
                'bin',
                'test',
                'src/types.ts', // just types
                ...eslintConfigFilenames
            ]
        }
    },
});