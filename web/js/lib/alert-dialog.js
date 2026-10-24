/* ═══════════════════════════════════════════════════════
   Übernommen aus der Website Schrietz (admin/js/alert-dialog.js).
   ALERT DIALOG — ersetzt window.confirm(), prompt() und alert()
   await confirmDialog('Titel', 'Beschreibung')        → true / false
   await promptDialog('Titel', 'Beschreibung', {value}) → Text / null (Abbruch)
   await alertDialog('Titel', 'Beschreibung')           → nach „OK“
   await speichernDialog('Titel', 'Beschreibung')      → 'speichern' / 'verwerfen' / null (Abbruch)
═══════════════════════════════════════════════════════ */
(function () {
    const HTML = `
    <div id="_adOverlay" class="_ad-overlay" role="alertdialog" aria-modal="true" aria-labelledby="_adTitle" aria-describedby="_adDesc">
        <div class="_ad-box">
            <div class="_ad-header">
                <div class="_ad-title" id="_adTitle"></div>
                <div class="_ad-desc"  id="_adDesc"></div>
                <input id="_adInput" class="_ad-input" type="text" autocomplete="off" aria-labelledby="_adTitle">
            </div>
            <div class="_ad-footer">
                <button type="button" id="_adCancel"  class="_ad-btn-cancel">Abbrechen</button>
                <button type="button" id="_adExtra"   class="_ad-btn-cancel">Nicht speichern</button>
                <button type="button" id="_adConfirm" class="_ad-btn-confirm">Bestätigen</button>
            </div>
        </div>
    </div>`;

    var _adResolve = null;

    function inject() {
        if (document.getElementById('_adOverlay')) return;
        document.body.insertAdjacentHTML('beforeend', HTML);

        // ESC bricht ab
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && document.getElementById('_adOverlay').classList.contains('_ad-open')) {
                if (_adResolve) _adResolve(false);
            }
        });
    }

    // Gemeinsamer Ablauf für alle drei Varianten
    function open(opts) {
        return new Promise(function (resolve) {
            inject();

            var overlay    = document.getElementById('_adOverlay');
            var titleEl    = document.getElementById('_adTitle');
            var descEl     = document.getElementById('_adDesc');
            var inputEl    = document.getElementById('_adInput');
            var cancelBtn  = document.getElementById('_adCancel');
            var confirmBtn = document.getElementById('_adConfirm');
            var extraBtn   = document.getElementById('_adExtra');
            extraBtn.style.display = opts.extra ? '' : 'none';

            titleEl.textContent = opts.title || '';
            descEl.textContent  = opts.desc || '';
            descEl.style.display = opts.desc ? '' : 'none';
            inputEl.style.display = opts.input ? '' : 'none';
            inputEl.value = opts.input ? (opts.value || '') : '';
            inputEl.placeholder = opts.placeholder || '';
            inputEl.type = opts.typ || 'text';  // z. B. password für die PIN
            inputEl.inputMode = opts.inputmode || '';
            inputEl.autocomplete = opts.typ === 'password' ? 'off' : '';
            cancelBtn.style.display = opts.cancel === false ? 'none' : '';
            confirmBtn.textContent = opts.confirmLabel || (opts.cancel === false ? 'OK' : 'Bestätigen');

            overlay.classList.add('_ad-open');
            setTimeout(function () { (opts.input ? inputEl : confirmBtn).focus(); if (opts.input) inputEl.select(); }, 50);

            function cleanup(ok) {
                overlay.classList.remove('_ad-open');
                cancelBtn.removeEventListener('click', onCancel);
                confirmBtn.removeEventListener('click', onConfirm);
                extraBtn.removeEventListener('click', onExtra);
                overlay.removeEventListener('click', onOverlay);
                inputEl.removeEventListener('keydown', onKey);
                _adResolve = null;
                if (opts.input) resolve(ok ? inputEl.value : null);
                else if (opts.extra) resolve(ok === 'extra' ? 'verwerfen' : ok ? 'speichern' : null);
                else resolve(ok);
            }
            function onCancel()  { cleanup(false); }
            function onConfirm() { cleanup(true);  }
            function onExtra()   { cleanup('extra'); }
            function onOverlay(e) { if (e.target === overlay) cleanup(false); }
            function onKey(e) { if (e.key === 'Enter') { e.preventDefault(); cleanup(true); } }

            _adResolve = cleanup;
            cancelBtn.addEventListener('click', onCancel);
            confirmBtn.addEventListener('click', onConfirm);
            extraBtn.addEventListener('click', onExtra);
            overlay.addEventListener('click', onOverlay);
            inputEl.addEventListener('keydown', onKey);
        });
    }

    window.confirmDialog = function (title, description) {
        return open({ title: title, desc: description });
    };
    window.promptDialog = function (title, description, opts) {
        opts = opts || {};
        return open({ title: title, desc: description, input: true, value: opts.value, placeholder: opts.placeholder, confirmLabel: opts.confirmLabel, typ: opts.typ, inputmode: opts.inputmode });
    };
    window.speichernDialog = function (title, description) {
        return open({ title: title, desc: description, extra: true, confirmLabel: 'Speichern' });
    };
    window.alertDialog = function (title, description) {
        return open({ title: title, desc: description, cancel: false });
    };

    // Inject sofort wenn DOM bereit ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inject);
    } else {
        inject();
    }
})();
