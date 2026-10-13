import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { ArchPanel } from '@/components/craft/panels';
import { PageBar, PageTitle, page } from '@/components/craft/page';
import { Alert, Button } from '@/components/ui';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { withAlpha } from '@/features/quran-reader/design';
import { CreationFooter } from '@/features/plans/goal-creation-components';
import { t } from '@/i18n';
import type { PhotoBody } from './api';
import { Avatar } from './avatar';
import { pickPhoto } from './photo-picker';
import { initialOf, NAME_LIMIT } from './profile';
import { AccountError } from './auth-client';
import { useAccount } from './provider';
import { Field } from './sign-in-screen';

/** A photo chosen here and not yet in the account; null when the photo is to be removed. */
type Choice = { body: PhotoBody; preview: string } | null;

/**
 * The name and photo of the account, as the account screen shows them: changed here, then kept
 * together with «تسجيل التغييرات» (nothing reaches the account before).
 */
export function ProfileScreen() {
  const { palette: p } = useReadingPreferences();
  const { user, profile: { profile }, refreshProfile, setName, setPhoto, removePhoto } = useAccount();
  // Undefined while unchanged here.
  const [name, setNameText] = useState<string | undefined>(undefined);
  const [photo, choosePhoto] = useState<Choice | undefined>(undefined);
  const [busy, setBusy] = useState<'name' | 'photo' | undefined>(undefined);
  const [error, setError] = useState('');
  // What went wrong, as the app was told it (English, for whoever looks into it).
  const [reason, setReason] = useState('');
  // A save that ends after the user went back doesn't leave a second time.
  const here = useRef(true);
  useEffect(() => () => { here.current = false; }, []);
  // Not read yet (no connection when the app opened): read it now.
  const unread = !profile;
  useEffect(() => { if (unread) void refreshProfile().catch(() => {}); }, [unread, refreshProfile]);

  if (user === null) return <Redirect href="/account" />;
  const email = user?.email ?? '';
  const savedName = profile?.fullName ?? '';
  const shownName = name ?? savedName;
  const nameChanged = name !== undefined && name.trim() !== savedName;
  const changed = nameChanged || photo !== undefined;
  const hasPhoto = photo === undefined ? !!profile?.avatar : photo !== null;
  const preview = photo === undefined ? profile?.photo?.url : photo?.preview;

  const leave = () => { if (router.canGoBack()) router.back(); else router.replace('/account'); };
  const choose = async () => {
    setError(''); setReason('');
    try {
      const picked = await pickPhoto();
      if (picked) choosePhoto(picked);
    } catch (e) {
      setError(t('account.profile.photoUnreadable'));
      setReason(e instanceof Error ? e.message : String(e));
    }
  };
  const submit = async () => {
    setError(''); setReason('');
    let step: 'name' | 'photo' = 'name';
    try {
      if (nameChanged) { setBusy(step); await setName(name ?? ''); }
      if (photo !== undefined) { setBusy(step = 'photo'); if (photo) await setPhoto(photo.body); else await removePhoto(); }
      if (here.current) leave();
    } catch (e) {
      // What was kept stays kept (the name goes first), so trying again sends only the rest.
      if (!here.current) return;
      const offline = e instanceof AccountError && e.kind === 'network';
      setError(t(`account.profile.${step === 'photo' ? (offline ? 'photoFailed' : 'photoRefused') : (offline ? 'failed' : 'nameRefused')}`));
      const message = e instanceof Error ? e.message : String(e);
      setReason(e instanceof AccountError && message === e.kind ? '' : message);
    } finally {
      if (here.current) setBusy(undefined);
    }
  };

  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <PageBar back={{ label: t('common.back'), onPress: leave }} palette={p} />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[page.content, { gap: 22 }]}>
        <PageTitle title={t('account.profile.title')} subtitle={t('account.profile.lead')} palette={p} />
        <ArchPanel palette={p} rise={40} contentStyle={s.portrait}>
          <Avatar size={152} photo={preview} cacheKey={photo === undefined ? profile?.avatar ?? undefined : undefined} initial={initialOf(shownName, email)} palette={p}
            busy={busy === 'photo'} label={hasPhoto ? t('account.profile.photoLabel', { name: shownName.trim() || email }) : t('account.profile.noPhotoLabel')} />
          <View style={s.actions}>
            <Button variant="outline" icon="image" palette={p} disabled={!!busy} onPress={() => void choose()}>
              {hasPhoto ? t('account.profile.changePhoto') : t('account.profile.addPhoto')}
            </Button>
            {hasPhoto && <Button variant="ghost" icon="trash" tone={p.destructive} palette={p} disabled={!!busy} onPress={() => { setError(''); choosePhoto(null); }}>
              {t('account.profile.removePhoto')}
            </Button>}
          </View>
          <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20, textAlign: 'center' }}>
            {photo === undefined ? t('account.profile.photoHint') : photo ? t('account.profile.photoPending') : t('account.profile.removePending')}
          </Text>
        </ArchPanel>
        <Field label={t('account.profile.name')}>
          {(field) => <TextInput {...field} style={[field.style, s.name]} value={shownName} onChangeText={setNameText} maxLength={NAME_LIMIT}
            placeholder={t('account.profile.namePlaceholder')} autoCapitalize="words" autoCorrect={false} autoComplete="name" textContentType="name"
            returnKeyType="done" editable={!busy} onSubmitEditing={() => { if (changed && !busy) void submit(); }} />}
        </Field>
        <View style={{ gap: 4 }}>
          <Text style={{ color: p.foreground, fontSize: 14, fontWeight: '600' }}>{t('account.signIn.email')}</Text>
          <Text style={{ color: p.mutedForeground, fontSize: 15, lineHeight: 24 }}>{`⁦${email}⁩`}</Text>
        </View>
        {!!error && <Alert variant="destructive" palette={p}>
          <Text accessibilityRole="alert" style={{ color: withAlpha(p.destructive, 0.9), fontSize: 14, lineHeight: 22 }}>{error}</Text>
          {!!reason && <Text selectable style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18, writingDirection: 'ltr', marginTop: 4 }}>{reason}</Text>}
        </Alert>}
      </ScrollView>
      <CreationFooter>
        <Button size="lg" icon="check" palette={p} block disabled={!changed || !!busy} onPress={() => void submit()}>
          {busy ? t('account.profile.submitting') : t('account.profile.submit')}
        </Button>
      </CreationFooter>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  portrait: { alignItems: 'center', gap: 12, paddingTop: 52, paddingHorizontal: 18, paddingBottom: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 4 },
  name: { writingDirection: 'rtl', textAlign: Platform.OS === 'android' ? 'left' : 'right' },
});
