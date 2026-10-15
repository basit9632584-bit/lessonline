import { NOTES_LIMIT } from './notes.ts';
import type { PracticeQuestion } from './practice.ts';

export type StatisticsParameters = { values: number[] };
export const STATISTICS_SAMPLE: StatisticsParameters = { values: [2, 4, 4, 4, 5, 5, 7, 9] };
export const statisticsSamples = [
  { id: 'spread', title: 'A dataset and its spread', notes: 'Compare the center and population spread of these values.\nData: 2, 4, 4, 4, 5, 5, 7, 9\nKeep repeated values: every observation contributes.' },
  { id: 'changed', title: 'One larger value', notes: 'Compare how the mean and median respond to one larger value.\nValues: 2, 3, 4, 5, 20\nThis activity does not automatically label any value an outlier.' },
];
export function parseStatisticValue(raw: string): { value: number; error?: never } | { error: string; value?: never } {
  const text = raw.trim().replace(/−/g, '-');
  if (!text || text.length > 24 || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return { error: 'Enter a finite decimal number from −100 to 100.' };
  const value = Number(text);
  if (!Number.isFinite(value) || Math.abs(value) > 100) return { error: 'Use a value from −100 to 100.' };
  if ((text.split('.')[1]?.length ?? 0) > 2) return { error: 'Use up to two decimal places for each value.' };
  return { value: value === 0 ? 0 : value };
}
export function isValidStatisticsValues(values: unknown): values is number[] {
  return Array.isArray(values) && values.length >= 3 && values.length <= 20 && Array.from(values).every(value => typeof value === 'number' && !parseStatisticValue(String(value)).error);
}
export function parseDataset(raw: string): { value: number[]; error?: never } | { error: string; value?: never } {
  const text = raw.trim();
  if (!text || text.length > 512 || text.split(',').some(part => !part.trim())) return { error: 'Enter 3–20 numbers separated by commas or spaces, with no empty values.' };
  const tokens = text.split(/[,\s]+/);
  if (tokens.length < 3 || tokens.length > 20) return { error: 'Use 3–20 values for this dataset.' };
  const values: number[] = [];
  for (const token of tokens) {
    const parsed = parseStatisticValue(token);
    if (parsed.error) return { error: parsed.error };
    values.push(parsed.value!);
  }
  return { value: values };
}
export function formatStatisticsNumber(value: number): string { return String(Number(value.toFixed(6))).replace('-', '−'); }
export type StatisticsSummary = { count: number; mean: number; median: number; min: number; max: number; range: number; populationStdDev: number };
export function statisticsSummary(params: StatisticsParameters): StatisticsSummary {
  if (!isValidStatisticsValues(params.values)) throw new Error('Use a supported statistics dataset.');
  // Integer cents keep bounded two-decimal inputs exact before division/sqrt.
  const cents = params.values.map(value => Math.round(value * 100));
  const sorted = [...cents].sort((a, b) => a - b);
  const count = cents.length;
  const meanCents = cents.reduce((sum, value) => sum + value, 0) / count;
  const middle = Math.floor(count / 2);
  const median = count % 2 ? sorted[middle] / 100 : (sorted[middle - 1] + sorted[middle]) / 200;
  const varianceCents = cents.reduce((sum, value) => sum + (value - meanCents) ** 2, 0) / count;
  return { count, mean: meanCents / 100, median, min: sorted[0] / 100, max: sorted[count - 1] / 100,
    range: (sorted[count - 1] - sorted[0]) / 100, populationStdDev: Math.sqrt(varianceCents) / 100 };
}
export function statisticsExplanation(params: StatisticsParameters): string {
  const summary = statisticsSummary(params);
  return `There are ${summary.count} values. The mean is the sum divided by ${summary.count}, approximately ${formatStatisticsNumber(summary.mean)}. The median is the middle of the numerically sorted values (the average of the two middle values for an even count), ${formatStatisticsNumber(summary.median)}. The range is maximum minus minimum: ${formatStatisticsNumber(summary.max)} − (${formatStatisticsNumber(summary.min)}) = ${formatStatisticsNumber(summary.range)}. The population standard deviation is approximately ${formatStatisticsNumber(summary.populationStdDev)}: square deviations from the mean, divide their sum by all ${summary.count} values (not n − 1), then take the square root. Change one observation to compare these summaries. No automatic outlier classification is used.`;
}
export type StatisticsNotesAnalysis =
  | { kind: 'recognized'; parameters: StatisticsParameters; lineNumbers: number[] }
  | { kind: 'empty' | 'manual' | 'ambiguous' | 'unsupported'; message: string };
export function analyzeStatisticsNotes(notes: string): StatisticsNotesAnalysis {
  if (!notes.trim()) return { kind: 'empty', message: 'Paste statistics notes or choose a sample.' };
  if (notes.length > NOTES_LIMIT) return { kind: 'unsupported', message: 'Use up to 6,000 characters. Your notes are preserved.' };
  const found: { values: number[]; line: number }[] = [];
  let unsupported = false;
  notes.split(/\r\n|\n|\r/).forEach((line, index) => {
    const match = line.trim().match(/^(?:data|values)\s*:\s*(.*)$/i);
    if (match) {
      const parsed = parseDataset(match[1]);
      if (parsed.error) unsupported = true;
      else found.push({ values: parsed.value!, line: index + 1 });
    } else {
      const unsupportedTopic = /\b(?:regression|integrals?|trigonometry|hypothesis|inferential)\b|\b(?:sample standard deviation|sample variance|confidence interval|p-value)\b/i.test(line);
      // Formula prose is retained for teacher review, never extracted/evaluated.
      // Its wording is not a proof: only an explicit dataset line supplies data.
      const supportedFormulaProse = /^\s*(?:the\s+)?(?:mean|median|range|minimum|maximum|count|sum|n|population\s+(?:standard deviation|variance))\s*=/i.test(line);
      if (unsupportedTopic || (line.includes('=') && !supportedFormulaProse)) unsupported = true;
    }
  });
  if (unsupported) return { kind: 'unsupported', message: 'This lesson supports 3–20 values from −100 to 100, up to two decimals, on a Data: or Values: line. It covers mean, median, range and population standard deviation. Correct unsupported values or other equations/topics; your notes are preserved.' };
  if (found.some(item => JSON.stringify(item.values) !== JSON.stringify(found[0].values))) return { kind: 'ambiguous', message: 'Different datasets were found. Keep one ordered dataset, or explicitly confirm your own values.' };
  if (!found.length) return { kind: 'manual', message: 'No Data: or Values: dataset was found. Enter the dataset manually; your notes are preserved.' };
  return { kind: 'recognized', parameters: { values: [...found[0].values] }, lineNumbers: found.map(item => item.line) };
}
export function matchingStatisticsSources(notes: string, params: StatisticsParameters): number[] {
  const analysis = analyzeStatisticsNotes(notes);
  return analysis.kind === 'recognized' && JSON.stringify(analysis.parameters.values) === JSON.stringify(params.values) ? analysis.lineNumbers.slice(0, 50) : [];
}
export function statisticsPracticeQuestions(params: StatisticsParameters): PracticeQuestion[] {
  const summary = statisticsSummary(params);
  const sorted = [...params.values].sort((a, b) => a - b).map(formatStatisticsNumber).join(', ');
  return [
    { id: 'value', title: 'Find the mean', prompt: 'What is the mean of the current dataset?', expected: summary.mean,
      reasoning: `Add all ${summary.count} values, including duplicates, and divide by ${summary.count}. The mean is approximately ${formatStatisticsNumber(summary.mean)}.` },
    { id: 'slope', title: 'Find the middle', prompt: 'What is the median of the current dataset?', expected: summary.median,
      reasoning: `Sort numerically: ${sorted}. ${summary.count % 2 ? 'Take the single middle value.' : 'Average the two middle values.'} The median is ${formatStatisticsNumber(summary.median)}.` },
    { id: 'intercept', title: 'Find population spread', prompt: 'What is the population standard deviation?', expected: summary.populationStdDev,
      reasoning: `Use the mean to find squared deviations, divide their sum by all ${summary.count} values (not n − 1), then take the square root. The population standard deviation is approximately ${formatStatisticsNumber(summary.populationStdDev)}.` },
  ];
}
