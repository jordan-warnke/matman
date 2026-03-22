import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  isStruggling: boolean;
  onToggle: () => void;
}

export default function StruggleToggle({ isStruggling, onToggle }: Props) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.icon,
        isStruggling
          ? { backgroundColor: colors.accent + '22', borderColor: colors.accent }
          : { backgroundColor: 'transparent', borderColor: colors.muted },
      ]}
      onPress={onToggle}
      activeOpacity={0.7}
      hitSlop={12}
    >
      <Text style={[styles.flag, { color: isStruggling ? colors.accent : colors.muted }]}>
        ⚑
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
  flag: {
    fontSize: 16,
    lineHeight: 20,
  },
});
