import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GameSettingsModal, { SettingsFields } from '../components/GameSettingsModal';
import { Font, Spacing } from '../constants/Theme';
import { useTheme } from '../contexts/ThemeContext';
import {
    DEFAULT_MODE_SETTINGS,
    GameType,
    loadModeSettings,
    ModeSettings,
} from '../store/HistoryStore';

interface ModeConfig {
  gameType: GameType;
  fields: SettingsFields;
}

function SlidersIcon({ color }: { color: string }) {
  const bar = { width: 16, height: 2, backgroundColor: color, borderRadius: 1 };
  const dot = (left: number) => ({
    position: 'absolute' as const,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: color,
    top: -1.5,
    left,
  });
  return (
    <View style={{ gap: 5 }}>
      <View style={{ position: 'relative' as const }}><View style={bar} /><View style={dot(10)} /></View>
      <View style={{ position: 'relative' as const }}><View style={bar} /><View style={dot(3)} /></View>
      <View style={{ position: 'relative' as const }}><View style={bar} /><View style={dot(8)} /></View>
    </View>
  );
}

const MODE_CONFIGS: Record<string, ModeConfig> = {
  'times-tables': {
    gameType: 'time-attack',
    fields: { minNumber: { min: 1, max: 13 }, maxNumber: { min: 1, max: 13 }, timePerProblem: true, anchor: true, problemCount: true, operationType: true, questionStyle: true, excludedNumbers: true, shuffleOrder: true },
  },
  arithmetic: {
    gameType: 'arith-survival',
    fields: { minNumber: { min: 2, max: 25 }, maxNumber: { min: 2, max: 25 }, timePerProblem: true, problemCount: true },
  },
  primes: {
    gameType: 'primes-time-attack',
    fields: { maxNumber: { min: 20, max: 200 }, timePerProblem: true, problemCount: true },
  },
  bounding: {
    gameType: 'bound-time-attack',
    fields: { timePerProblem: true, problemCount: true },
  },
  parity: {
    gameType: 'parity-drill',
    fields: { timePerProblem: true, problemCount: true },
  },
  algebra: {
    gameType: 'algebra-drill',
    fields: { timePerProblem: true, problemCount: true },
  },
  gauntlet: {
    gameType: 'gauntlet-drill',
    fields: { timePerProblem: true, problemCount: true, gauntletCategories: true },
  },
  estimation: {
    gameType: 'estimation-drill',
    fields: { timePerProblem: true, problemCount: true },
  },
  datastats: {
    gameType: 'datastats-drill',
    fields: { timePerProblem: true, problemCount: true },
  },
  verbal: {
    gameType: 'verbal-drill',
    fields: { timePerProblem: true, problemCount: true },
  },
};


