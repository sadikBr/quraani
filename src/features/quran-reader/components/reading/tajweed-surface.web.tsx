import { useCallback, useEffect, useRef } from 'react';
import type { TajweedSurfaceProps } from './tajweed-surface';
import { t } from '@/i18n';
export function TajweedSurface({ html, height, pageNumber, title, update, onMessage, onError }: TajweedSurfaceProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const publish = useCallback(() => { if (update) frame.current?.contentWindow?.postMessage({ source: 'quranni-reader-state', state: JSON.parse(update) }, '*'); }, [update]);
  useEffect(publish, [publish, html]);
  useEffect(() => {
    const listener = (event: MessageEvent) => { if (event.source === frame.current?.contentWindow && typeof event.data === 'string') { if (event.data.includes('"type":"ready"')) publish(); onMessage(event.data); } };
    window.addEventListener('message', listener); return () => window.removeEventListener('message', listener);
  }, [onMessage, publish]);
  return <iframe ref={frame} title={title ?? t('reader.tajweed.pageTitle', { page: pageNumber })} srcDoc={html} sandbox="allow-scripts" onLoad={publish} onError={onError}
    style={{ width: '100%', height, border: 0, display: 'block' }} />;
}
