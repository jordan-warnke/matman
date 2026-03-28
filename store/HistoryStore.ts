import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const HISTORY_KEY = '@matman/history';
const SETTINGS_KEY = '@matman/settings';
const MODE_SETTINGS_PREFIX = '@matman/mode-settings/';

export interface AttemptRecord {
  correct: number;
  wrong: number;
  totalTime: number;
  lastSeen: number;
  lastWrong?: number;
}

export interface ReviewPriority {
  weight: number;
  isDue: boolean;
  targetHours: number;
  hoursSince: number;
}

// Keyed as "3x7" — we keep a×b and b×a as distinct entries
// so the user gets drilled on both orderings.
export type History = Record<string, AttemptRecord>;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

async function storageGetItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return AsyncStorage.getItem(key);
}

async function storageSetItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
    return;
  }
  await AsyncStorage.setItem(key, value);
}

async function storageGetAllKeys(): Promise<string[]> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    return Object.keys(localStorage);
  }
  return Array.from(await AsyncStorage.getAllKeys());
}

async function storageMultiRemove(keys: string[]): Promise<void> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    keys.forEach((key) => localStorage.removeItem(key));
    return;
  }
  await AsyncStorage.multiRemove(keys);
}

/**
 * Duolingo-style review urgency.
 * - `known` wins over everything and is strongly suppressed.
 * - `struggle` raises urgency, but only inside the currently eligible pool.
 * - Recent items are still suppressed to avoid churn.
 * - Due/overdue items get a strong boost so normal practice can inject review.
 */
export function getReviewPriority(rec: AttemptRecord | undefined): ReviewPriority {
  if (!rec) {
    return {
      weight: 6,
      isDue: true,
      targetHours: 0,
      hoursSince: Number.POSITIVE_INFINITY,
    };
  }

  const attempts = Math.max(1, rec.correct + rec.wrong);
  const accuracy = rec.correct / attempts;
  const errorRate = rec.wrong / attempts;
  const avgSeconds = rec.totalTime / attempts / 1000;
  const hoursSince = (Date.now() - rec.lastSeen) / 3_600_000;

  let targetHours = 12 + rec.correct * 10;
  targetHours *= 0.8 + accuracy;
  targetHours /= 1 + errorRate * 1.5;

  if (avgSeconds > 8) targetHours *= 0.9;

  targetHours = clamp(targetHours, 6, 14 * 24);

  const isDue = hoursSince >= targetHours;

  if (hoursSince < 0.083) {
    return { weight: 0.05, isDue: false, targetHours, hoursSince };
  }

  if (hoursSince < 1) {
    return { weight: 0.2, isDue: false, targetHours, hoursSince };
  }

  const overdueRatio = targetHours <= 0 ? 1 : hoursSince / targetHours;
  let weight = 0.8 + accuracy * 0.8;

  if (isDue) {
    weight += 2.5 + Math.min(6, (overdueRatio - 1) * 2.5);
  } else {
    weight *= 0.6 + overdueRatio * 0.8;
  }

  return { weight, isDue, targetHours, hoursSince };
}

export function ankiWeight(rec: AttemptRecord | undefined): number {
  return getReviewPriority(rec).weight;
}

// ── Global settings (theme only) ───────────────────────────

export interface GlobalSettings {
  theme: 'light' | 'dark' | 'work' | 'system';
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
  excludedNumbers: number[];
  excludeSquarePairs: boolean;
  shuffleOrder: boolean;
  maxNumerator: number | null;
  maxDenominator: number | null;
  gauntletCategories: string[];
  factoringCategories: string[];
  operandMode: '3x1' | '2x2' | 'both';
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
  excludedNumbers: [],
  excludeSquarePairs: false,
  shuffleOrder: false,
  maxNumerator: null,
  maxDenominator: null,
  gauntletCategories: ['identities', 'exponents', 'quadratics', 'inequalities'],
  factoringCategories: ['diff-squares', 'perfect-sq', 'trinomials', 'gcf', 'leading-coeff', 'cubes'],
  operandMode: '3x1' as const,
};

