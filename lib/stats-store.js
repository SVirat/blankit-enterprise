/**
 * Blankit B2B — Stats store (file-backed, in-process)
 * Tracks PII and document redaction counts with 7-day history.
 * In production, replace with a database.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const STATS_FILE = path.join(__dirname, '..', '.stats.json');

const PII_KEYS = ['emails', 'phones', 'ssns', 'names', 'addresses', 'dobs', 'cards', 'mrns', 'ips'];
const DOC_KEYS = ['txt', 'docx', 'pdf', 'xlsx', 'pptx', 'csv'];
const ALL_KEYS = PII_KEYS.concat(DOC_KEYS);

// Map PII engine item types to our stat keys
const TYPE_MAP = {
    'Email': 'emails',
    'Phone Number': 'phones',
    'SSN': 'ssns',
    'Person Name': 'names',
    'Street Address': 'addresses',
    'Date': 'dobs',
    'Credit Card': 'cards',
    'Medical Record Number': 'mrns',
    'IP Address': 'ips'
};

// Map file extensions / types to doc keys
const DOC_TYPE_MAP = {
    'text': 'txt',
    'ooxml': 'docx', // default for ooxml, refined by extension
    'pdf': 'pdf'
};

const EXT_MAP = {
    '.txt': 'txt', '.csv': 'csv', '.tsv': 'txt', '.json': 'txt',
    '.xml': 'txt', '.md': 'txt', '.log': 'txt', '.html': 'txt',
    '.docx': 'docx', '.xlsx': 'xlsx', '.pptx': 'pptx', '.pdf': 'pdf'
};

function todayKey() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function emptyStats() {
    var pii = {};
    PII_KEYS.forEach(function (k) { pii[k] = 0; });
    var docs = {};
    DOC_KEYS.forEach(function (k) { docs[k] = 0; });
    return { pii: pii, docs: docs, daily: {} };
}

function load() {
    try {
        var raw = fs.readFileSync(STATS_FILE, 'utf-8');
        var data = JSON.parse(raw);
        // Ensure all keys exist
        PII_KEYS.forEach(function (k) { if (typeof data.pii[k] !== 'number') data.pii[k] = 0; });
        DOC_KEYS.forEach(function (k) { if (typeof data.docs[k] !== 'number') data.docs[k] = 0; });
        if (!data.daily) data.daily = {};
        return data;
    } catch (e) {
        return emptyStats();
    }
}

function save(data) {
    try {
        fs.writeFileSync(STATS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
        console.error('Failed to save stats:', e.message);
    }
}

function ensureDay(data, day) {
    if (!data.daily[day]) {
        var entry = {};
        ALL_KEYS.forEach(function (k) { entry[k] = 0; });
        data.daily[day] = entry;
    }
}

/**
 * Record PII redactions from a redact response.
 * @param {object[]} items - The items array from redactString result
 */
function recordPiiRedactions(items) {
    if (!items || items.length === 0) return;
    var data = load();
    var day = todayKey();
    ensureDay(data, day);

    items.forEach(function (item) {
        var key = TYPE_MAP[item.type];
        if (key) {
            data.pii[key] = (data.pii[key] || 0) + 1;
            data.daily[day][key] = (data.daily[day][key] || 0) + 1;
        }
    });

    save(data);
}

/**
 * Record a document redaction.
 * @param {string} filename - Original filename
 * @param {string} docType  - Type from doc-handler ('text', 'ooxml', 'pdf')
 * @param {object[]} items  - The items array from redaction result
 */
function recordDocRedaction(filename, docType, items) {
    var data = load();
    var day = todayKey();
    ensureDay(data, day);

    // Determine doc key from extension first, fall back to type
    var ext = path.extname(filename || '').toLowerCase();
    var docKey = EXT_MAP[ext] || DOC_TYPE_MAP[docType] || 'txt';

    data.docs[docKey] = (data.docs[docKey] || 0) + 1;
    data.daily[day][docKey] = (data.daily[day][docKey] || 0) + 1;

    // Also record PII items from the document
    if (items && items.length > 0) {
        items.forEach(function (item) {
            var key = TYPE_MAP[item.type];
            if (key) {
                data.pii[key] = (data.pii[key] || 0) + 1;
                data.daily[day][key] = (data.daily[day][key] || 0) + 1;
            }
        });
    }

    save(data);
}

/**
 * Get stats formatted for the dashboard.
 * Returns { pii, docs, history } where history has 7-day arrays.
 */
function getStats() {
    var data = load();

    // Build 7-day history (most recent last)
    var days = [];
    for (var i = 6; i >= 0; i--) {
        var d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().slice(0, 10));
    }

    var history = {};
    ALL_KEYS.forEach(function (k) {
        history[k] = days.map(function (day) {
            return (data.daily[day] && data.daily[day][k]) || 0;
        });
    });

    return {
        pii: data.pii,
        docs: data.docs,
        history: history,
        days: days
    };
}

module.exports = {
    recordPiiRedactions: recordPiiRedactions,
    recordDocRedaction: recordDocRedaction,
    getStats: getStats,
    PII_KEYS: PII_KEYS,
    DOC_KEYS: DOC_KEYS
};
