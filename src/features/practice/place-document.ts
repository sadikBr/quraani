import { withAlpha } from '@/features/quran-reader/colors';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { sliceTajweed, tajweedColor, type TajweedSurah } from '@/features/quran-reader/utils/tajweed';
import { t } from '@/i18n';
import type { AyahView, PlaceView } from './place-view';

const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A view's ayahs with their ids in the document: before, recited, the cue («ما قبلها»), after. */
const ayahIds = (view: PlaceView) => [
  ...view.before.map((a, i) => [`b${i}`, a] as const), ...view.text.map((a, i) => [`t${i}`, a] as const),
  ...(view.cue ? [['c0', view.cue] as const] : []), ...view.after.map((a, i) => [`a${i}`, a] as const),
];

/**
 * A place with the tajweed colours, as a web document, as the reader shows them: a browser shapes
 * an ayah whole across its colours, where React Native on Android would cut its letters apart at
 * each one. The document holds every ayah of the place, in the reader's size and spacing; what
 * shows of them is applied in place by `placeState`, so revealing a word does not reload the font.
 * Built from any view of the place: only its ayahs are used. `background`: the colour it sits on
 * (the card, or an exam's board), so it is seamless however the web view paints.
 */
export function placeDocument(view: PlaceView, font: string, fontSize: number, lineHeight: number, palette: ReaderPalette, background: string, display: (text: string) => string = (text) => text) {
  const ayah = (id: string, a: AyahView) => `<span class="ayah" id="${id}">${a.words.map((word) => `<span class="w">${escape(display(word))}</span>`).join('')}`
    + `${a.ayah.marker ? `<span class="mk" aria-hidden="true">\u00a0${escape(a.ayah.marker)}</span>` : ''}</span> `;
  const ids = ayahIds(view);
  const group = (prefix: string) => ids.filter(([id]) => id[0] === prefix).map(([id, a]) => ayah(id, a)).join('');
  const hidden = escape(t('practice.session.hidden'));
  const body = [
    view.before.length ? `<p class="ctx">${group('b')}</p>` : '',
    `<p id="text">${group('t')}<span id="more" class="more" aria-hidden="true"> …</span><span id="note" class="sr">${hidden}</span></p>`,
    view.cue ? `<p id="placeholder" class="placeholder"><span aria-hidden="true">…</span><span class="sr">${hidden}</span></p><p id="cue">${group('c')}</p>` : '',
    view.after.length ? `<p class="ctx">${group('a')}</p>` : '',
  ].join('');
  return `<!doctype html><html dir="rtl" lang="ar"><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'"><style>
@font-face{font-family:quran;src:url('${font}') format('truetype');font-display:block}
*{box-sizing:border-box}html,body{margin:0;padding:0;background:${background};overflow:hidden;-webkit-text-size-adjust:100%;-webkit-user-select:none;user-select:none}
main{opacity:0;display:flex;flex-direction:column;gap:10px;font:400 ${fontSize}px/${lineHeight}px quran;color:${palette.foreground};direction:rtl;text-align:center}
p{margin:0}[hidden]{display:none!important}.ctx{opacity:.6}.mk{color:${palette.ornament}}.hl{background:${withAlpha(palette.ornament, 0.2)}}
.more,.placeholder{color:${palette.mutedForeground}}.more{font:400 .8em sans-serif}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
</style></head><body><main>${body}</main><script>
const main=document.querySelector('main'),text=document.getElementById('text');let ready=false,applied=false;
const send=(type,extra={})=>{const data=JSON.stringify({source:'quranni-practice',type,...extra});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(data);else window.parent.postMessage(data,'*')};
function measure(){if(!ready||!applied)return;main.style.opacity='1';send('layout',{height:Math.ceil(main.getBoundingClientRect().height),text:text.hidden?0:Math.ceil(text.getBoundingClientRect().bottom)})}
window.applyQuranState=(s)=>{if(!s||typeof s!=='object'||!Array.isArray(s.ayahs))return;
for(const a of s.ayahs){const el=document.getElementById(a.id);if(!el)continue;
el.querySelectorAll('.w').forEach((w,i)=>{const html=a.words[i];if(typeof html==='string'&&w.dataset.html!==html){w.innerHTML=html;w.dataset.html=html}w.hidden=!(i<a.visible);w.classList.toggle('hl',i<a.marked)});
const mk=el.querySelector('.mk');if(mk)mk.hidden=!a.marker;el.hidden=!a.visible&&!a.marker}
text.hidden=!s.shown;document.getElementById('more').hidden=!s.more;document.getElementById('note').hidden=!s.hidden;
const placeholder=document.getElementById('placeholder');if(placeholder)placeholder.hidden=!s.placeholder;
applied=true;measure()};
window.addEventListener('message',e=>{if(e.source===window.parent&&e.data?.source==='quranni-reader-state')window.applyQuranState(e.data.state)});
document.fonts.load('${fontSize}px quran').then(()=>{ready=true;send('ready');measure()}).catch(()=>send('error'));new ResizeObserver(measure).observe(document.documentElement);
</script></body></html>`;
}

/**
 * What shows of a place's document (see `placeDocument`): each ayah's words in their tajweed
 * colours (`runs` by surah; plain until they load), how many show and are highlighted, and its
 * marker. `ghost` (an exam): dotted rules drawn below stand for the hidden words, not «…».
 */
export function placeState(view: PlaceView, runs: Record<number, TajweedSurah>, dark: boolean, palette: ReaderPalette, ghost: boolean, display: (text: string) => string = (text) => text) {
  const words = (a: AyahView) => {
    let offset = 0;
    return a.words.map((word) => {
      const start = offset; offset += word.length;
      return sliceTajweed(runs[a.ayah.surahNumber]?.[a.ayah.ayahNumber], a.ayah.text, start, offset)
        .map((run) => `<span style="color:${tajweedColor(run.rule, dark, palette.foreground)}">${escape(display(run.text))}</span>`).join('');
    });
  };
  return JSON.stringify({
    ayahs: ayahIds(view).map(([id, a]) => ({ id, words: words(a), visible: a.visible, marked: a.marked, marker: a.marker })),
    shown: view.shown, more: view.more && !ghost, hidden: view.more, placeholder: !!view.cue && !view.shown && !ghost,
  });
}
