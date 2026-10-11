import { useEffect, useRef, type CSSProperties } from 'react';
import type { ReaderFontSliderProps } from './reader-font-slider';
import { readerFontLabel } from '../../utils/reader-typography';
import { t } from '@/i18n';

export function ReaderFontSlider({ previewValue, onPreview, onCommit, palette }: ReaderFontSliderProps) {
  const commit = (input: HTMLInputElement) => onCommit(Number(input.value));
  // In the settings, whose tabs swipe: the drag stays with the slider. The swipe listens on an
  // ancestor, so the press is kept from reaching it (React's own handlers would be too late).
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const element = input.current;
    const keep = (event: Event) => event.stopPropagation();
    element?.addEventListener('pointerdown', keep);
    return () => element?.removeEventListener('pointerdown', keep);
  }, []);
  return <>
    <style>{`
      .qarani-font-slider { appearance: none; width: 100%; height: 48px; margin: 0; padding: 0; background: transparent; cursor: pointer; touch-action: pan-y; }
      .qarani-font-slider::-webkit-slider-runnable-track { height: 6px; border-radius: 999px; background: var(--font-track); }
      .qarani-font-slider::-moz-range-track { height: 6px; border-radius: 999px; background: var(--font-track); }
      .qarani-font-slider::-webkit-slider-thumb { appearance: none; width: 20px; height: 20px; margin-top: -7px; border: 1px solid var(--font-accent); border-radius: 50%; background: var(--font-paper); box-shadow: 0 1px 3px 0 #0000001a; }
      .qarani-font-slider::-moz-range-thumb { width: 18px; height: 18px; border: 1px solid var(--font-accent); border-radius: 50%; background: var(--font-paper); box-shadow: 0 1px 3px 0 #0000001a; }
      .qarani-font-slider:focus-visible { outline: 2px solid var(--font-accent); outline-offset: 3px; border-radius: 4px; }
    `}</style>
    <input ref={input} className="qarani-font-slider" data-testid="reader-font-slider" type="range" min={0} max={6} step={1} value={previewValue} dir="rtl"
      aria-label={t('settings.fontSize.label')} aria-valuetext={t('settings.fontSize.value', { label: readerFontLabel(previewValue), step: previewValue + 1, total: 7 })}
      style={{ '--font-accent': palette.primary, '--font-paper': palette.background,
        '--font-track': `linear-gradient(to left, ${palette.primary} ${previewValue / 6 * 100}%, ${palette.muted} ${previewValue / 6 * 100}%)` } as CSSProperties}
      onChange={(event) => onPreview(Number(event.currentTarget.value))}
      onPointerUp={(event) => commit(event.currentTarget)} onPointerCancel={(event) => commit(event.currentTarget)}
      onKeyUp={(event) => commit(event.currentTarget)} onBlur={(event) => commit(event.currentTarget)} />
  </>;
}
