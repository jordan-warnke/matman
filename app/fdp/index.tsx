import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GameSettingsModal, { SettingsFields } from '../../components/GameSettingsModal';
import { Font, Spacing } from '../../constants/Theme';
import { useTheme } from '../../contexts/ThemeContext';
import {
    DEFAULT_MODE_SETTINGS,
    GameType,
    loadModeSettings,
    ModeSettings,
} from '../../store/HistoryStore';

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

interface SubMode {
  gameType: GameType;
  emoji: string;
  label: string;
  subtitle: string;
}

const SUB_MODES: SubMode[] = [
  { gameType: 'fractions-drill', emoji: '½', label: 'Fractions', subtitle: '½ → 0.5' },
  { gameType: 'decimals-drill',  emoji: '.5', label: 'Decimals',  subtitle: '0.5 → ½' },
  { gameType: 'percents-drill',  emoji: '%',  label: 'Percents',  subtitle: '½ → 50%' },
];

const FIELDS: SettingsFields = { timePerProblem: true, problemCount: true };

export default function FDPHub() {
  const router = useRouter();
  const { colors } = useTheme();

  const [settingsMode, setSettingsMode] = useState<GameType | null>(null);
  const [settings, setSettings] = useState<ModeSettings>(DEFAULT_MODE_SETTINGS);

  useEffect(() => {
    if (settingsMode) {
      loadModeSettings(settingsMode).then(setSettings);
    }
  }, [settingsMode]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.back, { color: colors.primary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>FDP Conversions</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {SUB_MODES.map((mode) => (
          <View key={mode.gameType} style={[styles.modeCard, { borderColor: colors.secondary, backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={styles.modeMain}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/fdp/game', params: { type: mode.gameType } })}
            >
              <View style={[styles.modeIcon, { backgroundColor: colors.secondary }]}>
                <Text style={styles.modeEmoji}>{mode.emoji}</Text>
              </View>
              <View>
                <Text style={[styles.modeName, { color: colors.text }]}>{mode.label}</Text>
                <Text style={[styles.modeSubtitle, { color: colors.muted }]}>{mode.subtitle}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cogBtn, { borderLeftColor: colors.border }]}
              hitSlop={8}
              onPress={() => setSettingsMode(mode.gameType)}
            >
              <SlidersIcon color={colors.muted} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {settingsMode && (
        <GameSettingsModal
          visible={true}
          onClose={() => setSettingsMode(null)}
          gameType={settingsMode}
          settings={settings}
          onSettingsChange={setSettings}
          fields={FIELDS}
        />
      )}
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
  body: { padding: Spacing.xl, gap: Spacing.md },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 22,
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
  modeEmoji: { fontSize: 22, color: '#FFF', fontWeight: '700' },
  modeName: { ...Font.h3 },
  modeSubtitle: { ...Font.caption, marginTop: 2 },
  cogBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    borderLeftWidth: 1,
  },
});
