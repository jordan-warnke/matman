import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Font } from '../constants/Theme';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  onPeek?: () => void;
}

export default function PeekHint({ onPeek }: Props) {
  const { colors } = useTheme();
  const label = Platform.OS === 'web' ? 'Hold Tab or swipe left to peek' : 'Swipe left to peek';

  return (
    <View style={styles.row}>
      <Text style={[styles.text, { color: colors.muted }]}>{label}</Text>
      {onPeek && (
        <TouchableOpacity onPress={onPeek} hitSlop={20} style={styles.revealBtn}>
          <Text style={[styles.revealText, { color: colors.muted }]}>Reveal</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  text: {
    ...Font.caption,
  },
  revealBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  revealText: {
    ...Font.caption,
    fontWeight: '700',
  },
});