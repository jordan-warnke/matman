import React, { useEffect, useState } from 'react';
import {
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { Font, Spacing } from '../constants/Theme';
import { useTheme } from '../contexts/ThemeContext';
import {
    GameType,
    ModeSettings,
    sanitizeModeSettings,
    saveModeSettings,
} from '../store/HistoryStore';

const GAUNTLET_GROUP_LABELS: Record<string, string> = {
  identities: 'Identities',
  exponents: 'Exponents',
  quadratics: 'Quadratics',
  inequalities: 'Inequalities',
};

const FACTORING_GROUP_LABELS: Record<string, string> = {
  'diff-squares': 'Diff. of Squares',
  'perfect-sq': 'Perfect Sq. Tri.',
  trinomials: 'Trinomials',
  gcf: 'GCF',
  'leading-coeff': 'Leading Coeff.',
  cubes: 'Sum/Diff Cubes',
};

export interface SettingsFields {
  maxNumber?: { min: number; max: number };
  minNumber?: { min: number; max: number };
  timePerProblem?: boolean;
  anchor?: boolean;
  problemCount?: boolean;
  questionStyle?: boolean;
  operationType?: boolean;
  excludedNumbers?: boolean;
  shuffleOrder?: boolean;
  maxNumerator?: { min: number; max: number };
  maxDenominator?: { min: number; max: number };
  gauntletCategories?: boolean;
  factoringCategories?: boolean;
  operandMode?: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  gameType: GameType;
  settings: ModeSettings;
  onSettingsChange: (s: ModeSettings) => void;
  fields: SettingsFields;
}

export default function GameSettingsModal({
  visible,
  onClose,
  gameType,
  settings,
  onSettingsChange,
  fields,
}: Props) {
  const { colors } = useTheme();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      setDrafts({
        maxNumber: String(settings.maxNumber),
        minNumber: String(settings.minNumber),
        timeAttackSeconds: String(settings.timeAttackSeconds),
        anchor: settings.anchor ? String(settings.anchor) : '',
        problemCount: settings.problemCount ? String(settings.problemCount) : '',
        maxNumerator: settings.maxNumerator ? String(settings.maxNumerator) : '',
        maxDenominator: settings.maxDenominator ? String(settings.maxDenominator) : '',
      });
    }
  }, [visible, settings]);

  function clamp(raw: string, min: number, max: number): number {
    const n = parseInt(raw, 10);
    if (isNaN(n) || n < min) return min;
    if (n > max) return max;
    return n;
  }

  async function patch(update: Partial<ModeSettings>) {
    const next = sanitizeModeSettings({ ...settings, ...update });
    onSettingsChange(next);
    await saveModeSettings(gameType, next);
  }

  const maxRange = fields.maxNumber ?? { min: 1, max: 13 };
  const minRange = fields.minNumber ?? { min: 1, max: 13 };

  /** Commit all drafts and close */
  function handleDone() {
    Keyboard.dismiss();
    const update: Partial<ModeSettings> = {};

    if (fields.maxNumber) {
      update.maxNumber = clamp(drafts.maxNumber, maxRange.min, maxRange.max);
    }
    if (fields.minNumber) {
      update.minNumber = clamp(drafts.minNumber, minRange.min, minRange.max);
      // ensure min doesn't exceed max
      if (update.maxNumber !== undefined && update.minNumber > update.maxNumber) {
        update.minNumber = update.maxNumber;
      }
    }
    if (fields.timePerProblem) {
      update.timeAttackSeconds = clamp(drafts.timeAttackSeconds, 1, 60);
    }
    if (fields.anchor) {
      const n = parseInt(drafts.anchor, 10);
      update.anchor = isNaN(n) || n < 1 ? null : Math.min(n, maxRange.max);
    }
    if (fields.problemCount) {
      const n = parseInt(drafts.problemCount, 10);
      update.problemCount = isNaN(n) || n < 1 ? 0 : Math.min(n, 100);
    }
    if (fields.maxNumerator) {
      const n = parseInt(drafts.maxNumerator, 10);
      const range = fields.maxNumerator;
      update.maxNumerator = isNaN(n) || n < range.min ? null : Math.min(n, range.max);
    }
    if (fields.maxDenominator) {
      const n = parseInt(drafts.maxDenominator, 10);
      const range = fields.maxDenominator;
      update.maxDenominator = isNaN(n) || n < range.min ? null : Math.min(n, range.max);
    }

    patch(update);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.overlay}>
            <View style={[styles.modal, { backgroundColor: colors.card }]}>
              <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

              <ScrollView bounces={false} keyboardShouldPersistTaps="handled">

                {fields.anchor && (
                  <View style={styles.row}>
                    <Text style={[styles.label, { color: colors.text }]}>Anchor number</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.border, color: colors.text }]}
                      keyboardType="number-pad"
                      placeholder="off"
                      placeholderTextColor={colors.muted}
                      value={drafts.anchor ?? ''}
                      onChangeText={(v) => setDrafts((d) => ({ ...d, anchor: v }))}
                      maxLength={2}
                    />
                  </View>
                )}

                {fields.minNumber && (
                  <View style={styles.row}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      Min number ({minRange.min}–{minRange.max})
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.border, color: colors.text }]}
                      keyboardType="number-pad"
                      value={drafts.minNumber ?? ''}
                      onChangeText={(v) => setDrafts((d) => ({ ...d, minNumber: v }))}
                      maxLength={3}
                    />
                  </View>
                )}

                {fields.maxNumber && (
                  <View style={styles.row}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      Max number ({maxRange.min}–{maxRange.max})
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.border, color: colors.text }]}
                      keyboardType="number-pad"
                      value={drafts.maxNumber ?? ''}
                      onChangeText={(v) => setDrafts((d) => ({ ...d, maxNumber: v }))}
                      maxLength={3}
                    />
                  </View>
                )}

                {fields.timePerProblem && (
                  <View style={styles.row}>
                    <Text style={[styles.label, { color: colors.text }]}>Time per problem (s)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.border, color: colors.text }]}
                      keyboardType="number-pad"
                      value={drafts.timeAttackSeconds ?? ''}
                      onChangeText={(v) => setDrafts((d) => ({ ...d, timeAttackSeconds: v }))}
                      maxLength={2}
                    />
                  </View>
                )}

                {fields.problemCount && (
                  <View style={styles.row}>
                    <Text style={[styles.label, { color: colors.text }]}>Problem count</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.border, color: colors.text }]}
                      keyboardType="number-pad"
                      placeholder="∞"
                      placeholderTextColor={colors.muted}
                      value={drafts.problemCount ?? ''}
                      onChangeText={(v) => setDrafts((d) => ({ ...d, problemCount: v }))}
                      maxLength={3}
                    />
                  </View>
                )}


                {fields.operationType && (
                  <View style={{ gap: Spacing.xs }}>
                    <Text style={[styles.label, { color: colors.text }]}>Operation</Text>
                    <View style={[styles.segmented, { backgroundColor: colors.border }]}>
                      {(['multiply', 'squares', 'cubes'] as const).map((opt) => {
                        const active = (settings.operationType ?? 'multiply') === opt;
                        return (
                          <TouchableOpacity
                            key={opt}
                            style={[
                              styles.segmentBtn,
                              active && { backgroundColor: colors.primary },
                            ]}
                            activeOpacity={0.7}
                            onPress={() => patch({ operationType: opt })}
                          >
                            <Text
                              style={[
                                styles.segmentText,
                                { color: active ? '#FFF' : colors.text },
                              ]}
                            >
                              {opt === 'multiply' ? '× Multiply' : opt === 'squares' ? 'x² Squares' : 'x³ Cubes'}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {fields.questionStyle && (() => {
                  const op = settings.operationType ?? 'multiply';
                  const labels: Record<string, [string, string, string]> = {
                    multiply: ['× Multiply', '÷ Divide', '× ÷ Mix'],
                    squares:  ['x² Square', '√ Root', 'x²√ Mix'],
                    cubes:    ['x³ Cube', '∛ Cube Root', 'x³∛ Mix'],
                  };
                  const [stdLabel, revLabel, mixLabel] = labels[op] ?? labels.multiply;
                  return (
                    <View style={{ gap: Spacing.xs }}>
                      <Text style={[styles.label, { color: colors.text }]}>Direction</Text>
                      <View style={[styles.segmented, { backgroundColor: colors.border }]}>
                        {(['standard', 'reverse', 'mix'] as const).map((opt) => {
                          const active = (settings.questionStyle ?? 'standard') === opt;
                          return (
                            <TouchableOpacity
                              key={opt}
                              style={[
                                styles.segmentBtn,
                                active && { backgroundColor: colors.primary },
                              ]}
                              activeOpacity={0.7}
                              onPress={() => patch({ questionStyle: opt })}
                            >
                              <Text
                                style={[
                                  styles.segmentText,
                                  { color: active ? '#FFF' : colors.text },
                                ]}
                              >
                                {opt === 'standard' ? stdLabel : opt === 'reverse' ? revLabel : mixLabel}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })()}

                {fields.excludedNumbers && (settings.operationType ?? 'multiply') === 'multiply' && (
                  <View style={styles.row}>
                    <Text style={[styles.label, { color: colors.text }]}>Exclude perfect-square pairs</Text>
                    <TouchableOpacity
                      style={[
                        styles.inlineToggle,
                        { backgroundColor: settings.excludeSquarePairs ? colors.primary : colors.border },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => patch({ excludeSquarePairs: !settings.excludeSquarePairs })}
                    >
                      <Text style={[styles.inlineToggleText, { color: settings.excludeSquarePairs ? '#FFF' : colors.text }]}> 
                        {settings.excludeSquarePairs ? 'On' : 'Off'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {fields.excludedNumbers && (() => {
                  const range = fields.maxNumber ?? { min: 1, max: 13 };
                  const nums = Array.from({ length: range.max - range.min + 1 }, (_, i) => i + range.min);
                  const activeSet = new Set(
                    nums.filter((n) => !(settings.excludedNumbers ?? []).includes(n)),
                  );
                  return (
                    <View style={{ gap: Spacing.xs }}>
                      <Text style={[styles.label, { color: colors.text }]}>Numbers in play</Text>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>
                        Known items stay suppressed. At least one number in the active range remains available.
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {nums.map((n) => {
                          const excluded = (settings.excludedNumbers ?? []).includes(n);
                          const anchorLocked = settings.anchor === n;
                          const isLastActive = !excluded && activeSet.size <= 1;
                          const disabled = anchorLocked || isLastActive;
                          return (
                            <TouchableOpacity
                              key={n}
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 10,
                                justifyContent: 'center',
                                alignItems: 'center',
                                backgroundColor: excluded ? colors.border : colors.primary,
                                opacity: disabled ? 0.55 : excluded ? 0.4 : 1,
                              }}
                              activeOpacity={0.7}
                              disabled={disabled}
                              onPress={() => {
                                const current = settings.excludedNumbers ?? [];
                                const next = excluded
                                  ? current.filter((x) => x !== n)
                                  : [...current, n];
                                patch({ excludedNumbers: next });
                              }}
                            >
                              <Text style={{ fontSize: 15, fontWeight: '700', color: excluded ? colors.text : '#FFF' }}>{n}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })()}

                {fields.shuffleOrder && (
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { color: colors.text }]}>Shuffle factor order</Text>
                      <Text style={{ fontSize: 12, color: colors.muted }}>Show 9×10 and 10×9</Text>
                    </View>
                    <Switch
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor="#FFF"
                      value={settings.shuffleOrder ?? false}
                      onValueChange={(v) => patch({ shuffleOrder: v })}
                    />
                  </View>
                )}

                {fields.maxNumerator && (
                  <View style={styles.row}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      Max numerator ({fields.maxNumerator.min}–{fields.maxNumerator.max})
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.border, color: colors.text }]}
                      keyboardType="number-pad"
                      placeholder="all"
                      placeholderTextColor={colors.muted}
                      value={drafts.maxNumerator ?? ''}
                      onChangeText={(v) => setDrafts((d) => ({ ...d, maxNumerator: v }))}
                      maxLength={2}
                    />
                  </View>
                )}

                {fields.maxDenominator && (
                  <View style={styles.row}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      Max denominator ({fields.maxDenominator.min}–{fields.maxDenominator.max})
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.border, color: colors.text }]}
                      keyboardType="number-pad"
                      placeholder="all"
                      placeholderTextColor={colors.muted}
                      value={drafts.maxDenominator ?? ''}
                      onChangeText={(v) => setDrafts((d) => ({ ...d, maxDenominator: v }))}
                      maxLength={2}
                    />
                  </View>
                )}

                {fields.gauntletCategories && (
                  <View style={{ gap: Spacing.xs }}>
                    <Text style={[styles.label, { color: colors.text }]}>Categories</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {Object.entries(GAUNTLET_GROUP_LABELS).map(([key, label]) => {
                        const active = (settings.gauntletCategories ?? []).includes(key);
                        const isLast = active && (settings.gauntletCategories ?? []).length <= 1;
                        return (
                          <TouchableOpacity
                            key={key}
                            style={{
                              paddingHorizontal: 14,
                              paddingVertical: 8,
                              borderRadius: 10,
                              backgroundColor: active ? colors.primary : colors.border,
                              opacity: isLast ? 0.55 : 1,
                            }}
                            activeOpacity={0.7}
                            disabled={isLast}
                            onPress={() => {
                              const current = settings.gauntletCategories ?? Object.keys(GAUNTLET_GROUP_LABELS);
                              const next = active
                                ? current.filter((g) => g !== key)
                                : [...current, key];
                              patch({ gauntletCategories: next });
                            }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#FFF' : colors.text }}>{label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {fields.factoringCategories && (
                  <View style={{ gap: Spacing.xs }}>
                    <Text style={[styles.label, { color: colors.text }]}>Problem Types</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {Object.entries(FACTORING_GROUP_LABELS).map(([key, label]) => {
                        const active = (settings.factoringCategories ?? []).includes(key);
                        const isLast = active && (settings.factoringCategories ?? []).length <= 1;
                        return (
                          <TouchableOpacity
                            key={key}
                            style={{
                              paddingHorizontal: 14,
                              paddingVertical: 8,
                              borderRadius: 10,
                              backgroundColor: active ? colors.primary : colors.border,
                              opacity: isLast ? 0.55 : 1,
                            }}
                            activeOpacity={0.7}
                            disabled={isLast}
                            onPress={() => {
                              const current = settings.factoringCategories ?? Object.keys(FACTORING_GROUP_LABELS);
                              const next = active
                                ? current.filter((g) => g !== key)
                                : [...current, key];
                              patch({ factoringCategories: next });
                            }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#FFF' : colors.text }}>{label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {fields.operandMode && (
                  <View style={{ gap: Spacing.xs }}>
                    <Text style={[styles.label, { color: colors.text }]}>Operand Size</Text>
                    <View style={[styles.segmented, { backgroundColor: colors.border }]}>
                      {(['3x1', '2x2', 'both'] as const).map((opt) => {
                        const active = (settings.operandMode ?? '3x1') === opt;
                        return (
                          <TouchableOpacity
                            key={opt}
                            style={[
                              styles.segmentBtn,
                              active && { backgroundColor: colors.primary },
                            ]}
                            activeOpacity={0.7}
                            onPress={() => patch({ operandMode: opt })}
                          >
                            <Text
                              style={[
                                styles.segmentText,
                                { color: active ? '#FFF' : colors.text },
                              ]}
                            >
                              {opt === '3x1' ? '3×1 digit' : opt === '2x2' ? '2×2 digit' : 'Both'}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

              </ScrollView>

              <TouchableOpacity
                style={[styles.doneBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
                onPress={handleDone}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modal: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: 20,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  title: {
    ...Font.h3,
    marginBottom: Spacing.xs,
  },
  inlineToggle: {
    minWidth: 52,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineToggleText: { fontSize: 12, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    ...Font.body,
    flex: 1,
  },
  input: {
    width: 64,
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  doneBtn: {
    marginTop: Spacing.sm,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    ...Font.h3,
    color: '#FFF',
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
