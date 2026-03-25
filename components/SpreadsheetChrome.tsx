import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import MathText from './MathText';

const COLS = ['A', 'B', 'C', 'D', 'E', 'F'];

// Fake data that looks like a real product metrics report
const TOP_ROWS = [
  ['Channel', 'Q1', 'Q2', 'Q3', 'YTD', 'Var%'],
  ['SaaS', '14,230', '15,812', '16,044', '46,086', '+4.2'],
  ['Ent.', '9,871', '10,455', '11,002', '31,328', '+2.8'],
  ['SMB', '12,508', '13,190', '13,740', '39,438', '+3.5'],
  ['Self-srv', '11,344', '12,900', '13,310', '37,554', '+3.1'],
  ['Partner', '6,012', '6,540', '6,890', '19,442', '+2.4'],
  ['', '', '', '', '', ''],
  ['Costs', 'Q1', 'Q2', 'Q3', 'YTD', 'Var%'],
  ['Infra', '3,210', '3,480', '3,612', '10,302', '+4.8'],
  ['S&M', '5,840', '6,120', '6,350', '18,310', '+3.6'],
];
const MID_ROWS = [
  ['Total', '47,953', '51,357', '53,096', '152,406', '+3.4'],
];
const BOTTOM_ROWS = [
  ['Budget', '48,000', '50,000', '52,000', '150,000', ''],
  ['Δ', '-47', '+1,357', '+1,096', '+2,406', '+1.6'],
  ['', '', '', '', '', ''],
  ['KPIs', 'Target', 'Actual', 'Diff', '', ''],
  ['DAU', '84,500', '91,200', '+7.9%', '', ''],
];
const FILL_ROWS = [
  ['MAU', '312K', '298K', '-4.5%', '', ''],
  ['Retn D7', '42%', '44.1%', '+2.1', '', ''],
  ['Retn D30', '18%', '19.6%', '+1.6', '', ''],
  ['ARPU', '$4.20', '$4.55', '+8.3%', '', ''],
  ['LTV', '$38.10', '$41.20', '+8.1%', '', ''],
  ['CAC', '$12.50', '$11.80', '-5.6%', '', ''],
  ['Churn', '3.8%', '3.2%', '-0.6', '', ''],
  ['NPS', '52', '57', '+5', '', ''],
  ['CSAT', '4.2', '4.4', '+0.2', '', ''],
  ['P0 bugs', '3', '1', '-66%', '', ''],
  ['Uptime', '99.95%', '99.98%', '', '', ''],
  ['Latency', '142ms', '128ms', '-9.9%', '', ''],
];

export interface WorkModeProps {
  /** Shown in formula bar as "fx ..." */
  formula?: string;
  /** Cell reference label, e.g. "C5" */
  cellRef?: string;
  /** Multiple-choice options rendered as tappable cells */
  options?: { label: string; onPress: () => void }[];
  /** For numeric text input mode */
  inputValue?: string;
  onInputChange?: (v: string) => void;
  onInputSubmit?: () => void;
  /** Feedback: null = none, 'correct' | 'wrong' */
  feedbackState?: 'correct' | 'wrong' | null;
  /** Correct answer to show in cell after feedback */
  correctAnswer?: string;
  /** Optional richer text to show only in the active cell after feedback */
  revealedAnswer?: string;
  /** Optional peeked value shown before submission */
  peekValue?: string;
  peekVisible?: boolean;
  /** The option the user selected (for highlighting) */
  selectedValue?: string;
  selectedOptionTranslateX?: Animated.Value;
  selectedOptionTranslateY?: Animated.Value;
  selectedOptionScale?: Animated.Value;
  /** Trigger peek reveal */
  onPeek?: () => void;
  /** Back navigation */
  onBack?: () => void;
  /** Continue to next */
  onNext?: () => void;
  /** Repeat same question */
  onRepeat?: () => void;
}

interface Props extends WorkModeProps {
  children: React.ReactNode;
  panHandlers?: Record<string, any>;
}

