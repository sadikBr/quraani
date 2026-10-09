import { useEffect, useState } from 'react';
import { loadReaderContent } from '../quran-reader/services/reader-service';
import type { Riwayah } from '../quran-reader/riwayat';
import { buildPlanIndex, type PlanIndex } from './engine';

export function usePlanIndex(riwayah: Riwayah) {
  const [result, setResult] = useState<{ riwayah: Riwayah; index?: PlanIndex; error?: string }>();
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    void loadReaderContent(undefined, riwayah).then(content => { if (active) setResult({ riwayah, index: buildPlanIndex(content.data) }); })
      .catch(() => { if (active) setResult({ riwayah, error: 'تعذر تحميل حدود المصحف. اتصل بالإنترنت لتحميله أول مرة ثم أعد المحاولة.' }); });
    return () => { active = false; };
  }, [riwayah, revision]);
  return { index: result?.riwayah === riwayah ? result.index : undefined, error: result?.riwayah === riwayah ? result.error : undefined,
    retry: () => { setResult(undefined); setRevision(x => x + 1); } };
}
