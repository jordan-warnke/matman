export interface FDPEntry {
  id: number;
  fraction: string;
  decimal: string;
  percent: string;
  decimalValue: number;
  percentValue: number;
}

export type FDPFormat = 'fraction' | 'decimal' | 'percent';

// Common GMAT FDP conversions — halves through twelfths, plus ninths, elevenths, sevenths
export const FDP_TABLE: FDPEntry[] = [
  // Halves & Quarters
  { id: 0,  fraction: '1/2',  decimal: '0.5',    percent: '50%',     decimalValue: 0.5,     percentValue: 50 },
  { id: 1,  fraction: '1/4',  decimal: '0.25',   percent: '25%',     decimalValue: 0.25,    percentValue: 25 },
  { id: 2,  fraction: '3/4',  decimal: '0.75',   percent: '75%',     decimalValue: 0.75,    percentValue: 75 },
  // Thirds & Sixths
  { id: 3,  fraction: '1/3',  decimal: '0.333',  percent: '33.3%',   decimalValue: 1 / 3,   percentValue: 100 / 3 },
  { id: 4,  fraction: '2/3',  decimal: '0.667',  percent: '66.7%',   decimalValue: 2 / 3,   percentValue: 200 / 3 },
  { id: 5,  fraction: '1/6',  decimal: '0.167',  percent: '16.7%',   decimalValue: 1 / 6,   percentValue: 100 / 6 },
  { id: 6,  fraction: '5/6',  decimal: '0.833',  percent: '83.3%',   decimalValue: 5 / 6,   percentValue: 500 / 6 },
  // Fifths (20% multipliers)
  { id: 7,  fraction: '1/5',  decimal: '0.2',    percent: '20%',     decimalValue: 0.2,     percentValue: 20 },
  { id: 8,  fraction: '2/5',  decimal: '0.4',    percent: '40%',     decimalValue: 0.4,     percentValue: 40 },
  { id: 9,  fraction: '3/5',  decimal: '0.6',    percent: '60%',     decimalValue: 0.6,     percentValue: 60 },
  { id: 10, fraction: '4/5',  decimal: '0.8',    percent: '80%',     decimalValue: 0.8,     percentValue: 80 },
  // Eighths (12.5% multipliers)
  { id: 11, fraction: '1/8',  decimal: '0.125',  percent: '12.5%',   decimalValue: 0.125,   percentValue: 12.5 },
  { id: 12, fraction: '3/8',  decimal: '0.375',  percent: '37.5%',   decimalValue: 0.375,   percentValue: 37.5 },
  { id: 13, fraction: '5/8',  decimal: '0.625',  percent: '62.5%',   decimalValue: 0.625,   percentValue: 62.5 },
  { id: 14, fraction: '7/8',  decimal: '0.875',  percent: '87.5%',   decimalValue: 0.875,   percentValue: 87.5 },
  // Ninths (repeating digit pattern)
  { id: 15, fraction: '1/9',  decimal: '0.111',  percent: '11.1%',   decimalValue: 1 / 9,   percentValue: 100 / 9 },
  { id: 16, fraction: '2/9',  decimal: '0.222',  percent: '22.2%',   decimalValue: 2 / 9,   percentValue: 200 / 9 },
  { id: 17, fraction: '4/9',  decimal: '0.444',  percent: '44.4%',   decimalValue: 4 / 9,   percentValue: 400 / 9 },
  { id: 18, fraction: '5/9',  decimal: '0.556',  percent: '55.6%',   decimalValue: 5 / 9,   percentValue: 500 / 9 },
  { id: 19, fraction: '7/9',  decimal: '0.778',  percent: '77.8%',   decimalValue: 7 / 9,   percentValue: 700 / 9 },
  { id: 20, fraction: '8/9',  decimal: '0.889',  percent: '88.9%',   decimalValue: 8 / 9,   percentValue: 800 / 9 },
  // Tenths
  { id: 21, fraction: '1/10', decimal: '0.1',    percent: '10%',     decimalValue: 0.1,     percentValue: 10 },
  { id: 22, fraction: '3/10', decimal: '0.3',    percent: '30%',     decimalValue: 0.3,     percentValue: 30 },
  { id: 23, fraction: '7/10', decimal: '0.7',    percent: '70%',     decimalValue: 0.7,     percentValue: 70 },
  { id: 24, fraction: '9/10', decimal: '0.9',    percent: '90%',     decimalValue: 0.9,     percentValue: 90 },
  // Elevenths (9-multiplier pattern)
  { id: 25, fraction: '1/11', decimal: '0.091',  percent: '9.09%',   decimalValue: 1 / 11,  percentValue: 100 / 11 },
  { id: 26, fraction: '2/11', decimal: '0.182',  percent: '18.18%',  decimalValue: 2 / 11,  percentValue: 200 / 11 },
  { id: 27, fraction: '3/11', decimal: '0.273',  percent: '27.27%',  decimalValue: 3 / 11,  percentValue: 300 / 11 },
  // Twelfths
  { id: 28, fraction: '1/12', decimal: '0.083',  percent: '8.33%',   decimalValue: 1 / 12,  percentValue: 100 / 12 },
  { id: 29, fraction: '5/12', decimal: '0.417',  percent: '41.67%',  decimalValue: 5 / 12,  percentValue: 500 / 12 },
  // Sevenths (ugly approximations)
  { id: 30, fraction: '1/7',  decimal: '0.143',  percent: '14.3%',   decimalValue: 1 / 7,   percentValue: 100 / 7 },
  { id: 31, fraction: '2/7',  decimal: '0.286',  percent: '28.6%',   decimalValue: 2 / 7,   percentValue: 200 / 7 },
];

