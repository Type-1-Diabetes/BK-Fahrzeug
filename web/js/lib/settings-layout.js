/* ════════════════════════════════════════════════════════
   SETTINGS-LAYOUT — Unter-Navigation, Suche, Speicherleiste
   Übernommen aus der Website Schrietz (admin/js/settings-layout.js).
   Markup: .sl[data-sl="id"] > .sl-nav (.sl-nav-item[data-sl-page]) + .sl-main (.sl-page[data-sl-page])
   CSS: css/komponenten.css
════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const _ctls = {};

    function _store(key, val) {
        try {
            if (val === undefined) return localStorage.getItem(key);
            localStorage.setItem(key, val);
        } catch { return null; }
    }

    // Suche: Groß/klein + Umlaute egal
    function _norm(s) {
        return String(s || '').toLowerCase()
            .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
    }

    function _escText(s) {
        return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    /**
     * Bindet ein .sl-Layout an.
     * opts.onSave()    → async, true bei Erfolg (zeigt Speicherleiste bei Änderungen)
     * opts.onDiscard() → Werte neu laden
     * opts.onShow(page)→ beim Wechsel der Unterseite
     */
    function mount(root, opts) {
        if (!root) return null;
        if (root._sl) { Object.assign(root._sl.opts, opts || {}); return root._sl; }
        opts = opts || {};

        const id    = root.dataset.sl || 'sl';
        const pages = () => Array.from(root.querySelectorAll('.sl-page[data-sl-page]'));
        const items = () => Array.from(root.querySelectorAll('.sl-nav-item[data-sl-page]'));
        const main  = root.querySelector('.sl-main');
        let current = null;
        let isDirty = false;
        let saving  = false;

        const ctl = { root, opts, id };

        ctl.show = function (page, { scroll = true } = {}) {
            if (!root.querySelector(`.sl-page[data-sl-page="${page}"]`)) page = pages()[0]?.dataset.slPage;
            if (!page) return;
            const changed = current !== page;
            current = page;
            pages().forEach(p => p.classList.toggle('active', p.dataset.slPage === page));
            items().forEach(b => {
                const on = b.dataset.slPage === page;
                b.classList.toggle('active', on);
                b.setAttribute('aria-current', on ? 'page' : 'false');
                if (on && window.matchMedia('(max-width: 860px)').matches) {
                    b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
                }
            });
            _store('sl:' + id, page);
            if (changed && scroll) {
                const top = root.getBoundingClientRect().top;
                if (top < 0) window.scrollBy({ top: top - 70, behavior: 'smooth' });
            }
            if (changed && typeof opts.onShow === 'function') opts.onShow(page);
        };
        ctl.current = () => current;

        ctl.led = function (page, state, title) {
            const led = root.querySelector(`.sl-nav-item[data-sl-page="${page}"] .sl-led`);
            if (!led) return;
            led.className = 'sl-led' + (state ? ' ' + state : '');
            if (title !== undefined) led.title = title;
        };

        // ── Navigation ──
        items().forEach(b => b.addEventListener('click', () => {
            if (search && search.value) { search.value = ''; runSearch(''); }
            ctl.show(b.dataset.slPage);
        }));

        // ── Suche ──
        const search = root.querySelector('.sl-search input');
        let info = root.querySelector('.sl-search-info');
        let empty = null;
        if (search && main && !info) {
            info = document.createElement('div');
            info.className = 'sl-search-info';
            main.prepend(info);
        }
        function runSearch(q) {
            const words = _norm(q).trim().split(/\s+/).filter(Boolean);
            if (!words.length) {
                root.classList.remove('sl--searching');
                root.querySelectorAll('.sl-hit, .sl-miss').forEach(el => el.classList.remove('sl-hit', 'sl-miss'));
                items().forEach(b => b.classList.remove('sl-nomatch'));
                if (empty) { empty.remove(); empty = null; }
                return;
            }
            root.classList.add('sl--searching');
            let hits = 0, pageHits = 0;
            pages().forEach(p => {
                const head = _norm((p.dataset.slKeywords || '') + ' ' + (p.querySelector('.sl-page-head')?.textContent || ''));
                const headHit = words.every(w => head.includes(w));
                let pHits = 0;
                p.querySelectorAll('.sl-block').forEach(bl => {
                    const txt = headHit ? '' : _norm((bl.dataset.slKeywords || '') + ' ' + bl.textContent);
                    const hit = headHit || words.every(w => txt.includes(w));
                    bl.classList.toggle('sl-miss', !hit);
                    if (hit) pHits++;
                });
                p.classList.toggle('sl-hit', pHits > 0);
                items().filter(b => b.dataset.slPage === p.dataset.slPage)
                    .forEach(b => b.classList.toggle('sl-nomatch', pHits === 0));
                hits += pHits;
                if (pHits) pageHits++;
            });
            if (info) info.textContent = hits
                ? `${hits} Treffer in ${pageHits} ${pageHits === 1 ? 'Bereich' : 'Bereichen'}`
                : '';
            if (!hits && main) {
                if (!empty) { empty = document.createElement('div'); empty.className = 'sl-empty'; main.appendChild(empty); }
                empty.textContent = `Keine Einstellung zu „${q.trim()}“ gefunden.`;
            } else if (empty) { empty.remove(); empty = null; }
        }
        if (search) {
            search.addEventListener('input', () => runSearch(search.value));
            search.addEventListener('keydown', e => {
                if (e.key === 'Escape') { search.value = ''; runSearch(''); search.blur(); }
                if (e.key === 'Enter') e.preventDefault(); // nicht das umgebende Formular absenden
            });
        }

        // ── Speicherleiste ──
        let bar = null;
        if (typeof opts.onSave === 'function' && main) {
            bar = document.createElement('div');
            bar.className = 'sl-savebar';
            bar.setAttribute('role', 'status');
            bar.innerHTML = `
                <div class="sl-savebar-text">
                    <span>Ungespeicherte Änderungen <small class="sl-savebar-kbd">Strg + S</small></span></div>
                <button type="button" class="pbtn" data-sl-discard>Verwerfen</button>
                <button type="button" class="pbtn def" data-sl-save>Speichern</button>`;
            main.appendChild(bar);
            bar.querySelector('[data-sl-save]').addEventListener('click', () => ctl.save());
            bar.querySelector('[data-sl-discard]').addEventListener('click', async () => {
                if (typeof opts.onDiscard === 'function') await opts.onDiscard();
                ctl.clean();
            });
            const markDirty = e => {
                if (e.target.closest('.sl-search, [data-sl-nodirty]')) return;
                ctl.dirty();
            };
            root.addEventListener('input', markDirty);
            root.addEventListener('change', markDirty);
        }

        ctl.dirty = function () {
            if (!bar) return;
            isDirty = true;
            bar.classList.add('show');
        };
        ctl.clean = function () {
            isDirty = false;
            if (bar) bar.classList.remove('show');
        };
        ctl.isDirty = () => isDirty;
        ctl.save = async function () {
            if (!bar || saving) return;
            saving = true;
            const btn  = bar.querySelector('[data-sl-save]');
            const orig = btn.innerHTML;
            btn.disabled = true;
            btn.textContent = 'Speichern …';
            try {
                const ok = await opts.onSave();
                if (ok !== false) ctl.clean();
            } finally {
                saving = false;
                btn.disabled = false;
                btn.innerHTML = orig;
            }
        };

        root._sl = ctl;
        _ctls[id] = ctl;
        ctl.show(_store('sl:' + id) || root.dataset.slDefault || pages()[0]?.dataset.slPage, { scroll: false });
        return ctl;
    }

    function _visible(el) { return !!(el && el.offsetParent !== null); }

    // Strg/Cmd + S speichert das sichtbare Layout
    document.addEventListener('keydown', e => {
        if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 's') return;
        const ctl = Object.values(_ctls).find(c => _visible(c.root) && c.isDirty());
        if (!ctl) return;
        e.preventDefault();
        ctl.save();
    });

    window.addEventListener('beforeunload', e => {
        if (Object.values(_ctls).some(c => c.isDirty())) { e.preventDefault(); e.returnValue = ''; }
    });

    window.SettingsLayout = {
        mount,
        get: id => _ctls[id] || null,
        anyDirty: () => Object.values(_ctls).some(c => c.isDirty() && _visible(c.root)),
        open(id, page) { const c = _ctls[id]; if (c) c.show(page); },
    };
})();
