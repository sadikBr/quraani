import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { Riwayah } from '@/features/quran-reader/riwayat';
import { useAccount } from '@/features/account/provider';
import { usePlans } from '@/features/plans/provider';
import { usePlanIndex } from '@/features/plans/use-plan-index';
import { shapeOf, spanOf, validPortion } from './model';
import { passedRecitations, type PassedRecitation } from './membership';
import { useMembership } from './provider';

/**
 * What a member passes in the halaqat they are in joins their own memorization record, as the
 * phone's owner's does in a halaqa they supervise: each new portion heard and not to be repeated,
 * once. The record notes each recitation it took in (`fromHalaqat`), and travels with it from one
 * phone to another, so a portion taken out of it afterwards stays out on every phone. Nothing is
 * written before the account's first sync of this start (the record may have changed on another
 * phone), nor while a sync is under way or waits on the user. Read with the edition of each
 * halaqa's riwayah, loaded only while there is something to add.
 */
export function MemberRecordObserver() {
  const { membership } = useMembership();
  const { user, sync } = useAccount();
  const { ready, memorization } = usePlans();
  const pending = useMemo(() => passedRecitations(membership.joined, (riwayah) => new Set(memorization.find((r) => r.riwayah === riwayah)?.fromHalaqat ?? [])),
    [membership.joined, memorization]);
  // A conflict elsewhere (adhkar, bookmarks) doesn't hold the record back; one on the goals does.
  const settled = !!user && !sync.syncing && !sync.conflicts.some((c) => c.key === 'plans:v1') && (sync.lastSynced !== undefined || sync.problem === 'network');
  if (!ready || !membership.loaded || !settled || !pending.length) return null;
  const riwayat = [...new Set(pending.map((r) => r.riwayah))];
  return <>{riwayat.map((riwayah) => <TakeIn key={riwayah} riwayah={riwayah} pending={pending.filter((r) => r.riwayah === riwayah)} />)}</>;
}

function TakeIn({ riwayah, pending }: { riwayah: Riwayah; pending: PassedRecitation[] }) {
  const { index, error, retry } = usePlanIndex(riwayah);
  const { remember } = usePlans();
  // One write at a time; what came meanwhile (or failed) is tried again once it is done, and
  // when the app comes back.
  const busy = useRef(false);
  const [round, setRound] = useState(0);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      if (error) retry();
      setRound((n) => n + 1);
    });
    return () => subscription.remove();
  }, [error, retry]);
  const keys = pending.map((r) => r.key).join(',');
  useEffect(() => {
    if (!index || busy.current) return;
    busy.current = true;
    const shape = shapeOf(index);
    // A portion that doesn't read with this edition is noted, and passed over.
    const spans = pending.filter((r) => validPortion(shape, r.portion)).map((r) => spanOf(shape, r.portion));
    void remember(index, riwayah, spans, pending.map((r) => r.key)).then(() => true, () => false).then((written) => {
      busy.current = false;
      // Written: what came while it was on its way is taken in now. Failed: again when the app
      // comes back, or something new comes (not at once, which would only fail again).
      if (written) setRound((n) => n + 1);
    });
    // `pending` is read as it is when its keys change; `round` brings it back after a write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, keys, riwayah, remember, round]);
  return null;
}
