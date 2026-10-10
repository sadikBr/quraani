import type { PropsWithChildren } from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';
import { localeInfo } from '@/i18n';

export default function RootHtml({ children }: PropsWithChildren) {
  return <html lang={localeInfo().tag} dir={localeInfo().direction}>
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <ScrollViewStyleReset />
    </head>
    <body>{children}</body>
  </html>;
}
