import { ConfirmDialog } from '@/features/halaqat/confirm-dialog';
import { t } from '@/i18n';

/**
 * Asked before the record that finishes a whole goal (the last wird of a khatma, the last passage
 * to memorize): a finished goal stays finished, so this is the moment to catch a slip. Everything
 * recorded before it can still be undone the same day (`canUndoProgress`).
 */
export function FinishGoalDialog({ memorization, onConfirm, onClose }: { memorization: boolean; onConfirm: () => void; onClose: () => void }) {
  const kind = memorization ? 'memorization' : 'reading';
  return <ConfirmDialog tone="primary" icon="check" title={t(`goals.finish.${kind}.title`)} body={t(`goals.finish.${kind}.body`)}
    confirm={t(`goals.finish.${kind}.confirm`)} onConfirm={onConfirm} onClose={onClose} />;
}
