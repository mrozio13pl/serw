import http from 'node:http';
import { getLocalHost } from '../src/helpers/host';

export async function createServer(port: number) {
    return new Promise<http.Server>(resolve => {
        const server = http.createServer();
        server.listen(port, getLocalHost());
        server.once('listening', () => { resolve(server) });
    });
}