const FORMATS: FDPFormat[] = ['fraction', 'decimal', 'percent'];

export function getDisplayValue(entry: FDPEntry, format: FDPFormat): string {
  switch (format) {
    case 'fraction': return entry.fraction;
    case 'decimal':  return entry.decimal;
    case 'percent':  return entry.percent;
  }
}

export function formatLabel(format: FDPFormat): string {
  switch (format) {
    case 'fraction': return 'fraction';
    case 'decimal':  return 'decimal';
    case 'percent':  return 'percent';
  }
}

export function checkAnswer(entry: FDPEntry, format: FDPFormat, input: string): boolean {
  const cleaned = input.trim();

  switch (format) {
    case 'fraction':
      return cleaned === entry.fraction;
    case 'decimal': {
      const val = parseFloat(cleaned);
      return !isNaN(val) && Math.abs(val - entry.decimalValue) < 0.005;
    }
    case 'percent': {
      const stripped = cleaned.replace('%', '').trim();
      const val = parseFloat(stripped);
      return !isNaN(val) && Math.abs(val - entry.percentValue) < 0.5;
    }
  }
}

export function pickFormats(): { source: FDPFormat; target: FDPFormat } {
  const source = FORMATS[Math.floor(Math.random() * 3)];
  const remaining = FORMATS.filter((f) => f !== source);
  const target = remaining[Math.floor(Math.random() * 2)];
  return { source, target };
}

export function generateOptions(
  correctEntry: FDPEntry,
  targetFormat: FDPFormat,
  avoidAnswerAt?: number,
): string[] {
  const correctValue = getDisplayValue(correctEntry, targetFormat);
  const others = FDP_TABLE.filter((e) => e.id !== correctEntry.id);

  // Sort by numerical proximity to the correct answer (closest first)
  const sorted = [...others].sort(
    (a, b) =>
      Math.abs(a.decimalValue - correctEntry.decimalValue) -
      Math.abs(b.decimalValue - correctEntry.decimalValue),
  );

  // Build distractors: pick from the closest values with some variety
  // - 1 from same-denominator family (if available)
  // - fill remaining from numerically closest
  const correctFraction = correctEntry.fraction;
  const correctDenom = correctFraction.includes('/')
    ? correctFraction.split('/')[1]
    : null;

  const distractors: FDPEntry[] = [];
  const used = new Set<number>();

  // Try to include a same-denominator sibling first (e.g., 1/3 → 2/3)
  if (correctDenom) {
    const sibling = sorted.find(
      (e) =>
        e.fraction.includes('/') &&
        e.fraction.split('/')[1] === correctDenom &&
        !used.has(e.id),
    );
    if (sibling) {
      distractors.push(sibling);
      used.add(sibling.id);
    }
  }

  // Fill rest from closest values (that we haven't used)
  for (const entry of sorted) {
    if (distractors.length >= 3) break;
    if (!used.has(entry.id)) {
      distractors.push(entry);
      used.add(entry.id);
    }
  }

  const options = [
    correctValue,
    ...distractors.map((e) => getDisplayValue(e, targetFormat)),
  ];

  // Shuffle with bias away from previous answer position on repeat
  if (avoidAnswerAt !== undefined && avoidAnswerAt >= 0) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const s = [...options];
      for (let i = s.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [s[i], s[j]] = [s[j], s[i]];
      }
      if (s.indexOf(correctValue) !== avoidAnswerAt) return s;
    }
  }

  // Fisher-Yates shuffle
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return options;
}
