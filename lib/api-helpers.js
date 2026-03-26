/**
 * Blankit B2B — Shared API helpers (auth, CORS, error formatting)
 */

'use strict';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

/**
 * Send a JSON response with CORS headers.
 */
function sendJson(res, status, body) {
    res.writeHead(status, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
}

/**
 * Handle pre-flight OPTIONS.
 */
function handleCors(req, res) {
    if (req.method === 'OPTIONS') {
        res.writeHead(204, CORS_HEADERS);
        res.end();
        return true;
    }
    return false;
}

/**
 * Send a standard error response.
 */
function sendError(res, status, code, message) {
    sendJson(res, status, { error: { code, message, status } });
}

/**
 * Validate the API key from the Authorization header.
 * In production you'd verify against a database / KV store.
 * For now we accept any key with the correct prefix format.
 */
function authenticate(req, res) {
    const auth = req.headers['authorization'] || '';
    const match = auth.match(/^Bearer\s+(Blankit_(?:live|test)_\S+)$/);
    if (!match) {
        sendError(res, 401, 'invalid_api_key', 'Missing or invalid API key. Use: Authorization: Bearer Blankit_live_...');
        return null;
    }
    return { key: match[1], env: match[1].startsWith('Blankit_test_') ? 'sandbox' : 'production' };
}

/**
 * Read the entire request body as a Buffer (up to maxBytes).
 */
function readBody(req, maxBytes = 512 * 1024) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > maxBytes) {
                reject(Object.assign(new Error('Payload too large'), { code: 'payload_too_large', status: 413 }));
                req.destroy();
            } else {
                chunks.push(chunk);
            }
        });
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

module.exports = { sendJson, handleCors, sendError, authenticate, readBody, CORS_HEADERS };
