/**
 * POST /api/v1/redact — Redact PII from plain text
 */

'use strict';

const { redactString, estimateTokens } = require('../../lib/pii-engine');
const { sendJson, handleCors, sendError, authenticate, readBody } = require('../../lib/api-helpers');
const { recordPiiRedactions } = require('../../lib/stats-store');

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') return sendError(res, 405, 'method_not_allowed', 'Use POST');

    const auth = authenticate(req, res);
    if (!auth) return;

    let body;
    try {
        const raw = await readBody(req, 512 * 1024); // 500KB max for text
        body = JSON.parse(raw.toString('utf-8'));
    } catch (err) {
        if (err.code === 'payload_too_large') return sendError(res, 413, 'payload_too_large', 'Text payload exceeds 500KB limit.');
        return sendError(res, 400, 'bad_request', 'Invalid JSON body.');
    }

    if (!body.text || typeof body.text !== 'string') {
        return sendError(res, 400, 'bad_request', 'Missing required field: text (string).');
    }

    const start = Date.now();

    const categories = body.categories || undefined;
    const customWords = Array.isArray(body.custom_words) ? body.custom_words : undefined;
    const { result, items, map } = redactString(body.text, categories, customWords);

    // Record stats
    recordPiiRedactions(items);

    const processingMs = Date.now() - start;
    const categoriesMatched = [...new Set(items.map(i => i.type))];

    sendJson(res, 200, {
        redacted_text: result,
        items,
        redaction_map: map,
        stats: {
            total_redactions: items.length,
            categories_matched: categoriesMatched,
            input_tokens: estimateTokens(body.text),
            processing_ms: processingMs
        }
    });
};