export default function MainMenu() {
  const router = useRouter();
  const { colors, themeMode, setThemeMode, timed, setTimed, multipleChoice, setMultipleChoice } = useTheme();

  const [settingsMode, setSettingsMode] = useState<string | null>(null);
  const [settings, setSettings] = useState<ModeSettings>(DEFAULT_MODE_SETTINGS);

  useEffect(() => {
    if (settingsMode) {
      const cfg = MODE_CONFIGS[settingsMode];
      loadModeSettings(cfg.gameType).then(setSettings);
    }
  }, [settingsMode]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.hero}>
        <Text style={[styles.logo, { color: colors.primary }]}>matman</Text>
        <Text style={[styles.tagline, { color: colors.muted }]}>Mental math, mastered.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.menu} showsVerticalScrollIndicator={false}>

        <View style={[styles.card, { backgroundColor: colors.card, borderBottomColor: colors.primaryDark, borderBottomWidth: 5 }]}>
          <TouchableOpacity
            style={styles.cardMain}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/times-tables/game', params: { type: 'time-attack' } })}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.primary }]}>
                <Text style={styles.iconText}>×</Text>
              </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Times Tables</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cogBtn, { borderLeftColor: colors.border }]}
            hitSlop={8}
            onPress={() => setSettingsMode('times-tables')}
          >
            <SlidersIcon color={colors.muted} />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderBottomColor: colors.secondaryDark, borderBottomWidth: 5 }]}>
          <TouchableOpacity
            style={styles.cardMain}
            activeOpacity={0.85}
            onPress={() => router.push('/fdp/' as any)}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
                <Text style={styles.iconText}>%</Text>
              </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>FDP Conversions</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderBottomColor: colors.accentDark, borderBottomWidth: 5 }]}>
          <TouchableOpacity
            style={styles.cardMain}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/arithmetic/game', params: { type: 'arith-survival' } })}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.accent }]}>
                <Text style={styles.iconText}>n²</Text>
              </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Squares & Roots</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cogBtn, { borderLeftColor: colors.border }]}
            hitSlop={8}
            onPress={() => setSettingsMode('arithmetic')}
          >
            <SlidersIcon color={colors.muted} />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderBottomColor: colors.errorDark, borderBottomWidth: 5 }]}>
          <TouchableOpacity
            style={styles.cardMain}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/primes/game', params: { type: 'primes-time-attack' } })}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.error }]}>
                <Text style={styles.iconText}>P</Text>
              </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Prime Traps</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cogBtn, { borderLeftColor: colors.border }]}
            hitSlop={8}
            onPress={() => setSettingsMode('primes')}
          >
            <SlidersIcon color={colors.muted} />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderBottomColor: colors.secondaryDark, borderBottomWidth: 5 }]}>
          <TouchableOpacity
            style={styles.cardMain}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/bounding/game', params: { type: 'bound-time-attack' } })}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
                <Text style={styles.iconText}>≈</Text>
              </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Bounding</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cogBtn, { borderLeftColor: colors.border }]}
            hitSlop={8}
            onPress={() => setSettingsMode('bounding')}
          >
            <SlidersIcon color={colors.muted} />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderBottomColor: colors.accentDark, borderBottomWidth: 5 }]}>
          <TouchableOpacity
            style={styles.cardMain}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/parity/game', params: { type: 'parity-drill' } })}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.accent }]}>
                <Text style={styles.iconText}>±</Text>
              </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Parity & Sign</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cogBtn, { borderLeftColor: colors.border }]}
            hitSlop={8}
            onPress={() => setSettingsMode('parity')}
          >
            <SlidersIcon color={colors.muted} />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderBottomColor: colors.purpleDark, borderBottomWidth: 5 }]}>
          <TouchableOpacity
            style={styles.cardMain}
            activeOpacity={0.85}
            onPress={() => router.push('/algebra/' as any)}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.purple }]}>
                <Text style={styles.iconText}>x²</Text>
              </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Algebra</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cogBtn, { borderLeftColor: colors.border }]}
            hitSlop={8}
            onPress={() => setSettingsMode('algebra')}
          >
            <SlidersIcon color={colors.muted} />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderBottomColor: colors.errorDark, borderBottomWidth: 5 }]}>
          <TouchableOpacity
            style={styles.cardMain}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/estimation/game', params: { type: 'estimation-drill' } })}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.error }]}>
                <Text style={styles.iconText}>≈</Text>
              </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Estimation</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cogBtn, { borderLeftColor: colors.border }]}
            hitSlop={8}
            onPress={() => setSettingsMode('estimation')}
          >
            <SlidersIcon color={colors.muted} />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderBottomColor: colors.secondaryDark, borderBottomWidth: 5 }]}>
          <TouchableOpacity
            style={styles.cardMain}
            activeOpacity={0.85}
            onPress={() => router.push('/datastats/' as any)}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
                <Text style={styles.iconText}>📊</Text>
              </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Data & Stats</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cogBtn, { borderLeftColor: colors.border }]}
            hitSlop={8}
            onPress={() => setSettingsMode('datastats')}
          >
            <SlidersIcon color={colors.muted} />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderBottomColor: colors.tealDark, borderBottomWidth: 5 }]}>
          <TouchableOpacity
            style={styles.cardMain}
            activeOpacity={0.85}
            onPress={() => router.push('/verbal/' as any)}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.teal }]}>
                <Text style={styles.iconText}>🗣</Text>
              </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Verbal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cogBtn, { borderLeftColor: colors.border }]}
            hitSlop={8}
            onPress={() => setSettingsMode('verbal')}
          >
            <SlidersIcon color={colors.muted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.settingsPill, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.7}
          onPress={() => router.push('/reference' as any)}
        >
          <Text style={[styles.settingsPillText, { color: colors.muted }]}>Reference</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingsPill, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.7}
          onPress={() => router.push('/settings' as any)}
        >
          <Text style={[styles.settingsPillText, { color: colors.muted }]}>⚙️  Settings</Text>
        </TouchableOpacity>
      </ScrollView>

      {settingsMode && (
        <GameSettingsModal
          visible={true}
          onClose={() => setSettingsMode(null)}
          gameType={MODE_CONFIGS[settingsMode].gameType}
          settings={settings}
          onSettingsChange={setSettings}
          fields={MODE_CONFIGS[settingsMode].fields}
        />
      )}

      <View style={[styles.bottomRow, { borderTopColor: colors.border }]}>
        <View style={styles.toggleGroup}>
          <Text style={[styles.toggleLabel, { color: colors.muted }]}>⏱ Timed</Text>
          <Switch
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFF"
            onValueChange={setTimed}
            value={timed}
          />
        </View>

        <View style={styles.toggleGroup}>
          <Text style={[styles.toggleLabel, { color: colors.muted }]}>ABCD</Text>
          <Switch
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFF"
            onValueChange={setMultipleChoice}
            value={multipleChoice}
          />
        </View>

        <View style={[styles.themePill, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(['light', 'dark', 'work'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.themeSeg, themeMode === mode && { backgroundColor: colors.primary }]}
              onPress={() => setThemeMode(mode)}
              activeOpacity={0.7}
            >
              <Text style={[styles.themeSegText, themeMode === mode && { color: '#FFF' }]}>
                {mode === 'light' ? '☀️' : mode === 'dark' ? '🌙' : '💼'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  hero: {
    paddingTop: 40,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  logo: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
  },
  tagline: {
    ...Font.body,
    marginTop: 2,
  },
  menu: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderBottomWidth: 5,
    overflow: 'hidden',
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  cogBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    borderLeftWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  iconText: {
    fontSize: 28,
    color: '#FFF',
    fontWeight: '700',
  },
  cardTitle: { ...Font.h3 },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  toggleLabel: {
    ...Font.caption,
    fontWeight: '600',
  },
  themeLabel: { fontSize: 20 },
  themePill: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  themeSeg: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  themeSegText: {
    fontSize: 16,
  },
  settingsPill: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  settingsPillText: {
    ...Font.body,
    fontWeight: '600',
  },
});
