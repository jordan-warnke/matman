import { useCallback, useEffect, useRef } from 'react';
import { clearLastWrong, getReviewPriority, History, loadHistory } from '../store/HistoryStore';

// ── Constants (match useProblemGenerator.ts) ───────────────

const RECENT_QUEUE_SIZE = 16;
const RETRY_MIN_GAP = 3;
const RETRY_MAX_GAP = 6;
const RETRY_MAX_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const REVIEW_INJECTION_RATE = 0.4;

// ── Types ──────────────────────────────────────────────────

/** Minimum constraint: items must carry a historyKey for tracking. */
export interface HasKey {
  historyKey: string;
}

interface RetryEntry<T = unknown> {
  key: string;
  gap: number;
  snapshot?: T;
}

interface PoolConfig<T extends HasKey> {
  /** Fixed pool of all possible items. */
  pool: T[];
  /**
   * Optional per-item weight modifier applied *on top* of ankiWeight.
   * Useful for custom boosts (e.g. primes trap-number ×2.5).
   */
  weightModifier?: (item: T) => number;
}

interface GeneratorConfig<T extends HasKey> {
  /** Function that produces a random item on each call. */
  generate: () => T;
  /** How many candidates to produce per selection (default 12). */
  candidateCount?: number;
  /** Optional per-item weight modifier (same as pool mode). */
  weightModifier?: (item: T) => number;
}

type SelectorConfig<T extends HasKey> = PoolConfig<T> | GeneratorConfig<T>;

function isPoolConfig<T extends HasKey>(cfg: SelectorConfig<T>): cfg is PoolConfig<T> {
  return 'pool' in cfg;
}

// ── Utilities ──────────────────────────────────────────────

function randomRetryGap(): number {
  return Math.floor(Math.random() * (RETRY_MAX_GAP - RETRY_MIN_GAP + 1)) + RETRY_MIN_GAP;
}

function pickWeighted<T>(pool: T[], getWeight: (entry: T) => number): T {
  const total = pool.reduce((sum, e) => sum + Math.max(0, getWeight(e)), 0);
  if (total <= 0) return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
  let r = Math.random() * total;
  for (const e of pool) {
    r -= Math.max(0, getWeight(e));
    if (r <= 0) return e;
  }
  return pool[pool.length - 1] ?? pool[0];
}

// ── Hook ───────────────────────────────────────────────────

