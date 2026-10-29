// Gemeinsame Helfer für die Mac-Module (MPGler und Admin)
(function () {
  'use strict';
  const STATUS = { offen: 'Offen', in_bearbeitung: 'In Bearbeitung', erledigt: 'Erledigt' };

  // Inspektor als Blatt (iPad hochkant, Handy): dann nichts von selbst öffnen, sonst verdeckt es die Liste
  const SCHMAL = '(orientation: portrait) and (max-width: 1100px), (max-height: 500px) and (max-width: 1000px)';
  BK.mac = {
    STATUS,
    SCHMAL,
    ersteWahl: l => !matchMedia(SCHMAL).matches && l[0] ? l[0].id : null,
    pill: s => BK.el('span', { class: 'pill mp ' + s }, STATUS[s] || s),
    titel: m => m.art === 'material'
      ? `Materialanforderung: ${m.positionen.length} Artikel`
      : (m.geraet ? m.geraet.name : (m.gegenstand || m.geraet_frei || 'Mangel')),
    kurz: d => {
      const t = new Date(d), heute = new Date();
      const uhr = t.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      if (t.toDateString() === heute.toDateString()) return 'heute ' + uhr;
      if (t.toDateString() === new Date(heute - 864e5).toDateString()) return 'gestern ' + uhr;
      // Selbst zusammensetzen: Browser liefern „01.06.“ oder „01.06“, das gab „01.06.. 10:00“
      return `${String(t.getDate()).padStart(2, '0')}.${String(t.getMonth() + 1).padStart(2, '0')}. ${uhr}`;
    },

    // Fahrzeugstatus setzen. Rot braucht einen Grund, der auf dem Tablet steht.
    async ampelAendern(fz, vorschlag) {
      if (fz.ampel === 'einsatzbereit') {
        const grund = await promptDialog(`${fz.name} nicht einsatzbereit?`, 'Der Grund steht dann groß auf dem Tablet.',
          { value: vorschlag || '', placeholder: 'z. B. Trage: Fahrwerk blockiert', confirmLabel: 'Nicht einsatzbereit' });
        if (grund == null) return false;
        if (!grund.trim()) { await alertDialog('Grund fehlt', 'Bitte kurz schreiben, warum der KTW nicht fahren darf.'); return false; }
        await BK.api.ampelSetzen(fz.id, 'nicht_einsatzbereit', grund.trim().slice(0, 300));
        showToast(`${fz.name} ist nicht einsatzbereit`);
      } else {
        if (!await confirmDialog(`${fz.name} wieder einsatzbereit?`, 'Das Tablet zeigt dann „Der KTW darf fahren.“')) return false;
        await BK.api.ampelSetzen(fz.id, 'einsatzbereit', null);
        showToast(`${fz.name} ist wieder einsatzbereit`);
      }
      return true;
    },

    // Endgültig löschen nach Rückfrage. Gibt true zurück, wenn gelöscht.
    loeschKnopf: (was, aktion, danach) => BK.el('button.pbtn.rot', { type: 'button', onclick: async () => {
      if (!await confirmDialog(`${was} löschen?`, 'Das lässt sich nicht rückgängig machen. Im Verlauf des KTW bleibt ein Eintrag.')) return;
      try { await aktion(); showToast(`${was} gelöscht`); danach(); }
      catch (e) { alertDialog('Nicht gelöscht', e.message); }
    } }, 'Löschen'),

    // Werkzeugleiste: neue Mängelmeldung / Materialanforderung für ein gewähltes KTW (Formular als Blatt)
    neuFuer(modul, text, fahrzeuge, fertig) {
      const s = BK.el('select.tf.auto.neu-fuer', { 'aria-label': text + ' für KTW', title: text + ' für ein KTW anlegen', onchange: async () => {
        const id = s.value; s.value = '';
        if (!id) return;
        try { BK.blatt(modul, await BK.api.fahrzeug(id), fertig); } catch (e) { alertDialog('Hat nicht geklappt', e.message); }
      } }, BK.el('option', { value: '' }, '+ Neu'), ...fahrzeuge.map(f => BK.el('option', { value: f.id }, f.name)));
      return s;
    },

    // Rechte Seitenansicht schließen: Knopf oben rechts und Esc
    zuKnopf: fn => BK.el('button.tb.insp-zu', { type: 'button', title: 'Schließen (Esc)', 'aria-label': 'Schließen', onclick: fn }, BK.icon('x')),
    escZu(root, insp, fn) {
      root.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !insp.classList.contains('zu') && !document.querySelector('.auswahl-liste, .code-overlay, dialog[open]')) fn();
      });
    },

    // Drag & Drop am Griff (Maus und Finger): Zeilen in liste live umsortieren.
    // ziel(x, y) → { el, id } liefert ein Ablageziel außerhalb (z. B. anderer Bereich), sonst null.
    // fertig({ ids }) bei neuer Reihenfolge, fertig({ id, ziel }) beim Ablegen auf ein Ziel.
    sortierbar(liste, { zeilen, griff, ziel, fertig }) {
      liste.addEventListener('pointerdown', e => {
        const g = e.target.closest(griff), zeile = g && g.closest(zeilen);
        if (!zeile || e.button > 0) return;
        e.preventDefault();
        const vorher = [...liste.querySelectorAll(zeilen)].map(z => z.dataset.id);
        const scroller = liste.closest('.tablewrap, .vlist') || liste;
        let gezogen = false, treffer = null, y0 = e.clientY, timer = null, letzteY = e.clientY;
        const bewegen = ev => {
          letzteY = ev.clientY;
          if (!gezogen && Math.abs(ev.clientY - y0) < 4) return;
          if (!gezogen) { gezogen = true; zeile.classList.add('zieht'); document.body.classList.add('am-ziehen'); }
          const t = ziel && ziel(ev.clientX, ev.clientY);
          if ((t && t.el) !== (treffer && treffer.el)) { treffer && treffer.el.classList.remove('ablage'); treffer = t; treffer && treffer.el.classList.add('ablage'); }
          if (treffer) return;
          // Zeile an die Stelle unter dem Finger schieben
          const andere = [...liste.querySelectorAll(zeilen)].filter(z => z !== zeile);
          const nach = andere.find(z => { const r = z.getBoundingClientRect(); return ev.clientY < r.top + r.height / 2; });
          if (nach ? zeile.nextElementSibling !== nach : zeile !== andere[andere.length - 1]?.nextElementSibling) {
            if (nach) nach.before(zeile); else (andere[andere.length - 1] || zeile).after(zeile);
          }
        };
        // Am Rand automatisch scrollen
        const rollen = () => {
          const r = scroller.getBoundingClientRect();
          if (gezogen) scroller.scrollTop += letzteY < r.top + 40 ? -12 : letzteY > r.bottom - 40 ? 12 : 0;
          timer = requestAnimationFrame(rollen);
        };
        timer = requestAnimationFrame(rollen);
        const ende = () => {
          cancelAnimationFrame(timer);
          window.removeEventListener('pointermove', bewegen); window.removeEventListener('pointerup', ende); window.removeEventListener('pointercancel', ende);
          zeile.classList.remove('zieht'); document.body.classList.remove('am-ziehen');
          if (treffer) { treffer.el.classList.remove('ablage'); return fertig({ id: zeile.dataset.id, ziel: treffer.id }); }
          const neu = [...liste.querySelectorAll(zeilen)].map(z => z.dataset.id);
          if (gezogen && neu.join() !== vorher.join()) fertig({ ids: neu });
        };
        // Am Fenster lauschen: die Zeile wandert im DOM, dabei geht die Pointer-Bindung am Griff verloren
        window.addEventListener('pointermove', bewegen); window.addEventListener('pointerup', ende); window.addEventListener('pointercancel', ende);
      });
    },

    // Klick auf Zeile wählt aus, Pfeiltasten wandern (wie Finder-Listen)
    tastatur(tbody, waehlen) {
      tbody.tabIndex = 0;
      tbody.addEventListener('keydown', e => {
        if ((e.key !== 'ArrowDown' && e.key !== 'ArrowUp') || e.altKey) return;
        const zeilen = [...tbody.querySelectorAll('tr[data-id]')];
        const i = zeilen.findIndex(z => z.classList.contains('sel'));
        const neu = zeilen[Math.max(0, Math.min(zeilen.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
        if (neu) { waehlen(neu.dataset.id); neu.scrollIntoView({ block: 'nearest' }); }
        e.preventDefault();
      });
    },
  };

  // Ganze Checkliste wie MPG.doc: Gruppe als Überschrift, Material-Spalte farbig, dann Artikel, Soll, Ist, Ablaufdatum, Wo, Bemerkung
  BK.papierliste = (bereiche, eintraege) => {
    const { el } = BK;
    const abw = new Map((eintraege || []).map(e => [e.position_id, e]));
    const frist = { verfall: 'Ablaufdatum', stk: 'STK', mtk: 'MTK' };
    return el('table.tab.pliste',
      el('thead', el('tr', el('th', 'Material/ Ausstattung'), el('th', 'Artikel, wenn vorhanden SN und Hersteller'),
        el('th.num', 'Anzahl soll'), el('th.num', 'Anzahl ist'), el('th', 'Ablaufdatum, STK/ MTK'), el('th', 'Wo'), el('th', 'Bemerkung'))),
      ...bereiche.map((b, i) => el('tbody',
        b.gruppe && b.gruppe !== (bereiche[i - 1] || {}).gruppe ? el('tr.pl-gruppe', el('td', { colspan: 7 }, b.gruppe)) : null,
        ...b.positionen.map((p, j) => {
          const e = abw.get(p.id);
          const fehlt = e && e.ist != null && e.ist < p.soll;
          const l = BK.lfd(p);
          if (e && e.durchgestrichen) return el('tr.durch',
            j === 0 ? el('td', { class: 'pl-mat ' + (b.farbe || ''), rowspan: b.positionen.length }, b.name) : null,
            el('td.pl-art', el('b', p.artikel)), el('td.num', String(p.soll)), el('td.num', '–'), el('td'), el('td', p.wo || ''),
            el('td', e.bemerkung ? 'Nicht vorhanden · ' + e.bemerkung : 'Nicht vorhanden'));
          if (e && e.nicht_geprueft) return el('tr.nicht-geprueft',
            j === 0 ? el('td', { class: 'pl-mat ' + (b.farbe || ''), rowspan: b.positionen.length }, b.name) : null,
            el('td.pl-art', el('b', p.artikel + (p.optional ? ' (falls vorhanden)' : ''))), el('td.num', String(p.soll)), el('td.num', '?'),
            el('td', l.frist || frist[p.pruefart] || ''), el('td', p.wo || ''), el('td.red', 'Nicht geprüft'));
          return el('tr', { class: e ? 'abw' : null },
            j === 0 ? el('td', { class: 'pl-mat ' + (b.farbe || ''), rowspan: b.positionen.length }, b.name) : null,
            el('td.pl-art', el('b', p.artikel + (p.optional ? ' (falls vorhanden)' : '')), l.text ? el('span', l.text) : null),
            el('td.num', String(p.soll)),
            el('td', { class: 'num' + (fehlt ? ' warnt' : '') }, e && e.ist != null ? String(e.ist) : String(p.soll)),
            el('td', { class: e && e.verfall ? 'warnt' : null }, e && e.verfall ? BK.datum(e.verfall, false) : l.frist || frist[p.pruefart] || ''),
            el('td', p.wo || ''),
            el('td', e ? e.bemerkung || 'Abweichung' : ''));
        }))));
  };

  // Druckblatt wie im Organisationshandbuch: Kopf mit Logo, Titel, Dok. und Version, Fußzeile. Nur im Druck sichtbar.
  BK.druckblatt = ({ bereich, titel }, ...inhalt) => {
    const { el } = BK;
    return el('div.druck',
      el('table.dr-kopf', el('tbody', el('tr',
        el('td.dr-logo', el('img', { src: 'icons/logo-256.png', alt: 'Blauer Kreis' })),
        el('td.dr-titel', el('b', 'Organisationshandbuch'), el('span', bereich), el('u', titel))))),
      ...inhalt);
  };
  // Ankreuzfeld wie auf dem Papier: ○ leer, ● gewählt
  BK.kreuz = (an, text) => BK.el('span.dr-wahl', BK.el('i', { class: an ? 'an' : null }), text);
  // Linie mit Beschriftung, darauf der Wert
  BK.linie = (label, wert) => BK.el('span.dr-linie', BK.el('span', label), BK.el('b', wert || ''));
})();
