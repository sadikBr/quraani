import type { CSSProperties } from 'react';
import type { ReaderFontSliderProps } from './reader-font-slider';
import { readerFontLabels } from '../../utils/reader-typography';

export function ReaderFontSlider({ previewValue, onPreview, onCommit, palette }: ReaderFontSliderProps) {
  const commit = (input: HTMLInputElement) => onCommit(Number(input.value));
  return <>
    <style>{`
      .qarani-font-slider { appearance: none; width: 100%; height: 48px; margin: 0; padding: 0; background: transparent; cursor: pointer; touch-action: pan-y; }
      .qarani-font-slider::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: var(--font-track); }
      .qarani-font-slider::-moz-range-track { height: 4px; border-radius: 2px; background: var(--font-track); }
      .qarani-font-slider::-webkit-slider-thumb { appearance: none; width: 24px; height: 24px; margin-top: -10px; border: 3px solid var(--font-paper); border-radius: 50%; background: var(--font-accent); box-shadow: 0 0 0 1px var(--font-accent); }
      .qarani-font-slider::-moz-range-thumb { width: 18px; height: 18px; border: 3px solid var(--font-paper); border-radius: 50%; background: var(--font-accent); box-shadow: 0 0 0 1px var(--font-accent); }
      .qarani-font-slider:focus-visible { outline: 2px solid var(--font-accent); outline-offset: 3px; border-radius: 4px; }
    `}</style>
    <input className="qarani-font-slider" data-testid="reader-font-slider" type="range" min={0} max={6} step={1} value={previewValue} dir="rtl"
      aria-label="حجم نص القرآن" aria-valuetext={`${readerFontLabels[previewValue]}، ${previewValue + 1} من 7`}
      style={{ '--font-accent': palette.accent, '--font-paper': palette.paper,
        '--font-track': `linear-gradient(to left, ${palette.accent} ${previewValue / 6 * 100}%, ${palette.border} ${previewValue / 6 * 100}%)` } as CSSProperties}
      onChange={(event) => onPreview(Number(event.currentTarget.value))}
      onPointerUp={(event) => commit(event.currentTarget)} onPointerCancel={(event) => commit(event.currentTarget)}
      onKeyUp={(event) => commit(event.currentTarget)} onBlur={(event) => commit(event.currentTarget)} />
  </>;
}
