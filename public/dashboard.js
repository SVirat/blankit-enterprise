/**
 * Blankit Dashboard — Google Sign-In + API Key + Usage Stats
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'Blankit_session';
    const APIKEY_KEY = 'Blankit_apikey';
    const STATS_KEY = 'Blankit_stats';

    const signinScreen = document.getElementById('signin-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');
    const navSignout = document.getElementById('nav-signout');

    // ── Helpers ──

    function getSession() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); }
        catch { return null; }
    }

    function setSession(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function clearSession() {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(APIKEY_KEY);
    }

    function getApiKey() {
        return localStorage.getItem(APIKEY_KEY);
    }

    function getStats() {
        return defaultStats();
    }

    // Fetch live stats from the API
    function fetchAndRenderStats() {
        fetch('/api/v1/usage')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data && data.pii) {
                    renderStatsFromData(data);
                } else {
                    renderStatsFromData(defaultStats());
                }
            })
            .catch(function () {
                renderStatsFromData(defaultStats());
            });
    }

    function defaultStats() {
        return {
            pii: { emails: 0, phones: 0, ssns: 0, names: 0, addresses: 0, dobs: 0, cards: 0, mrns: 0, ips: 0 },
            docs: { txt: 0, docx: 0, pdf: 0, xlsx: 0, pptx: 0, csv: 0 },
            history: {
                emails: [0,0,0,0,0,0,0], phones: [0,0,0,0,0,0,0], ssns: [0,0,0,0,0,0,0],
                names: [0,0,0,0,0,0,0], addresses: [0,0,0,0,0,0,0], dobs: [0,0,0,0,0,0,0],
                cards: [0,0,0,0,0,0,0], mrns: [0,0,0,0,0,0,0], ips: [0,0,0,0,0,0,0],
                txt: [0,0,0,0,0,0,0], docx: [0,0,0,0,0,0,0], pdf: [0,0,0,0,0,0,0],
                xlsx: [0,0,0,0,0,0,0], pptx: [0,0,0,0,0,0,0], csv: [0,0,0,0,0,0,0]
            }
        };
    }

    // ── Generate API key ──

    function generateApiKey() {
        var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        var key = 'Blankit_live_';
        var array = new Uint8Array(32);
        crypto.getRandomValues(array);
        for (var i = 0; i < array.length; i++) {
            key += chars[array[i] % chars.length];
        }
        localStorage.setItem(APIKEY_KEY, JSON.stringify({
            key: key,
            created: new Date().toISOString()
        }));
        return { key: key, created: new Date().toISOString() };
    }

    // ── Render dashboard ──

    function showDashboard(user) {
        signinScreen.style.display = 'none';
        dashboardScreen.style.display = '';
        navSignout.style.display = '';

        document.getElementById('dash-avatar').src = user.picture || '';
        document.getElementById('dash-name').textContent = 'Welcome, ' + user.name;
        document.getElementById('dash-email').textContent = user.email;

        // Populate account page
        var acctName = document.getElementById('acct-name');
        var acctEmail = document.getElementById('acct-email');
        if (acctName) acctName.textContent = user.name || '';
        if (acctEmail) acctEmail.textContent = user.email || '';

        // Populate team owner
        var ownerName = document.getElementById('team-owner-name');
        var ownerAvatar = document.getElementById('team-owner-avatar');
        if (ownerName) ownerName.textContent = user.name || 'You';
        if (ownerAvatar) ownerAvatar.textContent = (user.name || 'U').charAt(0).toUpperCase();

        // Show sidebar toggle on mobile
        var sbt = document.getElementById('sidebar-toggle');
        if (sbt) sbt.style.display = '';

        renderApiKey();
        fetchAndRenderStats();
    }

    function showSignin() {
        signinScreen.style.display = '';
        dashboardScreen.style.display = 'none';
        navSignout.style.display = 'none';
        var sbt = document.getElementById('sidebar-toggle');
        if (sbt) sbt.style.display = 'none';
    }

    function renderApiKey() {
        var stored = localStorage.getItem(APIKEY_KEY);
        var emptyEl = document.getElementById('apikey-empty');
        var displayEl = document.getElementById('apikey-display');
        var billingEl = document.getElementById('billing-callout');
        var valueEl = document.getElementById('apikey-value');

        if (stored) {
            var data = JSON.parse(stored);
            emptyEl.style.display = 'none';
            displayEl.style.display = '';
            billingEl.style.display = '';

            // Always start hidden
            valueEl.textContent = '••••••••••••••••••••••••••••••••••••';
            valueEl.classList.add('apikey-hidden');
            valueEl.setAttribute('data-key', data.key);
            valueEl.setAttribute('data-visible', 'false');
            document.getElementById('icon-eye').style.display = '';
            document.getElementById('icon-eye-off').style.display = 'none';

            var d = new Date(data.created);
            document.getElementById('apikey-created').textContent = 'Created ' + d.toLocaleDateString();
        } else {
            emptyEl.style.display = '';
            displayEl.style.display = 'none';
            billingEl.style.display = 'none';
        }
    }

    // ── Chart palette ──
    var PURPLE = '#7c3aed';
    var PURPLE_LIGHT = 'rgba(124, 58, 237, 0.15)';
    var PII_COLORS = ['#7c3aed','#a78bfa','#6d28d9','#c4b5fd','#8b5cf6','#ddd6fe','#5b21b6','#ede9fe','#4c1d95'];
    var DOC_COLORS = ['#2563eb','#60a5fa','#1d4ed8','#93c5fd','#3b82f6','#bfdbfe'];
    var DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    var DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    function getLast7DayLabels() {
        var labels = [];
        for (var i = 6; i >= 0; i--) {
            var d = new Date();
            d.setDate(d.getDate() - i);
            labels.push(DAY_NAMES[d.getDay()]);
        }
        return labels;
    }

    var chartInstances = {};

    function destroyChart(id) {
        if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
    }

    function makeBarChart(canvasId, labels, data, colors) {
        destroyChart(canvasId);
        var ctx = document.getElementById(canvasId);
        if (!ctx) return;
        chartInstances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderRadius: 6,
                    borderSkipped: false,
                    maxBarThickness: 36
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e1e2e', titleColor: '#fff', bodyColor: '#e0e0e0', cornerRadius: 8, padding: 10 } },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#9ca3af' } },
                    y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 }, color: '#9ca3af' }, beginAtZero: true }
                }
            }
        });
    }

    function makeDoughnutChart(canvasId, labels, data, colors) {
        destroyChart(canvasId);
        var ctx = document.getElementById(canvasId);
        if (!ctx) return;
        chartInstances[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '55%',
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, padding: 10, font: { size: 11 }, color: '#6b7280' } },
                    tooltip: { backgroundColor: '#1e1e2e', titleColor: '#fff', bodyColor: '#e0e0e0', cornerRadius: 8, padding: 10 }
                }
            }
        });
    }

    function makeLineChart(canvasId, data, color) {
        destroyChart(canvasId);
        var ctx = document.getElementById(canvasId);
        if (!ctx) return;
        chartInstances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: getLast7DayLabels(),
                datasets: [{
                    data: data,
                    borderColor: color,
                    backgroundColor: color.replace(')', ', 0.1)').replace('rgb', 'rgba'),
                    fill: true,
                    tension: 0.35,
                    pointRadius: 3,
                    pointBackgroundColor: color,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e1e2e', titleColor: '#fff', bodyColor: '#e0e0e0', cornerRadius: 8, padding: 10 } },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#9ca3af' } },
                    y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 }, color: '#9ca3af' }, beginAtZero: true }
                }
            }
        });
    }

    function renderStatsFromData(stats) {
        var pii = stats.pii;
        var docs = stats.docs;
        var history = stats.history;

        // Total
        var piiTotal = 0; var docTotal = 0;
        for (var k in pii) piiTotal += pii[k];
        for (var k2 in docs) docTotal += docs[k2];
        document.getElementById('stat-total').textContent = (piiTotal + docTotal).toLocaleString();

        // PII bar chart
        var piiLabels = ['Emails','Phones','SSNs','Names','Addresses','DOBs','Cards','MRNs','IPs'];
        var piiData = [pii.emails, pii.phones, pii.ssns, pii.names, pii.addresses, pii.dobs, pii.cards, pii.mrns, pii.ips];
        makeBarChart('chart-pii', piiLabels, piiData, PII_COLORS);

        // Docs doughnut chart
        var docLabels = ['Plain Text','DOCX','PDF','XLSX','PPTX','CSV'];
        var docData = [docs.txt, docs.docx, docs.pdf, docs.xlsx, docs.pptx, docs.csv];
        makeDoughnutChart('chart-docs', docLabels, docData, DOC_COLORS);

        // Detail line charts are rendered on demand
        detailsRendered = false;
        cachedStats = stats;
    }

    var detailsRendered = false;
    var cachedStats = null;

    function renderDetailCharts() {
        if (detailsRendered) return;
        detailsRendered = true;
        var h = (cachedStats && cachedStats.history) ? cachedStats.history : defaultStats().history;

        // PII detail line charts
        var piiKeys = ['emails','phones','ssns','names','addresses','dobs','cards','mrns','ips'];
        piiKeys.forEach(function (key, i) {
            makeLineChart('chart-detail-' + key, h[key] || [0,0,0,0,0,0,0], PII_COLORS[i % PII_COLORS.length]);
        });

        // Doc detail line charts
        var docKeys = ['txt','docx','pdf','xlsx','pptx','csv'];
        docKeys.forEach(function (key, i) {
            makeLineChart('chart-detail-' + key, h[key] || [0,0,0,0,0,0,0], DOC_COLORS[i % DOC_COLORS.length]);
        });
    }

    // ── Google Sign-In callback ──

    window.handleGoogleSignIn = function (response) {
        // Decode the JWT payload (middle segment)
        var payload = JSON.parse(atob(response.credential.split('.')[1]));
        var user = {
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
            sub: payload.sub
        };
        setSession(user);
        showDashboard(user);
    };

    // ── Confirm dialog helper ──

    function showConfirm(title, message, confirmText, isDanger, onConfirm) {
        var overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        overlay.innerHTML = '<div class="confirm-box">' +
            '<h4>' + title + '</h4>' +
            '<p>' + message + '</p>' +
            '<div class="confirm-btns">' +
                '<button class="confirm-cancel">Cancel</button>' +
                '<button class="' + (isDanger ? 'confirm-danger' : 'confirm-primary') + '">' + confirmText + '</button>' +
            '</div></div>';
        document.body.appendChild(overlay);

        overlay.querySelector('.confirm-cancel').addEventListener('click', function () {
            overlay.remove();
        });
        overlay.querySelector('.' + (isDanger ? 'confirm-danger' : 'confirm-primary')).addEventListener('click', function () {
            overlay.remove();
            onConfirm();
        });
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) overlay.remove();
        });
    }

    // ── Events ──

    document.getElementById('btn-generate').addEventListener('click', function () {
        generateApiKey();
        renderApiKey();
    });

    // Reveal / hide key
    document.getElementById('btn-reveal').addEventListener('click', function () {
        var valueEl = document.getElementById('apikey-value');
        var visible = valueEl.getAttribute('data-visible') === 'true';
        if (visible) {
            valueEl.textContent = '••••••••••••••••••••••••••••••••••••';
            valueEl.classList.add('apikey-hidden');
            valueEl.setAttribute('data-visible', 'false');
            document.getElementById('icon-eye').style.display = '';
            document.getElementById('icon-eye-off').style.display = 'none';
        } else {
            valueEl.textContent = valueEl.getAttribute('data-key');
            valueEl.classList.remove('apikey-hidden');
            valueEl.setAttribute('data-visible', 'true');
            document.getElementById('icon-eye').style.display = 'none';
            document.getElementById('icon-eye-off').style.display = '';
        }
    });

    // Copy key (always copies the real key)
    document.getElementById('btn-copy').addEventListener('click', function () {
        var realKey = document.getElementById('apikey-value').getAttribute('data-key');
        if (!realKey) return;
        navigator.clipboard.writeText(realKey).then(function () {
            var btn = document.getElementById('btn-copy');
            btn.innerHTML = '✓';
            setTimeout(function () {
                btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
            }, 1500);
        });
    });

    // Rotate key
    document.getElementById('btn-rotate').addEventListener('click', function () {
        showConfirm(
            'Rotate API Key?',
            'This will generate a new key and permanently invalidate the current one. Any active integrations using the old key will stop working.',
            'Rotate Key',
            false,
            function () {
                generateApiKey();
                renderApiKey();
            }
        );
    });

    // Delete key
    document.getElementById('btn-delete').addEventListener('click', function () {
        showConfirm(
            'Delete API Key?',
            'This will permanently delete your key. Any active integrations will stop working immediately. You can always generate a new key later.',
            'Delete Key',
            true,
            function () {
                localStorage.removeItem(APIKEY_KEY);
                renderApiKey();
            }
        );
    });

    // Details expand / collapse
    document.getElementById('btn-details').addEventListener('click', function () {
        var section = document.getElementById('details-section');
        var btn = document.getElementById('btn-details');
        var text = document.getElementById('details-text');
        var visible = section.style.display !== 'none';
        if (visible) {
            section.style.display = 'none';
            btn.classList.remove('expanded');
            text.textContent = 'Get more detailed info';
        } else {
            section.style.display = '';
            btn.classList.add('expanded');
            text.textContent = 'Hide detailed info';
            renderDetailCharts();
        }
    });

    navSignout.addEventListener('click', function (e) {
        e.preventDefault();
        clearSession();
        showSignin();
    });

    // ── Init ──

    function initGoogleButton(clientId) {
        google.accounts.id.initialize({
            client_id: clientId,
            callback: window.handleGoogleSignIn,
            context: 'signin',
            ux_mode: 'popup',
            auto_select: false
        });
        google.accounts.id.renderButton(
            document.getElementById('g-signin-btn'),
            { type: 'standard', shape: 'pill', theme: 'outline', text: 'sign_in_with', size: 'large', logo_alignment: 'left' }
        );
    }

    var session = getSession();
    if (session && session.email) {
        showDashboard(session);
    } else {
        showSignin();
        fetch('/api/v1/config')
            .then(function (r) { return r.json(); })
            .then(function (cfg) {
                if (!cfg.googleClientId) return;
                // GSI script is loaded synchronously, but guard just in case
                if (typeof google !== 'undefined' && google.accounts) {
                    initGoogleButton(cfg.googleClientId);
                } else {
                    // Poll until GSI is ready (fallback)
                    var tries = 0;
                    var poll = setInterval(function () {
                        tries++;
                        if (typeof google !== 'undefined' && google.accounts) {
                            clearInterval(poll);
                            initGoogleButton(cfg.googleClientId);
                        } else if (tries > 50) {
                            clearInterval(poll);
                            console.error('Google Sign-In library failed to load');
                        }
                    }, 100);
                }
            })
            .catch(function (err) {
                console.error('Failed to load config:', err);
            });
    }

    // ── Email/Password Form ──
    var signinForm = document.getElementById('signin-form');
    var signinToggle = document.getElementById('signin-toggle-login');
    var isLoginMode = false;

    if (signinToggle) {
        signinToggle.addEventListener('click', function (e) {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            var nameField = document.getElementById('signin-name').closest('.signin-field');
            var submitBtn = signinForm.querySelector('.signin-submit');
            var noteEl = signinForm.querySelector('.signin-form-note');
            if (isLoginMode) {
                nameField.style.display = 'none';
                document.getElementById('signin-name').removeAttribute('required');
                document.getElementById('signin-password').placeholder = 'Enter your password';
                document.getElementById('signin-password').setAttribute('autocomplete', 'current-password');
                submitBtn.textContent = 'Sign In';
                noteEl.innerHTML = 'Don\u2019t have an account? <a href="#" id="signin-toggle-login" class="signin-toggle-link">Create one</a>';
            } else {
                nameField.style.display = '';
                document.getElementById('signin-name').setAttribute('required', '');
                document.getElementById('signin-password').placeholder = 'Create a password';
                document.getElementById('signin-password').setAttribute('autocomplete', 'new-password');
                submitBtn.textContent = 'Create Account';
                noteEl.innerHTML = 'Already have an account? <a href="#" id="signin-toggle-login" class="signin-toggle-link">Sign in</a>';
            }
            // Rebind the toggle link since innerHTML replaces it
            document.getElementById('signin-toggle-login').addEventListener('click', arguments.callee.bind(this));
        });
    }

    if (signinForm) {
        signinForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var name = document.getElementById('signin-name').value.trim();
            var email = document.getElementById('signin-email').value.trim();
            if (!email) return;
            // For login mode, use email as name fallback
            var user = {
                name: name || email.split('@')[0],
                email: email,
                picture: ''
            };
            saveSession(user);
            showDashboard(user);
        });
    }
})();
