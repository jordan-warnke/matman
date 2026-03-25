import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SpreadsheetChrome from '../../components/SpreadsheetChrome';
import { Font, Spacing } from '../../constants/Theme';
import { useTheme } from '../../contexts/ThemeContext';
import {
    DEFAULT_MODE_SETTINGS,
    GameType,
    loadModeSettings,
    ModeSettings,
    saveModeSettings,
} from '../../store/HistoryStore';

const GAME_TYPE: GameType = 'time-attack';

export default function TimesTablesHub() {
  const router = useRouter();
  const { colors, isWork } = useTheme();

  const [settings, setSettings] = useState<ModeSettings>(DEFAULT_MODE_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    loadModeSettings(GAME_TYPE).then(setSettings);
  }, []);

  useEffect(() => {
    if (showSettings) {
      setDrafts({
        maxNumber: String(settings.maxNumber),
        timeAttackSeconds: String(settings.timeAttackSeconds),
        anchor: settings.anchor ? String(settings.anchor) : '',
        problemCount: settings.problemCount ? String(settings.problemCount) : '',
      });
    }
  }, [showSettings]);

  async function patch(update: Partial<ModeSettings>) {
    const next = { ...settings, ...update };
    setSettings(next);
    await saveModeSettings(GAME_TYPE, update);
  }

  function clamp(raw: string, min: number, max: number): number {
    const n = parseInt(raw, 10);
    if (isNaN(n) || n < min) return min;
    if (n > max) return max;
    return n;
  }

  function commitDrafts() {
    const maxNumber = clamp(drafts.maxNumber, 1, 13);
    const timeAttackSeconds = clamp(drafts.timeAttackSeconds, 1, 60);
    const anchorRaw = parseInt(drafts.anchor, 10);
    const anchor = isNaN(anchorRaw) || anchorRaw < 1 ? null : Math.min(anchorRaw, 13);
    const countRaw = parseInt(drafts.problemCount, 10);
    const problemCount = isNaN(countRaw) || countRaw < 1 ? 0 : Math.min(countRaw, 100);
    patch({ maxNumber, timeAttackSeconds, anchor, problemCount });
    setDrafts({
      maxNumber: String(maxNumber),
      timeAttackSeconds: String(timeAttackSeconds),
      anchor: anchor ? String(anchor) : '',
      problemCount: problemCount ? String(problemCount) : '',
    });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
    <SpreadsheetChrome>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.back, { color: colors.primary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{isWork ? 'Revenue Forecast' : 'Times Tables'}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* ── Play Card ─────────────────── */}
        <View style={[styles.modeCard, { borderColor: colors.primary, backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={styles.modeMain}
            activeOpacity={0.85}
            onPress={() =>
              router.push({ pathname: '/times-tables/game', params: { type: GAME_TYPE } })
            }
          >
            <View style={[styles.modeIcon, { backgroundColor: colors.primary }]}>
              <Text style={styles.modeEmoji}>🎯</Text>
            </View>
            <Text style={[styles.modeName, { color: colors.text }]}>Start Practice</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cogBtn, { borderLeftColor: colors.border }]}
            hitSlop={8}
            onPress={() => setShowSettings(true)}
          >
            <Feather name="sliders" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Settings modal ───────── */}
      <Modal visible={showSettings} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card, maxHeight: '85%' }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Settings</Text>
            <ScrollView showsVerticalScrollIndicator={true} style={{ flexShrink: 1 }}>

            <View style={styles.modalRow}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Max number (1–13)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.border, color: colors.text }]}
                keyboardType="number-pad"
                value={drafts.maxNumber ?? ''}
                onChangeText={(v) => setDrafts((d) => ({ ...d, maxNumber: v }))}
                onBlur={() => {
                  const c = clamp(drafts.maxNumber, 1, 13);
                  setDrafts((d) => ({ ...d, maxNumber: String(c) }));
                  patch({ maxNumber: c });
                }}
                maxLength={2}
              />
            </View>

            <View style={styles.modalRow}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Time per problem (s)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.border, color: colors.text }]}
                keyboardType="number-pad"
                value={drafts.timeAttackSeconds ?? ''}
                onChangeText={(v) => setDrafts((d) => ({ ...d, timeAttackSeconds: v }))}
                onBlur={() => {
                  const c = clamp(drafts.timeAttackSeconds, 1, 60);
                  setDrafts((d) => ({ ...d, timeAttackSeconds: String(c) }));
                  patch({ timeAttackSeconds: c });
                }}
                maxLength={2}
              />
            </View>

            <View style={styles.modalRow}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Anchor number</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.border, color: colors.text }]}
                keyboardType="number-pad"
                placeholder="off"
                placeholderTextColor={colors.muted}
                value={drafts.anchor ?? ''}
                onChangeText={(v) => setDrafts((d) => ({ ...d, anchor: v }))}
                onBlur={() => {
                  const n = parseInt(drafts.anchor, 10);
                  const val = isNaN(n) || n < 1 ? null : Math.min(n, 13);
                  setDrafts((d) => ({ ...d, anchor: val ? String(val) : '' }));
                  patch({ anchor: val });
                }}
                maxLength={2}
              />
            </View>

            <View style={styles.modalRow}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Problem count</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.border, color: colors.text }]}
                keyboardType="number-pad"
                placeholder="∞"
                placeholderTextColor={colors.muted}
                value={drafts.problemCount ?? ''}
                onChangeText={(v) => setDrafts((d) => ({ ...d, problemCount: v }))}
                onBlur={() => {
                  const n = parseInt(drafts.problemCount, 10);
                  const val = isNaN(n) || n < 1 ? 0 : Math.min(n, 100);
                  setDrafts((d) => ({ ...d, problemCount: val ? String(val) : '' }));
                  patch({ problemCount: val });
                }}
                maxLength={3}
              />
            </View>

            <View style={{ marginBottom: Spacing.lg, gap: Spacing.xs }}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Operation</Text>
              <View style={{ flexDirection: 'row', borderRadius: 10, overflow: 'hidden', backgroundColor: colors.border }}>
                {(['multiply', 'squares', 'cubes'] as const).map((opt) => {
                  const active = (settings.operationType ?? 'multiply') === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        alignItems: 'center',
                        borderRadius: 10,
                        ...(active ? { backgroundColor: colors.primary } : {}),
                      }}
                      activeOpacity={0.7}
                      onPress={() => patch({ operationType: opt })}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#FFF' : colors.text }}>
                        {opt === 'multiply' ? '× Multiply' : opt === 'squares' ? 'x² Squares' : 'x³ Cubes'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {(() => {
              const op = settings.operationType ?? 'multiply';
              const labels: Record<string, [string, string, string]> = {
                multiply: ['× Multiply', '÷ Divide', '× ÷ Mix'],
                squares:  ['x² Square', '√ Root', 'x²√ Mix'],
                cubes:    ['x³ Cube', '∛ Cube Root', 'x³∛ Mix'],
              };
              const [stdLabel, revLabel, mixLabel] = labels[op] ?? labels.multiply;
              return (
                <View style={{ marginBottom: Spacing.lg, gap: Spacing.xs }}>
                  <Text style={[styles.modalLabel, { color: colors.text }]}>Direction</Text>
                  <View style={{ flexDirection: 'row', borderRadius: 10, overflow: 'hidden', backgroundColor: colors.border }}>
                    {(['standard', 'reverse', 'mix'] as const).map((opt) => {
                      const active = (settings.questionStyle ?? 'standard') === opt;
                      return (
                        <TouchableOpacity
                          key={opt}
                          style={{
                            flex: 1,
                            paddingVertical: 8,
                            alignItems: 'center',
                            borderRadius: 10,
                            ...(active ? { backgroundColor: colors.primary } : {}),
                          }}
                          activeOpacity={0.7}
                          onPress={() => patch({ questionStyle: opt })}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#FFF' : colors.text }}>
                            {opt === 'standard' ? stdLabel : opt === 'reverse' ? revLabel : mixLabel}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })()}

            {/* ── Exclude numbers ─────────── */}
            <View style={{ marginBottom: Spacing.lg, gap: Spacing.xs }}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Shuffle factor order</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: colors.muted, flex: 1 }}>Show 9×10 and 10×9</Text>
                <Switch
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFF"
                  value={settings.shuffleOrder ?? false}
                  onValueChange={(v) => patch({ shuffleOrder: v })}
                />
              </View>
            </View>

            {/* ── Exclude numbers ─────────── */}
            <View style={{ marginBottom: Spacing.lg, gap: Spacing.xs }}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Numbers in play</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {Array.from({ length: 13 }, (_, i) => i + 1).map((n) => {
                  const excluded = (settings.excludedNumbers ?? []).includes(n);
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
                        opacity: excluded ? 0.4 : 1,
                      }}
                      activeOpacity={0.7}
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

            </ScrollView>
            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: colors.primary, borderBottomColor: colors.primaryDark }]}
              activeOpacity={0.85}
              onPress={() => { commitDrafts(); setShowSettings(false); }}
            >
              <Text style={styles.doneTxt}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SpreadsheetChrome>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  back: { fontSize: 28, fontWeight: '700' },
  title: { ...Font.h2 },
  body: { padding: Spacing.xl },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 22,
    marginBottom: Spacing.lg,
    borderBottomWidth: 5,
    overflow: 'hidden',
  },
  modeMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modeIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  modeEmoji: { fontSize: 24 },
  modeName: { ...Font.h3 },
  cogBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    borderLeftWidth: 1,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  optionLabel: { ...Font.body, fontWeight: '600' },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '85%',
    borderRadius: 24,
    padding: Spacing.xl,
  },
  modalTitle: { ...Font.h2, textAlign: 'center', marginBottom: Spacing.xl },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  modalLabel: { ...Font.body, fontWeight: '600', flex: 1 },
  modalInput: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: 64,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
  },
  doneBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.sm,
    borderBottomWidth: 4,
  },
  doneTxt: { ...Font.h3, color: '#FFF' },
});
