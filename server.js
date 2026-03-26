/**
 * Blankit B2B — Local dev server
 * Serves static files from /public and API routes from /api, reading env vars from .env
 */
require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Note: Do NOT use express.json() globally — Vercel handlers use readBody/Busboy

// Load Vercel-style handlers
const configHandler = require('./api/v1/config');
const categoriesHandler = require('./api/v1/categories');
const redactHandler = require('./api/v1/redact');
const redactDocHandler = require('./api/v1/redact-doc');
const unredactHandler = require('./api/v1/unredact');
const usageHandler = require('./api/v1/usage');

// API routes — match both GET and POST for each endpoint
['/api/v1/config'].forEach(p => { app.get(p, configHandler); app.post(p, configHandler); app.options(p, configHandler); });
['/api/v1/categories'].forEach(p => { app.get(p, categoriesHandler); app.post(p, categoriesHandler); app.options(p, categoriesHandler); });
['/api/v1/redact'].forEach(p => { app.get(p, redactHandler); app.post(p, redactHandler); app.options(p, redactHandler); });
['/api/v1/redact-doc'].forEach(p => { app.get(p, redactDocHandler); app.post(p, redactDocHandler); app.options(p, redactDocHandler); });
['/api/v1/unredact'].forEach(p => { app.get(p, unredactHandler); app.post(p, unredactHandler); app.options(p, unredactHandler); });
['/api/v1/usage'].forEach(p => { app.get(p, usageHandler); app.post(p, usageHandler); app.options(p, usageHandler); });

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Clean URL routes (match Vercel cleanUrls behavior)
app.get('/docs', (req, res) => res.sendFile(path.join(__dirname, 'public', 'docs.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));

app.listen(PORT, () => {
    console.log(`Blankit dev server running at http://localhost:${PORT}`);
});
