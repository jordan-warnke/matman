import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

type MathTextProps = {
  text: string;
  style?: TextStyle | TextStyle[];
  containerStyle?: ViewStyle | ViewStyle[];
  compact?: boolean;
  numberOfLines?: number;
};

type Token =
  | { type: 'text'; value: string }
  | { type: 'operator'; value: string }
  | { type: 'fraction'; numerator: string; denominator: string };

const OPENERS = new Set(['(', '[', '{']);
const CLOSERS = new Set([')', ']', '}']);
const NARRATIVE_MARKERS = /\b(is|are|where|when|then|from|for some|integer|always|only if)\b|[:,]/i;

function findTopLevelIndex(text: string, target: string): number {
  let depth = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (OPENERS.has(char)) {
      depth += 1;
      continue;
    }
    if (CLOSERS.has(char)) {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth === 0 && char === target) {
      return index;
    }
  }
  return -1;
}

function splitEquation(text: string): [string, string] | null {
  const index = findTopLevelIndex(text, '=');
  if (index < 0) return null;

  const left = text.slice(0, index).trim();
  const right = text.slice(index + 1).trim();
  if (!left || !right) return null;
  return [left, right];
}

function parseFraction(text: string): { numerator: string; denominator: string } | null {
  if (NARRATIVE_MARKERS.test(text)) return null;

  const slashIndex = findTopLevelIndex(text, '/');
  if (slashIndex < 0) return null;

  const numerator = text.slice(0, slashIndex).trim();
  const denominator = text.slice(slashIndex + 1).trim();
  if (!numerator || !denominator) return null;
  return { numerator, denominator };
}

function tokenizeExpression(text: string): Token[] {
  const tokens: Token[] = [];
  let depth = 0;
  let current = '';

  const pushTextToken = () => {
    const value = current.trim();
    if (!value) {
      current = '';
      return;
    }

    const fraction = parseFraction(value);
    if (fraction) {
      tokens.push({ type: 'fraction', ...fraction });
    } else {
      tokens.push({ type: 'text', value });
    }
    current = '';
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (OPENERS.has(char)) {
      depth += 1;
      current += char;
      continue;
    }
    if (CLOSERS.has(char)) {
      depth = Math.max(0, depth - 1);
      current += char;
      continue;
    }

    const isArrow = char === '→';
    const isAsciiArrow = text.slice(index, index + 2) === '->';
    if (depth === 0 && (isArrow || isAsciiArrow)) {
      pushTextToken();
      tokens.push({ type: 'operator', value: isArrow ? '→' : '->' });
      if (isAsciiArrow) index += 1;
      continue;
    }

    const isOperator = char === '+' || char === '−' || char === '×';
    const isAsciiMinus = char === '-' && text[index - 1] === ' ' && text[index + 1] === ' ';
    if (depth === 0 && (isOperator || isAsciiMinus)) {
      pushTextToken();
      tokens.push({ type: 'operator', value: char });
      continue;
    }

    current += char;
  }

  pushTextToken();
  return tokens;
}

function renderPlainText(
  value: string,
  textStyle: TextStyle,
  key: string,
  numberOfLines?: number,
) {
  return (
    <Text key={key} style={textStyle} numberOfLines={numberOfLines}>
      {value}
    </Text>
  );
}

function hasFractionToken(tokens: Token[]): boolean {
  return tokens.some((token) => token.type === 'fraction');
}

export default function MathText({
  text,
  style,
  containerStyle,
  compact = false,
  numberOfLines,
}: MathTextProps) {
  const flattened = StyleSheet.flatten(style) ?? {};
  const baseFontSize = typeof flattened.fontSize === 'number' ? flattened.fontSize : 16;
  const textStyle: TextStyle = {
    ...flattened,
    textAlign: flattened.textAlign ?? 'center',
  };
  const fractionTextStyle: TextStyle = {
    ...textStyle,
    fontSize: Math.max(10, Math.round(baseFontSize * (compact ? 0.7 : 0.76))),
    lineHeight: Math.max(12, Math.round(baseFontSize * (compact ? 0.9 : 1))),
  };

  const equation = splitEquation(text);
  const tokens = equation
    ? [
        ...tokenizeExpression(equation[0]),
        { type: 'operator', value: '=' } as Token,
        ...tokenizeExpression(equation[1]),
      ]
    : tokenizeExpression(text);

  if (!hasFractionToken(tokens)) {
    return renderPlainText(text, textStyle, 'plain', numberOfLines);
  }

  return (
    <View style={[styles.row, containerStyle]}>
      {tokens.map((token, index) => {
        const key = `${token.type}-${index}`;
        if (token.type === 'text') {
          return renderPlainText(token.value, textStyle, key, numberOfLines);
        }
        if (token.type === 'operator') {
          return renderPlainText(` ${token.value} `, textStyle, key, numberOfLines);
        }

        return (
          <View key={key} style={styles.fractionWrap}>
            <Text style={fractionTextStyle}>{token.numerator}</Text>
            <View
              style={[
                styles.divider,
                {
                  backgroundColor: textStyle.color ?? '#000',
                  minWidth: compact ? 18 : 24,
                },
              ]}
            />
            <Text style={fractionTextStyle}>{token.denominator}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    flexShrink: 1,
  },
  fractionWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
    flexShrink: 1,
  },
  divider: {
    alignSelf: 'stretch',
    height: 1,
    marginVertical: 1,
  },
});