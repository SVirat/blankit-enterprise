/**
 * GET /api/v1/usage — Return real redaction stats from the stats store.
 * No auth required for dashboard (public stats per session).
 */

'use strict';

const { sendJson, handleCors, sendError } = require('../../lib/api-helpers');
const { getStats } = require('../../lib/stats-store');

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;
    if (req.method !== 'GET') return sendError(res, 405, 'method_not_allowed', 'Use GET');

    const stats = getStats();
    sendJson(res, 200, stats);
};
