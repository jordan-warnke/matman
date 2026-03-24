import React from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import { Font } from '../constants/Theme';
import { useTheme } from '../contexts/ThemeContext';

export default function PeekHint() {
  const { colors } = useTheme();
  const label = Platform.OS === 'web' ? 'Hold Tab or swipe left to peek' : 'Swipe left to peek';

  return <Text style={[styles.text, { color: colors.muted }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  text: {
    ...Font.caption,
  },
});