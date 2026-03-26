/**
 * Blankit B2B — Server-side PII/PHI detection & redaction engine
 * Ported from the browser extension's pii-engine.js for Node.js / Vercel serverless.
 */

'use strict';

// ─── Common first names (always redacted even standalone) ───
const COMMON_NAMES = new Set([
    'James', 'Robert', 'John', 'Michael', 'David',
    'William', 'Richard', 'Joseph', 'Thomas', 'Charles',
    'Mary', 'Patricia', 'Jennifer', 'Linda', 'Barbara',
    'Elizabeth', 'Susan', 'Jessica', 'Sarah', 'Karen',
    'Aarav', 'Vivaan', 'Aditya', 'Virat', 'Arjun',
    'Sai', 'Reyansh', 'Rahul', 'Krishna', 'Ishaan',
    'Ananya', 'Diya', 'Priya', 'Raj', 'Isha',
    'Saanvi', 'Anika', 'Kavya', 'Riya', 'Pooja'
]);

// ─── Common English words excluded from name detection ───
const COMMON_WORDS = new Set([
    'the','be','to','of','and','in','that','have','it','for','not','on','with','he','as','you',
    'do','at','this','but','his','by','from','they','we','say','her','she','or','an','will','my',
    'one','all','would','there','their','what','so','up','out','if','about','who','get','which',
    'go','me','when','make','can','like','time','no','just','him','know','take','people','into',
    'year','your','good','some','could','them','see','other','than','then','now','look','only',
    'come','its','over','think','also','back','after','use','two','how','our','work','first',
    'well','way','even','new','want','because','any','these','give','day','most','us','great',
    'has','had','been','was','are','did','does','got','may','much','must','own','should','still',
    'such','too','very','where','while','why','each','here','right','through',
    'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday',
    'January','February','March','April','May','June','July','August','September','October','November','December',
    'The','This','That','These','Those','What','Which','Where','When','How','Who','Why','Here','There',
    'Each','Every','Some','Any','All','Both','Few','More','Most','Other','Such','Only','Same','Than',
    'Very','Just','But','And','For','Not','You','Are','Was','Were','Been','Being',
    'Have','Has','Had','Does','Did','Will','Would','Could','Should','May','Might','Must','Shall',
    'Can','Need','Dare','About','Above','After','Again','Also','Back','Before','Below','Between',
    'Come','Down','Even','First','From','Get','Give','Good','Great','Into','Know','Like',
    'Look','Make','Much','New','Now','Over','Own','Part','Right','See','Still','Take','Tell','Think',
    'Through','Time','Under','Want','Way','Well','With','Work','Year','Your',
    'Please','Hello','Thank','Thanks','Dear','Best','Kind','Note','Sure','Data','File','Help','Home',
    'Long','Left','Next','Last','High','Full','Real','True','Open','Line','Type','Free','Using',
    'Without','Within',
    'ask','call','send','read','check','run','let','try','keep','move','show','start','stop',
    'watch','write','meet',
    'Ask','Call','Send','Read','Check','Run','Let','Try','Keep','Move','Show','Start','Stop',
    'Watch','Write','Meet'
]);

