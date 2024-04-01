export interface Options {
    /** Path to the root directory. */
    root?: string;

    /**
     * Hostname to bind.
     * @default 'localhost'
     */
    readonly host?: string;

    /**
     * Port to bind.
     * @default 3000
     */
    port?: number;

    /**
     * Path to the main page file.
     * @default 'index.html'
     */
    readonly index?: string;

    /**
     * Show dot files, e.g. `.env`.
     * @default false
     */
    readonly dotFiles?: boolean;

    /**
     * List of files to ignore.
     */
    readonly ignoreFiles?: string[];

    /**
     * Enable directory listing.
     * @default true
     */
    readonly dirListing?: boolean;

    /**
     * Path to a file to display when an error occurred.
     * @default '404.html'
     */
    readonly errorPage?: string;

    // logs

    /**
     * Log IP address of the client's request.
     * @default false
     */
    readonly logIp?: boolean;

    /**
     * Log User-agent of the client's request.
     * @default false
     */
    readonly logAgent?: boolean;

    /**
     * Log timestamp.
     * @default true
     */
    readonly logTimestamp?: boolean;

    /**
     * Clear console after the server starts.
     * @default true
     */
    readonly clearConsole?: boolean;

    /**
     * Disable logging entirely.
     * @default false
     */
    readonly silent?: boolean;

    // auth

    /**
     * Enable simple authentication via a password.
     */
    password?: string;

    /**
     * A randomly generated salt to encrypt/decrypt the password.
     */
    salt?: string;

    // ssl/tls

    /**
     * Enable SSL/TLS for HTTPS.
     * @default false
     */
    readonly ssl?: boolean;

    /**
     * Path to SSL certificate key.
     * @default 'key.pem'
     */
    readonly key?: string;

    /**
     * Path to SSL certificate file.
     * @default 'cert.pem'
     */
    readonly cert?: string;

    // response headers

    /**
     * Enable CORS headers.
     * @default false
     */
    readonly cors?: boolean;

    /**
     * Enable Etag headers.
     * @default false
     */
    readonly etag?: boolean;

    /**
     * Enable Cache-Control header and set `maxAge` (seconds).
     * @default undefined
     */
    readonly maxAge?: number;

    /**
     * Appends Cache-Control header with `immutable`.
     * @default false
     */
    readonly immutable?: boolean;

    // other

    /**
     * Whether to open browser window after the server starts.
     * @default true
     */
    readonly open?: boolean;

    /**
     * Automatically handle /robots.txt.
     * @default false
     */
    readonly robots?: boolean;

    /**
     * Path to the config json file.
     * @default 'serw.json'
     */
    readonly config?: string;
}

export type RequiredOptions = Required<Pick<Options, Exclude<keyof Options, 'password' | 'config' | 'errorPage'>>> & {
    password?: Options['password'];
    errorPage?: Options['errorPage'];
};