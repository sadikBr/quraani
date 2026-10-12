import type { Ayah, AyahReference } from '@/lib/quranpedia/types';
import type { ReaderPalette } from '../theme';
import type { ReaderTextLayout } from '../types/reader';
import { ayahKey } from './references';
import { ayahWords } from './page-practice';
import { readerTextLineHeight } from './reader-typography';
import { sliceTajweed, tajweedColor, type TajweedSurah } from './tajweed';
import { t } from '@/i18n';

const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The original Unicode string is never reshaped, normalized, or given joiners.
 * One browser text flow shapes across color spans, including combining marks.
 * React Native Android breaks that context between attributed-text fragments. */
/** `display`: the text as the document's font draws it, applied to each piece after it is cut. */
export function tajweedTextState(ayahs: readonly Ayah[], runs: TajweedSurah | undefined, dark: boolean, palette: ReaderPalette, selected: AyahReference | null, visibleWords?: ReadonlyMap<string, number>, display: (text: string) => string = (text) => text) {
  return JSON.stringify(ayahs.map((ayah) => {
    let offset = 0;
    return {
      key: ayahKey(ayah),
      selected: !visibleWords && selected !== null && ayahKey(selected) === ayahKey(ayah),
      visible: visibleWords?.get(ayahKey(ayah)) ?? null,
      words: ayahWords(ayah.text).map((word) => {
        const start = offset; offset += word.length;
        return sliceTajweed(runs?.[ayah.ayahNumber], ayah.text, start, offset)
          .map((run) => `<span style="color:${tajweedColor(run.rule, dark, palette.foreground)}">${escape(display(run.text))}</span>`).join('');
      }),
    };
  }));
}

export function tajweedTextDocument(ayahs: readonly Ayah[], layout: ReaderTextLayout, font: string, fontSize: number, spacious: boolean, palette: ReaderPalette, preview = false, display: (text: string) => string = (text) => text) {
  const interaction = preview ? '' : ' role="button" tabindex="0"';
  const rows = ayahs.map((ayah) => {
    const words = ayahWords(ayah.text).map((word) => `<span class="word">${escape(display(word))}</span>`).join('');
    const verse = `<span class="ayah" data-key="${ayahKey(ayah)}" data-surah="${ayah.surahNumber}" data-ayah="${ayah.ayahNumber}"><span class="verse"${interaction}>${words}</span>\u00a0<span class="marker"${interaction} aria-label="${escape(t(preview ? 'reader.tajweed.ayah' : 'reader.tajweed.ayahActions', { ayah: ayah.ayahNumber }))}">${escape(ayah.marker)}</span></span> `;
    return layout === 'flowing' ? verse : `<div class="row">${preview ? '' : `<div class="reference">${ayah.surahNumber}:${ayah.ayahNumber}</div>`}<div class="paragraph">${verse}</div></div>`;
  }).join('');
  // The script fills in each ayah's spoken label whenever its words are hidden or revealed.
  const script = (value: string) => JSON.stringify(value).replace(/</g, '\\u003c');
  const spokenLabel = script(t('reader.ayah.spokenLabel', { surah: '{{surah}}', ayah: '{{ayah}}', text: '{{text}}' }));
  const hiddenLabel = script(t('reader.ayah.hidden'));
  return `<!doctype html><html dir="rtl" lang="ar"><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'"><style>
@font-face{font-family:quran;src:url('${font}') format('truetype');font-display:block}
*{box-sizing:border-box}html,body{margin:0;padding:0;background:${palette.card};color:${palette.foreground};overflow:hidden;-webkit-text-size-adjust:100%;-webkit-user-select:none;user-select:none}main{opacity:0;font:400 ${fontSize}px/${readerTextLineHeight(fontSize, spacious)}px quran;direction:rtl;text-align:justify;text-align-last:center;padding:8px 0;white-space:pre-wrap}.word,.verse,.ayah{display:inline}.hidden{visibility:hidden}.marker{color:${palette.ornament}}.selected{background:${palette.highlight}}.row{padding-bottom:18px;margin-bottom:14px;border-bottom:1px solid ${palette.border}}.row:last-child{margin-bottom:0}.paragraph{padding:8px 0}.reference{display:table;font:500 12px/1.6 sans-serif;padding:3px 10px;margin:0 0 6px auto;color:${palette.secondaryForeground};background:${palette.secondary};border-radius:999px}.verse,.marker{cursor:pointer}.marker:focus-visible,.verse:focus-visible{outline:1px solid ${palette.primary}}
${preview ? 'main{padding:0}.row,.row:last-child,.paragraph{padding:0;margin:0;border:0}.verse,.marker{cursor:default}' : ''}
</style></head><body><main>${rows}</main><script>
const main=document.querySelector('main');let ready=false,applied=false;
const send=(type,extra={})=>{const data=JSON.stringify({source:'quranni-tajweed-text',type,...extra});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(data);else window.parent.postMessage(data,'*')};
function measure(){if(!ready||!applied)return;main.style.opacity='1';send('layout',{height:Math.ceil(main.getBoundingClientRect().height),ayahs:[...document.querySelectorAll('.ayah')].map(a=>({key:a.dataset.key,y:a.getClientRects()[0]?.top??0}))})}
window.applyQuranState=(state)=>{for(const value of state){const ayah=[...document.querySelectorAll('.ayah')].find(a=>a.dataset.key===value.key);if(!ayah)continue;ayah.classList.toggle('selected',value.selected);const words=[...ayah.querySelectorAll('.word')];words.forEach((word,i)=>{if(word.dataset.html!==value.words[i]){word.innerHTML=value.words[i];word.dataset.html=value.words[i]}const hidden=value.visible!==null&&i>=value.visible;word.classList.toggle('hidden',hidden);word.setAttribute('aria-hidden',String(hidden))});const spoken=words.filter((_,i)=>value.visible===null||i<value.visible).map(w=>w.textContent).join('');ayah.querySelector('.verse').setAttribute('aria-label',${spokenLabel}.replace('{{surah}}',()=>ayah.dataset.surah).replace('{{ayah}}',()=>ayah.dataset.ayah).replace('{{text}}',()=>spoken||${hiddenLabel}))}applied=true;measure()};
window.addEventListener('message',e=>{if(e.source===window.parent&&e.data?.source==='quranni-reader-state')window.applyQuranState(e.data.state)});
document.fonts.load('${fontSize}px quran').then(()=>{ready=true;send('ready');measure()}).catch(()=>send('error'));new ResizeObserver(measure).observe(document.documentElement);
if(${!preview}){
let start=null,timer=null,long=false;function clear(){clearTimeout(timer);timer=null}function ref(e){const a=e.target.closest('.ayah');return a?{surah:Number(a.dataset.surah),ayah:Number(a.dataset.ayah)}:{}}
document.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY};long=false;const a=ref(e);if(a.ayah)timer=setTimeout(()=>{long=true;send('select',a)},500)});
document.addEventListener('pointermove',e=>{if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>8)clear()});document.addEventListener('pointercancel',()=>{clear();start=null});
document.addEventListener('pointerup',e=>{clear();if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.5){send('swipe',{delta:dx>0?1:-1});return}if(long||Math.hypot(dx,dy)>8)return;send(e.target.closest('.marker')?'select':'tap',ref(e))});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.marker,.verse')){e.preventDefault();send(e.target.matches('.marker')?'select':'tap',ref(e))}});document.addEventListener('contextmenu',e=>e.preventDefault());
}
</script></body></html>`;
}
