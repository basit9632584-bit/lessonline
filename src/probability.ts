import { NOTES_LIMIT } from './notes.ts';
import type { PracticeQuestion } from './practice.ts';

export type ProbabilityParameters = { n: number; p: number; k: number };
export type ProbabilityKey = keyof ProbabilityParameters;
export const PROBABILITY_SAMPLE: ProbabilityParameters = { n: 4, p: .5, k: 2 };
export const probabilitySamples = [
  { id: 'four-trials', title: 'Four independent trials', notes: 'Explore exactly two successes in four independent trials.\nBinomial: n=4, p=0.5, k=2\nEach trial has two outcomes. The probability of success stays constant.' },
  { id: 'less-likely', title: 'Less likely successes', notes: 'Explore a smaller success probability across six fixed trials.\nBinomial: n=6, p=0.2, k=1\nTrials are independent, have two outcomes, and share the same success probability.' },
];
export function parseProbabilityValue(raw: string, key: ProbabilityKey, n = 30): { value: number; error?: never } | { error: string; value?: never } {
  const text = raw.trim();
  if (!text || text.length > 24 || !/^[+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return { error: 'Enter a nonnegative finite decimal number.' };
  const value = Number(text);
  if (!Number.isFinite(value)) return { error: 'Enter a finite number.' };
  if (key === 'p') {
    if (value < 0 || value > 1) return { error: 'Use a probability from 0 to 1, not a percentage.' };
    if ((text.split('.')[1]?.length ?? 0) > 2) return { error: 'Use up to two decimal places for p.' };
  } else if (key === 'n') {
    if (!Number.isInteger(value) || value < 1 || value > 30) return { error: 'Use a whole number of trials from 1 to 30.' };
  } else if (!Number.isInteger(n) || n < 1 || n > 30 || !Number.isInteger(value) || value < 0 || value > n) return { error: 'Use a whole number of successes from 0 to the trial count n.' };
  return { value: value === 0 ? 0 : value };
}
export function isValidProbabilityParameters(value: unknown): value is ProbabilityParameters {
  if (!value || typeof value !== 'object') return false;
  const params = value as ProbabilityParameters;
  return (['n', 'p', 'k'] as const).every(key => typeof params[key] === 'number' && !parseProbabilityValue(String(params[key]), key, params.n).error);
}
export function binomialProbability(n: number, p: number, k: number): number {
  if (!isValidProbabilityParameters({ n, p, k })) throw new Error('Use supported binomial parameters.');
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  let combinations = 1;
  for (let i = 1; i <= Math.min(k, n - k); i++) combinations = combinations * (n - i + 1) / i;
  return combinations * p ** k * (1 - p) ** (n - k);
}
export function probabilityMass(params: ProbabilityParameters, k = params.k): number { return binomialProbability(params.n, params.p, k); }
export function probabilityDistribution(params: ProbabilityParameters): number[] {
  if (!isValidProbabilityParameters(params)) throw new Error('Use supported binomial parameters.');
  return Array.from({ length: params.n + 1 }, (_, k) => binomialProbability(params.n, params.p, k));
}
export function expectedSuccesses(params: ProbabilityParameters): number {
  if (!isValidProbabilityParameters(params)) throw new Error('Use supported binomial parameters.');
  return Number((params.n * params.p).toFixed(10));
}
export function formatProbabilityNumber(value: number): string {
  if (value === 0) return '0';
  // Significant digits retain tiny positive probabilities instead of rounding to zero.
  return String(Number(value.toPrecision(7)));
}
export function formatProbabilityPercent(value: number): string { return formatProbabilityNumber(value * 100) + '%'; }
export function probabilityExplanation(params: ProbabilityParameters): string {
  return `This binomial model assumes a fixed ${params.n} trials, two outcomes per trial (success or failure), independent trials, and a constant success probability p = ${formatProbabilityNumber(params.p)}. The chance of exactly ${params.k} successes is approximately ${formatProbabilityNumber(probabilityMass(params))}, or ${formatProbabilityPercent(probabilityMass(params))}. The expected success count is n × p = ${formatProbabilityNumber(expectedSuccesses(params))}; it is a long-run average, not a promised outcome. The chance of zero successes is approximately ${formatProbabilityNumber(probabilityMass(params, 0))}. The distribution is calculated deterministically, not simulated. Check the assumptions before applying it to a real situation.`;
}
export type ProbabilityNotesAnalysis =
  | { kind: 'recognized'; parameters: ProbabilityParameters; lineNumbers: number[] }
  | { kind: 'empty' | 'manual' | 'ambiguous' | 'unsupported'; message: string };
const numeric = '[+]?(?:\\d+(?:\\.\\d{1,2})?|\\.\\d{1,2})';
const binomialLine = new RegExp(`^binomial\\s*:\\s*n\\s*=\\s*(${numeric})\\s*,\\s*p\\s*=\\s*(${numeric})\\s*,\\s*k\\s*=\\s*(${numeric})\\s*$`, 'i');
export function analyzeProbabilityNotes(notes: string): ProbabilityNotesAnalysis {
  if (!notes.trim()) return { kind: 'empty', message: 'Paste binomial notes or choose a sample.' };
  if (notes.length > NOTES_LIMIT) return { kind: 'unsupported', message: 'Use up to 6,000 characters. Your notes are preserved.' };
  const found: { parameters: ProbabilityParameters; line: number }[] = [];
  let unsupported = false;
  notes.split(/\r\n|\n|\r/).forEach((line, index) => {
    const match = line.trim().match(binomialLine);
    if (match) {
      const parameters = { n: Number(match[1]), p: Number(match[2]), k: Number(match[3]) };
      if (!isValidProbabilityParameters(parameters)) unsupported = true;
      else found.push({ parameters, line: index + 1 });
    } else if (/=|^\s*binomial\s*:|\b(?:bayes|bayesian|poisson)\b|\b(?:normal distribution|continuous distribution|conditional probability|without replacement)\b/i.test(line)) unsupported = true;
  });
  if (unsupported) return { kind: 'unsupported', message: 'Use an isolated Binomial: n=4, p=0.5, k=2 line: n is a whole number 1–30, p is 0–1 with up to two decimals, and k is a whole number 0–n. Other distributions or expressions are outside this activity. Your notes are preserved.' };
  if (found.some(item => item.parameters.n !== found[0].parameters.n || item.parameters.p !== found[0].parameters.p || item.parameters.k !== found[0].parameters.k)) return { kind: 'ambiguous', message: 'Different binomial parameter sets were found. Keep one, or explicitly confirm your own values.' };
  if (!found.length) return { kind: 'manual', message: 'No labelled binomial parameter line was found. Enter n, p and k manually; your notes are preserved.' };
  return { kind: 'recognized', parameters: { ...found[0].parameters }, lineNumbers: found.map(item => item.line) };
}
export function matchingProbabilitySources(notes: string, params: ProbabilityParameters): number[] {
  const analysis = analyzeProbabilityNotes(notes);
  return analysis.kind === 'recognized' && analysis.parameters.n === params.n && analysis.parameters.p === params.p && analysis.parameters.k === params.k ? analysis.lineNumbers.slice(0, 50) : [];
}
export function probabilityPracticeQuestions(params: ProbabilityParameters): PracticeQuestion[] {
  return [
    { id: 'value', title: 'Exactly this many', prompt: `What is the probability of exactly ${params.k} successes? Enter a decimal from 0 to 1, not a percentage.`, expected: probabilityMass(params), answerRange: { min: 0, max: 1 },
      reasoning: `For n = ${params.n}, p = ${formatProbabilityNumber(params.p)}, k = ${params.k}, P(X = k) = C(n,k) × pᵏ × (1 − p)ⁿ⁻ᵏ ≈ ${formatProbabilityNumber(probabilityMass(params))}. Endpoints p = 0 or 1 are handled directly.` },
    { id: 'slope', title: 'Expected successes', prompt: 'What is the expected number of successes?', expected: expectedSuccesses(params), answerRange: { min: 0, max: params.n },
      reasoning: `Expected successes = n × p = ${params.n} × ${formatProbabilityNumber(params.p)} = ${formatProbabilityNumber(expectedSuccesses(params))}. This average need not be a whole number.` },
    { id: 'intercept', title: 'No successes', prompt: 'What is the probability of zero successes? Enter a decimal from 0 to 1, not a percentage.', expected: probabilityMass(params, 0), answerRange: { min: 0, max: 1 },
      reasoning: `All trials must fail: P(X = 0) = (1 − p)ⁿ ≈ ${formatProbabilityNumber(probabilityMass(params, 0))}. When p = 1, zero successes has probability 0.` },
  ];
}
