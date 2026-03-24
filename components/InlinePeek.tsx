import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Font, Spacing } from '../constants/Theme';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  visible: boolean;
  title?: string;
  detail?: string;
  children: React.ReactNode;
}

export default function InlinePeek({ visible, title = 'Peek', detail, children }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.slot} pointerEvents={visible ? 'auto' : 'none'}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: visible ? 1 : 0,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.muted }]}>{title}</Text>
        <View style={styles.content}>{children}</View>
        {detail ? <Text style={[styles.detail, { color: colors.muted }]}>{detail}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    width: '100%',
    minHeight: 84,
    marginTop: Spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 84,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...Font.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  detail: {
    ...Font.caption,
    marginTop: 4,
    textAlign: 'center',
  },
});