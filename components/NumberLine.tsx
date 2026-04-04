import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import type { ThemeColors } from '../constants/Theme';

interface Props {
  value: number;
  benchmark: number;
  benchmarkDisplay?: string;
  valueDisplay?: string;
  colors: ThemeColors;
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

/* ── Label formatting ────────────────────────────────────── */

function fmtMarker(n: number): string {
  if (Number.isInteger(n)) return Math.abs(n) >= 10_000 ? n.toLocaleString() : String(n);
  if (Math.abs(n) >= 100) return String(Math.round(n));
  if (Math.abs(n) >= 10) return n.toFixed(1);
  if (Math.abs(n) >= 1) return n.toFixed(2);
  return n.toFixed(3);
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

const INSET = 16;
const AXIS_Y = 30;
const TICK_HALF = 5;
const MARKER_R = 7;
const LABEL_W = 80;
const TICK_LABEL_W = 52;
const MIN_LABEL_GAP = 34;

export default function NumberLine({
  value,
  benchmark,
  benchmarkDisplay,
  valueDisplay,
  colors,
}: Props) {
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
  }, [width, value, benchmark]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setWidth(w);
  };

  if (width === 0) return <View style={styles.wrap} onLayout={onLayout} />;

  /* ── Range & ticks ────────────────────────────────────── */
  const lo = Math.min(value, benchmark);
  const hi = Math.max(value, benchmark);
  const span = hi - lo || Math.abs(lo) * 0.1 || 1;
  const pad = span * 0.55;

  const ticks = computeTicks(lo - pad, hi + pad);
  const tickInterval = ticks.length > 1 ? Math.abs(ticks[1] - ticks[0]) : 1;

  const axMin = Math.min(lo - pad, ticks[0] ?? lo);
  const axMax = Math.max(hi + pad, ticks[ticks.length - 1] ?? hi);
  const axRange = axMax - axMin || 1;

  const usable = width - INSET * 2;
  const toX = (n: number) => INSET + ((n - axMin) / axRange) * usable;

  const vx = toX(value);
  const bx = toX(benchmark);
  const gapLeft = Math.min(vx, bx);
  const gapW = Math.abs(vx - bx);

  const isLess = value < benchmark;
  const valColor = isLess ? colors.error : colors.correct;

  // Filter tick labels that would collide with marker labels
  const visibleTicks = ticks.filter(t => {
    const tx = toX(t);
    return Math.abs(tx - vx) > MIN_LABEL_GAP && Math.abs(tx - bx) > MIN_LABEL_GAP;
  });

  const clamp = (x: number, w: number) =>
    Math.max(0, Math.min(width - w, x - w / 2));

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          opacity: anim,
          transform: [{
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [12, 0],
            }),
          }],
        },
      ]}
      onLayout={onLayout}
    >
      {/* Benchmark label — above axis */}
      <View style={[styles.markerLabelBox, { left: clamp(bx, LABEL_W), top: 2 }]}>
        <Text style={[styles.markerLabel, { color: colors.muted }]} numberOfLines={1}>
          {benchmarkDisplay || fmtMarker(benchmark)}
        </Text>
      </View>

      {/* Axis line */}
      <View style={[styles.axis, { backgroundColor: colors.border }]} />

      {/* Tick marks */}
      {visibleTicks.map((t, i) => (
        <View
          key={i}
          style={[styles.tick, { left: toX(t) - 0.75, backgroundColor: colors.border }]}
        />
      ))}

      {/* Gap bar */}
      {gapW > 2 && (
        <View
          style={[
            styles.gapBar,
            {
              left: gapLeft,
              width: gapW,
              backgroundColor: valColor + '18',
              borderLeftColor: valColor + '40',
              borderRightColor: valColor + '40',
            },
          ]}
        />
      )}

      {/* Benchmark marker (ring) */}
      <View
        style={[
          styles.ring,
          {
            left: bx - MARKER_R,
            borderColor: colors.muted,
            backgroundColor: colors.card,
          },
        ]}
      />

      {/* Value marker (filled) */}
      <View style={[styles.dot, { left: vx - MARKER_R, backgroundColor: valColor }]} />

      {/* Tick labels — below axis */}
      {visibleTicks.map((t, i) => (
        <View
          key={i}
          style={[styles.tickLabelBox, { left: clamp(toX(t), TICK_LABEL_W) }]}
        >
          <Text style={[styles.tickLabel, { color: colors.muted }]} numberOfLines={1}>
            {fmtTick(t, tickInterval)}
          </Text>
        </View>
      ))}

      {/* Value label — below ticks */}
      <View style={[styles.markerLabelBox, { left: clamp(vx, LABEL_W), top: AXIS_Y + TICK_HALF + 22 }]}>
        <Text style={[styles.markerLabel, { color: valColor, fontWeight: '800' }]} numberOfLines={1}>
          {valueDisplay || fmtMarker(value)}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 78,
    marginTop: 12,
    position: 'relative',
  },
  axis: {
    position: 'absolute',
    top: AXIS_Y,
    left: INSET - 6,
    right: INSET - 6,
    height: 2,
    borderRadius: 1,
  },
  tick: {
    position: 'absolute',
    top: AXIS_Y - TICK_HALF,
    width: 1.5,
    height: TICK_HALF * 2 + 2,
  },
  gapBar: {
    position: 'absolute',
    top: AXIS_Y - 6,
    height: 14,
    borderRadius: 4,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
  },
  ring: {
    position: 'absolute',
    top: AXIS_Y - MARKER_R + 1,
    width: MARKER_R * 2,
    height: MARKER_R * 2,
    borderRadius: MARKER_R,
    borderWidth: 2.5,
  },
  dot: {
    position: 'absolute',
    top: AXIS_Y - MARKER_R + 1,
    width: MARKER_R * 2,
    height: MARKER_R * 2,
    borderRadius: MARKER_R,
  },
  markerLabelBox: {
    position: 'absolute',
    width: LABEL_W,
    alignItems: 'center',
  },
  markerLabel: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  tickLabelBox: {
    position: 'absolute',
    top: AXIS_Y + TICK_HALF + 4,
    width: TICK_LABEL_W,
    alignItems: 'center',
  },
  tickLabel: {
    fontSize: 10,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    opacity: 0.7,
  },
});
