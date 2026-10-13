import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Row, RowGroup, Section } from '@/components/craft/page';
import { Alert, Badge, Button } from '@/components/ui';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { ConfirmDialog } from '@/features/halaqat/confirm-dialog';
import { shortDate } from '@/features/plans/presentation';
import { localDate } from '@/features/plans/dates';
import { t } from '@/i18n';
import { useAccount } from './provider';
import { deviceName } from './device';
import type { Device } from './profile';

export const clock = (ms: number) => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
export const dayOf = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// This device may not have given its name yet (it does once signed in): it knows it.
const nameOf = (device: Device) => device.name ?? (device.current ? deviceName() : t('account.devices.unnamed'));

/** When the device was last seen, and since when it is signed in. */
function lineOf(device: Device) {
  const active = device.current ? t('account.devices.activeNow')
    : dayOf(device.lastActive) === localDate() ? t('account.devices.activeToday', { time: clock(device.lastActive) })
    : t('account.devices.activeOn', { date: shortDate(dayOf(device.lastActive)) });
  return device.signedIn ? `${active}\n${t('account.devices.signedIn', { date: shortDate(dayOf(device.signedIn)) })}` : active;
}

/**
 * The phones and browsers signed in to the account, this one first: each by the name it gave
 * itself and when it was last seen, and a way to sign out any of the others (or all of them).
 */
export function DevicesSection() {
  const { palette: p } = useReadingPreferences();
  const { devices, endDevice, endOtherDevices } = useAccount();
  const [list, setList] = useState<Device[] | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState('');
  const [ending, setEnding] = useState<Device | 'others' | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  // Read again after a device is signed out, or when asked.
  const [reads, setReads] = useState(0);
  useEffect(() => {
    let active = true;
    devices().then((next) => { if (active) { setList(next); setFailed(false); } }, () => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [devices, reads]);
  const retry = () => { setFailed(false); setReads((n) => n + 1); };

  const end = async (which: Device | 'others') => {
    setEnding(undefined); setBusy(true); setMessage('');
    try {
      if (which === 'others') await endOtherDevices(); else await endDevice(which.id);
      // Gone from the list at once; the list read again says the rest.
      setList((current) => current?.filter((d) => which === 'others' ? d.current : d.id !== which.id));
    } catch {
      setMessage(t('account.devices.endFailed'));
    }
    setBusy(false);
    setReads((n) => n + 1);
  };

  const others = list?.filter((d) => !d.current).length ?? 0;
  return <Section title={t('account.devices.title')} detail={t('account.devices.detail')} palette={p}>
    {failed && <Alert variant="destructive" palette={p} action={<Button size="sm" variant="outline" icon="sync" palette={p} onPress={retry}>{t('common.retry')}</Button>}>
      {t('account.devices.failed')}
    </Alert>}
    {list === undefined ? !failed && <RowGroup palette={p}><View style={{ minHeight: 64, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={p.mutedForeground} /></View></RowGroup>
      : <RowGroup palette={p}>
          {list.map((device) => <Row key={device.id} icon={device.platform === 'web' ? 'monitor' : 'smartphone'} title={nameOf(device)} detail={lineOf(device)} palette={p}
            trailing={device.current ? <Badge variant="outline" icon="check" palette={p}>{t('account.devices.thisDevice')}</Badge>
              : <Button size="sm" variant="outline" palette={p} disabled={busy} label={t('account.devices.endLabel', { name: nameOf(device) })}
                  onPress={() => { setMessage(''); setEnding(device); }}>{t('account.devices.end')}</Button>} />)}
        </RowGroup>}
    {others > 1 && <View style={{ alignItems: 'flex-start' }}>
      <Button variant="ghost" icon="log-out" palette={p} disabled={busy} onPress={() => { setMessage(''); setEnding('others'); }}>{t('account.devices.endOthers')}</Button>
    </View>}
    {!!message && <Alert variant="destructive" palette={p}>{message}</Alert>}
    {ending && <ConfirmDialog icon="log-out" onClose={() => setEnding(undefined)} onConfirm={() => void end(ending)}
      title={ending === 'others' ? t('account.devices.endOthersConfirmTitle') : t('account.devices.endConfirmTitle')}
      body={ending === 'others' ? t('account.devices.endOthersConfirmBody') : ending.name ? t('account.devices.endConfirmBody', { name: ending.name }) : t('account.devices.endConfirmBodyUnnamed')}
      confirm={ending === 'others' ? t('account.devices.endOthers') : t('account.devices.end')} />}
  </Section>;
}
