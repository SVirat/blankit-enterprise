/**
 * Blankit B2B — Public config endpoint
 * Serves client-safe env vars (no secrets like GOOGLE_CLIENT_SECRET).
 */

'use strict';

const { handleCors, sendJson } = require('../../lib/api-helpers');

module.exports = (req, res) => {
    if (handleCors(req, res)) return;

    sendJson(res, 200, {
        googleClientId: process.env.GOOGLE_CLIENT_ID || '',
        web3formsKey: process.env.WEB3FORMS_KEY || '',
    });
};
