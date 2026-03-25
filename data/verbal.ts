/**
 * Verbal — GMAT drill bank.
 *
 * Three sub-categories:
 *  1. CR Flaws (~20) — Common critical reasoning flaw types
 *  2. Logic Signals (~12) — Keywords that signal argument structure
 *  3. RC Structure (~10) — Reading comprehension structure patterns
 */

export interface VerbalProblem {
  id: string;
  category: string;
  group: 'cr-flaws' | 'logic-signals' | 'rc-structure';
  display: string;
  question: string;
  answer: string;
  options: string[];
  hint: string;
  historyKey: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function shuffleVerbalOptions(p: VerbalProblem, avoidIdx?: number): VerbalProblem {
  const wrong = shuffle(p.options.filter((o) => o !== p.answer)).slice(0, 3);
  const all = [p.answer, ...wrong];
  if (avoidIdx !== undefined && avoidIdx >= 0) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const s = shuffle(all);
      if (s.indexOf(p.answer) !== avoidIdx) return { ...p, options: s };
    }
  }
  return { ...p, options: shuffle(all) };
}

// ── 1. CR Flaws ────────────────────────────────────────────

const crFlaws: VerbalProblem[] = [
  {
    id: 'cr01', category: 'CR Flaws', group: 'cr-flaws',
    display: 'Correlation ≠ Causation',
    question: 'What flaw assumes that because two things co-occur, one caused the other?',
    answer: 'Confusing correlation with causation',
    options: ['Confusing correlation with causation', 'Hasty generalization', 'Biased sample', 'Appeal to authority', 'False dichotomy', 'Equivocation'],
    hint: 'Co-occurrence does not prove one event caused the other.',
    historyKey: 'verb:cr:corr-cause',
  },
  {
    id: 'cr02', category: 'CR Flaws', group: 'cr-flaws',
    display: 'Part → Whole',
    question: 'What is it called when what\'s true of a part is assumed true of the whole?',
    answer: 'Composition fallacy',
    options: ['Composition fallacy', 'Division fallacy', 'Hasty generalization', 'Ad hominem', 'Straw man', 'Appeal to emotion'],
    hint: 'Just because each brick is light does not mean the wall is light.',
    historyKey: 'verb:cr:composition',
  },
  {
    id: 'cr03', category: 'CR Flaws', group: 'cr-flaws',
    display: 'Whole → Part',
    question: 'What is it called when what\'s true of the whole is assumed true of each part?',
    answer: 'Division fallacy',
    options: ['Division fallacy', 'Composition fallacy', 'Hasty generalization', 'Red herring', 'Begging the question', 'False cause'],
    hint: 'A profitable company does not mean every department is profitable.',
    historyKey: 'verb:cr:division',
  },
  {
    id: 'cr04', category: 'CR Flaws', group: 'cr-flaws',
    display: 'Only two options presented',
    question: 'What flaw presents only two choices when more exist?',
    answer: 'False dichotomy',
    options: ['False dichotomy', 'Straw man', 'Slippery slope', 'Circular reasoning', 'Ad hominem', 'Red herring'],
    hint: '"Either we do X or disaster follows" — ignores options C, D, E…',
    historyKey: 'verb:cr:false-dicho',
  },
  {
    id: 'cr05', category: 'CR Flaws', group: 'cr-flaws',
    display: 'Small sample → Big claim',
    question: 'What flaw draws a broad conclusion from insufficient evidence?',
    answer: 'Hasty generalization',
    options: ['Hasty generalization', 'Biased sample', 'Composition fallacy', 'False dichotomy', 'Appeal to authority', 'Equivocation'],
    hint: 'Surveying 5 people does not establish a trend.',
    historyKey: 'verb:cr:hasty-gen',
  },
  {
    id: 'cr06', category: 'CR Flaws', group: 'cr-flaws',
    display: 'Unrepresentative sample',
    question: 'What flaw uses a sample that doesn\'t represent the population?',
    answer: 'Biased sample',
    options: ['Biased sample', 'Hasty generalization', 'Straw man', 'Red herring', 'False cause', 'Circular reasoning'],
    hint: 'Surveying only gym members about exercise habits is not representative.',
    historyKey: 'verb:cr:biased-sample',
  },
  {
    id: 'cr07', category: 'CR Flaws', group: 'cr-flaws',
    display: 'Attacking the person',
    question: 'What flaw attacks the arguer instead of the argument?',
    answer: 'Ad hominem',
    options: ['Ad hominem', 'Straw man', 'Red herring', 'Tu quoque', 'Appeal to authority', 'Circular reasoning'],
    hint: '"You can\'t trust her opinion because she\'s not a scientist."',
    historyKey: 'verb:cr:ad-hominem',
  },
  {
    id: 'cr08', category: 'CR Flaws', group: 'cr-flaws',
    display: 'Distorting the opponent\'s view',
    question: 'What flaw misrepresents someone\'s argument to make it easier to attack?',
    answer: 'Straw man',
    options: ['Straw man', 'Ad hominem', 'Red herring', 'False dichotomy', 'Appeal to emotion', 'Equivocation'],
    hint: '"So you\'re saying we should never regulate anything at all?"',
    historyKey: 'verb:cr:straw-man',
  },
  {
    id: 'cr09', category: 'CR Flaws', group: 'cr-flaws',
    display: 'One step leads to extreme outcome',
    question: 'What flaw assumes a small step inevitably leads to a chain of negative events?',
    answer: 'Slippery slope',
    options: ['Slippery slope', 'False dichotomy', 'Hasty generalization', 'Straw man', 'Appeal to fear', 'Red herring'],
    hint: '"If we allow X, then Y, then Z, then total catastrophe."',
    historyKey: 'verb:cr:slippery-slope',
  },
  {
    id: 'cr10', category: 'CR Flaws', group: 'cr-flaws',
    display: 'Conclusion restates the premise',
    question: 'What flaw assumes the conclusion in the premise?',
    answer: 'Circular reasoning',
    options: ['Circular reasoning', 'Straw man', 'Red herring', 'Equivocation', 'False cause', 'Appeal to authority'],
    hint: '"This is true because it is true." The premise = the conclusion.',
    historyKey: 'verb:cr:circular',
  },
  {
    id: 'cr11', category: 'CR Flaws', group: 'cr-flaws',
    display: 'Shifting word meaning',
    question: 'What flaw uses the same term with two different meanings?',
    answer: 'Equivocation',
    options: ['Equivocation', 'Straw man', 'False dichotomy', 'Circular reasoning', 'Red herring', 'Composition fallacy'],
    hint: '"The law says we are free; therefore, this product must be free."',
    historyKey: 'verb:cr:equivocation',
  },
  {
    id: 'cr12', category: 'CR Flaws', group: 'cr-flaws',
    display: 'Distracting from the issue',
    question: 'What flaw introduces an irrelevant topic to divert attention?',
    answer: 'Red herring',
    options: ['Red herring', 'Straw man', 'Ad hominem', 'Circular reasoning', 'Slippery slope', 'False dichotomy'],
    hint: '"Why worry about the budget when there are bigger issues like…"',
    historyKey: 'verb:cr:red-herring',
  },
  {
    id: 'cr13', category: 'CR Flaws', group: 'cr-flaws',
    display: '% increase vs. absolute increase',
    question: 'What flaw confuses relative change with absolute change?',
    answer: 'Relative vs. absolute comparison',
    options: ['Relative vs. absolute comparison', 'Hasty generalization', 'Biased sample', 'False cause', 'Composition fallacy', 'Equivocation'],
    hint: 'A 200% increase from 1 to 3 is not necessarily significant.',
    historyKey: 'verb:cr:rel-abs',
  },
  {
    id: 'cr14', category: 'CR Flaws', group: 'cr-flaws',
    display: 'Sufficient vs. Necessary',
    question: 'What flaw confuses a sufficient condition for a necessary one?',
    answer: 'Sufficient-necessary confusion',
    options: ['Sufficient-necessary confusion', 'False dichotomy', 'Circular reasoning', 'Equivocation', 'Hasty generalization', 'Straw man'],
    hint: 'Rain is sufficient for wet grass, but not necessary (sprinklers too).',
    historyKey: 'verb:cr:suff-nec',
  },
  {
    id: 'cr15', category: 'CR Flaws', group: 'cr-flaws',
    display: 'Plans will work as intended',
    question: 'What flaw assumes a plan will be implemented without obstacles?',
    answer: 'Implementation assumption',
    options: ['Implementation assumption', 'False dichotomy', 'Slippery slope', 'Hasty generalization', 'Appeal to authority', 'Red herring'],
    hint: 'A policy that looks good on paper may fail in practice.',
    historyKey: 'verb:cr:impl-assume',
  },
  {
    id: 'cr16', category: 'CR Flaws', group: 'cr-flaws',
    display: 'Past trend will continue',
    question: 'What flaw assumes historical patterns guarantee future results?',
    answer: 'Extrapolation fallacy',
    options: ['Extrapolation fallacy', 'Hasty generalization', 'False cause', 'Slippery slope', 'Biased sample', 'Circular reasoning'],
    hint: '"Sales have risen 10% per year, so they will continue to do so."',
    historyKey: 'verb:cr:extrapolation',
  },
  {
    id: 'cr17', category: 'CR Flaws', group: 'cr-flaws',
    display: 'No evidence = Evidence of absence',
    question: 'What flaw treats lack of evidence against a claim as proof of the claim?',
    answer: 'Absence of evidence fallacy',
    options: ['Absence of evidence fallacy', 'Circular reasoning', 'Appeal to ignorance', 'Red herring', 'Equivocation', 'Straw man'],
    hint: '"No one has disproved it, so it must be true."',
    historyKey: 'verb:cr:absence-evidence',
  },
  {
    id: 'cr18', category: 'CR Flaws', group: 'cr-flaws',
    display: 'Average masks distribution',
    question: 'What flaw ignores that an average can hide extreme variation?',
    answer: 'Neglecting distribution',
    options: ['Neglecting distribution', 'Hasty generalization', 'Biased sample', 'Equivocation', 'False dichotomy', 'Composition fallacy'],
    hint: 'Average income of $60K hides that half earn $20K and half earn $100K.',
    historyKey: 'verb:cr:avg-dist',
  },
  {
    id: 'cr19', category: 'CR Flaws', group: 'cr-flaws',
    display: 'Self-selected respondents',
    question: 'What flaw arises when respondents choose whether to participate?',
    answer: 'Self-selection bias',
    options: ['Self-selection bias', 'Biased sample', 'Hasty generalization', 'Composition fallacy', 'Red herring', 'False cause'],
    hint: 'Only people who feel strongly respond to voluntary surveys.',
    historyKey: 'verb:cr:self-select',
  },
  {
    id: 'cr20', category: 'CR Flaws', group: 'cr-flaws',
    display: 'Confusing rate and count',
    question: 'What flaw confuses a rate (percentage) with an absolute number?',
    answer: 'Rate vs. count confusion',
    options: ['Rate vs. count confusion', 'Relative vs. absolute comparison', 'Hasty generalization', 'Biased sample', 'Equivocation', 'Composition fallacy'],
    hint: 'A lower accident rate does not mean fewer total accidents if volume grew.',
    historyKey: 'verb:cr:rate-count',
  },
];

