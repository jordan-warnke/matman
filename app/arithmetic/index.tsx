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
import SpreadsheetChrome from '../../components/SpreadsheetChrome';
import { Font, Spacing } from '../../constants/Theme';

function clamp(raw: string, lo: number, hi: number) {
  const n = parseInt(raw, 10);
  return isNaN(n) ? lo : Math.max(lo, Math.min(hi, n));
}
import { useTheme } from '../../contexts/ThemeContext';
import {
    DEFAULT_MODE_SETTINGS,
    GameType,
    loadModeSettings,
    ModeSettings,
    saveModeSettings,
} from '../../store/HistoryStore';

const GAME_TYPE: GameType = 'arith-survival';
const LONGDIV_TYPE: GameType = 'longdiv-drill';

export default function ArithmeticHub() {
  const router = useRouter();
  const { colors, isWork } = useTheme();

  const [settings, setSettings] = useState<ModeSettings>(DEFAULT_MODE_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTarget, setSettingsTarget] = useState<GameType>(GAME_TYPE);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const [ldSettings, setLdSettings] = useState<ModeSettings>(DEFAULT_MODE_SETTINGS);

  useEffect(() => {
    loadModeSettings(GAME_TYPE).then(setSettings);
    loadModeSettings(LONGDIV_TYPE).then(setLdSettings);
  }, []);

  useEffect(() => {
    if (showSettings) {
      const s = settingsTarget === LONGDIV_TYPE ? ldSettings : settings;
      setDrafts({
        minNumber: String(s.minNumber || 2),
        maxNumber: String(s.maxNumber || (settingsTarget === LONGDIV_TYPE ? 12 : 25)),
        problemCount: s.problemCount ? String(s.problemCount) : '',
      });
    }
  }, [showSettings, settingsTarget]);

  async function patch(update: Partial<ModeSettings>) {
    if (settingsTarget === LONGDIV_TYPE) {
      const next = { ...ldSettings, ...update };
      setLdSettings(next);
      await saveModeSettings(LONGDIV_TYPE, update);
    } else {
      const next = { ...settings, ...update };
      setSettings(next);
      await saveModeSettings(GAME_TYPE, update);
    }
  }

  function commitDrafts() {
    const isLD = settingsTarget === LONGDIV_TYPE;
    const maxClamp = isLD ? 12 : 25;
    const minN = clamp(drafts.minNumber, 2, maxClamp);
    const maxN = clamp(drafts.maxNumber, 2, maxClamp);
    const countRaw = parseInt(drafts.problemCount, 10);
    const problemCount = isNaN(countRaw) || countRaw < 1 ? 0 : Math.min(countRaw, 100);
    patch({ minNumber: Math.min(minN, maxN), maxNumber: Math.max(minN, maxN), problemCount });
    setDrafts({
      minNumber: String(Math.min(minN, maxN)),
      maxNumber: String(Math.max(minN, maxN)),
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
        <Text style={[styles.title, { color: colors.text }]}>{isWork ? 'Growth Analysis' : 'Arithmetic'}</Text>
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
            onPress={() => { setSettingsTarget(GAME_TYPE); setShowSettings(true); }}
          >
            <Feather name="sliders" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* ── Long Division Card ──────── */}
        <View style={[styles.modeCard, { borderColor: colors.secondary, backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={styles.modeMain}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/arithmetic/longdiv' as any, params: { type: LONGDIV_TYPE } })}
          >
            <View style={[styles.modeIcon, { backgroundColor: colors.secondary }]}>
              <Text style={styles.modeEmoji}>➗</Text>
            </View>
            <Text style={[styles.modeName, { color: colors.text }]}>Long Division</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cogBtn, { borderLeftColor: colors.border }]}
            hitSlop={8}
            onPress={() => { setSettingsTarget(LONGDIV_TYPE); setShowSettings(true); }}
          >
            <Feather name="sliders" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>

      </ScrollView>

      <Modal visible={showSettings} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {settingsTarget === LONGDIV_TYPE ? 'Long Division Settings' : 'Settings'}
            </Text>

            <View style={styles.modalRow}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>
                {settingsTarget === LONGDIV_TYPE ? 'Min divisor (2–12)' : 'Min number (2–25)'}
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.border, color: colors.text }]}
                keyboardType="number-pad"
                value={drafts.minNumber ?? '2'}
                onChangeText={(v) => setDrafts((d) => ({ ...d, minNumber: v }))}
                maxLength={2}
              />
            </View>

            <View style={styles.modalRow}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>
                {settingsTarget === LONGDIV_TYPE ? 'Max divisor (2–12)' : 'Max number (2–25)'}
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.border, color: colors.text }]}
                keyboardType="number-pad"
                value={drafts.maxNumber ?? '25'}
                onChangeText={(v) => setDrafts((d) => ({ ...d, maxNumber: v }))}
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
    marginBottom: Spacing.lg,
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
