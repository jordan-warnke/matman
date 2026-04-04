import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Font, Spacing } from '../../constants/Theme';
import { DEFAULT_GLOBAL, GlobalSettings, clearAllReviews, loadGlobalSettings, resetAllProgress, saveGlobalSettings } from '../../store/HistoryStore';

const THEME_ORDER: GlobalSettings['theme'][] = ['system', 'light', 'dark'];

export default function SettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL);

  useEffect(() => {
    loadGlobalSettings().then(setSettings);
  }, []);

  async function patch(update: Partial<GlobalSettings>) {
    const next = { ...settings, ...update };
    setSettings(next);
    await saveGlobalSettings(update);
  }

  function cycleTheme() {
    const idx = THEME_ORDER.indexOf(settings.theme);
    const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    patch({ theme: next });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.section}>Appearance</Text>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Theme</Text>
            <Text style={styles.hint}>Tap to cycle: system → light → dark</Text>
          </View>
          <TouchableOpacity style={styles.chip} onPress={cycleTheme}>
            <Text style={styles.chipText}>{settings.theme.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>Data</Text>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Adaptive Review</Text>
            <Text style={styles.hint}>Resurfacing is now automatic. Review timing comes from recent accuracy and speed, not manual flags.</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Smart Sense</Text>
            <Text style={styles.hint}>Serve warm-up problems before difficult retries</Text>
          </View>
          <TouchableOpacity style={styles.chip} onPress={() => patch({ smartSense: !settings.smartSense })}>
            <Text style={styles.chipText}>{settings.smartSense ? 'ON' : 'OFF'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.7}
          onPress={() =>
            Alert.alert(
              'Clear Review Queue',
              'This postpones all pending reviews without deleting any history. Items will resurface naturally on their SRS schedule.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clear',
                  onPress: () => clearAllReviews(),
                },
              ],
            )
          }
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Clear Review Queue</Text>
            <Text style={styles.hint}>Postpone all pending reviews without deleting history</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.7}
          onPress={() =>
            Alert.alert(
              'Reset All Progress',
              'This will clear all drill history and mode settings. Your theme preference will be kept.\n\nThis cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset',
                  style: 'destructive',
                  onPress: () => resetAllProgress(),
                },
              ],
            )
          }
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: Colors.light.error }]}>Reset All Progress</Text>
            <Text style={styles.hint}>Clear history and mode settings</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  back: { fontSize: 28, color: Colors.light.primary, fontWeight: '700' },
  title: { ...Font.h2, color: Colors.light.text },
  body: { padding: Spacing.lg },
  section: {
    ...Font.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: Colors.light.muted,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderBottomWidth: 3,
    borderBottomColor: Colors.light.border,
  },
  label: { ...Font.body, fontWeight: '600', color: Colors.light.text },
  hint: { ...Font.caption, marginTop: 2 },
  chip: {
    backgroundColor: Colors.light.border,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  chipText: { ...Font.caption, fontWeight: '700', color: Colors.light.text },
});
