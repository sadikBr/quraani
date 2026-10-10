/**
 * Live-state bridges for the tajweed WebView documents.
 *
 * The documents embed a large font as a data URI, so replacing the WebView
 * source re-parses that font and blanks the page. State that changes while
 * reading (selection, measured opening heights, text size) is therefore applied
 * in place through `window.applyQuranState`, which TajweedSurface calls with
 * `injectJavaScript` on native and `postMessage` on web.
 */
const insertBeforeBodyEnd = (html: string, script: string) => {
  const end = html.lastIndexOf('</body>');
  return end < 0 ? html + script : html.slice(0, end) + script + html.slice(end);
};

export interface TajweedPageState { selected: string | null; openings: Record<number, number> }

/** Adds a state receiver to a `tajweedDocument` page. Relies on its global `fit()`/`send()`. */
export function withTajweedPageBridge(html: string) {
  return insertBeforeBodyEnd(html, `<script>
window.applyQuranState=(state)=>{if(!state||typeof state!=='object')return;
document.querySelectorAll('.word.selected').forEach(w=>w.classList.remove('selected'));
const ref=typeof state.selected==='string'?state.selected.split(':').map(Number):[];
if(ref.length===2&&ref.every(Number.isInteger))document.querySelectorAll('.word[data-surah="'+ref[0]+'"][data-ayah="'+ref[1]+'"]').forEach(w=>w.classList.add('selected'));
for(const node of document.querySelectorAll('[data-opening]')){const h=Number(state.openings?.[node.dataset.opening]);if(Number.isFinite(h)&&h>=0&&h<5000)node.style.height=h+'px'}
fit()};
window.addEventListener('message',e=>{if(e.source===window.parent&&e.data?.source==='quranni-reader-state')window.applyQuranState(e.data.state)});
send('ready');
</script>`);
}

export interface TajweedTextStyle { fontSize: number; lineHeight: number }

/**
 * Wraps a `tajweedTextDocument`'s `applyQuranState` so a combined
 * `{ style, ayahs }` update restyles the text before ayah state is applied.
 * The document stays hidden until its first state is applied, so the first
 * visible frame already uses the requested size.
 */
export function withTajweedTextStyleBridge(html: string) {
  return insertBeforeBodyEnd(html, `<script>
(()=>{const apply=window.applyQuranState;window.applyQuranState=(state)=>{if(!state||typeof state!=='object')return;
const style=state.style;if(style&&Number.isFinite(style.fontSize)&&Number.isFinite(style.lineHeight)){main.style.fontSize=style.fontSize+'px';main.style.lineHeight=style.lineHeight+'px'}
if(Array.isArray(state.ayahs))apply(state.ayahs)}})();
</script>`);
}

export const tajweedTextUpdate = (ayahState: string, style: TajweedTextStyle) =>
  `{"style":${JSON.stringify(style)},"ayahs":${ayahState}}`;