// ── 2. Logic Signals ───────────────────────────────────────

const logicSignals: VerbalProblem[] = [
  {
    id: 'ls01', category: 'Logic Signals', group: 'logic-signals',
    display: '"However", "Nevertheless", "Yet"',
    question: 'What do these signal words indicate?',
    answer: 'Contrast / shift in direction',
    options: ['Contrast / shift in direction', 'Continuation of idea', 'Cause and effect', 'Example coming next', 'Conclusion follows', 'Emphasis of prior point'],
    hint: 'These words pivot the argument in a new direction.',
    historyKey: 'verb:ls:contrast',
  },
  {
    id: 'ls02', category: 'Logic Signals', group: 'logic-signals',
    display: '"Therefore", "Hence", "Thus"',
    question: 'What do these signal words indicate?',
    answer: 'Conclusion follows',
    options: ['Conclusion follows', 'Contrast / shift in direction', 'Additional support', 'Example follows', 'Cause and effect', 'Concession'],
    hint: 'These words introduce the main takeaway of the argument.',
    historyKey: 'verb:ls:conclusion',
  },
  {
    id: 'ls03', category: 'Logic Signals', group: 'logic-signals',
    display: '"Moreover", "Furthermore", "In addition"',
    question: 'What do these signal words indicate?',
    answer: 'Additional supporting point',
    options: ['Additional supporting point', 'Contrast', 'Conclusion', 'Cause and effect', 'Concession', 'Example follows'],
    hint: 'These words add another piece of evidence in the same direction.',
    historyKey: 'verb:ls:addition',
  },
  {
    id: 'ls04', category: 'Logic Signals', group: 'logic-signals',
    display: '"For example", "For instance", "Such as"',
    question: 'What do these signal words indicate?',
    answer: 'Illustrative example follows',
    options: ['Illustrative example follows', 'Conclusion follows', 'Contrast', 'Cause and effect', 'Concession', 'Additional point'],
    hint: 'These words introduce a specific case that illustrates the point.',
    historyKey: 'verb:ls:example',
  },
  {
    id: 'ls05', category: 'Logic Signals', group: 'logic-signals',
    display: '"Because", "Since", "Due to"',
    question: 'What do these signal words indicate?',
    answer: 'Premise / reason',
    options: ['Premise / reason', 'Conclusion', 'Contrast', 'Example', 'Addition', 'Concession'],
    hint: 'These words introduce the reason WHY — the evidence, not the conclusion.',
    historyKey: 'verb:ls:premise',
  },
  {
    id: 'ls06', category: 'Logic Signals', group: 'logic-signals',
    display: '"Although", "Despite", "Even though"',
    question: 'What do these signal words indicate?',
    answer: 'Concession before a counter-point',
    options: ['Concession before a counter-point', 'Contrast / shift', 'Conclusion', 'Addition', 'Cause and effect', 'Example follows'],
    hint: '"Although X is true, Y is more important." Acknowledges then pivots.',
    historyKey: 'verb:ls:concession',
  },
  {
    id: 'ls07', category: 'Logic Signals', group: 'logic-signals',
    display: '"In contrast", "On the other hand", "Conversely"',
    question: 'What do these signal words indicate?',
    answer: 'Direct opposition / comparison',
    options: ['Direct opposition / comparison', 'Additional support', 'Conclusion', 'Example follows', 'Concession', 'Cause and effect'],
    hint: 'These words set up a comparison between two opposing ideas.',
    historyKey: 'verb:ls:opposition',
  },
  {
    id: 'ls08', category: 'Logic Signals', group: 'logic-signals',
    display: '"Assuming that", "Given that"',
    question: 'What do these signal words indicate?',
    answer: 'Stated premise / assumption',
    options: ['Stated premise / assumption', 'Conclusion', 'Contrast', 'Concession', 'Example', 'Addition'],
    hint: 'These words signal the starting conditions taken to be true.',
    historyKey: 'verb:ls:assumption',
  },
  {
    id: 'ls09', category: 'Logic Signals', group: 'logic-signals',
    display: '"Not X but rather Y"',
    question: 'What structural role does this pattern play?',
    answer: 'Correction / replacement',
    options: ['Correction / replacement', 'Addition', 'Concession', 'Example', 'Cause and effect', 'Conclusion'],
    hint: 'Rejects one interpretation and replaces it with another.',
    historyKey: 'verb:ls:correction',
  },
  {
    id: 'ls10', category: 'Logic Signals', group: 'logic-signals',
    display: '"Consequently", "As a result", "It follows that"',
    question: 'What do these signal words indicate?',
    answer: 'Effect / result of prior cause',
    options: ['Effect / result of prior cause', 'Premise / reason', 'Contrast', 'Addition', 'Example', 'Concession'],
    hint: 'These words show what happened BECAUSE of the preceding point.',
    historyKey: 'verb:ls:effect',
  },
  {
    id: 'ls11', category: 'Logic Signals', group: 'logic-signals',
    display: '"In summary", "To conclude", "Overall"',
    question: 'What do these signal words indicate?',
    answer: 'Summary / wrap-up',
    options: ['Summary / wrap-up', 'New point introduced', 'Contrast', 'Concession', 'Example follows', 'Premise'],
    hint: 'These words signal the author is wrapping up the argument.',
    historyKey: 'verb:ls:summary',
  },
  {
    id: 'ls12', category: 'Logic Signals', group: 'logic-signals',
    display: '"Some argue", "Critics contend", "Proponents claim"',
    question: 'What do these signal words indicate?',
    answer: 'Third-party viewpoint',
    options: ['Third-party viewpoint', 'Author\'s conclusion', 'Premise', 'Contrast', 'Example', 'Addition'],
    hint: 'These words distance the author from the claim — it\'s someone else\'s view.',
    historyKey: 'verb:ls:third-party',
  },
];

