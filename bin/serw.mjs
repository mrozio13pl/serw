#!/usr/bin/env node
import { parse } from 'ofi';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import colors from 'picocolors';

const options = parse(process.argv.slice(2), {
    string: [
        'host',
        'index',
        'key',
        'cert',
        'config',
        'error-page'
    ],
    number: ['port', 'max-age'],
    array: 'ignore-files',
    boolean: [
        'dot-files',
        'dir-listing',
        'ssl',
        'cors',
        'etag',
        'immutable',
        'open',
        'robots',
        'log-ip',
        'log-agent',
        'log-timestamp',
        'clear-console',
        'silent',
        'version',
        'help'
    ],
    alias: {
        host: 'H',
        port: 'p',
        index: 'm',
        dotFiles: 'd',
        ignoreFiles: 'i',
        dirListing: 'l',
        errorPage: 'E',
        open: 'o',
        robots: 'r',
        cors: 'c',
        etag: 'e',
        immutable: 'I',
        maxAge: 'M',
        password: 'P',
        ssl: 's',
        key: 'K',
        cert: 'C',
        version: 'v',
        help: 'h',
    },
    camelize: true,
    parseNumber: false
});

const helpText = `serw

  Simple static HTTP server.

    ${colors.bold('Usage')}

        $ ${colors.cyan('serw')} [path] [options]
        path - where to bind assets from. Uses current directory by default or /public if exists.
        options - flag options.

    ${colors.bold('Options')}

        -H --host               Hostname to bind. (default: 'localhost')
        -p --port               Port to bind. (default: 3000)
        -m --index              Path to the main page file. (default: 'index.html')
        -d --dot-files          Enable dot files, e.g. ".env". (default: 'false') 
        -i --ignore-files       List of files to ignore.
        -l --no-dir-listing     Disable directory listing. (default: 'false') 
        -E --error-page         Path to a file to display when an error occurred. (default: '404.html') 
        -o --no-open            Whether to open browser window after the server starts. (default: 'true')
        -r --robots             Automatically handle /robots.txt. (default: 'false') 
        -c --cors               Enable CORS headers. (default: 'false')
        -e --etag               Enable ETag headers. (default: 'false')
        -M --max-age            Enable Cache-Control header and set "maxAge" (sec). (default: 'undefined')
        -I --immutable          Appends Cache-Control header with "immutable". (default: 'false')
        -p --password           Enable simple authentication via a password.
        -s --ssl                Enable SSL/TLS for HTTPS. (default: 'false')
        -K --key                Path to SSL certificate key. (default: 'key.pem')
        -C --cert               Path to SSL certificate file. (default: 'cert.pem')
        --config                Path to the config json file. (default: 'serw.json')
        --log-ip                Log IP address of the client's request. (default: 'false')
        --log-agent             Log User-agent of the client's request. (default: 'false')
        --log-timestamp         Log timestamp. (default: 'true')
        --clear-console         Clear console after the server starts. (default: 'true')
        --silent                Disable logging entirely. (default: 'false')
        -h --help               Print this list.
        -v --version            Print the version.

        Altenatively you can use ${colors.cyan('serw.json')} file.

    ${colors.bold('Examples')}

        $ ${colors.cyan('serw')} build --cors --port 8080
        $ ${colors.cyan('serw')} --dot-files --password abc
        $ ${colors.cyan('serw')} --ssl --key server.key --cert server.csr
        $ ${colors.cyan('serw')} -dcr --log-agent -o=false
`;

if (options.version) {
    // show current version from package.json
    const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
    process.stdout.write('v' + JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')).version);
} else if (options.help) {
    console.log(helpText);
} else {
    (await import('../dist/index.js')).default(options._[0], options);
}