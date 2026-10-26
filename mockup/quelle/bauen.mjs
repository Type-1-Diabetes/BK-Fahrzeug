// Baut aus web/ eine einzelne Mockup-Datei: echte CSS, JS und Module, nur api.js durch Testdaten ersetzt.
// Aufruf im Repo-Ordner: node mockup/quelle/bauen.mjs [ziel] [skill]  → mockup/ui-1zu1.html
// Mit skill werden mockup/quelle/skill-<skill>.css und .js als Schicht obendrauf gelegt.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const web = p => readFileSync(new URL('../../web/' + p, import.meta.url), 'utf8');
const bild = p => 'data:image/png;base64,' + readFileSync(new URL('../../web/' + p, import.meta.url)).toString('base64');
const MODULE = [...web('js/module-liste.js').matchAll(/name: '(\w+)'/g)].map(m => m[1]);
const LIBS = ['js/lib/pwa.js', 'js/lib/alert-dialog.js', 'js/lib/ui-helpers.js', 'js/lib/settings-layout.js', 'js/dom.js', 'js/icons.js'];
const NACH = ['js/warteschlange.js', 'js/auswahl.js', 'js/fristen.js', 'js/formular.js', 'js/mac.js', 'js/module-liste.js'];

const css = ['css/basis.css', 'css/komponenten.css', ...MODULE.map(n => `modules/${n}/${n}.css`)].map(web).join('\n');
const html = Object.fromEntries(MODULE.map(n => [n, web(`modules/${n}/${n}.html`)]));
const bilder = s => s.replaceAll("'icons/logo-256.png'", `'${bild('icons/logo-256.png')}'`).replaceAll("'icons/banner.png'", `'${bild('icons/banner.png')}'`);
// app.js übernimmt die vorab angemeldeten Module, statt sie nachzuladen
const app = web('js/app.js').replace('const module = {};', 'const module = BK._vorab;');
if (app === web('js/app.js')) throw new Error('app.js: Stelle „const module = {};“ nicht gefunden');

const vorab = `window.BK_CONFIG = { url: '', key: '', version: 'mockup', vapid: '' };
window.BK = { _vorab: {} }; BK.modul = (n, d) => { BK._vorab[n] = d; };
const _html = ${JSON.stringify(html)};
const _fetch = window.fetch;
window.fetch = (u, o) => { const m = String(u).match(/^modules\\/(\\w+)\\/\\1\\.html/); return m ? Promise.resolve(new Response(_html[m[1]] || '')) : _fetch(u, o); };`;
const nachPwa = `window.pwaIsStandalone = () => true;`;
// Ansicht wechseln: nur im Mockup, unten links
const wahl = `(function () {
  const a = new URLSearchParams(location.search).get('ansicht') || 'tablet';
  const n = document.createElement('nav'); n.className = 'mockup-wahl';
  [['tablet', 'Tablet'], ['mpg', 'MPGler'], ['admin', 'Admin']].forEach(([k, t]) => {
    const l = document.createElement('a'); l.href = '?ansicht=' + k; l.textContent = t; if (k === a) l.className = 'on'; n.append(l); });
  document.body.append(n);
})();`;
const wahlCss = `.mockup-wahl{position:fixed;right:8px;bottom:8px;z-index:9999;display:flex;gap:2px;padding:3px;border-radius:9px;background:rgba(0,0,0,.72);font:600 12px/1 system-ui}
.mockup-wahl a{color:#fff;text-decoration:none;padding:6px 10px;border-radius:6px;opacity:.7}.mockup-wahl a.on{background:rgba(255,255,255,.2);opacity:1}`;

const js = [vorab, web('js/lib/pwa.js'), nachPwa, ...LIBS.slice(1).map(web), readFileSync(new URL('testdaten-api.js', import.meta.url), 'utf8'),
  ...NACH.map(web), ...MODULE.map(n => web(`modules/${n}/${n}.js`)), app, wahl].map(bilder).join('\n;\n');
const kopf = web('index.html').match(/<head>([\s\S]*?)<\/head>/)[1]
  .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>\n?/, '').replace(/<link[^>]*>\n?/g, '');

const ziel = process.argv[2] || 'mockup/ui-1zu1.html';
const skill = process.argv[3];
const schicht = t => { const u = new URL(`skill-${skill}.${t}`, import.meta.url); return skill && existsSync(u) ? readFileSync(u, 'utf8') : ''; };
writeFileSync(ziel, `<!doctype html>
<html lang="de">
<head>${kopf}<style>
${css}
${wahlCss}
${schicht('css')}
</style>
</head>
<body>
<!-- Mockup 1:1 aus web/ (gebaut mit mockup/quelle/bauen.mjs). Nur Testdaten, kein Server. Ansicht: ?ansicht=tablet | mpg | admin -->
<div id="app" aria-live="polite"></div>
<script>
${js.replaceAll('</script', '<\\/script')}
;
${schicht('js')}
</script>
</body>
</html>
`);
console.log('geschrieben:', ziel, MODULE.length, 'Module');
