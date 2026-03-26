/**
 * Blankit B2B — Server-side document redaction handler
 * Supports OOXML (.docx, .xlsx, .pptx), plain text, and basic PDF text extraction.
 */

'use strict';

const JSZip = require('jszip');
const { redactString, createContext } = require('./pii-engine');

const TEXT_EXTENSIONS = /\.(txt|csv|tsv|json|xml|md|log|html|htm|yaml|yml|ini|cfg|conf|rtf)$/i;
const OOXML_EXTENSIONS = /\.(docx|xlsx|pptx)$/i;
const PDF_EXTENSION = /\.pdf$/i;
const MAX_TEXT_SIZE = 10 * 1024 * 1024;   // 10 MB
const MAX_DOC_SIZE = 50 * 1024 * 1024;    // 50 MB

function escapeXml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function detectType(filename, buffer) {
    if (OOXML_EXTENSIONS.test(filename)) return 'ooxml';
    if (PDF_EXTENSION.test(filename)) return 'pdf';
    if (TEXT_EXTENSIONS.test(filename)) return 'text';
    // Magic-byte detection
    if (buffer && buffer.length >= 5) {
        const head = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
        if (head[0] === 0x50 && head[1] === 0x4B && head[2] === 0x03 && head[3] === 0x04) return 'ooxml';
        if (head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46 && head[4] === 0x2D) return 'pdf';
    }
    return 'text'; // fallback to text
}

/**
 * Redact a plain-text buffer.
 */
function redactText(buffer, categories, customWords, ctx) {
    const text = buffer.toString('utf-8');
    const r = redactString(text, categories, customWords, ctx);
    return { buffer: Buffer.from(r.result, 'utf-8'), items: r.items, map: r.map, ctx: r.ctx };
}

/**
 * Redact an OOXML (docx/xlsx/pptx) file by unzipping, scrubbing XML text nodes, re-zipping.
 */
async function redactOoxml(buffer, categories, customWords, ctx) {
    const zip = await JSZip.loadAsync(buffer);
    ctx = ctx || createContext();
    const items = [];

    const xmlParts = Object.keys(zip.files).filter(name =>
        /\.(xml|rels)$/i.test(name) && !zip.files[name].dir
    );

    for (const name of xmlParts) {
        let content = await zip.files[name].async('string');
        // Redact text content between XML tags (preserve tags)
        const redacted = content.replace(/>([^<]+)</g, (full, text) => {
            if (text.trim().length < 3) return full;
            const r = redactString(text, categories, customWords, ctx);
            items.push(...r.items);
            return '>' + escapeXml(r.result) + '<';
        });
        zip.file(name, redacted);
    }

    const outBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    return { buffer: outBuffer, items, map: ctx.map, ctx };
}

/**
 * Basic PDF text extraction and redaction.
 * Extracts text streams, redacts PII, returns the redaction metadata.
 * Note: Returns extracted/redacted text as a simplified output (full PDF rewrite is complex).
 */
function redactPdfText(buffer, categories, customWords, ctx) {
    ctx = ctx || createContext();
    const content = buffer.toString('latin1');
    const items = [];
    let extractedText = '';

    // Extract text from PDF stream objects (simplistic approach)
    const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
    let match;
    while ((match = streamRegex.exec(content)) !== null) {
        const streamData = match[1];
        // Look for text-showing operators: Tj, TJ, ', "
        const textOps = streamData.match(/\(([^)]*)\)\s*Tj/g);
        if (textOps) {
            for (const op of textOps) {
                const textMatch = op.match(/\(([^)]*)\)/);
                if (textMatch) extractedText += textMatch[1] + ' ';
            }
        }
    }

    // Also try to find plain readable text in the PDF
    const readableChunks = content.match(/[\x20-\x7E]{10,}/g);
    if (readableChunks) {
        extractedText += readableChunks.join(' ');
    }

    if (extractedText.length < 3) {
        return { buffer, items: [], map: ctx.map, ctx, extractedText: '' };
    }

    const r = redactString(extractedText, categories, customWords, ctx);
    return {
        buffer,
        items: r.items,
        map: r.map,
        ctx: r.ctx,
        redactedText: r.result,
        extractedText
    };
}

/**
 * Main entry: auto-detect type and redact.
 */
async function redactDocument(filename, buffer, categories, customWords) {
    if (buffer.length > MAX_DOC_SIZE) {
        throw Object.assign(new Error('File too large (max 50MB)'), { code: 'payload_too_large', status: 413 });
    }

    const type = detectType(filename, buffer);
    const ctx = createContext();

    switch (type) {
        case 'ooxml':
            return { type: 'ooxml', ...(await redactOoxml(buffer, categories, customWords, ctx)) };
        case 'pdf':
            if (buffer.length > MAX_DOC_SIZE) throw Object.assign(new Error('PDF too large'), { code: 'payload_too_large', status: 413 });
            return { type: 'pdf', ...redactPdfText(buffer, categories, customWords, ctx) };
        case 'text':
            if (buffer.length > MAX_TEXT_SIZE) throw Object.assign(new Error('Text file too large (max 10MB)'), { code: 'payload_too_large', status: 413 });
            return { type: 'text', ...redactText(buffer, categories, customWords, ctx) };
        default:
            throw Object.assign(new Error('Unsupported file format'), { code: 'unsupported_format', status: 422 });
    }
}

module.exports = { redactDocument, detectType };
