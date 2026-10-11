import { View } from 'react-native';
import { router } from 'expo-router';
import { IconTile } from '@/components/ui';
import type { Riwayah } from '@/features/quran-reader/riwayat';
import { Copy, PlanCard } from '@/features/plans/components';
import { DetailAction } from '@/features/plans/plan-detail-components';
import { t } from '@/i18n';

/** On memorization and revision goals: recite what is memorized, in the goal's riwayah. */
export function PracticeGoalCard({ riwayah }: { riwayah: Riwayah }) {
  return <PlanCard>
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <IconTile name="practice" />
      <View style={{ flex: 1, minWidth: 0 }}><Copy title>{t('practice.goal.title')}</Copy><Copy muted>{t('practice.goal.description')}</Copy></View>
    </View>
    <DetailAction icon="practice" label={t('practice.goal.start')} onPress={() => router.push({ pathname: '/practice', params: { riwayah, scope: 'memorized' } })} />
  </PlanCard>;
}
