import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Font, Spacing } from '../../constants/Theme';
import { useTheme } from '../../contexts/ThemeContext';
import {
    DEFAULT_MODE_SETTINGS,
    GameType,
    loadModeSettings,
    ModeSettings,
    saveModeSettings,
} from '../../store/HistoryStore';

const ALG_TYPE: GameType = 'algebra-drill';
const WP_TYPE: GameType = 'wordprob-drill';

export default function AlgebraHub() {
  const router = useRouter();
  const { colors } = useTheme();

  const [settings, setSettings] = useState<ModeSettings>(DEFAULT_MODE_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsFor, setSettingsFor] = useState<GameType>(ALG_TYPE);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    loadModeSettings(ALG_TYPE).then(setSettings);
  }, []);

  useEffect(() => {
    if (showSettings) {
      setDrafts({
        timeAttackSeconds: String(settings.timeAttackSeconds),
        problemCount: settings.problemCount ? String(settings.problemCount) : '',
      });
    }
  }, [showSettings]);

  async function patch(update: Partial<ModeSettings>) {
    const next = { ...settings, ...update };
    setSettings(next);
    await saveModeSettings(ALG_TYPE, update);
    await saveModeSettings(WP_TYPE, update);
  }

  function clamp(raw: string, min: number, max: number): number {
    const n = parseInt(raw, 10);
    if (isNaN(n) || n < min) return min;
    if (n > max) return max;
    return n;
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.back, { color: colors.purple }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Algebra</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* ── Identities ───────────────── */}
        <View style={[styles.modeCard, { borderColor: colors.purple, backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={styles.modeMain}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/algebra/game', params: { type: ALG_TYPE } })}
          >
            <View style={[styles.modeIcon, { backgroundColor: colors.purple }]}>
              <Text style={styles.modeEmoji}>x²</Text>
            </View>
            <Text style={[styles.modeName, { color: colors.text }]}>Identities</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cogBtn, { borderLeftColor: colors.border }]}
            hitSlop={8}
            onPress={() => { setSettingsFor(ALG_TYPE); setShowSettings(true); }}
          >
            <Feather name="sliders" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* ── Word Translation ─────────── */}
        <View style={[styles.modeCard, { borderColor: colors.purpleDark, backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={styles.modeMain}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/algebra/game', params: { type: WP_TYPE } })}
          >
            <View style={[styles.modeIcon, { backgroundColor: colors.purpleDark }]}>
              <Text style={styles.modeEmoji}>W</Text>
            </View>
            <Text style={[styles.modeName, { color: colors.text }]}>Word Translation</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cogBtn, { borderLeftColor: colors.border }]}
            hitSlop={8}
            onPress={() => { setSettingsFor(WP_TYPE); setShowSettings(true); }}
          >
            <Feather name="sliders" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>Why This Matters</Text>
          <Text style={[styles.infoLine, { color: colors.muted }]}>
            GMAT algebra questions demand instant pattern recognition. Memorize identities like (a + b)² and difference of squares so you can factor at speed.
          </Text>
          <Text style={[styles.infoLine, { color: colors.muted }]}>
            Word translation errors account for ~30% of quant mistakes. Drill "less than", "exceeds", and percent traps until they're automatic.
          </Text>
        </View>
      </ScrollView>

      <Modal visible={showSettings} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {settingsFor === ALG_TYPE ? 'Identities' : 'Word Translation'} Settings
            </Text>

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

            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: colors.purple, borderBottomColor: colors.purpleDark }]}
              activeOpacity={0.85}
              onPress={() => setShowSettings(false)}
            >
              <Text style={styles.doneTxt}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    marginBottom: Spacing.md,
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
  modeEmoji: { fontSize: 24, color: '#FFF', fontWeight: '700' },
  modeName: { ...Font.h3 },
  cogBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    borderLeftWidth: 1,
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  infoTitle: { ...Font.body, fontWeight: '700', marginBottom: Spacing.sm },
  infoLine: { ...Font.caption, marginBottom: 4 },
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
  modalLabel: { ...Font.body, flex: 1 },
  modalInput: {
    width: 64,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  doneBtn: {
    marginTop: Spacing.md,
    paddingVertical: 14,
    borderRadius: 16,
    borderBottomWidth: 5,
    alignItems: 'center',
  },
  doneTxt: { ...Font.h3, color: '#FFF' },
});
