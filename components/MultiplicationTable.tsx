import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Font } from '../constants/Theme';
import { useTheme } from '../contexts/ThemeContext';

const COLS = 13;
const { width: SCREEN_W } = Dimensions.get('window');
const CELL = Math.floor((SCREEN_W - 32) / (COLS + 1));

export default function MultiplicationTable() {
  const { colors } = useTheme();
  const nums = Array.from({ length: COLS }, (_, i) => i + 1);

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.card }]}>
      <View style={[styles.titleBar, { backgroundColor: colors.primary }]}>
        <Text style={styles.titleText}>× Table</Text>
      </View>

      <View style={styles.grid}>
        {/* Header row */}
        <View style={styles.row}>
          <View style={[styles.cell, { backgroundColor: colors.primary }]}>
            <Text style={styles.cornerText}>×</Text>
          </View>
          {nums.map((n) => (
            <View key={`h${n}`} style={[styles.cell, { backgroundColor: colors.border }]}>
              <Text style={[styles.headerText, { color: colors.text }]}>{n}</Text>
            </View>
          ))}
        </View>

        {/* Data rows */}
        {nums.map((row) => (
          <View key={`r${row}`} style={styles.row}>
            <View style={[styles.cell, { backgroundColor: colors.border }]}>
              <Text style={[styles.headerText, { color: colors.text }]}>{row}</Text>
            </View>
            {nums.map((col) => (
              <View key={`${row}-${col}`} style={[styles.cell, { borderColor: colors.border }]}>
                <Text style={[styles.cellText, { color: colors.text }]}>{row * col}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  titleBar: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  titleText: {
    ...Font.h3,
    color: '#FFF',
    letterSpacing: 0.5,
  },
  grid: {
    padding: 6,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL,
    height: CELL,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  cornerText: {
    fontSize: Math.max(10, CELL * 0.5),
    fontWeight: '800',
    color: '#FFF',
  },
  headerText: {
    fontSize: Math.max(9, CELL * 0.45),
    fontWeight: '700',
  },
  cellText: {
    fontSize: Math.max(8, CELL * 0.4),
  },
});
