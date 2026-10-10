import { useEffect, useState } from 'react';
import { loadReaderContent } from '../quran-reader/services/reader-service';
import type { Riwayah } from '../quran-reader/riwayat';
import { buildPlanIndex, type PlanIndex } from './engine';
import { usePlans } from './provider';
import { needsRelink } from './relink';

export function usePlanIndex(riwayah: Riwayah) {
  const { plans, memorization, ready, relink } = usePlans();
  const [result, setResult] = useState<{ riwayah: Riwayah; index?: PlanIndex; error?: string }>();
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    void loadReaderContent(undefined, riwayah).then(content => { if (active) setResult({ riwayah, index: buildPlanIndex(content.data) }); })
      .catch(() => { if (active) setResult({ riwayah, error: 'تعذر تحميل حدود المصحف. اتصل بالإنترنت لتحميله أول مرة ثم أعد المحاولة.' }); });
    return () => { active = false; };
  }, [riwayah, revision]);
  const index = result?.riwayah === riwayah ? result.index : undefined;
  // A corrected edition (same ayahs, updated page metadata) silently re-links
  // saved goals and the memorization record instead of locking them.
  const stale = !!index && ready && needsRelink(plans, memorization, riwayah, index);
  useEffect(() => {
    if (!stale || !index) return;
    let active = true;
    // Only the newest edition may re-link goals. A screen that kept an older copy
    // (e.g. a list under a detail screen) refreshes its index instead of
    // re-linking goals backwards, which would otherwise ping-pong forever.
    void loadReaderContent(undefined, riwayah).then(content => {
      const latest = buildPlanIndex(content.data);
      if (!active) return;
      if (latest.corpus === index.corpus) return relink(index);
      setResult({ riwayah, index: latest });
    }).catch(() => {});
    return () => { active = false; };
  }, [stale, index, relink, riwayah]);
  return { index, error: result?.riwayah === riwayah ? result.error : undefined,
    retry: () => { setResult(undefined); setRevision(x => x + 1); } };
}