// ─── Pattern definitions (9 detection categories) ───
const PATTERNS = [
    { key: 'emails',      label: 'EMAIL', type: 'Email',                 regex: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g },
    { key: 'phones',      label: 'PHONE', type: 'Phone Number',          regex: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
    { key: 'ssn',         label: 'SSN',   type: 'SSN',                   regex: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g },
    { key: 'creditCards', label: 'CC',    type: 'Credit Card',           regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g },
    { key: 'addresses',   label: 'ADDR',  type: 'Street Address',        regex: /\b\d{1,5}\s+(?:[A-Za-z]+\s*){1,4}(?:[Ss]t(?:reet)?|[Aa]ve(?:nue)?|[Bb]lvd|[Bb]oulevard|[Dd]r(?:ive)?|[Ll]n|[Ll]ane|[Rr]d|[Rr]oad|[Cc]t|[Cc]ourt|[Pp]l(?:ace)?|[Ww]ay|[Cc]ir(?:cle)?)\.?(?:\s*,\s*(?:[Aa]pt|[Ss]uite|[Uu]nit|[Ss]te|#)\.?\s*\w+)?(?:\s*,\s*[A-Za-z]+(?:\s+[A-Za-z]+){0,2})?(?:\s*,?\s+[A-Z]{2}(?=\s+\d{5}|[\s.,;!?\n\r]|$))?(?:\s+\d{5}(?:-\d{4})?)?/g },
    { key: 'dates',       label: 'DOB',   type: 'Date',                  regex: /\b(?:0?[1-9]|1[0-2])[\/\-](?:0?[1-9]|[12]\d|3[01])[\/\-](?:19|20)\d{2}\b/g },
    { key: 'medical',     label: 'MRN',   type: 'Medical Record Number', regex: /\b(?:MRN|MR#|Medical Record)[:\s#]*\d{4,10}\b/gi },
    { key: 'ip',          label: 'IP',    type: 'IP Address',            regex: /\b(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g }
];

const ALL_CATEGORIES = {
    emails: true, phones: true, ssn: true, creditCards: true,
    addresses: true, names: true, dates: true, medical: true, ip: true
};

/**
 * Create a fresh redaction context (stateful counter + map).
 * One context per API request — never shared.
 */
function createContext() {
    return { counter: 0, map: {} };
}

/**
 * Redact PII from a plain-text string.
 *
 * @param {string}   text            Input text
 * @param {object}   [categories]    Category overrides (e.g. { emails: true, ssn: false })
 * @param {string[]} [customWords]   Extra words to redact
 * @param {object}   [ctx]           Redaction context (created if omitted)
 * @returns {{ result: string, items: object[], map: object, ctx: object }}
 */
function redactString(text, categories, customWords, ctx) {
    if (!text || text.length < 3) return { result: text, items: [], map: {}, ctx: ctx || createContext() };

    ctx = ctx || createContext();
    const cats = Object.assign({}, ALL_CATEGORIES, categories || {});
    let result = text;
    const items = [];

    // ── Regex-based categories ──
    for (const pattern of PATTERNS) {
        if (!cats[pattern.key]) continue;
        // Reset lastIndex for global regex re-use across calls
        const re = new RegExp(pattern.regex.source, pattern.regex.flags);
        result = result.replace(re, (match) => {
            if (/^\[.+_\d+\]$/.test(match)) return match;
            ctx.counter++;
            const placeholder = `[${pattern.label}_${ctx.counter}]`;
            ctx.map[placeholder] = match;
            items.push({ type: pattern.type, placeholder, index: ctx.counter - 1 });
            return placeholder;
        });
    }

    // ── Name detection: multi-word (2-4 consecutive capitalised words) ──
    if (cats.names) {
        const nameRegex = /\b[A-Z][a-zA-Z]{1,15}(?:\s+[A-Z][a-zA-Z]{1,15}){1,3}\b/g;
        result = result.replace(nameRegex, (match) => {
            if (/^\[.+_\d+\]/.test(match)) return match;
            const words = match.split(/(\s+)/);
            const allNonCommon = words.filter((_, i) => i % 2 === 0).every(
                w => !COMMON_WORDS.has(w) && !COMMON_WORDS.has(w.toLowerCase())
            );
            if (allNonCommon) {
                ctx.counter++;
                const ph = `[NAME_${ctx.counter}]`;
                ctx.map[ph] = match;
                items.push({ type: 'Person Name', placeholder: ph, index: ctx.counter - 1 });
                return ph;
            }
            // Partial — redact contiguous non-common runs
            const parts = [];
            let run = [];
            for (let w = 0; w < words.length; w++) {
                if (w % 2 === 1) { // whitespace
                    if (run.length > 0) run.push(words[w]);
                    else parts.push(words[w]);
                    continue;
                }
                const isCommon = COMMON_WORDS.has(words[w]) || COMMON_WORDS.has(words[w].toLowerCase());
                if (!isCommon) { run.push(words[w]); }
                else {
                    if (run.length > 0) {
                        const runText = run.join('').trim();
                        ctx.counter++;
                        const ph = `[NAME_${ctx.counter}]`;
                        ctx.map[ph] = runText;
                        items.push({ type: 'Person Name', placeholder: ph, index: ctx.counter - 1 });
                        parts.push(ph);
                        run = [];
                    }
                    parts.push(words[w]);
                }
            }
            if (run.length > 0) {
                const runText = run.join('').trim();
                ctx.counter++;
                const ph = `[NAME_${ctx.counter}]`;
                ctx.map[ph] = runText;
                items.push({ type: 'Person Name', placeholder: ph, index: ctx.counter - 1 });
                parts.push(ph);
            }
            return parts.join('');
        });

        // Standalone common first names
        result = result.replace(/\b[A-Z][a-zA-Z]{1,15}\b/g, (match) => {
            if (/^\[.+_\d+\]/.test(match)) return match;
            const normalized = match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
            if (!COMMON_NAMES.has(normalized)) return match;
            if (COMMON_WORDS.has(match) || COMMON_WORDS.has(match.toLowerCase())) return match;
            ctx.counter++;
            const ph = `[NAME_${ctx.counter}]`;
            ctx.map[ph] = match;
            items.push({ type: 'Person Name', placeholder: ph, index: ctx.counter - 1 });
            return ph;
        });
    }

    // ── Custom words ──
    if (customWords && customWords.length > 0) {
        for (const word of customWords) {
            if (!word || word.length < 1) continue;
            const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const cwRegex = new RegExp('\\b' + escaped + '\\b', 'g');
            result = result.replace(cwRegex, (match) => {
                ctx.counter++;
                const ph = `[CUSTOM_${ctx.counter}]`;
                ctx.map[ph] = match;
                items.push({ type: 'Custom Word', placeholder: ph, index: ctx.counter - 1 });
                return ph;
            });
        }
    }

    return { result, items, map: ctx.map, ctx };
}

/**
 * Recursively redact all string values in a JSON object.
 */
function deepRedactObj(obj, categories, customWords, ctx) {
    ctx = ctx || createContext();
    const allItems = [];

    function walk(node) {
        if (typeof node === 'string') {
            if (node.length < 5) return node;
            const r = redactString(node, categories, customWords, ctx);
            allItems.push(...r.items);
            return r.result;
        }
        if (Array.isArray(node)) return node.map(walk);
        if (node && typeof node === 'object') {
            const out = {};
            for (const key of Object.keys(node)) out[key] = walk(node[key]);
            return out;
        }
        return node;
    }

    const result = walk(obj);
    return { result, items: allItems, map: ctx.map, ctx };
}

/**
 * Restore original values by replacing placeholders using a redaction map.
 */
function unredact(text, map) {
    if (!text || !map) return text;
    let result = text;
    for (const [placeholder, original] of Object.entries(map)) {
        // Use split+join for safe replacement (no regex special-char issues)
        result = result.split(placeholder).join(original);
    }
    return result;
}

/**
 * List available categories.
 */
function getCategories() {
    return PATTERNS.map(p => ({
        key: p.key, label: p.label, type: p.type, default: true
    })).concat([{ key: 'names', label: 'NAME', type: 'Person Name', default: true }]);
}

/**
 * Rough token count (word-level, similar to GPT tokenizer approximation).
 */
function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.split(/\s+/).length * 1.3);
}

module.exports = {
    redactString,
    deepRedactObj,
    unredact,
    getCategories,
    estimateTokens,
    createContext,
    ALL_CATEGORIES
};