// ── 3. RC Structure ────────────────────────────────────────

const rcStructure: VerbalProblem[] = [
  {
    id: 'rc01', category: 'RC Structure', group: 'rc-structure',
    display: 'Paragraph 1: Old view\nParagraph 2: New research\nParagraph 3: Implications',
    question: 'What passage structure is this?',
    answer: 'Old view → New view',
    options: ['Old view → New view', 'Compare & contrast', 'Problem → Solution', 'Chronological narrative', 'Definition & examples', 'Cause & effect chain'],
    hint: 'Classic GMAT: present conventional wisdom, then challenge it.',
    historyKey: 'verb:rc:old-new',
  },
  {
    id: 'rc02', category: 'RC Structure', group: 'rc-structure',
    display: 'Paragraph 1: Issue\nParagraph 2: Proposed fix\nParagraph 3: Evaluation',
    question: 'What passage structure is this?',
    answer: 'Problem → Solution',
    options: ['Problem → Solution', 'Old view → New view', 'Compare & contrast', 'Cause & effect chain', 'Chronological narrative', 'Classification'],
    hint: 'Identifies a challenge, proposes a response, then assesses it.',
    historyKey: 'verb:rc:prob-sol',
  },
  {
    id: 'rc03', category: 'RC Structure', group: 'rc-structure',
    display: 'Paragraph 1: Theory A\nParagraph 2: Theory B\nParagraph 3: Author\'s evaluation',
    question: 'What passage structure is this?',
    answer: 'Compare & contrast',
    options: ['Compare & contrast', 'Old view → New view', 'Problem → Solution', 'Cause & effect chain', 'Chronological narrative', 'Definition & examples'],
    hint: 'Two competing explanations are weighed against each other.',
    historyKey: 'verb:rc:compare',
  },
  {
    id: 'rc04', category: 'RC Structure', group: 'rc-structure',
    display: 'Author states a claim and provides multiple examples supporting it',
    question: 'What is the primary purpose of the passage?',
    answer: 'To support a thesis with evidence',
    options: ['To support a thesis with evidence', 'To refute a common belief', 'To compare two theories', 'To describe a chronological process', 'To propose a new solution', 'To analyze causes of a phenomenon'],
    hint: 'Claim + examples = thesis-driven support structure.',
    historyKey: 'verb:rc:thesis-support',
  },
  {
    id: 'rc05', category: 'RC Structure', group: 'rc-structure',
    display: '"While some scholars argue X, the evidence suggests Y"',
    question: 'What is the author\'s role in this sentence?',
    answer: 'Acknowledging then rejecting a counterargument',
    options: ['Acknowledging then rejecting a counterargument', 'Presenting balanced viewpoints', 'Summarizing the main idea', 'Introducing new evidence', 'Defining a key term', 'Restating the thesis'],
    hint: 'The "While… but…" structure concedes before countering.',
    historyKey: 'verb:rc:ack-reject',
  },
  {
    id: 'rc06', category: 'RC Structure', group: 'rc-structure',
    display: 'Detail question: "According to the passage, which of the following…"',
    question: 'What approach works best for this question type?',
    answer: 'Find the specific reference and match it directly',
    options: ['Find the specific reference and match it directly', 'Infer from the tone of the passage', 'Identify the main idea', 'Consider what the author would likely say', 'Evaluate the passage\'s structure', 'Read between the lines'],
    hint: 'Detail questions reward precise location of facts, not inference.',
    historyKey: 'verb:rc:detail-approach',
  },
  {
    id: 'rc07', category: 'RC Structure', group: 'rc-structure',
    display: 'Inference question: "It can be inferred that the author…"',
    question: 'What approach works best for this question type?',
    answer: 'Find what must be true based on stated information',
    options: ['Find what must be true based on stated information', 'Choose the most extreme statement', 'Rely on outside knowledge', 'Pick the broadest generalization', 'Choose the answer that sounds sophisticated', 'Identify an opinion not in the passage'],
    hint: 'Valid inferences are slightly beyond the text but fully supported by it.',
    historyKey: 'verb:rc:inference-approach',
  },
  {
    id: 'rc08', category: 'RC Structure', group: 'rc-structure',
    display: 'Main idea question: "The primary purpose of the passage is to…"',
    question: 'What common trap should you avoid?',
    answer: 'Choosing an answer that covers only one paragraph',
    options: ['Choosing an answer that covers only one paragraph', 'Choosing the most detailed answer', 'Choosing the first idea mentioned', 'Choosing an answer that\'s too broad', 'Choosing the longest option', 'Choosing an option with strong language'],
    hint: 'Main idea must encompass the whole passage, not just a section.',
    historyKey: 'verb:rc:main-idea-trap',
  },
  {
    id: 'rc09', category: 'RC Structure', group: 'rc-structure',
    display: 'Tone / Attitude question: "The author\'s attitude toward X is best described as…"',
    question: 'What should you look for?',
    answer: 'Language intensity: neutral, cautious, supportive, or critical',
    options: ['Language intensity: neutral, cautious, supportive, or critical', 'The topic of the passage', 'How many paragraphs discuss X', 'Whether the passage is long or short', 'The complexity of vocabulary used', 'The number of quoted sources'],
    hint: 'Words like "merely", "significant", "questionable" reveal the author\'s stance.',
    historyKey: 'verb:rc:tone',
  },
  {
    id: 'rc10', category: 'RC Structure', group: 'rc-structure',
    display: 'Function question: "The author mentions X in order to…"',
    question: 'What should you focus on?',
    answer: 'Why the detail was included, not what it says',
    options: ['Why the detail was included, not what it says', 'The literal meaning of the sentence', 'The paragraph topic', 'The main idea of the passage', 'A definition of the term', 'An external fact about the topic'],
    hint: 'Function questions ask about purpose, not content. Ask "why is this here?"',
    historyKey: 'verb:rc:function',
  },
];

// ── Export all ──────────────────────────────────────────────

export const ALL_VERBAL_PROBLEMS: VerbalProblem[] = [
  ...crFlaws,
  ...logicSignals,
  ...rcStructure,
];

export type VerbalGroup = 'cr-flaws' | 'logic-signals' | 'rc-structure';

export const VERBAL_GROUPS: Record<VerbalGroup, string> = {
  'cr-flaws': 'CR Flaws',
  'logic-signals': 'Logic Signals',
  'rc-structure': 'RC Structure',
};
