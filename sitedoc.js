/* =========================================================================
   sitedoc.js — client-side "download this page as a document" generator.

   Nothing is pre-generated or committed: when the visitor clicks the button,
   this script reads the CURRENT content of the page (including sections that
   were live-embedded from other pages) and builds the file in the browser —
   the same approach as the .txt download on the publications page.

   - Word (.docx): built with the open-source `docx` library, lazy-loaded
     from a CDN only when the button is first clicked (~250 KB gzipped).
     If the CDN cannot be reached, it automatically falls back to .txt.
   - Plain text (.txt): no dependencies at all.

   Used by index.html and about.html. Each page calls:
       SiteDoc.init({ baseName: '...', note: '...' });
   inside a section containing #dlDocx, #dlTxt and #dlStatus elements.
   ========================================================================= */
(function (global) {
    'use strict';

    /* ---------------- palette (matches style.css) ---------------- */
    var PLUM = '4A2545', PLUM2 = '6B2D5C', GOLD = 'B8860B',
        INK = '2D1B2E', GREY = '666666';

    /* =====================================================================
       1. EXTRACTION — walk the first .container of the page in document
          order and turn the known building blocks into a neutral list of
          "blocks". Unknown decorative elements are simply skipped.
       ===================================================================== */

    // Components that are handled as a whole (their inner <p>/<span>s must
    // not be re-processed by the generic handlers).
    var COMPONENTS = '.profile-hero, .stats-banner, .stats-bar, .awards-stats, ' +
        '.profile-card, .timeline-row, .mentor-card, .membership-row, ' +
        '.cert-row, .review-row, .skill-row, .contact-row, .pillar-card, ' +
        '.pub-item, .award-card';

    // Everything the walker reacts to, in one selector (document order).
    var WALK = COMPONENTS + ', .tag, h3.category-title, .year-divider, p';

    // Areas that must never contribute content.
    var EXCLUDE = '.download-section, .explore-card, .year-filter, ' +
        '.award-gallery, #lightbox, header, footer, nav';

    function txt(el) {
        return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
    }

    // Like txt(), but turns <br> into ", " so lines don't run together.
    function txtBr(el) {
        if (!el) return '';
        var clone = el.cloneNode(true);
        var brs = clone.querySelectorAll('br');
        for (var i = 0; i < brs.length; i++) {
            brs[i].parentNode.replaceChild(clone.ownerDocument.createTextNode(', '), brs[i]);
        }
        return txt(clone);
    }

    // textContent of `el` minus the text of children matching `sel`.
    function txtWithout(el, sel) {
        var clone = el.cloneNode(true);
        var kill = clone.querySelectorAll(sel);
        for (var i = 0; i < kill.length; i++) kill[i].parentNode.removeChild(kill[i]);
        return txt(clone);
    }

    function extract(doc, cfg) {
        var root = doc.querySelector('body > div.container') ||
                   doc.querySelector('.container');
        var blocks = [];
        if (!root) return blocks;

        var els = root.querySelectorAll(WALK);
        for (var i = 0; i < els.length; i++) {
            var el = els[i];
            if (el.closest(EXCLUDE)) continue;

            // Skip elements nested inside an already-handled component.
            var comp = el.closest(COMPONENTS);
            if (comp && comp !== el) continue;

            /* ---- hero (name + tagline + intro paragraphs) ---- */
            if (el.matches('.profile-hero')) {
                var paras = [];
                var ps = el.querySelectorAll('.profile-info p:not(.tagline)');
                for (var j = 0; j < ps.length; j++) paras.push(txt(ps[j]));
                blocks.push({ t: 'hero',
                    name: txt(el.querySelector('h1')),
                    tagline: txt(el.querySelector('.tagline')),
                    paras: paras });
                continue;
            }

            /* ---- stats banners / bars → one summary line ---- */
            if (el.matches('.stats-banner, .stats-bar, .awards-stats')) {
                var parts = [], stats = el.querySelectorAll('.stat, .stat-item');
                for (var k = 0; k < stats.length; k++) {
                    var num = txt(stats[k].querySelector('.stat-num'));
                    var lab = txt(stats[k].querySelector('.stat-label'));
                    if (num && lab) parts.push(num + ' ' + lab);
                }
                if (parts.length) blocks.push({ t: 'stats', text: parts.join('  \u00b7  ') });
                continue;
            }

            /* ---- academic profile cards (Scopus / WoS / Scholar) ---- */
            if (el.matches('.profile-card')) {
                var pparts = [], pst = el.querySelectorAll('.profile-stat');
                for (var m = 0; m < pst.length; m++) {
                    pparts.push(txt(pst[m].querySelector('.num')) + ' ' +
                                txt(pst[m].querySelector('.label')));
                }
                blocks.push({ t: 'kv', k: txt(el.querySelector('.profile-platform')),
                              v: pparts.join(' \u00b7 ') });
                continue;
            }

            /* ---- section / sub-section headings ---- */
            if (el.matches('.tag')) {
                var tag = txt(el);
                if (/^Explore More$/i.test(tag)) continue;   // link cards only
                blocks.push({ t: 'h1', text: tag });
                continue;
            }
            if (el.matches('h3.category-title') || el.matches('.year-divider')) {
                blocks.push({ t: 'h2', text: txt(el) });
                continue;
            }

            /* ---- repeated entry types ---- */
            if (el.matches('.timeline-row')) {
                blocks.push({ t: 'item', date: txt(el.querySelector('.timeline-date')),
                    title: txt(el.querySelector('.timeline-text strong')),
                    sub: txt(el.querySelector('.timeline-text .sub')) });
                continue;
            }
            if (el.matches('.cert-row')) {
                blocks.push({ t: 'item', date: txt(el.querySelector('.cert-year')),
                    title: txt(el.querySelector('.cert-info strong')),
                    sub: txt(el.querySelector('.cert-info .sub')) });
                continue;
            }
            if (el.matches('.membership-row')) {
                blocks.push({ t: 'item',
                    date: txt(el.querySelector('.period')),
                    title: txtWithout(el.querySelector('.role'), '.period'),
                    sub: txt(el.querySelector('.org')) });
                continue;
            }
            if (el.matches('.review-row')) {
                // "#N" is a <span class="item-number"> glued to the text
                // (the gap on screen is CSS margin only) — read it separately.
                var strongEl = el.querySelector('strong');
                blocks.push({ t: 'item',
                    num: txt(el.querySelector('.item-number')),
                    title: strongEl ? txtWithout(strongEl, '.item-number') : '',
                    sub: txt(el.querySelector('.sub')) });
                continue;
            }
            if (el.matches('.mentor-card')) {
                blocks.push({ t: 'item',
                    title: txt(el.querySelector('.mentor-name')),
                    date: txt(el.querySelector('.mentor-role')),
                    sub: txt(el.querySelector('.mentor-title')),
                    sub2: txtBr(el.querySelector('.mentor-affiliation')) });
                continue;
            }
            if (el.matches('.skill-row')) {
                blocks.push({ t: 'kv', k: txtWithout(el, '.level'),
                              v: txt(el.querySelector('.level')) });
                continue;
            }
            if (el.matches('.contact-row')) {
                blocks.push({ t: 'kv', k: txt(el.querySelector('strong')),
                              v: txt(el.querySelector('a')) || txtWithout(el, 'strong') });
                continue;
            }
            if (el.matches('.pillar-card')) {
                blocks.push({ t: 'item', title: txt(el.querySelector('.pillar-title')),
                    sub: txt(el.querySelector('.pillar-brief')) });
                continue;
            }
            if (el.matches('.pub-item')) {
                var titleEl = el.querySelector('.pub-title');
                var badges = [], bs = el.querySelectorAll('.pub-title .badge');
                for (var b = 0; b < bs.length; b++) badges.push(txt(bs[b]));
                // The page script injects "#N" as a <span class="pub-number">
                // glued directly to the title (spacing is CSS-only), so read
                // it separately and strip it from the title text.
                var num = txt(el.querySelector('.pub-title .pub-number'));
                var linkEl = el.querySelector('.pub-actions a');
                var href = linkEl ? (linkEl.getAttribute('href') || '') : '';
                if (href && href.charAt(0) !== '#' && !/^https?:\/\//i.test(href)) {
                    href = 'https://rospawan.github.io/' + href.replace(/^\.?\//, '');
                }
                blocks.push({ t: 'pub',
                    num: num,
                    title: titleEl ? txtWithout(titleEl, '.badge, .pub-number') : '',
                    badges: badges,
                    authors: txt(el.querySelector('.pub-authors')),
                    venue: txt(el.querySelector('.pub-venue')),
                    link: href });
                continue;
            }
            if (el.matches('.award-card')) {
                blocks.push({ t: 'item', title: txt(el.querySelector('.award-title')),
                    sub: txt(el.querySelector('.award-venue')) });
                continue;
            }

            /* ---- plain paragraphs (intros, notes, skills software line) ---- */
            if (el.matches('p')) {
                if (el.matches('.embed-loading, .result-count, .download-sub, ' +
                               '.explore-brief, .pillar-brief, .section-subtitle-skip')) continue;
                var ptext = txt(el);
                if (!ptext || /^Loading /i.test(ptext)) continue;
                blocks.push({ t: 'p', text: ptext, strong: !!el.querySelector('strong') &&
                              ptext === txt(el.querySelector('strong')) });
                continue;
            }
        }
        return blocks;
    }

    /* =====================================================================
       2. PLAIN-TEXT OUTPUT (no dependencies)
       ===================================================================== */
    function toText(blocks, cfg) {
        var L = [], today = new Date().toISOString().slice(0, 10);
        L.push('=====================================================');
        L.push('ALI ROSPAWAN \u2014 ' + cfg.docTitle.toUpperCase());
        L.push('=====================================================');
        L.push('');
        L.push('NOTE: ' + cfg.note);
        L.push('Generated on ' + today + ' from https://rospawan.github.io/');
        L.push('');
        blocks.forEach(function (bl) {
            switch (bl.t) {
                case 'hero':
                    L.push(bl.name);
                    L.push(bl.tagline);
                    L.push('');
                    bl.paras.forEach(function (p) { L.push(p); L.push(''); });
                    break;
                case 'h1':
                    L.push(''); L.push('');
                    L.push('=====================================================');
                    L.push(bl.text.toUpperCase());
                    L.push('=====================================================');
                    break;
                case 'h2':
                    var bar = ''; for (var d2 = 0; d2 < bl.text.length + 8; d2++) bar += '-';
                    L.push('');
                    L.push('  ' + bar);
                    L.push('  --- ' + bl.text + ' ---');
                    L.push('  ' + bar);
                    L.push('');
                    break;
                case 'item':
                    L.push('  ' + (bl.num ? bl.num + ' ' : '') +
                           (bl.date ? '[' + bl.date + '] ' : '') + (bl.title || ''));
                    if (bl.sub) L.push('      ' + bl.sub);
                    if (bl.sub2) L.push('      ' + bl.sub2);
                    break;
                case 'pub':
                    L.push('  ' + (bl.num ? bl.num + ' ' : '') + bl.title +
                        (bl.badges.length ? '  [' + bl.badges.join('] [') + ']' : ''));
                    if (bl.authors) L.push('      ' + bl.authors);
                    if (bl.venue) L.push('      ' + bl.venue);
                    if (bl.link) L.push('      ' + bl.link);
                    L.push('');
                    break;
                case 'kv': L.push('  ' + bl.k + ': ' + bl.v); break;
                case 'stats': L.push('  ' + bl.text); break;
                case 'p': L.push(bl.text); L.push(''); break;
            }
        });
        L.push('');
        L.push('--- End of document \u00b7 auto-generated from rospawan.github.io ---');
        return L.join('\r\n');
    }

    /* =====================================================================
       3. WORD (.docx) OUTPUT — needs the `docx` library (window.docx)
       ===================================================================== */
    function buildDocx(blocks, cfg, D) {
        var FONT = { ascii: 'Calibri', hAnsi: 'Calibri', cs: 'Calibri',
                     eastAsia: 'Noto Sans CJK TC' };
        function run(t, o) {
            o = o || {};
            return new D.TextRun({ text: t, font: FONT, size: o.size || 19,
                bold: o.bold, italics: o.italics, color: o.color || INK });
        }
        function para(opts) { return new D.Paragraph(opts); }
        var kids = [], today = new Date().toISOString().slice(0, 10);

        blocks.forEach(function (bl, idx) {
            switch (bl.t) {
                case 'hero':
                    kids.push(para({ spacing: { after: 40 },
                        children: [run(bl.name, { bold: true, size: 48, color: PLUM })] }));
                    kids.push(para({ spacing: { after: 160 },
                        children: [run(bl.tagline, { bold: true, size: 21, color: GOLD })] }));
                    // note box straight after the hero
                    kids.push(noteBox());
                    bl.paras.forEach(function (p) {
                        kids.push(para({ alignment: D.AlignmentType.JUSTIFIED,
                            spacing: { before: 120, after: 40 }, children: [run(p)] }));
                    });
                    break;
                case 'h1':
                    kids.push(para({ spacing: { before: 280, after: 100 },
                        border: { bottom: { style: D.BorderStyle.SINGLE, size: 12,
                                            color: GOLD, space: 2 } },
                        children: [run(bl.text.toUpperCase(), { bold: true, size: 24, color: PLUM })] }));
                    break;
                case 'h2':
                    // Shaded band (same light-plum as the site's section chips)
                    // so category and year separators stand out from the items.
                    kids.push(para({ spacing: { before: 220, after: 100 },
                        shading: { type: D.ShadingType.CLEAR, fill: 'EDE7F0' },
                        border: { left: { style: D.BorderStyle.SINGLE, size: 18,
                                          color: PLUM2, space: 4 } },
                        indent: { left: 60 },
                        children: [run('  ' + bl.text + '  ',
                            { bold: true, size: 20, color: PLUM })] }));
                    break;
                case 'item':
                    var line = [];
                    if (bl.num) line.push(run(bl.num + '  ', { bold: true, size: 16, color: PLUM2 }));
                    if (bl.date) line.push(run(bl.date + '   ', { bold: true, size: 17, color: GOLD }));
                    line.push(run(bl.title || '', { bold: true }));
                    kids.push(para({ spacing: { before: 60, after: 10 }, children: line }));
                    if (bl.sub) kids.push(para({ indent: { left: 280 }, spacing: { after: 10 },
                        children: [run(bl.sub, { size: 18, color: GREY })] }));
                    if (bl.sub2) kids.push(para({ indent: { left: 280 }, spacing: { after: 10 },
                        children: [run(bl.sub2, { size: 18, color: GREY })] }));
                    break;
                case 'pub':
                    var tl = [];
                    if (bl.num) tl.push(run(bl.num + '  ', { bold: true, size: 16, color: PLUM2 }));
                    tl.push(run(bl.title, { bold: true, size: 18 }));
                    bl.badges.forEach(function (b) {
                        tl.push(run('  [' + b + ']', { bold: true, size: 15, color: GOLD }));
                    });
                    kids.push(para({ spacing: { before: 80, after: 10 }, children: tl }));
                    if (bl.authors) kids.push(para({ indent: { left: 280 }, spacing: { after: 10 },
                        children: [run(bl.authors, { size: 17, color: GREY })] }));
                    var vr = [];
                    if (bl.venue) vr.push(run(bl.venue, { italics: true, size: 17, color: GREY }));
                    if (bl.link) vr.push(run((bl.venue ? '  \u2014  ' : '') + bl.link,
                        { size: 16, color: GOLD }));
                    if (vr.length) kids.push(para({ indent: { left: 280 },
                        spacing: { after: 40 }, children: vr }));
                    break;
                case 'kv':
                    kids.push(para({ spacing: { before: 40, after: 40 },
                        children: [run(bl.k + '  \u2014  ', { bold: true, size: 18, color: PLUM2 }),
                                   run(bl.v, { size: 18 })] }));
                    break;
                case 'stats':
                    kids.push(para({ spacing: { before: 60, after: 60 },
                        children: [run(bl.text, { bold: true, size: 18, color: GOLD })] }));
                    break;
                case 'p':
                    kids.push(para({ alignment: D.AlignmentType.JUSTIFIED,
                        spacing: { before: 40, after: 60 }, children: [run(bl.text)] }));
                    break;
            }
        });

        function noteBox() {
            var none = { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
            return new D.Table({
                width: { size: 10106, type: D.WidthType.DXA },
                columnWidths: [10106],
                borders: { top: none, bottom: none, right: none,
                           insideHorizontal: none, insideVertical: none,
                           left: { style: D.BorderStyle.SINGLE, size: 24, color: GOLD } },
                rows: [new D.TableRow({ children: [new D.TableCell({
                    width: { size: 10106, type: D.WidthType.DXA },
                    shading: { type: D.ShadingType.CLEAR, fill: 'F5F4F0' },
                    margins: { top: 120, bottom: 120, left: 220, right: 220 },
                    children: [
                        para({ spacing: { after: 40 },
                            children: [run('ABOUT THIS DOCUMENT', { bold: true, size: 16, color: PLUM })] }),
                        para({ children: [run(cfg.note + ' Generated on ' + today +
                            ' from https://rospawan.github.io/', { size: 17, color: GREY })] }),
                    ],
                })] })],
            });
        }
        // If the page had no hero (e.g. an embed failed), still lead with the note.
        if (!blocks.length || blocks[0].t !== 'hero') kids.unshift(noteBox());

        return new D.Document({
            creator: 'rospawan.github.io',
            title: 'Ali Rospawan \u2014 ' + cfg.docTitle + ' (auto-generated, not a CV)',
            styles: { default: { document: { run: { font: FONT, size: 19, color: INK } } } },
            sections: [{
                properties: { page: {
                    size: { width: 11906, height: 16838 },        // A4
                    margin: { top: 900, bottom: 900, left: 900, right: 900 } } },
                footers: { default: new D.Footer({ children: [para({
                    tabStops: [{ type: D.TabStopType.RIGHT, position: 10106 }],
                    border: { top: { style: D.BorderStyle.SINGLE, size: 4,
                                     color: 'DDDDDD', space: 2 } },
                    children: [
                        run('Ali Rospawan \u00b7 Auto-generated from rospawan.github.io \u00b7 Not a formal CV',
                            { size: 15, color: GREY }),
                        new D.TextRun({ text: '\t', font: FONT }),
                        new D.TextRun({ children: ['Page ', D.PageNumber.CURRENT],
                            font: FONT, size: 15, color: GREY }),
                    ] })] }) },
                children: kids,
            }],
        });
    }

    /* =====================================================================
       4. BROWSER GLUE — lazy CDN loading, blob download, button wiring
       ===================================================================== */
    var DOCX_SOURCES = [
        'https://cdn.jsdelivr.net/npm/docx@9.6.1/dist/index.iife.js',
        'https://unpkg.com/docx@9.6.1/dist/index.iife.js',
    ];
    var docxPromise = null;

    function loadDocxLib() {
        if (global.docx) return Promise.resolve(global.docx);
        if (docxPromise) return docxPromise;
        docxPromise = new Promise(function (resolve, reject) {
            (function tryNext(i) {
                if (i >= DOCX_SOURCES.length) { docxPromise = null; reject(new Error('cdn')); return; }
                var s = document.createElement('script');
                s.src = DOCX_SOURCES[i];
                s.onload = function () {
                    if (global.docx) resolve(global.docx);
                    else tryNext(i + 1);
                };
                s.onerror = function () { s.remove(); tryNext(i + 1); };
                document.head.appendChild(s);
            })(0);
        });
        return docxPromise;
    }

    function saveBlob(blob, filename) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    }

    function init(cfg) {
        var docxBtn = document.getElementById('dlDocx');
        var txtBtn  = document.getElementById('dlTxt');
        var status  = document.getElementById('dlStatus');

        function say(msg) { if (status) { status.textContent = msg; status.hidden = !msg; } }

        function downloadTxt() {
            var blocks = extract(document, cfg);
            var blob = new Blob(['\uFEFF' + toText(blocks, cfg)],
                { type: 'text/plain;charset=utf-8' });
            saveBlob(blob, cfg.baseName + '.txt');
        }

        if (txtBtn) txtBtn.addEventListener('click', function () { say(''); downloadTxt(); });

        if (docxBtn) docxBtn.addEventListener('click', function () {
            var label = docxBtn.querySelector('.btn-dl-label');
            var orig = label ? label.textContent : '';
            if (label) label.textContent = 'Preparing\u2026';
            docxBtn.setAttribute('disabled', 'disabled');
            say('');
            loadDocxLib().then(function (D) {
                var blocks = extract(document, cfg);
                return D.Packer.toBlob(buildDocx(blocks, cfg, D)).then(function (blob) {
                    saveBlob(blob, cfg.baseName + '.docx');
                });
            }).catch(function () {
                say('The Word generator could not be loaded (offline or CDN blocked), ' +
                    'so a plain-text version was downloaded instead.');
                downloadTxt();
            }).then(function () {
                if (label) label.textContent = orig;
                docxBtn.removeAttribute('disabled');
            });
        });
    }

    global.SiteDoc = { extract: extract, toText: toText, buildDocx: buildDocx, init: init };

})(typeof window !== 'undefined' ? window : globalThis);
