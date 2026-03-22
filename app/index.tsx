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
    fields: { minNumber: { min: 1, max: 13 }, maxNumber: { min: 1, max: 13 }, timePerProblem: true, anchor: true, problemCount: true, operationType: true, questionStyle: true },
  },
  arithmetic: {
    gameType: 'arith-survival',
    fields: { problemCount: true },
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
  estimation: {
    gameType: 'estimation-drill',
    fields: { timePerProblem: true, problemCount: true },
  },
  datastats: {
    gameType: 'datastats-drill',
    fields: { timePerProblem: true, problemCount: true },
  },
};

export default function MainMenu() {
  const router = useRouter();
  const { colors, isDark, toggleTheme, timed, setTimed, multipleChoice, setMultipleChoice } = useTheme();

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
        <View style={[styles.card, { backgroundColor: colors.card, borderBottomColor: colors.primaryDark }]}>
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

        <View style={[styles.card, { backgroundColor: colors.card, borderBottomColor: colors.secondaryDark }]}>
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

        <View style={[styles.card, { backgroundColor: colors.card, borderBottomColor: colors.accentDark }]}>
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

        <View style={[styles.card, { backgroundColor: colors.card, borderBottomColor: colors.errorDark }]}>
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

        <View style={[styles.card, { backgroundColor: colors.card, borderBottomColor: colors.secondaryDark }]}>
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

        <View style={[styles.card, { backgroundColor: colors.card, borderBottomColor: colors.accentDark }]}>
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

        <View style={[styles.card, { backgroundColor: colors.card, borderBottomColor: colors.purpleDark }]}>
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

        <View style={[styles.card, { backgroundColor: colors.card, borderBottomColor: colors.errorDark }]}>
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

        <View style={[styles.card, { backgroundColor: colors.card, borderBottomColor: colors.secondaryDark }]}>
          <TouchableOpacity
            style={styles.cardMain}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/datastats/game', params: { type: 'datastats-drill' } })}
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

        <View style={styles.toggleGroup}>
          <Text style={styles.themeLabel}>☀️</Text>
          <Switch
            trackColor={{ false: colors.border, true: colors.secondary }}
            thumbColor="#FFF"
            onValueChange={toggleTheme}
            value={isDark}
          />
          <Text style={styles.themeLabel}>🌙</Text>
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
});
