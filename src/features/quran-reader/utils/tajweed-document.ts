import type { TajweedLine } from './tajweed';
import type { ReaderPalette } from '../theme';
import { t } from '@/i18n';
export interface TajweedBlock { surah: number; title: string; opens: boolean; lines: TajweedLine[] }
const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Build our own minimal document from validated glyphs. No source scripts/HTML. */
export function tajweedDocument(blocks: TajweedBlock[], font: string, palette: ReaderPalette, dark: boolean, selected: string | null, openingHeights: Record<number, number> = {}) {
  const body = blocks.map((block) => `${block.opens ? `<div data-opening="${block.surah}" style="height:${openingHeights[block.surah] ?? 100}px"></div>` : ''}` + block.lines.map((line) => `<div class="line ${line.centered ? 'centered' : ''}">${line.words.map((w) => {
    const ref = `${w.surah}:${w.ayah}`;
    // Word labels have always started with a space.
    const label = w.marker ? t('reader.tajweed.ayahActions', { ayah: w.ayah }) : ` ${t('reader.tajweed.ayah', { ayah: w.ayah })}`;
    return `<span data-surah="${w.surah}" data-ayah="${w.ayah}" data-marker="${w.marker ? '1' : '0'}"${w.marker ? ' role="button" tabindex="0"' : ''} aria-label="${escape(label)}" class="word ${selected === ref ? 'selected' : ''}">${escape(w.glyph)}</span>`;
  }).join('')}</div>`).join('')).join('');
  return `<!doctype html><html dir="rtl" lang="ar"><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'"><style>
@font-face{font-family:tajweed;src:url('${font}') format('woff2');font-display:block}
@font-palette-values --reader{font-family:tajweed;base-palette:${dark ? 1 : 0};override-colors:0 ${palette.foreground},13 ${palette.foreground}}
*{box-sizing:border-box}html,body{padding:0;margin:0;background:${palette.card};color:${palette.foreground};overflow:hidden;-webkit-user-select:none;user-select:none}main{padding:10px 2px 16px;opacity:0}.line{display:flex;direction:rtl;justify-content:space-between;align-items:baseline;font:32px/1.9 tajweed;font-palette:--reader}.centered{justify-content:center;gap:.22em}.word{flex-shrink:0;white-space:pre;cursor:pointer}.selected{background:${palette.highlight}}.word:focus-visible{outline:1px solid ${palette.primary}}
</style></head><body><main>${body}</main><script>
const send=(type,extra={})=>{const data=JSON.stringify({source:'quranni-tajweed',type,...extra});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(data);else window.parent.postMessage(data,'*')};
const main=document.querySelector('main');let ready=false;
function fit(){if(!ready)return;const lines=[...document.querySelectorAll('.line')];lines.forEach(l=>l.style.fontSize='32px');const widths=lines.map(l=>[...l.children].reduce((n,w)=>n+w.getBoundingClientRect().width,0)+(l.classList.contains('centered')?(l.children.length-1)*7:0));const widest=Math.max(...widths,1);const size=Math.min(46,32*(main.clientWidth-6)/widest);lines.forEach(l=>l.style.fontSize=size+'px');main.style.opacity='1';send('layout',{height:Math.ceil(main.getBoundingClientRect().height),fontSize:size,target:document.querySelector('.selected')?.getBoundingClientRect().top,openings:[...document.querySelectorAll('[data-opening]')].map(n=>({surah:Number(n.dataset.opening),y:n.getBoundingClientRect().top}))});}
document.fonts.load('32px tajweed').then(()=>{ready=true;fit()}).catch(()=>send('error'));new ResizeObserver(fit).observe(document.documentElement);
let start=null,timer=null,long=false;function clear(){clearTimeout(timer);timer=null}
function reference(e){const w=e.target.closest('[data-ayah]');return w?{surah:Number(w.dataset.surah),ayah:Number(w.dataset.ayah)}:{}}
document.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY};long=false;const ref=reference(e);if(ref.ayah)timer=setTimeout(()=>{long=true;send('select',ref)},500)});
document.addEventListener('pointermove',e=>{if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>8)clear()});
document.addEventListener('pointercancel',()=>{clear();start=null});
document.addEventListener('pointerup',e=>{clear();if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.5){send('swipe',{delta:dx>0?1:-1});return}if(long||Math.hypot(dx,dy)>8)return;const marker=e.target.closest('[data-marker="1"]');send(marker?'select':'tap',reference(e))});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-marker="1"]')){e.preventDefault();send('select',reference(e))}});document.addEventListener('contextmenu',e=>e.preventDefault());
</script></body></html>`;
}