export default function SpreadsheetChrome({ children, formula, panHandlers, ...workProps }: Props) {
  const { isWork, colors, isWorkDark, toggleWorkDark } = useTheme();

  if (!isWork) return <>{children}</>;

  // Hub screens pass no formula — just pass through children in work mode too
  if (!formula) return <>{children}</>;

    const { cellRef, options, inputValue, onInputChange, onInputSubmit,
      feedbackState, correctAnswer, revealedAnswer, peekValue, peekVisible, selectedValue,
      selectedOptionTranslateX, selectedOptionTranslateY, selectedOptionScale,
      onPeek, onBack, onNext, onRepeat } = workProps;
  const inputRef = useRef<TextInput>(null);

  const cellBorder = { borderRightWidth: 1, borderRightColor: colors.border };
  const rowBorder = { borderBottomWidth: 1, borderBottomColor: colors.border };
  const isHeaderRow = (i: number) => i === 0;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (inputValue === undefined || !onInputChange) return;

    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const isTextEntry = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
      if (isTextEntry) return;

      const key = event.key;
      const isValueKey = /^[0-9]$/.test(key) || key === '.' || key === '/' || key === '-';

      if (isValueKey) {
        event.preventDefault();
        inputRef.current?.focus();
        onInputChange(`${inputValue}${key}`);
        return;
      }

      if (key === 'Backspace') {
        event.preventDefault();
        inputRef.current?.focus();
        onInputChange(inputValue.slice(0, -1));
        return;
      }

      if ((key === 'Enter' || key === ' ') && onInputSubmit) {
        event.preventDefault();
        inputRef.current?.focus();
        onInputSubmit();
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [inputValue, onInputChange, onInputSubmit]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} {...panHandlers}>
      {/* Toolbar */}
      <View style={[styles.toolbar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} hitSlop={12}>
          <Text style={[styles.toolbarNav, { color: colors.muted }]}>← Reports</Text>
        </TouchableOpacity>
        <Text style={[styles.toolbarTitle, { color: colors.text }]}>Q3_Performance.xlsx</Text>
        <TouchableOpacity onPress={toggleWorkDark} hitSlop={12}>
          <Text style={[styles.toolbarNav, { color: colors.muted }]}>{isWorkDark ? '☀' : '☾'}</Text>
        </TouchableOpacity>
      </View>

      {/* Column headers */}
      <View style={[styles.row, rowBorder, { backgroundColor: colors.card }]}>
        <View style={[styles.rowNum, cellBorder]} />
        {COLS.map((c) => (
          <View key={c} style={[styles.col, cellBorder]}>
            <Text style={[styles.colText, { color: colors.muted }]}>{c}</Text>
          </View>
        ))}
      </View>

      {/* Top data rows */}
      {TOP_ROWS.map((row, i) => (
        <View key={`t${i}`} style={[styles.row, rowBorder]}>
          <View style={[styles.rowNum, cellBorder, { backgroundColor: colors.card }]}>
            <Text style={[styles.rowNumText, { color: colors.muted }]}>{i + 1}</Text>
          </View>
          {row.map((cell, j) => (
            <View key={j} style={[styles.col, cellBorder]}>
              <Text
                style={[styles.cellText, { color: isHeaderRow(i) ? colors.muted : colors.text }]}
                numberOfLines={1}
              >
                {cell}
              </Text>
            </View>
          ))}
        </View>
      ))}

      {/* Formula bar — positioned right above the active cell */}
      <View style={[styles.formulaBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.cellRefBox, { backgroundColor: colors.border }]}>
          <Text style={[styles.cellRefText, { color: colors.text }]}>{cellRef || 'C5'}</Text>
        </View>
        <Text style={[styles.fxLabel, { color: colors.muted }]}>fx</Text>
        <View style={styles.formulaValue}>
          <MathText
            text={formula || ''}
            style={[styles.formulaText, { color: colors.text }, styles.leftAlignedText]}
            compact
            containerStyle={styles.leftAlignedContent}
          />
          {feedbackState && correctAnswer ? (
            <MathText
              text={` = ${revealedAnswer ?? correctAnswer}`}
              style={[styles.formulaText, { color: colors.correct, fontWeight: '600' }]}
              compact
            />
          ) : peekVisible && peekValue ? (
            <MathText
              text={` = ${peekValue}`}
              style={[styles.formulaText, { color: colors.correct, fontWeight: '600' }]}
              compact
            />
          ) : null}
        </View>
      </View>

      {/* Active row — game content lives here */}
      <View style={[styles.row, rowBorder]}>
        <View style={[styles.rowNum, cellBorder, { backgroundColor: colors.card }]}>
          <Text style={[styles.rowNumText, { color: colors.muted }]}>{TOP_ROWS.length + 1}</Text>
        </View>
        <View style={[styles.col, cellBorder]}>
          <Text style={[styles.cellText, { color: colors.text }]} numberOfLines={1}>Online</Text>
        </View>
        {/* Cells B and C: filler */}
        <View style={[styles.col, cellBorder]}>
          <Text style={[styles.cellText, { color: colors.text }]}>11,344</Text>
        </View>
        {/* Cell C: the "active" cell — shows answer or input */}
        <View style={[styles.activeCol, cellBorder, {
          borderColor: feedbackState === 'correct' ? colors.correct
            : feedbackState === 'wrong' ? colors.error
            : colors.primary,
          backgroundColor: feedbackState === 'correct' ? colors.correct + '15'
            : feedbackState === 'wrong' ? colors.error + '15'
            : colors.primary + '10',
        }]}>
          {inputValue !== undefined ? (
            <TextInput
              ref={inputRef}
              style={[styles.cellInput, { color: colors.text }]}
              value={inputValue}
              onChangeText={onInputChange}
              onSubmitEditing={onInputSubmit}
              keyboardType="number-pad"
              autoFocus
              returnKeyType="done"
              placeholder="—"
              placeholderTextColor={colors.muted}
            />
          ) : (
            <Text style={[styles.cellText, { color: colors.muted }]}>—</Text>
          )}
        </View>
        {/* Remaining cells */}
        <View style={[styles.col, cellBorder]}>
          <Text style={[styles.cellText, { color: colors.text }]}>35,554</Text>
        </View>
        <View style={[styles.col, cellBorder]}>
          <Text style={[styles.cellText, { color: colors.text }]}>+3.1</Text>
        </View>
      </View>

      {/* Mid data rows — between active row and options */}
      {MID_ROWS.map((row, i) => (
        <View key={`m${i}`} style={[styles.row, rowBorder]}>
          <View style={[styles.rowNum, cellBorder, { backgroundColor: colors.card }]}>
            <Text style={[styles.rowNumText, { color: colors.muted }]}>{TOP_ROWS.length + 2 + i}</Text>
          </View>
          {row.map((cell, j) => (
            <View key={j} style={[styles.col, cellBorder]}>
              <Text
                style={[styles.cellText, {
                  color: cell.startsWith('+') ? '#548235' : cell.startsWith('-') ? '#C00000' : colors.text,
                }]}
                numberOfLines={1}
              >
                {cell}
              </Text>
            </View>
          ))}
        </View>
      ))}

      {/* Options area — looks like a cell dropdown or data entry area */}
      {options && options.length > 0 && (
        <View style={[styles.dropdownArea, { borderColor: colors.border }]}>
          {options.map((opt, i) => {
            const isSelected = selectedValue === opt.label;
            const isCorrect = feedbackState && correctAnswer === opt.label;
            const isWrong = feedbackState === 'wrong' && isSelected && !isCorrect;
            return (
              <Animated.View
                key={i}
                style={isSelected ? {
                  transform: [
                    { translateX: selectedOptionTranslateX ?? 0 },
                    { translateY: selectedOptionTranslateY ?? 0 },
                    { scale: selectedOptionScale ?? 1 },
                  ],
                } : undefined}
              >
                <TouchableOpacity
                  style={[
                    styles.dropdownRow,
                    { borderBottomColor: colors.border },
                    isCorrect && feedbackState && { backgroundColor: colors.correct + '18' },
                    isWrong && { backgroundColor: colors.error + '18' },
                  ]}
                  onPress={feedbackState && isCorrect ? onNext : opt.onPress}
                  disabled={!!feedbackState && !isCorrect}
                  activeOpacity={0.6}
                >
                  <MathText
                    text={opt.label}
                    style={[
                      styles.dropdownText,
                      { color: colors.text },
                      ...(isCorrect && feedbackState ? [{ color: colors.correct, fontWeight: '600' as const }] : []),
                      ...(isWrong ? [{ color: colors.error }] : []),
                      styles.leftAlignedText,
                    ]}
                    compact
                    containerStyle={[styles.dropdownContent, styles.leftAlignedContent]}
                  />
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      )}

      {/* Navigation — looks like status bar action */}

      {/* Bottom data rows */}
      {BOTTOM_ROWS.map((row, i) => (
        <View key={`b${i}`} style={[styles.row, rowBorder]}>
          <View style={[styles.rowNum, cellBorder, { backgroundColor: colors.card }]}>
            <Text style={[styles.rowNumText, { color: colors.muted }]}>{TOP_ROWS.length + 2 + MID_ROWS.length + i}</Text>
          </View>
          {row.map((cell, j) => (
            <View key={j} style={[styles.col, cellBorder]}>
              <Text
                style={[styles.cellText, {
                  color: cell.startsWith('+') ? '#548235' : cell.startsWith('-') ? '#C00000' : colors.text,
                }]}
                numberOfLines={1}
              >
                {cell}
              </Text>
            </View>
          ))}
        </View>
      ))}

      {/* Fill remaining space with more data rows */}
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {FILL_ROWS.map((row, i) => (
          <View key={`f${i}`} style={[styles.row, rowBorder]}>
            <View style={[styles.rowNum, cellBorder, { backgroundColor: colors.card }]}>
              <Text style={[styles.rowNumText, { color: colors.muted }]}>{TOP_ROWS.length + 2 + MID_ROWS.length + BOTTOM_ROWS.length + i}</Text>
            </View>
            {row.map((cell, j) => (
              <View key={j} style={[styles.col, cellBorder]}>
                <Text
                  style={[styles.cellText, {
                    color: cell.startsWith('+') ? '#548235' : cell.startsWith('-') ? '#C00000' : colors.text,
                  }]}
                  numberOfLines={1}
                >
                  {cell}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* Action bar — just above sheet tabs, near thumb */}
      <View style={[styles.actionBar, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
        {feedbackState ? (
          <>
            {onRepeat && (
              <TouchableOpacity onPress={onRepeat} style={styles.actionBtn}>
                <Text style={[styles.actionText, { color: colors.muted }]}>↺ Recalc</Text>
              </TouchableOpacity>
            )}
            {onNext && (
              <TouchableOpacity onPress={onNext} style={[styles.actionBtn, { borderWidth: 1, borderColor: colors.border }]}>
                <Text style={[styles.actionText, { color: colors.text }]}>Next ▸</Text>
              </TouchableOpacity>
            )}
          </>
        ) : onPeek ? (
          <TouchableOpacity onPress={onPeek} style={styles.actionBtn}>
            <Text style={[styles.actionText, { color: colors.muted }]}>Reveal</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Sheet tabs */}
      <View style={[styles.sheetTabs, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={[styles.tab, styles.activeTab, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.tabText, { color: colors.text }]}>Summary</Text>
        </View>
        <View style={styles.tab}>
          <Text style={[styles.tabText, { color: colors.muted }]}>Raw Data</Text>
        </View>
        <View style={styles.tab}>
          <Text style={[styles.tabText, { color: colors.muted }]}>Charts</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  toolbarNav: {
    fontSize: 13,
    fontWeight: '500',
  },
  toolbarTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  formulaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottomWidth: 1,
    gap: 6,
    minHeight: 34,
  },
  cellRefBox: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 3,
    minWidth: 32,
    alignItems: 'center',
  },
  cellRefText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Courier',
  },
  fxLabel: {
    fontSize: 11,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  formulaText: {
    fontSize: 12,
    fontFamily: 'Courier',
  },
  formulaValue: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  leftAlignedContent: {
    justifyContent: 'flex-start',
  },
  leftAlignedText: {
    textAlign: 'left',
  },
  row: {
    flexDirection: 'row',
    height: 28,
  },
  rowNum: {
    width: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowNumText: {
    fontSize: 10,
    fontWeight: '500',
  },
  col: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  colText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  cellText: {
    fontSize: 11,
    fontFamily: 'Courier',
  },
  activeCol: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
  },
  cellInput: {
    fontSize: 11,
    fontFamily: 'Courier',
    padding: 0,
    margin: 0,
    height: 24,
  },
  dropdownArea: {
    marginLeft: 28,
    marginRight: 0,
    borderWidth: 1,
    borderTopWidth: 0,
  },
  dropdownRow: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownText: {
    fontSize: 13,
    fontFamily: 'Courier',
  },
  dropdownContent: {
    justifyContent: 'flex-start',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sheetTabs: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 4,
    borderTopWidth: 1,
    gap: 2,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeTab: {
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
