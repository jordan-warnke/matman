import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Keyboard,
    PanResponder,
  Platform,
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
const PAPER_SOUND = require('../assets/paper.wav');

type TableTab = 'multiply' | 'fdp' | 'powers' | 'primes' | 'factorial' | 'unitdigit' | 'algebra';

export type { TableTab };

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

function MultiplyGrid({ colors, highlightRow, highlightCol, minNumber, maxNumber, excludedNumbers }: { colors: any; highlightRow?: number; highlightCol?: number; minNumber?: number; maxNumber?: number; excludedNumbers?: number[] }) {
  // Auto-fit all 14 columns (1 header + 13 data) into available width – no horizontal scroll needed
  const TAB_RAIL_W = 44;
  const COLS = 14;
  const CELL = Math.floor((SCREEN_W - TAB_RAIL_W) / COLS);
  const FONT = CELL >= 30 ? 12 : CELL >= 24 ? 10 : 9;
  const H_FONT = CELL >= 30 ? 13 : CELL >= 24 ? 11 : 9;
  const PAIR_FONT = CELL >= 30 ? 7 : CELL >= 24 ? 6 : 5;
  const nums = Array.from({ length: 13 }, (_, i) => i + 1);

  const min = minNumber ?? 1;
  const max = maxNumber ?? 13;
  const excluded = new Set(excludedNumbers ?? []);
  const isActive = (n: number) => n >= min && n <= max && !excluded.has(n);
  const isRelevant = (n: number) => isActive(n) || highlightRow === n || highlightCol === n;

  return (
    <ScrollView style={{ flex: 1 }}>
      <View>
        {/* Header row */}
        <View style={gridStyles.row}>
          <View style={[gridStyles.cell(CELL), { backgroundColor: colors.primary }]}>
            <Text style={[gridStyles.headerText, { fontSize: H_FONT }]}>×</Text>
          </View>
          {nums.map((n) => {
            const isHL = highlightCol === n;
            return (
              <View
                key={n}
                style={[
                  gridStyles.cell(CELL),
                  { backgroundColor: colors.primary, opacity: isRelevant(n) ? 1 : 0.3 },
                  isHL && { backgroundColor: colors.accent },
                ]}
              >
                <Text style={[gridStyles.headerText, { fontSize: H_FONT }, isHL && { fontWeight: '900' }]}>{n}</Text>
              </View>
            );
          })}
        </View>
        {/* Data rows */}
        {nums.map((row) => {
          const isHL = highlightRow === row;
          const rowActive = isRelevant(row);
          return (
            <View key={row} style={[gridStyles.row, isHL && { backgroundColor: colors.primary + '10' }]}> 
              <View style={[gridStyles.cell(CELL), { backgroundColor: colors.primary, opacity: rowActive ? (isHL ? 1 : 0.85) : 0.3 }]}>
                <Text style={[gridStyles.headerText, { fontSize: H_FONT }, isHL && { fontWeight: '900' }]}>{row}</Text>
              </View>
              {nums.map((col) => {
                const colHL = highlightCol === col;
                const colActive = isRelevant(col);
                const cellActive = rowActive && colActive;
                const cellHL = isHL || colHL;
                const intersection = isHL && colHL;
                return (
                  <View
                    key={col}
                    style={[
                      gridStyles.dataCell(CELL),
                      { borderColor: colors.border },
                      !isHL && row % 2 === 0 && { backgroundColor: colors.background },
                      cellHL && { backgroundColor: colors.primary + '08' },
                      intersection && { backgroundColor: colors.primary + '12', borderColor: colors.border },
                    ]}
                  >
                    <View style={gridStyles.dataContent}>
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: FONT,
                          fontWeight: cellHL ? '600' : '500',
                          textAlign: 'center',
                          opacity: cellActive ? 1 : 0.2,
                        }}
                      >
                        {row * col}
                      </Text>
                      <Text
                        style={{
                          color: colors.muted,
                          fontSize: PAIR_FONT,
                          lineHeight: PAIR_FONT + 1,
                          textAlign: 'center',
                          opacity: cellActive ? 0.75 : 0.18,
                        }}
                      >
                        {CELL >= 24 ? `(${row}×${col})` : `${row}×${col}`}
                      </Text>
                    </View>
                  </View>
                );
              })}
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

interface ReferenceBrowserProps {
  activeTab?: TableTab;
  onTabChange?: (tab: TableTab) => void;
  highlightRow?: number;
  highlightCol?: number;
  minNumber?: number;
  maxNumber?: number;
  excludedNumbers?: number[];
}

export function ReferenceBrowser({
  activeTab = 'multiply',
  onTabChange,
  highlightRow,
  highlightCol,
  minNumber,
  maxNumber,
  excludedNumbers,
}: ReferenceBrowserProps) {
  const { colors } = useTheme();

  const renderTable = () => {
    switch (activeTab) {
      case 'multiply': return <MultiplyGrid colors={colors} highlightRow={highlightRow} highlightCol={highlightCol} minNumber={minNumber} maxNumber={maxNumber} excludedNumbers={excludedNumbers} />;
      case 'fdp': return <FDPTable colors={colors} />;
      case 'powers': return <PowersTable colors={colors} />;
      case 'primes': return <PrimesTable colors={colors} />;
      case 'factorial': return <FactorialTable colors={colors} />;
      case 'unitdigit': return <UnitDigitTable colors={colors} />;
      case 'algebra': return <AlgebraRefTable colors={colors} />;
    }
  };

  return (
    <View style={[styles.browserShell, { backgroundColor: colors.card }]}> 
      <View style={styles.tableArea}>
        <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}> 
          <Text style={[styles.tableTitle, { color: colors.text }]}>
            {TAB_TITLES[activeTab]}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          {renderTable()}
        </View>
      </View>

      <View style={[styles.tabRail, { backgroundColor: colors.primary }]}> 
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabBtn,
              activeTab === tab.key && { backgroundColor: 'rgba(255,255,255,0.25)' },
            ]}
            onPress={() => onTabChange?.(tab.key)}
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
  );
}

// ── Main component ──

interface Props {
  children: React.ReactNode;
  highlightRow?: number;
  highlightCol?: number;
  minNumber?: number;
  maxNumber?: number;
  excludedNumbers?: number[];
}

export default function ReferenceOverlay({ children, highlightRow, highlightCol, minNumber, maxNumber, excludedNumbers }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TableTab>('multiply');
  const tableSlide = useRef(new Animated.Value(24)).current;
  const tableOpacity = useRef(new Animated.Value(0)).current;
  const tableVisibleRef = useRef(false);
  const [tableVisible, setTableVisible] = useState(false);
  const paperAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val && TABS.some((t) => t.key === val)) {
        setActiveTab(val as TableTab);
      }
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof Audio === 'undefined') return;
    const soundModule = PAPER_SOUND as { uri?: string; default?: string } | string;
    const soundUri = typeof soundModule === 'string'
      ? soundModule
      : soundModule.uri ?? soundModule.default;
    if (!soundUri) return;

    const audio = new Audio(soundUri);
    audio.volume = 0.35;
    paperAudioRef.current = audio;
    return () => {
      audio.pause();
      paperAudioRef.current = null;
    };
  }, []);

  const playPaperSound = useCallback(() => {
    if (Platform.OS !== 'web') return;
    const audio = paperAudioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Ignore autoplay restrictions on web until the user has interacted.
    });
  }, []);

  const openTable = useCallback(() => {
    if (tableVisibleRef.current) return;
    tableVisibleRef.current = true;
    setTableVisible(true);
    Keyboard.dismiss();
    playPaperSound();
    tableSlide.setValue(24);
    tableOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(tableSlide, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(tableOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [playPaperSound, tableOpacity, tableSlide]);

  const closeTable = useCallback(() => {
    if (!tableVisibleRef.current) return;
    tableVisibleRef.current = false;
    playPaperSound();
    Animated.parallel([
      Animated.timing(tableSlide, { toValue: 18, duration: 180, useNativeDriver: true }),
      Animated.timing(tableOpacity, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => setTableVisible(false));
  }, [playPaperSound, tableOpacity, tableSlide]);

  const toggleTable = useCallback(() => {
    if (tableVisibleRef.current) {
      closeTable();
    } else {
      openTable();
    }
  }, [closeTable, openTable]);

  const switchTab = useCallback((tab: TableTab) => {
    setActiveTab(tab);
    AsyncStorage.setItem(STORAGE_KEY, tab);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handler = (evt: KeyboardEvent) => {
      const target = evt.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

      if (evt.key === 'Tab') {
        evt.preventDefault();
        toggleTable();
        return;
      }

      if (evt.key === 'Escape' && tableVisibleRef.current) {
        evt.preventDefault();
        closeTable();
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [closeTable, toggleTable]);

  const openPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gs) => {
        if (tableVisibleRef.current) return false;
        if (evt.nativeEvent.pageX < 40) return false;
        return gs.dx < -30 && Math.abs(gs.dx) > Math.abs(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -80 && !tableVisibleRef.current) {
          openTable();
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
          closeTable();
        }
      },
    }),
  ).current;

  const renderTable = () => {
    switch (activeTab) {
      case 'multiply': return <MultiplyGrid colors={colors} highlightRow={highlightRow} highlightCol={highlightCol} minNumber={minNumber} maxNumber={maxNumber} excludedNumbers={excludedNumbers} />;
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
            { opacity: tableOpacity, transform: [{ translateX: tableSlide }] },
          ]}
          {...dismissPan.panHandlers}
        >
          <View
            style={[
              styles.container,
              {
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
              },
            ]}
          >
            <ReferenceBrowser
              activeTab={activeTab}
              onTabChange={switchTab}
              highlightRow={highlightRow}
              highlightCol={highlightCol}
              minNumber={minNumber}
              maxNumber={maxNumber}
              excludedNumbers={excludedNumbers}
            />
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
  browserShell: {
    flex: 1,
    flexDirection: 'row',
  },
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
  dataContent: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
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
