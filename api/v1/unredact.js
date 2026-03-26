/**
 * POST /api/v1/unredact — Restore original values using a redaction map
 */

'use strict';

const { unredact } = require('../../lib/pii-engine');
const { sendJson, handleCors, sendError, authenticate, readBody } = require('../../lib/api-helpers');

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') return sendError(res, 405, 'method_not_allowed', 'Use POST');

    const auth = authenticate(req, res);
    if (!auth) return;

    let body;
    try {
        const raw = await readBody(req, 512 * 1024);
        body = JSON.parse(raw.toString('utf-8'));
    } catch (err) {
        if (err.code === 'payload_too_large') return sendError(res, 413, 'payload_too_large', 'Payload exceeds 500KB limit.');
        return sendError(res, 400, 'bad_request', 'Invalid JSON body.');
    }

    if (!body.text || typeof body.text !== 'string') {
        return sendError(res, 400, 'bad_request', 'Missing required field: text (string).');
    }
    if (!body.redaction_map || typeof body.redaction_map !== 'object') {
        return sendError(res, 400, 'bad_request', 'Missing required field: redaction_map (object).');
    }

    const restored = unredact(body.text, body.redaction_map);
    const replacementsMade = Object.keys(body.redaction_map).filter(
        ph => body.text.includes(ph)
    ).length;

    sendJson(res, 200, {
        restored_text: restored,
        replacements_made: replacementsMade
    });
};
