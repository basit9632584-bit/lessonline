import { analyzeNotes, NOTES_LIMIT } from './notes.ts';
import { describeLine, equationText, parseCoefficient } from './math.ts';
import { analyzeCalculusNotes, CALCULUS_SAMPLE, matchingCalculusSources, parseCalculusValue } from './calculus.ts';
import type { CalculusKey, CalculusParameters } from './calculus.ts';
import { analyzeStatisticsNotes, isValidStatisticsValues, matchingStatisticsSources, parseDataset, STATISTICS_SAMPLE } from './statistics.ts';
import type { StatisticsParameters } from './statistics.ts';
import { analyzeProbabilityNotes, isValidProbabilityParameters, matchingProbabilitySources, parseProbabilityValue, PROBABILITY_SAMPLE } from './probability.ts';
import type { ProbabilityKey, ProbabilityParameters } from './probability.ts';

export const DRAFT_KEY = 'lessonline-draft-v1';
export const CURRENT_DRAFT_KEY = 'lessonline-draft-v2';
export const EXPLANATION_LIMIT = 2400;
export type Lesson = {
  version: 1;
  title: string;
  notes: string;
  parameters: { m: number; b: number };
  coefficientDrafts: { m: string; b: string };
  confirmed: boolean;
  explanation: string;
  explanationOrigin: 'manual' | 'template' | 'nim';
  explanationStale: boolean;
  sourceLineNumbers: number[];
  reviewed: boolean;
};
export type CalculusLesson = Omit<Lesson, 'version' | 'parameters' | 'coefficientDrafts'> & {
  version: 2; kind: 'calculus'; parameters: CalculusParameters;
  coefficientDrafts: Record<CalculusKey, string>;
};
export type StatisticsLesson = Omit<Lesson, 'version' | 'parameters' | 'coefficientDrafts'> & {
  version: 2; kind: 'statistics'; parameters: StatisticsParameters; datasetDraft: string;
};
export type ProbabilityLesson = Omit<Lesson, 'version' | 'parameters' | 'coefficientDrafts'> & {
  version: 2; kind: 'probability'; parameters: ProbabilityParameters; coefficientDrafts: Record<ProbabilityKey, string>;
};
export type AnyLesson = Lesson | CalculusLesson | StatisticsLesson | ProbabilityLesson;
export function isProbabilityLesson(lesson: AnyLesson): lesson is ProbabilityLesson { return lesson.version === 2 && lesson.kind === 'probability'; }
export function emptyProbabilityLesson(): ProbabilityLesson {
  return { ...emptyLesson(), version: 2, kind: 'probability', title: 'Independent trials', parameters: { ...PROBABILITY_SAMPLE }, coefficientDrafts: { n: '', p: '', k: '' } };
}
export function isCalculusLesson(lesson: AnyLesson): lesson is CalculusLesson { return lesson.version === 2 && lesson.kind === 'calculus'; }
export function isStatisticsLesson(lesson: AnyLesson): lesson is StatisticsLesson { return lesson.version === 2 && lesson.kind === 'statistics'; }
export function emptyStatisticsLesson(): StatisticsLesson {
  return { version: 2, kind: 'statistics', title: 'A dataset and its spread', notes: '', parameters: { values: [...STATISTICS_SAMPLE.values] }, datasetDraft: '',
    confirmed: false, explanation: '', explanationOrigin: 'manual', explanationStale: false, sourceLineNumbers: [], reviewed: false };
}
export function emptyCalculusLesson(): CalculusLesson {
  return { ...emptyLesson(), version: 2, kind: 'calculus', title: 'A changing slope', parameters: { ...CALCULUS_SAMPLE }, coefficientDrafts: { a: '', b: '', c: '', x0: '' } };
}

export function emptyLesson(): Lesson {
  return { version: 1, title: 'Straight-line graphs', notes: '', parameters: { m: 2, b: 1 },
    coefficientDrafts: { m: '', b: '' }, confirmed: false, explanation: '',
    explanationOrigin: 'manual', explanationStale: false, sourceLineNumbers: [], reviewed: false };
}

