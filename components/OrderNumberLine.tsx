import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import type { ThemeColors } from '../constants/Theme';

interface Point {
  value: number;
  display: string;
  reveal?: string;
  placed: boolean;
}

interface Props {
  points: Point[];
  colors: ThemeColors;
  accentColor: string;
  /** When true, all points show display + reveal labels */
  revealed?: boolean;
}

/* ── Nice-number tick algorithm ──────────────────────────── */

function niceNum(x: number, round: boolean): number {
  if (x <= 0) return 1;
  const exp = Math.floor(Math.log10(x));
  const frac = x / 10 ** exp;
  let nice: number;
  if (round) {
    nice = frac < 1.5 ? 1 : frac < 3 ? 2 : frac < 7 ? 5 : 10;
  } else {
    nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  }
  return nice * 10 ** exp;
}

function computeTicks(lo: number, hi: number, target = 5): number[] {
  const range = hi - lo;
  if (range <= 0) return [lo];
  const interval = niceNum(range / target, true);
  const first = Math.ceil(lo / interval) * interval;
  const ticks: number[] = [];
  for (let t = first; t <= hi + interval * 0.001 && ticks.length < 20; t += interval) {
    ticks.push(parseFloat((Math.round(t / interval) * interval).toPrecision(12)));
  }
  return ticks;
}

function fmtTick(n: number, interval: number): string {
  if (interval >= 1) {
    if (Number.isInteger(n)) return Math.abs(n) >= 10_000 ? n.toLocaleString() : String(n);
    return n.toFixed(1);
  }
  const decimals = Math.max(1, Math.ceil(-Math.log10(interval)));
  return n.toFixed(decimals);
}

/* ── Layout constants ────────────────────────────────────── */

const INSET = 20;
const AXIS_Y_NORMAL = 10;
const AXIS_Y_REVEALED = 22;
const TICK_HALF = 4;
const MARKER_R = 5;
const TICK_LABEL_W = 48;
const MIN_MARKER_GAP = 28;

export default function OrderNumberLine({ points, colors, accentColor, revealed }: Props) {
  const [width, setWidth] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (width > 0) {
      anim.setValue(0);
      Animated.spring(anim, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: true,
      }).start();
    }
  }, [width]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setWidth(w);
  };

  if (width === 0 || points.length === 0) {
    return <View style={[styles.wrap, revealed && styles.wrapRevealed]} onLayout={onLayout} />;
  }

  const AXIS_Y = revealed ? AXIS_Y_REVEALED : AXIS_Y_NORMAL;

  const values = points.map(p => p.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || Math.abs(lo) * 0.1 || 1;
  const pad = span * 0.35;

  const ticks = computeTicks(lo - pad, hi + pad);
  const tickInterval = ticks.length > 1 ? Math.abs(ticks[1] - ticks[0]) : 1;

  const axMin = Math.min(lo - pad, ticks[0] ?? lo);
  const axMax = Math.max(hi + pad, ticks[ticks.length - 1] ?? hi);
  const axRange = axMax - axMin || 1;

  const usable = width - INSET * 2;
  const toX = (n: number) => INSET + ((n - axMin) / axRange) * usable;

  // Filter tick labels that would collide with marker positions
  const markerXs = points.map(p => toX(p.value));
  const visibleTicks = ticks.filter(t => {
    const tx = toX(t);
    return markerXs.every(mx => Math.abs(tx - mx) > MIN_MARKER_GAP);
  });

  const clamp = (x: number, w: number) =>
    Math.max(0, Math.min(width - w, x - w / 2));

  // Compute stagger tiers for overlapping marker labels
  const LABEL_W = 60;
  const sorted = points.map((pt, i) => ({ i, x: toX(pt.value) })).sort((a, b) => a.x - b.x);
  const tiers: number[] = new Array(points.length).fill(0);
  for (let s = 1; s < sorted.length; s++) {
    const prev = sorted[s - 1];
    const curr = sorted[s];
    if (Math.abs(curr.x - prev.x) < LABEL_W) {
      tiers[curr.i] = (tiers[prev.i] + 1) % 2;
    }
  }

  return (
    <Animated.View
      style={[
        styles.wrap,
        revealed && styles.wrapRevealed,
        {
          opacity: anim,
          transform: [{
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 0],
            }),
          }],
        },
      ]}
      onLayout={onLayout}
    >
      {/* Axis line */}
      <View style={[styles.axis, { backgroundColor: colors.border, top: AXIS_Y }]} />

      {/* Tick marks */}
      {visibleTicks.map((t, i) => (
        <View
          key={`t${i}`}
          style={[styles.tick, { left: toX(t) - 0.75, backgroundColor: colors.border, top: AXIS_Y - TICK_HALF }]}
        />
      ))}

      {/* Tick labels */}
      {visibleTicks.map((t, i) => (
        <View
          key={`tl${i}`}
          style={[styles.tickLabelBox, { left: clamp(toX(t), TICK_LABEL_W), top: AXIS_Y + TICK_HALF + 4 }]}
        >
          <Text style={[styles.tickLabel, { color: colors.muted }]} numberOfLines={1}>
            {fmtTick(t, tickInterval)}
          </Text>
        </View>
      ))}

      {/* Point markers */}
      {points.map((pt, i) => {
        const px = toX(pt.value);
        const isShown = revealed || pt.placed;
        const tier = tiers[i];
        return (
          <View key={`m${i}`}>
            {/* Dot */}
            <View
              style={[
                styles.dot,
                {
                  left: px - MARKER_R,
                  top: AXIS_Y - MARKER_R + 1,
                  backgroundColor: isShown ? accentColor : colors.muted + '60',
                  borderColor: isShown ? accentColor : colors.muted,
                },
              ]}
            />
            {/* Display label above */}
            {isShown && (
              <View style={[styles.markerLabelBox, { left: clamp(px, 60), top: AXIS_Y - MARKER_R - 14 - tier * 12 }]}>
                <Text
                  style={[styles.markerLabel, { color: accentColor }]}
                  numberOfLines={1}
                >
                  {pt.display}
                </Text>
              </View>
            )}
            {/* Reveal label below */}
            {revealed && pt.reveal && (
              <View style={[styles.revealLabelBox, { left: clamp(px, 60), top: AXIS_Y + MARKER_R + 4 + tier * 12 }]}>
                <Text
                  style={[styles.revealLabel, { color: colors.muted }]}
                  numberOfLines={1}
                >
                  {pt.reveal}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 60,
    marginHorizontal: 8,
    position: 'relative',
  },
  wrapRevealed: {
    height: 76,
  },
  axis: {
    position: 'absolute',
    left: INSET - 8,
    right: INSET - 8,
    height: 2,
    borderRadius: 1,
  },
  tick: {
    position: 'absolute',
    width: 1.5,
    height: TICK_HALF * 2 + 2,
  },
  tickLabelBox: {
    position: 'absolute',
    width: TICK_LABEL_W,
    alignItems: 'center',
  },
  tickLabel: {
    fontSize: 9,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    opacity: 0.7,
  },
  dot: {
    position: 'absolute',
    width: MARKER_R * 2,
    height: MARKER_R * 2,
    borderRadius: MARKER_R,
    borderWidth: 1.5,
  },
  markerLabelBox: {
    position: 'absolute',
    width: 60,
    alignItems: 'center',
  },
  markerLabel: {
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  revealLabelBox: {
    position: 'absolute',
    width: 60,
    alignItems: 'center',
  },
  revealLabel: {
    fontSize: 9,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
});
