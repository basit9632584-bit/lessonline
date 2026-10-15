import { formatNumber, yAt } from './math.ts';

export const ANSWER_TOLERANCE = 0.005;
const FLOAT_EPSILON = 1e-10;
export type PracticeId = 'value' | 'slope' | 'intercept';
export type PracticeQuestion = { id: PracticeId; title: string; prompt: string; expected: number; reasoning: string; answerRange?: { min: number; max: number } };
export type AnswerResult = { status: 'correct' | 'incorrect' | 'invalid'; message: string };

export function practiceQuestions(m: number, b: number): PracticeQuestion[] {
  const result = yAt(m, b, 2);
  return [
    { id: 'value', title: 'Follow the equation', prompt: 'What is y when x = 2?', expected: result,
      reasoning: `Substitute x = 2: y = (${formatNumber(m)}) × 2 + (${formatNumber(b)}) = ${formatNumber(result)}.` },
    { id: 'slope', title: 'Find the change', prompt: 'What is the slope, m?', expected: m,
      reasoning: `The slope is ${formatNumber(m)}: for a step of 1 in x, y changes by ${formatNumber(m)}.${m === 0 ? ' Zero slope means a horizontal line.' : m < 0 ? ' The negative sign means the line falls as x increases.' : ' The positive sign means the line rises as x increases.'}` },
    { id: 'intercept', title: 'Find the crossing', prompt: 'What is the y-intercept, b?', expected: b,
      reasoning: `At x = 0, y = (${formatNumber(m)}) × 0 + (${formatNumber(b)}) = ${formatNumber(b)}. The line crosses the y-axis at (0, ${formatNumber(b)}).` },
  ];
}

export function parsePracticeAnswer(raw: string): number | null {
  const text = raw.trim();
  if (!text || text.length > 128 || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

export function checkPracticeAnswer(question: PracticeQuestion, raw: string): AnswerResult {
  const value = parsePracticeAnswer(raw);
  if (value === null) return { status: 'invalid', message: `Enter a finite decimal number, such as ${question.answerRange ? '0.5' : '-2 or 0.5'}. Expressions and fractions are not accepted. This has not been marked incorrect.` };
  if (question.answerRange && (value < question.answerRange.min || value > question.answerRange.max)) return { status: 'invalid', message: `Enter a decimal number from ${question.answerRange.min} to ${question.answerRange.max}. This has not been marked incorrect.` };
  const correct = Math.abs(value - question.expected) <= ANSWER_TOLERANCE + FLOAT_EPSILON;
  return { status: correct ? 'correct' : 'incorrect', message: `${correct ? 'Correct.' : 'Not quite. You can edit your answer and try again.'} ${question.reasoning}` };
}