export function matchingSources(notes: string, m: number, b: number): number[] {
  const result = analyzeNotes(notes);
  return result.kind === 'recognized' && result.m === m && result.b === b ? result.lineNumbers.slice(0, 50) : [];
}

export function templateExplanation(m: number, b: number): string {
  return 'For ' + equationText(m, b) + ', the slope is ' + String(m) + ' and the y-intercept is ' + String(b) + '. ' +
    describeLine(m, b) + ' Try changing one value at a time and compare the graph with the table.';
}

export function canReview(lesson: AnyLesson): boolean {
  if (isProbabilityLesson(lesson)) {
    const analysis = analyzeProbabilityNotes(lesson.notes);
    return lesson.explanationOrigin !== 'nim' && isValidProbabilityParameters(lesson.parameters) &&
      (['n', 'p', 'k'] as const).every(key => parseProbabilityValue(lesson.coefficientDrafts[key], key, lesson.parameters.n).value === lesson.parameters[key]) &&
      lesson.confirmed && !lesson.explanationStale && Boolean(lesson.title.trim()) && Boolean(lesson.explanation.trim()) && analysis.kind !== 'empty' && analysis.kind !== 'unsupported';
  }
  if (isStatisticsLesson(lesson)) {
    const analysis = analyzeStatisticsNotes(lesson.notes);
    const draft = parseDataset(lesson.datasetDraft);
    return lesson.explanationOrigin !== 'nim' && isValidStatisticsValues(lesson.parameters.values) && Boolean(draft.value) && JSON.stringify(draft.value) === JSON.stringify(lesson.parameters.values) && lesson.confirmed && !lesson.explanationStale &&
      Boolean(lesson.title.trim()) && Boolean(lesson.explanation.trim()) && analysis.kind !== 'empty' && analysis.kind !== 'unsupported';
  }
  if (isCalculusLesson(lesson)) {
    const analysis = analyzeCalculusNotes(lesson.notes);
    return lesson.explanationOrigin !== 'nim' && (['a', 'b', 'c', 'x0'] as const).every(key => !parseCalculusValue(String(lesson.parameters[key]), key).error) &&
      lesson.confirmed && !lesson.explanationStale && Boolean(lesson.title.trim()) && Boolean(lesson.explanation.trim()) && analysis.kind !== 'empty' && analysis.kind !== 'unsupported';
  }
  const analysis = analyzeNotes(lesson.notes);
  return lesson.confirmed && !lesson.explanationStale && Boolean(lesson.title.trim()) && Boolean(lesson.explanation.trim()) &&
    analysis.kind !== 'empty' && analysis.kind !== 'unsupported';
}

