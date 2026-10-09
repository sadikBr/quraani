import { WebView } from 'react-native-webview';
import { useCallback, useEffect, useMemo, useRef } from 'react';
export interface TajweedSurfaceProps { html: string; height: number; pageNumber: number; title?: string; update?: string; onMessage: (data: string) => void; onError: () => void }
export function TajweedSurface({ html, height, update, onMessage, onError }: TajweedSurfaceProps) {
  const view = useRef<WebView>(null);
  const source = useMemo(() => ({ html }), [html]);
  const publish = useCallback(() => { if (update) view.current?.injectJavaScript(`window.applyQuranState?.(${update});true;`); }, [update]);
  useEffect(publish, [publish, html]);
  return <WebView ref={view} source={source} originWhitelist={['*']} scrollEnabled={false} bounces={false}
    style={{ height, backgroundColor: 'transparent' }} containerStyle={{ flex: 0, height }}
    automaticallyAdjustContentInsets={false} textZoom={100} setSupportMultipleWindows={false}
    onShouldStartLoadWithRequest={(request) => request.url === 'about:blank'}
    onLoadEnd={publish} onMessage={(event) => { if (event.nativeEvent.data.includes('"type":"ready"')) publish(); onMessage(event.nativeEvent.data); }} onError={onError} />;
}
