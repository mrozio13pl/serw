/** List of some HTTP codes, to make my life easier. */
export enum STATUS {
    OK = 200,
    MOVED_TEMPORARILY = 302,
    PARTIAL_CONTENT = 206,
    NOT_MODIFIED = 304,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    METHOD_NOT_ALLOWED = 405,
    REQUESTED_RANGE_NOT_SATISFIABLE = 416,
    INTERNAL_SERVER_ERROR = 500
}