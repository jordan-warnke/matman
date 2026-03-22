import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Spacing } from '../constants/Theme';
import { useTheme } from '../contexts/ThemeContext';

interface NumberPadProps {
  onPress: (key: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  extraKeys?: string[];
  disabled?: boolean;
}

export default function NumberPad({
  onPress,
  onBackspace,
  onSubmit,
  extraKeys,
  disabled = false,
}: NumberPadProps) {
  const { colors } = useTheme();

  const rows: string[][] = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
  ];

  if (extraKeys && extraKeys.length > 0) {
    // Extra keys row (e.g. '.', '0', '/' for FDP)
    const extraRow = [...extraKeys];
    // Ensure 0 is in this row if we have extras
    if (!extraRow.includes('0')) {
      // Put 0 in the middle
      while (extraRow.length < 2) extraRow.push('');
      extraRow.splice(1, 0, '0');
    }
    // Pad to 3
    while (extraRow.length < 3) extraRow.push('');
    rows.push(extraRow);
  } else {
    // Standard bottom row with backspace, 0, submit
    // Handled separately below
  }

  const btnStyle = (bg: string, border: string) => [
    styles.key,
    { backgroundColor: bg, borderColor: border, borderBottomColor: border },
  ];

  return (
    <View style={styles.pad}>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((key, ki) => {
            if (key === '') return <View key={ki} style={styles.key} />;
            return (
              <TouchableOpacity
                key={ki}
                style={btnStyle(colors.card, colors.border)}
                activeOpacity={0.6}
                onPress={() => onPress(key)}
                disabled={disabled}
              >
                <Text style={[styles.keyText, { color: colors.text }]}>{key}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Bottom row: ⌫ / 0 / GO  (or just ⌫ / GO when extraKeys present) */}
      <View style={styles.row}>
        {extraKeys && extraKeys.length > 0 ? (
          <>
            <TouchableOpacity
              style={[styles.key, styles.wideKey, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.6}
              onPress={onBackspace}
              disabled={disabled}
            >
              <Text style={[styles.keyText, { color: colors.muted }]}>⌫</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.key, styles.wideKey, { backgroundColor: colors.primary, borderColor: colors.primaryDark, borderBottomColor: colors.primaryDark }]}
              activeOpacity={0.6}
              onPress={onSubmit}
              disabled={disabled}
            >
              <Text style={[styles.keyText, { color: '#FFF' }]}>GO</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={btnStyle(colors.card, colors.border)}
              activeOpacity={0.6}
              onPress={onBackspace}
              disabled={disabled}
            >
              <Text style={[styles.keyText, { color: colors.muted }]}>⌫</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={btnStyle(colors.card, colors.border)}
              activeOpacity={0.6}
              onPress={() => onPress('0')}
              disabled={disabled}
            >
              <Text style={[styles.keyText, { color: colors.text }]}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.key, { backgroundColor: colors.primary, borderColor: colors.primaryDark, borderBottomColor: colors.primaryDark }]}
              activeOpacity={0.6}
              onPress={onSubmit}
              disabled={disabled}
            >
              <Text style={[styles.keyText, { color: '#FFF' }]}>GO</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  key: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wideKey: {
    flex: 1.5,
  },
  keyText: {
    fontSize: 22,
    fontWeight: '700',
  },
});
