import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { formatList, t } from '@/i18n';
import { withAlpha } from '../../../design';
import { quranpedia } from '../../../services/reader-service';
import type { ReaderPalette } from '../../../theme';
import { LongProse, StaleNote, Status, useAyahService, type ScienceProps } from './shared';

const load = (surah: number, ayah: number) => quranpedia.getFatwas(surah, ayah);
const SEAL = 30;

/**
 * Fatwas on the ayah, laid out as the books of fatwas set them: the question after its «س», the
 * answer after its «ج» (a long one shown in part), and the scholar who gave it.
 */
export function FatwasView({ ayah, palette: p }: ScienceProps) {
  const fatwas = useAyahService(ayah, 'fatwa', load);
  const list = fatwas.data ?? [];
  if (fatwas.status !== 'ready' || !list.length) return <Status loaded={fatwas} empty={!list.length} palette={p} />;
  return <View style={{ gap: 22 }}>
    {list.map((fatwa, i) => <Fragment key={fatwa.id}>
      {i > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.border }} />}
      <View style={{ gap: 14 }}>
        <View style={s.line}>
          <Seal letter={t('reader.sciences.fatwa.question')} palette={p} />
          <Text style={{ flex: 1, minWidth: 0, color: p.foreground, fontSize: 17, lineHeight: 31, fontFamily: 'ReaderNaskhBold' }}>{fatwa.question}</Text>
        </View>
        <View style={s.line}>
          <Seal letter={t('reader.sciences.fatwa.answer')} filled palette={p} />
          <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
            <LongProse text={fatwa.answer} limit={360} size={17} palette={p} />
            {!!fatwa.muftis.length && <Text style={{ color: p.ornament, fontSize: 14, lineHeight: 22, fontFamily: 'ReaderNaskhBold', alignSelf: 'flex-end' }}>{t('reader.sciences.fatwa.by', { names: formatList(fatwa.muftis) })}</Text>}
          </View>
        </View>
      </View>
    </Fragment>)}
    {fatwas.stale && <StaleNote palette={p} />}
  </View>;
}

/** The letter of a question or an answer in a gold ring; the answer's filled. */
function Seal({ letter, filled = false, palette: p }: { letter: string; filled?: boolean; palette: ReaderPalette }) {
  return <View aria-hidden style={[s.seal, { borderColor: withAlpha(p.ornament, 0.8), backgroundColor: filled ? p.ornament : withAlpha(p.ornament, 0.1) }]}>
    <Text style={{ color: filled ? p.card : p.ornament, fontSize: 15, lineHeight: 24, fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>{letter}</Text>
  </View>;
}

const s = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  seal: { width: SEAL, height: SEAL, borderRadius: SEAL / 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
});