export function parseStoredLesson(raw: string): AnyLesson | null {
  try {
    if (raw.length > 65536) return null;
    const value = JSON.parse(raw);
    if (value?.version === 2) {
      if (value.kind === 'probability') return parseProbabilityLesson(value);
      return value.kind === 'statistics' ? parseStatisticsLesson(value) : parseCalculusLesson(value);
    }
    if (!value || value.version !== 1 || typeof value.title !== 'string' || value.title.length > 100 ||
      typeof value.notes !== 'string' || value.notes.length > NOTES_LIMIT ||
      typeof value.explanation !== 'string' || value.explanation.length > EXPLANATION_LIMIT ||
      !['manual', 'template', 'nim'].includes(value.explanationOrigin) ||
      typeof value.confirmed !== 'boolean' || typeof value.reviewed !== 'boolean' || typeof value.explanationStale !== 'boolean' ||
      typeof value.parameters?.m !== 'number' || typeof value.parameters?.b !== 'number' ||
      parseCoefficient(String(value.parameters.m)).error || parseCoefficient(String(value.parameters.b)).error ||
      typeof value.coefficientDrafts?.m !== 'string' || value.coefficientDrafts.m.length > 24 ||
      typeof value.coefficientDrafts?.b !== 'string' || value.coefficientDrafts.b.length > 24 ||
      !Array.isArray(value.sourceLineNumbers) || value.sourceLineNumbers.length > 50) return null;
    const lines = value.notes.split(/\r?\n/);
    if (value.sourceLineNumbers.some((line: unknown) => !Number.isInteger(line) ||
      Number(line) < 1 || Number(line) > lines.length || !lines[Number(line) - 1].trim())) return null;
    // Reconstruct only known fields; saved browser data is not an executable lesson.
    const lesson: Lesson = {
      version: 1, title: value.title, notes: value.notes,
      parameters: { m: value.parameters.m, b: value.parameters.b },
      coefficientDrafts: { m: value.coefficientDrafts.m, b: value.coefficientDrafts.b },
      confirmed: value.confirmed, explanation: value.explanation,
      explanationOrigin: value.explanationOrigin,
      explanationStale: value.explanationStale,
      sourceLineNumbers: matchingSources(value.notes, value.parameters.m, value.parameters.b),
      reviewed: value.reviewed,
    };
    if (lesson.confirmed && (parseCoefficient(lesson.coefficientDrafts.m).value !== lesson.parameters.m ||
      parseCoefficient(lesson.coefficientDrafts.b).value !== lesson.parameters.b)) lesson.confirmed = false;
    if (!canReview(lesson)) lesson.reviewed = false;
    return lesson;
  } catch { return null; }
}

function parseProbabilityLesson(value: unknown): ProbabilityLesson | null {
  const data = value as ProbabilityLesson;
  const keys = ['n', 'p', 'k'] as const;
  if (!data || data.kind !== 'probability' || typeof data.title !== 'string' || data.title.length > 100 || typeof data.notes !== 'string' || data.notes.length > NOTES_LIMIT ||
    typeof data.explanation !== 'string' || data.explanation.length > EXPLANATION_LIMIT || !['manual', 'template'].includes(data.explanationOrigin) ||
    typeof data.confirmed !== 'boolean' || typeof data.reviewed !== 'boolean' || typeof data.explanationStale !== 'boolean' || !isValidProbabilityParameters(data.parameters) ||
    !data.coefficientDrafts || keys.some(key => typeof data.coefficientDrafts[key] !== 'string' || data.coefficientDrafts[key].length > 24) ||
    !Array.isArray(data.sourceLineNumbers) || data.sourceLineNumbers.length > 50) return null;
  const lines = data.notes.split(/\r\n|\n|\r/);
  if (data.sourceLineNumbers.some(line => !Number.isInteger(line) || line < 1 || line > lines.length || !lines[line - 1].trim())) return null;
  const lesson: ProbabilityLesson = {
    version: 2, kind: 'probability', title: data.title, notes: data.notes, parameters: { n: data.parameters.n, p: data.parameters.p, k: data.parameters.k },
    coefficientDrafts: { n: data.coefficientDrafts.n, p: data.coefficientDrafts.p, k: data.coefficientDrafts.k },
    confirmed: data.confirmed, explanation: data.explanation, explanationOrigin: data.explanationOrigin, explanationStale: data.explanationStale,
    sourceLineNumbers: matchingProbabilitySources(data.notes, data.parameters), reviewed: data.reviewed,
  };
  if (lesson.confirmed && keys.some(key => parseProbabilityValue(lesson.coefficientDrafts[key], key, lesson.parameters.n).value !== lesson.parameters[key])) lesson.confirmed = false;
  if (!canReview(lesson)) lesson.reviewed = false;
  return lesson;
}

