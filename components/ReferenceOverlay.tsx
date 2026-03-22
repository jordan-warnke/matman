import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Keyboard,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Font, Spacing } from '../constants/Theme';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const STORAGE_KEY = '@matman/ref-table-tab';

type TableTab = 'multiply' | 'fdp' | 'powers' | 'primes' | 'factorial' | 'unitdigit' | 'algebra';

const TABS: { key: TableTab; label: string }[] = [
  { key: 'multiply', label: '×' },
  { key: 'fdp', label: '%' },
  { key: 'powers', label: 'nˣ' },
  { key: 'primes', label: 'P' },
  { key: 'factorial', label: 'n!' },
  { key: 'unitdigit', label: '∂' },
  { key: 'algebra', label: '=' },
];

// ── Shared two-column table helper ──

function TwoColTable({ rows, colors }: { rows: { left: string; right: string }[]; colors: any }) {
  return (
    <ScrollView style={{ flex: 1 }} nestedScrollEnabled contentContainerStyle={tblStyles.container}>
      {rows.map((r, i) => (
        <View
          key={i}
          style={[
            tblStyles.row,
            { borderBottomColor: colors.border },
            i % 2 === 0 && { backgroundColor: colors.background },
          ]}
        >
          <Text style={[tblStyles.left, { color: colors.muted }]}>{r.left}</Text>
          <Text style={[tblStyles.right, { color: colors.text }]}>{r.right}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Table renderers ──

function MultiplyGrid({ colors, highlightRow }: { colors: any; highlightRow?: number }) {
  // Auto-fit all 14 columns (1 header + 13 data) into available width – no horizontal scroll needed
  const TAB_RAIL_W = 44;
  const COLS = 14;
  const CELL = Math.floor((SCREEN_W - TAB_RAIL_W) / COLS);
  const FONT = CELL >= 30 ? 12 : CELL >= 24 ? 10 : 9;
  const H_FONT = CELL >= 30 ? 13 : CELL >= 24 ? 11 : 9;
  const nums = Array.from({ length: 13 }, (_, i) => i + 1);

  return (
    <ScrollView style={{ flex: 1 }}>
      <View>
        {/* Header row */}
        <View style={gridStyles.row}>
          <View style={[gridStyles.cell(CELL), { backgroundColor: colors.primary }]}>
            <Text style={[gridStyles.headerText, { fontSize: H_FONT }]}>×</Text>
          </View>
          {nums.map((n) => (
            <View key={n} style={[gridStyles.cell(CELL), { backgroundColor: colors.primary }]}>
              <Text style={[gridStyles.headerText, { fontSize: H_FONT }]}>{n}</Text>
            </View>
          ))}
        </View>
        {/* Data rows */}
        {nums.map((row) => {
          const isHL = highlightRow === row;
          return (
            <View key={row} style={[gridStyles.row, isHL && { backgroundColor: colors.primary + '18' }]}>
              <View style={[gridStyles.cell(CELL), { backgroundColor: colors.primary, opacity: isHL ? 1 : 0.85 }]}>
                <Text style={[gridStyles.headerText, { fontSize: H_FONT }, isHL && { fontWeight: '900' }]}>{row}</Text>
              </View>
              {nums.map((col) => (
                <View
                  key={col}
                  style={[
                    gridStyles.dataCell(CELL),
                    { borderColor: colors.border },
                    !isHL && row % 2 === 0 && { backgroundColor: colors.background },
                  ]}
                >
                  <Text style={{ color: colors.text, fontSize: FONT, fontWeight: '500', textAlign: 'center' }}>{row * col}</Text>
                </View>
              ))}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function FDPTable({ colors }: { colors: any }) {
  const data: { left: string; right: string }[] = [
    { left: '1/2', right: '0.5  ·  50%' },
    { left: '1/3', right: '0.333  ·  33.3%' },
    { left: '2/3', right: '0.667  ·  66.7%' },
    { left: '1/4', right: '0.25  ·  25%' },
    { left: '3/4', right: '0.75  ·  75%' },
    { left: '1/5', right: '0.2  ·  20%' },
    { left: '2/5', right: '0.4  ·  40%' },
    { left: '3/5', right: '0.6  ·  60%' },
    { left: '4/5', right: '0.8  ·  80%' },
    { left: '1/6', right: '0.167  ·  16.7%' },
    { left: '5/6', right: '0.833  ·  83.3%' },
    { left: '1/8', right: '0.125  ·  12.5%' },
    { left: '3/8', right: '0.375  ·  37.5%' },
    { left: '5/8', right: '0.625  ·  62.5%' },
    { left: '7/8', right: '0.875  ·  87.5%' },
    { left: '1/9', right: '0.111  ·  11.1%' },
    { left: '1/10', right: '0.1  ·  10%' },
    { left: '1/12', right: '0.083  ·  8.3%' },
  ];
  return <TwoColTable rows={data} colors={colors} />;
}

function PowersTable({ colors }: { colors: any }) {
  const sections: { left: string; right: string }[] = [];
  // Squares 1²–25²
  for (let n = 1; n <= 25; n++) sections.push({ left: `${n}²`, right: String(n * n) });
  // Cubes 1³–10³
  for (let n = 1; n <= 10; n++) sections.push({ left: `${n}³`, right: String(n ** 3) });
  // Powers of 2
  for (let n = 1; n <= 12; n++) sections.push({ left: `2^${n}`, right: String(2 ** n) });
  return <TwoColTable rows={sections} colors={colors} />;
}

function PrimesTable({ colors }: { colors: any }) {
  // All primes up to 100
  const primes: number[] = [];
  for (let n = 2; n <= 100; n++) {
    let isPrime = true;
    for (let d = 2; d * d <= n; d++) { if (n % d === 0) { isPrime = false; break; } }
    if (isPrime) primes.push(n);
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.md }}>
      <View style={chipStyles.grid}>
        {primes.map((p) => (
          <View key={p} style={[chipStyles.chip, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[chipStyles.chipText, { color: colors.text }]}>{p}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function FactorialTable({ colors }: { colors: any }) {
  const data: { left: string; right: string }[] = [];
  let fac = 1;
  for (let n = 1; n <= 12; n++) {
    fac *= n;
    data.push({ left: `${n}!`, right: fac.toLocaleString() });
  }
  return <TwoColTable rows={data} colors={colors} />;
}

function UnitDigitTable({ colors }: { colors: any }) {
  // Unit digit cyclicity: base → cycle of unit digits for powers 1,2,3,...
  const cycles: { base: number; cycle: number[] }[] = [
    { base: 2, cycle: [2, 4, 8, 6] },
    { base: 3, cycle: [3, 9, 7, 1] },
    { base: 4, cycle: [4, 6] },
    { base: 5, cycle: [5] },
    { base: 6, cycle: [6] },
    { base: 7, cycle: [7, 9, 3, 1] },
    { base: 8, cycle: [8, 4, 2, 6] },
    { base: 9, cycle: [9, 1] },
  ];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.md }}>
      {cycles.map(({ base, cycle }) => (
        <View key={base} style={[cycleStyles.row, { borderBottomColor: colors.border }]}>
          <Text style={[cycleStyles.base, { color: colors.primary }]}>{base}ⁿ</Text>
          <View style={cycleStyles.chips}>
            {cycle.map((d, i) => (
              <View key={i} style={[cycleStyles.chip, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[cycleStyles.digit, { color: colors.text }]}>{d}</Text>
              </View>
            ))}
          </View>
          <Text style={[cycleStyles.len, { color: colors.muted }]}>/{cycle.length}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function AlgebraRefTable({ colors }: { colors: any }) {
  const data: { left: string; right: string }[] = [
    { left: 'a² − b²', right: '(a+b)(a−b)' },
    { left: '(a+b)²', right: 'a² + 2ab + b²' },
    { left: '(a−b)²', right: 'a² − 2ab + b²' },
    { left: '(a+b)²−(a−b)²', right: '4ab' },
    { left: '(a+b)²+(a−b)²', right: '2a² + 2b²' },
    { left: 'a² + b²', right: 'NOT factorable' },
    { left: 'xᵃ · xᵇ', right: 'x⁽ᵃ⁺ᵇ⁾' },
    { left: 'xᵃ / xᵇ', right: 'x⁽ᵃ⁻ᵇ⁾' },
    { left: '(xᵃ)ᵇ', right: 'x⁽ᵃᵇ⁾' },
    { left: 'x⁰', right: '1 (x ≠ 0)' },
    { left: 'x⁻ⁿ', right: '1/xⁿ' },
    { left: '(xy)ⁿ', right: 'xⁿyⁿ' },
    { left: '(x/y)ⁿ', right: 'xⁿ/yⁿ' },
    { left: '(a+b)/c', right: 'a/c + b/c ✓' },
    { left: 'a/(b+c)', right: '≠ a/b + a/c ✗' },
  ];
  return <TwoColTable rows={data} colors={colors} />;
}

// ── Tab title map ──
const TAB_TITLES: Record<TableTab, string> = {
  multiply: 'Times Table',
  fdp: 'Fraction · Decimal · %',
  powers: 'Powers & Bases',
  primes: 'Primes ≤ 100',
  factorial: 'Factorials',
  unitdigit: 'Unit Digit Cyclicity',
  algebra: 'Algebra Identities',
};

// ── Main component ──

interface Props {
  children: React.ReactNode;
  highlightRow?: number;
}

export default function ReferenceOverlay({ children, highlightRow }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TableTab>('multiply');
  const tableSlide = useRef(new Animated.Value(SCREEN_W)).current;
  const tableVisibleRef = useRef(false);
  const [tableVisible, setTableVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val && TABS.some((t) => t.key === val)) {
        setActiveTab(val as TableTab);
      }
    });
  }, []);

  const switchTab = useCallback((tab: TableTab) => {
    setActiveTab(tab);
    AsyncStorage.setItem(STORAGE_KEY, tab);
  }, []);

  const openPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gs) => {
        if (tableVisibleRef.current) return false;
        if (evt.nativeEvent.pageX < 40) return false;
        return gs.dx < -30 && Math.abs(gs.dx) > Math.abs(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -80 && !tableVisibleRef.current) {
          tableVisibleRef.current = true;
          setTableVisible(true);
          Keyboard.dismiss();
          Animated.spring(tableSlide, { toValue: 0, useNativeDriver: true, friction: 7 }).start();
        }
      },
    }),
  ).current;

  const dismissPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => {
        return gs.dx > 20 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5;
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > 60) {
          tableVisibleRef.current = false;
          Animated.timing(tableSlide, { toValue: SCREEN_W, duration: 250, useNativeDriver: true })
            .start(() => setTableVisible(false));
        }
      },
    }),
  ).current;

  const renderTable = () => {
    switch (activeTab) {
      case 'multiply': return <MultiplyGrid colors={colors} highlightRow={highlightRow} />;
      case 'fdp': return <FDPTable colors={colors} />;
      case 'powers': return <PowersTable colors={colors} />;
      case 'primes': return <PrimesTable colors={colors} />;
      case 'factorial': return <FactorialTable colors={colors} />;
      case 'unitdigit': return <UnitDigitTable colors={colors} />;
      case 'algebra': return <AlgebraRefTable colors={colors} />;
    }
  };

  return (
    <View style={{ flex: 1 }} {...openPan.panHandlers}>
      {children}

      {tableVisible && (
        <Animated.View
          style={[
            styles.overlay,
            { transform: [{ translateX: tableSlide }] },
          ]}
          {...dismissPan.panHandlers}
        >
          <View
            style={[
              styles.container,
              {
                backgroundColor: colors.card,
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
              },
            ]}
          >
            {/* Table content area */}
            <View style={styles.tableArea}>
              {/* Header with title */}
              <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.tableTitle, { color: colors.text }]}>
                  {TAB_TITLES[activeTab]}
                </Text>
              </View>
              {/* Scrollable table content */}
              <View style={{ flex: 1 }}>
                {renderTable()}
              </View>
            </View>

            {/* Vertical tab rail on right edge */}
            <View style={[styles.tabRail, { backgroundColor: colors.primary }]}>
              {TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tabBtn,
                    activeTab === tab.key && { backgroundColor: 'rgba(255,255,255,0.25)' },
                  ]}
                  onPress={() => switchTab(tab.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.tabLabel,
                    activeTab === tab.key && styles.tabLabelActive,
                  ]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

export function SwipeHint() {
  const { colors } = useTheme();
  return <Text style={[styles.swipeHint, { color: colors.muted }]}>← swipe for tables</Text>;
}

// ── Styles ──

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  tableArea: {
    flex: 1,
  },
  tableHeader: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tabRail: {
    width: 44,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  tabBtn: {
    width: 40,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
  },
  tabLabelActive: {
    color: '#FFF',
  },
  swipeHint: {
    ...Font.caption,
  },
});

const gridStyles = {
  row: { flexDirection: 'row' as const },
  cell: (size: number) => ({
    width: size,
    height: size,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  }),
  headerText: {
    fontWeight: '700' as const,
    color: '#FFF',
  },
  dataCell: (size: number) => ({
    width: size,
    height: size,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: StyleSheet.hairlineWidth,
  }),
};

const tblStyles = StyleSheet.create({
  container: { paddingBottom: Spacing.lg },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  left: {
    width: 60,
    fontSize: 16,
    fontWeight: '700',
  },
  right: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
});

const chipStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  chip: {
    minWidth: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  chipText: {
    fontSize: 18,
    fontWeight: '700',
  },
});

const cycleStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  base: {
    width: 40,
    fontSize: 18,
    fontWeight: '800',
  },
  chips: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  digit: {
    fontSize: 16,
    fontWeight: '700',
  },
  len: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
});
