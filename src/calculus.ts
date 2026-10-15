import type { PracticeQuestion } from './practice.ts';
import { NOTES_LIMIT } from './notes.ts';

export type CalculusParameters = { a: number; b: number; c: number; x0: number };
export type CalculusKey = keyof CalculusParameters;
export const CALCULUS_SAMPLE: CalculusParameters = { a: 1, b: 0, c: 0, x0: 1 };
export const calculusSamples = [
  { id: 'quadratic', title: 'A changing slope', notes: 'Explore how the slope of a quadratic changes with position.\nf(x) = x^2\nStart at position 1 and compare the curve with its tangent.' },
  { id: 'downward', title: 'A downward curve', notes: 'Explore a downward-opening quadratic.\nf(x) = -0.5x^2 + x + 2\nMove the evaluation point and observe the tangent slope.' },
];
export function parseCalculusValue(raw: string, key: CalculusKey): { value: number; error?: never } | { error: string; value?: never } {
  const bound = key === 'x0' ? 3 : 5;
  const text = raw.trim();
  if (!text || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return { error: `Enter a decimal number from −${bound} to ${bound}.` };
  const value = Number(text);
  if (!Number.isFinite(value) || Math.abs(value) > bound) return { error: `Use a value from −${bound} to ${bound}.` };
  if ((text.split('.')[1]?.length ?? 0) > 2) return { error: 'Use up to two decimal places.' };
  return { value: value === 0 ? 0 : value };
}
const precise = (value: number) => Number(value.toFixed(10));
export function formatCalculusNumber(value: number): string { return String(Number(value.toFixed(6))).replace('-', '−'); }
export function quadraticAt(params: CalculusParameters, x: number): number { return precise(params.a * x * x + params.b * x + params.c); }
export function derivativeAt(params: CalculusParameters, x: number): number { return precise(2 * params.a * x + params.b); }
export function tangentAt(params: CalculusParameters, x: number): number { return precise(quadraticAt(params, params.x0) + derivativeAt(params, params.x0) * (x - params.x0)); }
function polynomial(terms: { coefficient: number; variable: string }[]): string {
  const nonzero = terms.filter(term => term.coefficient !== 0);
  if (!nonzero.length) return '0';
  return nonzero.map((term, i) => {
    const magnitude = Math.abs(term.coefficient);
    const value = magnitude === 1 && term.variable ? '' : formatCalculusNumber(magnitude);
    return `${i === 0 ? term.coefficient < 0 ? '−' : '' : term.coefficient < 0 ? ' − ' : ' + '}${value}${term.variable}`;
  }).join('');
}
export function quadraticText(params: CalculusParameters): string { return 'f(x) = ' + polynomial([{ coefficient: params.a, variable: 'x²' }, { coefficient: params.b, variable: 'x' }, { coefficient: params.c, variable: '' }]); }
export function derivativeText(params: CalculusParameters): string { return 'f′(x) = ' + polynomial([{ coefficient: 2 * params.a, variable: 'x' }, { coefficient: params.b, variable: '' }]); }
export function tangentText(params: CalculusParameters): string { return 'T(x) = ' + polynomial([{ coefficient: derivativeAt(params, params.x0), variable: 'x' }, { coefficient: precise(quadraticAt(params, params.x0) - derivativeAt(params, params.x0) * params.x0), variable: '' }]); }
export function calculusExplanation(params: CalculusParameters): string {
  return `${quadraticText(params)} has derivative ${derivativeText(params)}. At x₀ = ${formatCalculusNumber(params.x0)}, f(x₀) = ${formatCalculusNumber(quadraticAt(params, params.x0))} and the exact tangent slope is ${formatCalculusNumber(derivativeAt(params, params.x0))}. The tangent is ${tangentText(params)}. Move x₀ to see how the local slope changes.${params.a === 0 ? ' Here a = 0, so the function is linear (or constant), and its slope does not change.' : ''}`;
}
export type CalculusNotesAnalysis =
  | { kind: 'recognized'; parameters: { a: number; b: number; c: number }; lineNumbers: number[] }
  | { kind: 'empty' | 'manual' | 'ambiguous' | 'unsupported'; message: string };
const decimal = '(?:\\d+(?:\\.\\d{1,2})?|\\.\\d{1,2})';
const numericQuadratic = new RegExp(`^(?:f\\(x\\)|y)=([+-]?)(${decimal})?x(?:\\^2|²)(?:([+-])(${decimal})?x)?(?:([+-])(${decimal}))?$`, 'i');
const numericLinear = new RegExp(`^(?:f\\(x\\)|y)=([+-]?)(${decimal})?x(?:([+-])(${decimal}))?$`, 'i');
const numericConstant = new RegExp(`^(?:f\\(x\\)|y)=([+-]?)(${decimal})$`, 'i');
function readCoefficient(sign: string, value: string | undefined): number | undefined {
  const parsed = parseCalculusValue((sign === '-' ? '-' : '') + (value ?? '1'), 'a');
  return parsed.value;
}
export function analyzeCalculusNotes(notes: string): CalculusNotesAnalysis {
  if (!notes.trim()) return { kind: 'empty', message: 'Paste quadratic notes or choose a sample.' };
  if (notes.length > NOTES_LIMIT) return { kind: 'unsupported', message: 'Use up to 6,000 characters. Your notes are preserved.' };
  const found: { a: number; b: number; c: number; line: number }[] = [];
  let unsupported = false;
  notes.split(/\r\n|\n|\r/).forEach((original, index) => {
    const normalized = original.trim().replace(/−/g, '-');
    if (!normalized) return;
    if (/\b(?:integrals?|integration|trigonometry)\b|\b(?:sin|cos|tan|log|sqrt|exp)\s*\(|x\s*(?:\^|\*\*)\s*(?!2(?:\b|\s))\d+|x\s*³/i.test(normalized)) unsupported = true;
    if (!normalized.includes('=')) return;
    const isolated = normalized.replace(/^[^=\n]*:\s*(?=(?:f\s*\(\s*x\s*\)|y)\s*=)/i, '').replace(/[.;]$/, '').replace(/\s/g, '');
    if (/^(?:f\(x\)|y)=ax(?:\^2|²)\+bx\+c$/i.test(isolated)) return;
    const match = isolated.match(numericQuadratic);
    const linear = isolated.match(numericLinear);
    const constant = isolated.match(numericConstant);
    if (!match && !linear && !constant) { unsupported = true; return; }
    let a: number | undefined = 0;
    let b: number | undefined = 0;
    let c: number | undefined = 0;
    if (match) {
      a = readCoefficient(match[1], match[2]);
      b = match[3] ? readCoefficient(match[3], match[4]) : 0;
      c = match[5] ? readCoefficient(match[5], match[6]) : 0;
    } else if (linear) {
      b = readCoefficient(linear[1], linear[2]);
      c = linear[3] ? readCoefficient(linear[3], linear[4]) : 0;
    } else if (constant) c = readCoefficient(constant[1], constant[2]);
    if (a === undefined || b === undefined || c === undefined) unsupported = true;
    else found.push({ a, b, c, line: index + 1 });
  });
  if (unsupported) return { kind: 'unsupported', message: 'Use one isolated numeric quadratic f(x) = ax² + bx + c (or y = ...), coefficients from −5 to 5 with up to two decimals. Numeric linear or constant forms are supported when a = 0. Arbitrary functions and integrals are outside this lesson. Set x₀ in the separate control; notes are preserved.' };
  if (found.some(item => item.a !== found[0].a || item.b !== found[0].b || item.c !== found[0].c)) return { kind: 'ambiguous', message: 'These notes contain different quadratics. Keep one, or explicitly confirm coefficients manually.' };
  if (!found.length) return { kind: 'manual', message: 'No numeric quadratic was found. Set a, b, c and x₀ manually; your notes are preserved.' };
  return { kind: 'recognized', parameters: { a: found[0].a, b: found[0].b, c: found[0].c }, lineNumbers: found.map(item => item.line) };
}
export function matchingCalculusSources(notes: string, params: CalculusParameters): number[] {
  const analysis = analyzeCalculusNotes(notes);
  return analysis.kind === 'recognized' && analysis.parameters.a === params.a && analysis.parameters.b === params.b && analysis.parameters.c === params.c ? analysis.lineNumbers.slice(0, 50) : [];
}
export function calculusPracticeQuestions(params: CalculusParameters): PracticeQuestion[] {
  const x0 = formatCalculusNumber(params.x0);
  const y0 = quadraticAt(params, params.x0);
  const slope = derivativeAt(params, params.x0);
  const next = precise(params.x0 + 1);
  return [
    { id: 'value', title: 'Find the point', prompt: `What is f(x₀) when x₀ = ${x0}?`, expected: y0, reasoning: `Substitute x = ${x0} into ${quadraticText(params)}: f(x₀) = ${formatCalculusNumber(y0)}.` },
    { id: 'slope', title: 'Find the local slope', prompt: `What is f′(x₀) when x₀ = ${x0}?`, expected: slope, reasoning: `${derivativeText(params)}. At x₀ = ${x0}, 2 × (${formatCalculusNumber(params.a)}) × (${x0}) + (${formatCalculusNumber(params.b)}) = ${formatCalculusNumber(slope)}.` },
    { id: 'intercept', title: 'Follow the tangent', prompt: `What is the tangent's y-value at x = ${formatCalculusNumber(next)}?`, expected: tangentAt(params, next), reasoning: `This asks about the tangent, not the curve. A step of 1 from x₀ gives T(x₀ + 1) = f(x₀) + f′(x₀) = ${formatCalculusNumber(y0)} + (${formatCalculusNumber(slope)}) = ${formatCalculusNumber(tangentAt(params, next))}.` },
  ];
}
