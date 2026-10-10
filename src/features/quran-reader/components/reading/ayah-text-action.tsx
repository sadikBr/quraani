import type { ReactNode } from 'react';
import { Text } from 'react-native';
import { t } from '@/i18n';

export interface AyahTextActionProps {
  children: ReactNode;
  color?: string;
  label: string;
  hint?: string;
  onPress: () => void;
  onLongPress?: () => void;
}

export function AyahTextAction({ children, color, label, hint, onPress, onLongPress }: AyahTextActionProps) {
  return <Text style={color ? { color } : undefined} accessibilityRole="button"
    accessibilityLabel={label} accessibilityHint={hint}
    onPress={(event) => { event.stopPropagation(); onPress(); }}
    onLongPress={onLongPress ? (event) => { event.stopPropagation(); onLongPress(); } : undefined}
    accessibilityActions={onLongPress ? [{ name: 'longpress', label: t('reader.ayah.openActions') }] : undefined}
    onAccessibilityAction={onLongPress ? (event) => { if (event.nativeEvent.actionName === 'longpress') onLongPress(); } : undefined}>
    {children}
  </Text>;
}
