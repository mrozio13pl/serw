/** @type {import('eslint').Linter.Config} */
module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    extends: ['@mrozio/eslint-config'],
    overrides: [
        {
            files: ['*.js', '*.mjs', '*.cjs'],
            parser: '@babel/eslint-parser'
        },
        {
            files: ['*.ts', '*.tsx'],
            extends: ['@mrozio/eslint-config/typescript'],
            parserOptions: {
                project: ['./tsconfig.eslint.json'],
                tsconfigRootDir: __dirname
            },
        }
    ]
};