function parseStatisticsLesson(value: unknown): StatisticsLesson | null {
  const data = value as StatisticsLesson;
  if (!data || data.kind !== 'statistics' || typeof data.title !== 'string' || data.title.length > 100 || typeof data.notes !== 'string' || data.notes.length > NOTES_LIMIT ||
    typeof data.explanation !== 'string' || data.explanation.length > EXPLANATION_LIMIT || !['manual', 'template'].includes(data.explanationOrigin) ||
    typeof data.confirmed !== 'boolean' || typeof data.reviewed !== 'boolean' || typeof data.explanationStale !== 'boolean' ||
    !isValidStatisticsValues(data.parameters?.values) || typeof data.datasetDraft !== 'string' || data.datasetDraft.length > 512 ||
    !Array.isArray(data.sourceLineNumbers) || data.sourceLineNumbers.length > 50) return null;
  const lines = data.notes.split(/\r\n|\n|\r/);
  if (data.sourceLineNumbers.some(line => !Number.isInteger(line) || line < 1 || line > lines.length || !lines[line - 1].trim())) return null;
  const lesson: StatisticsLesson = {
    version: 2, kind: 'statistics', title: data.title, notes: data.notes, parameters: { values: [...data.parameters.values] }, datasetDraft: data.datasetDraft,
    confirmed: data.confirmed, explanation: data.explanation, explanationOrigin: data.explanationOrigin, explanationStale: data.explanationStale,
    sourceLineNumbers: matchingStatisticsSources(data.notes, data.parameters), reviewed: data.reviewed,
  };
  const draft = parseDataset(lesson.datasetDraft);
  if (lesson.confirmed && (!draft.value || JSON.stringify(draft.value) !== JSON.stringify(lesson.parameters.values))) lesson.confirmed = false;
  if (!canReview(lesson)) lesson.reviewed = false;
  return lesson;
}

function parseCalculusLesson(value: unknown): CalculusLesson | null {
  const data = value as CalculusLesson;
  const keys = ['a', 'b', 'c', 'x0'] as const;
  if (!data || data.kind !== 'calculus' || typeof data.title !== 'string' || data.title.length > 100 ||
    typeof data.notes !== 'string' || data.notes.length > NOTES_LIMIT || typeof data.explanation !== 'string' || data.explanation.length > EXPLANATION_LIMIT ||
    !['manual', 'template'].includes(data.explanationOrigin) || typeof data.confirmed !== 'boolean' || typeof data.reviewed !== 'boolean' || typeof data.explanationStale !== 'boolean' ||
    !data.parameters || !data.coefficientDrafts || keys.some(key => typeof data.parameters[key] !== 'number' || parseCalculusValue(String(data.parameters[key]), key).error ||
      typeof data.coefficientDrafts[key] !== 'string' || data.coefficientDrafts[key].length > 24) || !Array.isArray(data.sourceLineNumbers) || data.sourceLineNumbers.length > 50) return null;
  const lines = data.notes.split(/\r\n|\n|\r/);
  if (data.sourceLineNumbers.some(line => !Number.isInteger(line) || line < 1 || line > lines.length || !lines[line - 1].trim())) return null;
  const lesson: CalculusLesson = {
    version: 2, kind: 'calculus', title: data.title, notes: data.notes,
    parameters: { a: data.parameters.a, b: data.parameters.b, c: data.parameters.c, x0: data.parameters.x0 },
    coefficientDrafts: { a: data.coefficientDrafts.a, b: data.coefficientDrafts.b, c: data.coefficientDrafts.c, x0: data.coefficientDrafts.x0 },
    confirmed: data.confirmed, explanation: data.explanation, explanationOrigin: data.explanationOrigin, explanationStale: data.explanationStale,
    sourceLineNumbers: matchingCalculusSources(data.notes, data.parameters), reviewed: data.reviewed,
  };
  if (lesson.confirmed && keys.some(key => parseCalculusValue(lesson.coefficientDrafts[key], key).value !== lesson.parameters[key])) lesson.confirmed = false;
  if (!canReview(lesson)) lesson.reviewed = false;
  return lesson;
}
