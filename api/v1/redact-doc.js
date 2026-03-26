/**
 * POST /api/v1/redact-doc — Redact PII from an uploaded document
 * Accepts multipart/form-data with a 'file' field.
 */

'use strict';

const Busboy = require('busboy');
const { redactDocument } = require('../../lib/doc-handler');
const { sendJson, handleCors, sendError, authenticate, CORS_HEADERS } = require('../../lib/api-helpers');
const { recordDocRedaction } = require('../../lib/stats-store');

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

function parseMultipart(req) {
    return new Promise((resolve, reject) => {
        const busboy = Busboy({ headers: req.headers, limits: { fileSize: MAX_FILE_SIZE, files: 1 } });
        let fileBuffer = null;
        let fileName = '';
        let fields = {};

        busboy.on('file', (fieldname, stream, info) => {
            if (fieldname !== 'file') { stream.resume(); return; }
            fileName = info.filename || 'upload';
            const chunks = [];
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', () => { fileBuffer = Buffer.concat(chunks); });
            stream.on('limit', () => {
                reject(Object.assign(new Error('File too large'), { code: 'payload_too_large', status: 413 }));
            });
        });

        busboy.on('field', (name, val) => { fields[name] = val; });
        busboy.on('finish', () => resolve({ fileBuffer, fileName, fields }));
        busboy.on('error', reject);

        req.pipe(busboy);
    });
}

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') return sendError(res, 405, 'method_not_allowed', 'Use POST');

    const auth = authenticate(req, res);
    if (!auth) return;

    let parsed;
    try {
        parsed = await parseMultipart(req);
    } catch (err) {
        if (err.code === 'payload_too_large') return sendError(res, 413, 'payload_too_large', 'File exceeds 50MB limit.');
        return sendError(res, 400, 'bad_request', 'Failed to parse multipart upload.');
    }

    if (!parsed.fileBuffer || parsed.fileBuffer.length === 0) {
        return sendError(res, 400, 'bad_request', 'Missing file field in multipart upload.');
    }

    let categories;
    if (parsed.fields.categories) {
        try { categories = JSON.parse(parsed.fields.categories); } catch { /* use defaults */ }
    }
    let customWords;
    if (parsed.fields.custom_words) {
        try { customWords = JSON.parse(parsed.fields.custom_words); } catch { /* ignore */ }
    }

    const start = Date.now();

    let result;
    try {
        result = await redactDocument(parsed.fileName, parsed.fileBuffer, categories, customWords);
    } catch (err) {
        const status = err.status || 500;
        const code = err.code || 'internal_error';
        return sendError(res, status, code, err.message);
    }

    // Record stats
    recordDocRedaction(parsed.fileName, result.type, result.items);

    const processingMs = Date.now() - start;

    const responseBody = {
        file_name: parsed.fileName,
        file_type: result.type,
        file_size_bytes: parsed.fileBuffer.length,
        items: result.items,
        redaction_map: result.map,
        stats: {
            total_redactions: result.items.length,
            processing_ms: processingMs
        }
    };

    // Include the redacted file as base64 for ooxml & text
    if (result.buffer && (result.type === 'ooxml' || result.type === 'text')) {
        responseBody.redacted_file_base64 = result.buffer.toString('base64');
    }
    // For PDF, include the extracted/redacted text
    if (result.type === 'pdf' && result.redactedText) {
        responseBody.redacted_text = result.redactedText;
    }

    sendJson(res, 200, responseBody);
};

// Disable Vercel's default body parser for multipart
module.exports.config = { api: { bodyParser: false } };