export function useRetrySelector<T extends HasKey>(config: SelectorConfig<T>) {
  // Store config in ref so `next` callback is stable across renders
  const configRef = useRef(config);
  configRef.current = config;

  const historyRef = useRef<History>({});
  const recentRef = useRef<string[]>([]);
  const retryQueueRef = useRef<RetryEntry<T>[]>([]);
  const lastRetryServedRef = useRef<string | null>(null);
  const reviewsServedRef = useRef(0);

  const refreshHistory = useCallback(async () => {
    historyRef.current = await loadHistory();
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  /** Queue a wrong-answer key for retry 3-6 problems later. */
  const enqueueRetry = useCallback((key: string, snapshot?: T) => {
    // If this key was the last retry served, it was answered wrong again — cancel graduation
    if (lastRetryServedRef.current === key) lastRetryServedRef.current = null;
    if (retryQueueRef.current.some(e => e.key === key)) return;
    retryQueueRef.current.push({ key, gap: randomRetryGap(), snapshot });
  }, []);

  /** Select the next item using three-tier retry / due / active logic. */
  const next = useCallback((): T & { resurfacing?: 'retry' | 'review' } => {
    const cfg = configRef.current;
    const history = historyRef.current;

    // ── 0. Graduate previous retry if it was answered correctly ──
    // If lastRetryServedRef is still set, enqueueRetry was never called for it,
    // meaning the user answered it correctly → clear lastWrong.
    if (lastRetryServedRef.current) {
      clearLastWrong(lastRetryServedRef.current);
      lastRetryServedRef.current = null;
    }

    // ── 1. Tick down retry gaps & prune expired entries ──
    retryQueueRef.current = retryQueueRef.current
      .map(e => ({ ...e, gap: e.gap - 1 }))
      .filter(e => {
        const rec = history[e.key];
        return rec?.lastWrong != null && Date.now() - rec.lastWrong <= RETRY_MAX_WINDOW_MS;
      });

    const readyRetryKeys = new Set(
      retryQueueRef.current.filter(e => e.gap <= 0).map(e => e.key),
    );
    const recentSet = new Set(recentRef.current);

    if (isPoolConfig(cfg)) {
      // ── POOL-BASED selection ──────────────────────────
      const mod = cfg.weightModifier ?? (() => 1);
      const pool = cfg.pool;

      const scored = pool.map(item => {
        const priority = getReviewPriority(history[item.historyKey]);
        const hasHistory = !!history[item.historyKey];
        let weight = priority.weight * mod(item);
        if (recentSet.has(item.historyKey)) weight = 0;
        const wrongCount = history[item.historyKey]?.wrong ?? 0;
        return {
          item,
          weight,
          reviewWeight: priority.weight * mod(item),
          retryWeight: Math.max(1, priority.weight) * (1 + wrongCount) * mod(item),
          isDue: priority.isDue,
          hasHistory,
          isRetryReady: readyRetryKeys.has(item.historyKey),
        };
      });

      // Scale recent queue to pool size
      const queueLimit = Math.max(2, Math.min(RECENT_QUEUE_SIZE, Math.floor(scored.length / 2) || 2));
      while (recentRef.current.length > queueLimit) recentRef.current.shift();

      const activePool = scored.filter(e => e.weight > 0);
      const retryPool = scored.filter(e => e.isRetryReady);
      const duePool = activePool.filter(e => e.isDue);
      const reviewCap = Math.max(5, Math.floor(scored.length * 0.25));
      const shouldInjectReview = duePool.length > 0
        && reviewsServedRef.current < reviewCap
        && Math.random() < REVIEW_INJECTION_RATE;
      const standardPool = shouldInjectReview
        ? (duePool.length > 0 ? duePool : activePool)
        : activePool;
      const fallbackPool = duePool.length > 0 ? duePool : scored;

      const chosen = retryPool.length > 0
        ? pickWeighted(retryPool, e => e.retryWeight)
        : pickWeighted(
            standardPool.length > 0 ? standardPool : fallbackPool,
            e => (standardPool.length > 0 ? e.weight : e.reviewWeight),
          );

      if (chosen.isRetryReady) {
        retryQueueRef.current = retryQueueRef.current.filter(e => e.key !== chosen.item.historyKey);
        lastRetryServedRef.current = chosen.item.historyKey;
      }
      const resurfacing: 'retry' | 'review' | undefined = chosen.isRetryReady
        ? 'retry'
        : chosen.hasHistory && chosen.isDue && shouldInjectReview
          ? 'review'
          : undefined;
      if (resurfacing === 'review') reviewsServedRef.current++;

      recentRef.current.push(chosen.item.historyKey);
      while (recentRef.current.length > queueLimit) recentRef.current.shift();

      return { ...chosen.item, resurfacing };

    } else {
      // ── GENERATOR-BASED selection ─────────────────────
      const count = cfg.candidateCount ?? 12;
      const mod = cfg.weightModifier ?? (() => 1);

      // Check if any retry entries are ready
      const retryReady = retryQueueRef.current.filter(e => e.gap <= 0);

      // Try to serve a retry candidate (snapshot-first, then regeneration fallback)
      if (retryReady.length > 0) {
        const entry = retryReady[0];
        const targetKey = entry.key;

        // If we stored a snapshot, return it directly — no regeneration needed
        if (entry.snapshot) {
          retryQueueRef.current = retryQueueRef.current.filter(e => e.key !== targetKey);
          lastRetryServedRef.current = targetKey;
          recentRef.current = [...recentRef.current, targetKey].slice(-RECENT_QUEUE_SIZE);
          return { ...entry.snapshot, resurfacing: 'retry' as const };
        }

        // Fallback: try to regenerate by matching historyKey
        for (let i = 0; i < count * 3; i++) {
          const c = cfg.generate();
          if (c.historyKey === targetKey) {
            retryQueueRef.current = retryQueueRef.current.filter(e => e.key !== targetKey);
            lastRetryServedRef.current = targetKey;
            recentRef.current = [...recentRef.current, c.historyKey].slice(-RECENT_QUEUE_SIZE);
            return { ...c, resurfacing: 'retry' as const };
          }
        }
        // Couldn't regenerate — keep entry in queue, it will retry next call or expire
      }

      // Normal candidate generation with getReviewPriority
      const candidates: { item: T; weight: number; isDue: boolean; hasHistory: boolean }[] = [];
      for (let i = 0; i < count; i++) {
        const c = cfg.generate();
        if (recentSet.has(c.historyKey)) continue;
        const priority = getReviewPriority(history[c.historyKey]);
        candidates.push({
          item: c,
          weight: priority.weight * mod(c),
          isDue: priority.isDue,
          hasHistory: !!history[c.historyKey],
        });
      }

      // Fallback if all were filtered out
      if (candidates.length === 0) {
        const fallback = cfg.generate();
        const p = getReviewPriority(history[fallback.historyKey]);
        candidates.push({ item: fallback, weight: p.weight * mod(fallback), isDue: p.isDue, hasHistory: !!history[fallback.historyKey] });
      }

      // Due-item injection: 40% chance to force pick from due subset (capped per session)
      const dueCandidates = candidates.filter(c => c.isDue);
      const reviewCap = Math.max(5, Math.floor(count * 2));
      const shouldInjectReview = dueCandidates.length > 0
        && reviewsServedRef.current < reviewCap
        && Math.random() < REVIEW_INJECTION_RATE;
      const selectionPool = shouldInjectReview ? dueCandidates : candidates;

      const chosen = pickWeighted(selectionPool, e => e.weight);
      const resurfacing: 'retry' | 'review' | undefined =
        chosen.hasHistory && chosen.isDue && shouldInjectReview ? 'review' : undefined;
      if (resurfacing === 'review') reviewsServedRef.current++;

      recentRef.current = [...recentRef.current, chosen.item.historyKey].slice(-RECENT_QUEUE_SIZE);

      return { ...chosen.item, resurfacing };
    }
  }, []); // stable — reads from configRef

  return { next, enqueueRetry, refreshHistory, historyRef };
}
