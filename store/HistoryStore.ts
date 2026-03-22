import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = '@matman/history';
const SETTINGS_KEY = '@matman/settings';
const MODE_SETTINGS_PREFIX = '@matman/mode-settings/';
const STRUGGLES_KEY = '@matman/struggles';
const KNOWN_KEY = '@matman/known';

export interface AttemptRecord {
  correct: number;
  wrong: number;
  totalTime: number;
  lastSeen: number;
}

// Keyed as "3x7" — we keep a×b and b×a as distinct entries
// so the user gets drilled on both orderings.
export type History = Record<string, AttemptRecord>;

/**
 * Anki-like weight: recency + manual struggle boost only.
 *  - Unseen problems get high weight (need to introduce).
 *  - Recently-seen problems are suppressed (avoid repeats).
 *  - Stale problems get a review boost over time.
 *  - Manually-flagged "struggle" items get 3× weight.
 */
export function ankiWeight(rec: AttemptRecord | undefined, struggling = false, known = false): number {
  if (!rec) return 5; // unseen — high priority to introduce

  const hoursSince = (Date.now() - rec.lastSeen) / 3_600_000;

  let recency: number;
  if (hoursSince < 0.083) {
    // < 5 min ago — suppress to avoid in-session repeats
    recency = 0.2;
  } else if (hoursSince < 1) {
    recency = 0.8;
  } else if (hoursSince < 24) {
    recency = 1.0;
  } else {
    // over a day — review boost that grows with time, capped
    recency = Math.min(2.5, 1.0 + Math.log2(hoursSince / 24) * 0.3);
  }

  if (struggling) return recency * 3;
  if (known) return recency * 0.5;
  return recency;
}

// ── Global settings (theme only) ───────────────────────────

export interface GlobalSettings {
  theme: 'light' | 'dark' | 'system';
  timed: boolean;
  multipleChoice: boolean;
}

export const DEFAULT_GLOBAL: GlobalSettings = {
  theme: 'system',
  timed: false,
  multipleChoice: false,
};

// ── Per-mode settings ──────────────────────────────────────

export interface ModeSettings {
  maxNumber: number;
  minNumber: number;
  mode: 'input' | 'multiple-choice';
  operationType: 'multiply' | 'squares' | 'cubes';
  questionStyle: 'standard' | 'reverse' | 'mix';
  timeAttackSeconds: number;
  anchor: number | null;
  problemCount: number;
  timed: boolean;
}

export const DEFAULT_MODE_SETTINGS: ModeSettings = {
  maxNumber: 13,
  minNumber: 1,
  mode: 'input',
  operationType: 'multiply',
  questionStyle: 'standard',
  timeAttackSeconds: 3,
  anchor: null,
  problemCount: 0, // 0 = unlimited
  timed: false,
};

export type GameType =
  | 'time-attack' | 'free-form'
  | 'fdp-time-attack' | 'fdp-free-form'
  | 'fractions-drill' | 'decimals-drill' | 'percents-drill'
  | 'arith-survival' | 'arith-free-form'
  | 'primes-time-attack' | 'primes-free-form'
  | 'bound-time-attack' | 'bound-free-form'
  | 'parity-drill' | 'sign-drill'
  | 'algebra-drill' | 'wordprob-drill'
  | 'estimation-drill'
  | 'datastats-drill';

// ── helpers ────────────────────────────────────────────────

function makeKey(a: number, b: number) {
  return `${a}x${b}`;
}

// ── public API ─────────────────────────────────────────────

export async function loadHistory(): Promise<History> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function recordAttempt(
  a: number,
  b: number,
  isCorrect: boolean,
  timeMs: number,
): Promise<void> {
  return recordByKey(makeKey(a, b), isCorrect, timeMs);
}

export async function recordByKey(
  key: string,
  isCorrect: boolean,
  timeMs: number,
): Promise<void> {
  const history = await loadHistory();
  const prev = history[key] ?? { correct: 0, wrong: 0, totalTime: 0, lastSeen: 0 };

  history[key] = {
    correct: prev.correct + (isCorrect ? 1 : 0),
    wrong: prev.wrong + (isCorrect ? 0 : 1),
    totalTime: prev.totalTime + timeMs,
    lastSeen: Date.now(),
  };

  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// ── Global settings ────────────────────────────────────────

export async function loadGlobalSettings(): Promise<GlobalSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  return raw ? { ...DEFAULT_GLOBAL, ...JSON.parse(raw) } : DEFAULT_GLOBAL;
}

export async function saveGlobalSettings(patch: Partial<GlobalSettings>): Promise<void> {
  const current = await loadGlobalSettings();
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...patch }));
}

// ── Per-mode settings ──────────────────────────────────────

export async function loadModeSettings(gameType: GameType): Promise<ModeSettings> {
  const raw = await AsyncStorage.getItem(MODE_SETTINGS_PREFIX + gameType);
  return raw ? { ...DEFAULT_MODE_SETTINGS, ...JSON.parse(raw) } : DEFAULT_MODE_SETTINGS;
}

export async function saveModeSettings(
  gameType: GameType,
  patch: Partial<ModeSettings>,
): Promise<void> {
  const current = await loadModeSettings(gameType);
  await AsyncStorage.setItem(
    MODE_SETTINGS_PREFIX + gameType,
    JSON.stringify({ ...current, ...patch }),
  );
}

// ── Struggle pairs ─────────────────────────────────────────

export async function loadStruggles(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(STRUGGLES_KEY);
  return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
}

export async function toggleStruggle(key: string): Promise<boolean> {
  const struggles = await loadStruggles();
  const nowStruggling = !struggles.has(key);
  if (nowStruggling) {
    struggles.add(key);
    // Mutually exclusive: remove from known
    const known = await loadKnown();
    if (known.has(key)) {
      known.delete(key);
      await AsyncStorage.setItem(KNOWN_KEY, JSON.stringify([...known]));
    }
  } else {
    struggles.delete(key);
  }
  await AsyncStorage.setItem(STRUGGLES_KEY, JSON.stringify([...struggles]));
  return nowStruggling;
}

export async function clearStruggles(): Promise<void> {
  await AsyncStorage.removeItem(STRUGGLES_KEY);
}

// ── Known (mastered) items ─────────────────────────────────

export async function loadKnown(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(KNOWN_KEY);
  return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
}

export async function toggleKnown(key: string): Promise<boolean> {
  const known = await loadKnown();
  const nowKnown = !known.has(key);
  if (nowKnown) {
    known.add(key);
    // Mutually exclusive: remove from struggles
    const struggles = await loadStruggles();
    if (struggles.has(key)) {
      struggles.delete(key);
      await AsyncStorage.setItem(STRUGGLES_KEY, JSON.stringify([...struggles]));
    }
  } else {
    known.delete(key);
  }
  await AsyncStorage.setItem(KNOWN_KEY, JSON.stringify([...known]));
  return nowKnown;
}

export async function clearKnown(): Promise<void> {
  await AsyncStorage.removeItem(KNOWN_KEY);
}

// ── Reset all progress ─────────────────────────────────────

export async function resetAllProgress(): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const matmanKeys = allKeys.filter((k) => k.startsWith('@matman/'));
  // Keep global settings (theme preference), clear everything else
  const toDelete = matmanKeys.filter((k) => k !== SETTINGS_KEY);
  if (toDelete.length > 0) await AsyncStorage.multiRemove(toDelete);
}