export function sanitizeModeSettings(settings: ModeSettings): ModeSettings {
  const maxNumber = clamp(settings.maxNumber, 1, 25);
  const minNumber = clamp(settings.minNumber, 1, maxNumber);
  const anchor = settings.anchor == null ? null : clamp(settings.anchor, 1, 25);

  const excludedNumbers = [...new Set(settings.excludedNumbers ?? [])]
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 13)
    .sort((a, b) => a - b);

  const sanitizedExcluded = excludedNumbers.filter((n) => n !== anchor);
  const activeRange = new Set<number>();
  for (let n = minNumber; n <= maxNumber; n++) activeRange.add(n);

  const hasPlayableB = [...activeRange].some((n) => !sanitizedExcluded.includes(n));
  if (!hasPlayableB) {
    sanitizedExcluded.splice(sanitizedExcluded.indexOf(minNumber), sanitizedExcluded.includes(minNumber) ? 1 : 0);
  }

  return {
    ...settings,
    maxNumber,
    minNumber,
    anchor,
    excludedNumbers: sanitizedExcluded,
    excludeSquarePairs: !!settings.excludeSquarePairs,
  };
}

export type GameType =
  | 'time-attack' | 'free-form'
  | 'fdp-time-attack' | 'fdp-free-form'
  | 'fractions-drill' | 'decimals-drill' | 'percents-drill'
  | 'cyclicity-drill'
  | 'arith-survival' | 'arith-free-form'
  | 'primes-time-attack' | 'primes-free-form'
  | 'bound-time-attack' | 'bound-free-form'
  | 'parity-drill' | 'sign-drill'
  | 'algebra-drill' | 'wordprob-drill' | 'gauntlet-drill' | 'factoring-drill'
  | 'estimation-drill'
  | 'datastats-drill' | 'di-drill'
  | 'verbal-drill'
  | 'longdiv-drill'
  | 'numbersense-drill';

// ── helpers ────────────────────────────────────────────────

function makeKey(a: number, b: number) {
  return `${a}x${b}`;
}

// ── public API ─────────────────────────────────────────────

export async function loadHistory(): Promise<History> {
  const raw = await storageGetItem(HISTORY_KEY);
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
    lastWrong: isCorrect ? prev.lastWrong : Date.now(),
  };

  await storageSetItem(HISTORY_KEY, JSON.stringify(history));
}

// ── Global settings ────────────────────────────────────────

export async function loadGlobalSettings(): Promise<GlobalSettings> {
  const raw = await storageGetItem(SETTINGS_KEY);
  return raw ? { ...DEFAULT_GLOBAL, ...JSON.parse(raw) } : DEFAULT_GLOBAL;
}

export async function saveGlobalSettings(patch: Partial<GlobalSettings>): Promise<void> {
  const current = await loadGlobalSettings();
  await storageSetItem(SETTINGS_KEY, JSON.stringify({ ...current, ...patch }));
}

// ── Per-mode settings ──────────────────────────────────────

export async function loadModeSettings(gameType: GameType): Promise<ModeSettings> {
  const raw = await storageGetItem(MODE_SETTINGS_PREFIX + gameType);
  return raw
    ? sanitizeModeSettings({ ...DEFAULT_MODE_SETTINGS, ...JSON.parse(raw) })
    : DEFAULT_MODE_SETTINGS;
}

export async function saveModeSettings(
  gameType: GameType,
  patch: Partial<ModeSettings>,
): Promise<void> {
  const current = await loadModeSettings(gameType);
  const next = sanitizeModeSettings({ ...current, ...patch });
  await storageSetItem(
    MODE_SETTINGS_PREFIX + gameType,
    JSON.stringify(next),
  );
}

// ── Reset all progress ─────────────────────────────────────

export async function resetAllProgress(): Promise<void> {
  const allKeys = await storageGetAllKeys();
  const matmanKeys = allKeys.filter((k) => k.startsWith('@matman/'));
  // Keep global settings (theme preference), clear everything else
  const toDelete = matmanKeys.filter((k) => k !== SETTINGS_KEY);
  if (toDelete.length > 0) await storageMultiRemove(toDelete);
}
