import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  isKnown: boolean;
  onToggle: () => void;
}

export default function KnownToggle({ isKnown, onToggle }: Props) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.icon,
        isKnown
          ? { backgroundColor: colors.primary + '22', borderColor: colors.primary }
          : { backgroundColor: 'transparent', borderColor: colors.muted },
      ]}
      onPress={onToggle}
      activeOpacity={0.7}
      hitSlop={12}
    >
      <Text style={[styles.thumb, { color: isKnown ? colors.primary : colors.muted }]}>
        👍
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    fontSize: 16,
    lineHeight: 20,
  },
});
