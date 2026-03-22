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

const GAME_TYPE: GameType = 'arith-survival';

export default function ArithmeticHub() {
  const router = useRouter();
  const { colors } = useTheme();

  const [settings, setSettings] = useState<ModeSettings>(DEFAULT_MODE_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    loadModeSettings(GAME_TYPE).then(setSettings);
  }, []);

  useEffect(() => {
    if (showSettings) {
      setDrafts({
        problemCount: settings.problemCount ? String(settings.problemCount) : '',
      });
    }
  }, [showSettings]);

  async function patch(update: Partial<ModeSettings>) {
    const next = { ...settings, ...update };
    setSettings(next);
    await saveModeSettings(GAME_TYPE, update);
  }

  function commitDrafts() {
    const countRaw = parseInt(drafts.problemCount, 10);
    const problemCount = isNaN(countRaw) || countRaw < 1 ? 0 : Math.min(countRaw, 100);
    patch({ problemCount });
    setDrafts({
      problemCount: problemCount ? String(problemCount) : '',
    });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.back, { color: colors.primary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Squares & Roots</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* ── Play Card ─────────────────── */}
        <View style={[styles.modeCard, { borderColor: colors.primary, backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={styles.modeMain}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/arithmetic/game', params: { type: GAME_TYPE } })}
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

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>Problem Types</Text>
          <Text style={[styles.infoLine, { color: colors.muted }]}>Squares: 2² – 25²</Text>
          <Text style={[styles.infoLine, { color: colors.muted }]}>Roots: √4 – √625</Text>
        </View>
      </ScrollView>

      <Modal visible={showSettings} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Settings</Text>

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
              style={[styles.doneBtn, { backgroundColor: colors.primary, borderBottomColor: colors.primaryDark }]}
              activeOpacity={0.85}
              onPress={() => { commitDrafts(); setShowSettings(false); }}
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
    marginBottom: Spacing.lg,
  },
  optionLabel: { ...Font.body, fontWeight: '600' },
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
