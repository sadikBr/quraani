import { ArabicText as Text } from '@/components/arabic-text';
import { Pressable, StyleSheet } from "react-native";
import type { ReaderPalette } from "../../theme";

interface Props {
    children: string;
    label?: string;
    onPress: () => void;
    palette: ReaderPalette;
    selected?: boolean;
    disabled?: boolean;
}

export function ReaderButton({
    children,
    label,
    onPress,
    palette,
    selected,
    disabled,
}: Props) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label ?? children}
            accessibilityState={{ selected: !!selected, disabled: !!disabled }}
            disabled={disabled}
            onPress={onPress}
            style={({ pressed }) => [
                styles.button,
                {
                    backgroundColor: selected
                        ? palette.accent
                        : palette.paper,
                    borderColor: selected ? palette.accent : palette.border,
                    opacity: disabled ? 0.35 : pressed ? 0.65 : 1,
                },
            ]}
        >
            <Text
                style={[
                    styles.text,
                    { color: selected ? palette.paper : palette.text },
                ]}
            >
                {children}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        minHeight: 48,
        minWidth: 44,
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    text: { fontSize: 14, fontWeight: "600", textAlign: "center" },
});
