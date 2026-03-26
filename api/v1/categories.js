/**
 * GET /api/v1/categories — List all available detection categories
 */

'use strict';

const { getCategories } = require('../../lib/pii-engine');
const { sendJson, handleCors, sendError, authenticate } = require('../../lib/api-helpers');

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;
    if (req.method !== 'GET') return sendError(res, 405, 'method_not_allowed', 'Use GET');

    const auth = authenticate(req, res);
    if (!auth) return;

    sendJson(res, 200, { categories: getCategories() });
};
