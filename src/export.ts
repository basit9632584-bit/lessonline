import { canReview, EXPLANATION_LIMIT, matchingSources, parseStoredLesson } from './lesson.ts';
import type { Lesson, CalculusLesson, StatisticsLesson, ProbabilityLesson, AnyLesson } from './lesson.ts';
import { parseCoefficient } from './math.ts';
import { analyzeNotes, NOTES_LIMIT } from './notes.ts';
import { parseCalculusValue, matchingCalculusSources, analyzeCalculusNotes } from './calculus.ts';
import { isValidStatisticsValues, matchingStatisticsSources, analyzeStatisticsNotes } from './statistics.ts';
import { isValidProbabilityParameters, matchingProbabilitySources, analyzeProbabilityNotes } from './probability.ts';
type PortableCommon = {
  title: string; explanation: string; reviewed: true;
  sourceNotes?: string; sourceLineNumbers?: number[];
};
export type PortableLinearLesson = PortableCommon & {
  version: 1; parameters: { m: number; b: number }; explanationOrigin: 'manual' | 'template' | 'nim';
};
export type PortableCalculusLesson = PortableCommon & {
  version: 2; kind: 'calculus'; parameters: { a: number; b: number; c: number; x0: number };
  explanationOrigin: 'manual' | 'template';
};
export type PortableStatisticsLesson = PortableCommon & {
  version: 2; kind: 'statistics'; parameters: { values: number[] };
  explanationOrigin: 'manual' | 'template';
};
export type PortableProbabilityLesson = PortableCommon & {
  version: 2; kind: 'probability'; parameters: { n: number; p: number; k: number };
  explanationOrigin: 'manual' | 'template';
};
export type PortableLesson = PortableLinearLesson | PortableCalculusLesson | PortableStatisticsLesson | PortableProbabilityLesson;
export function toPortableLesson(lesson: Lesson, includeNotes?: boolean): PortableLinearLesson;
export function toPortableLesson(lesson: CalculusLesson, includeNotes?: boolean): PortableCalculusLesson;
export function toPortableLesson(lesson: StatisticsLesson, includeNotes?: boolean): PortableStatisticsLesson;
export function toPortableLesson(lesson: ProbabilityLesson, includeNotes?: boolean): PortableProbabilityLesson;
export function toPortableLesson(lesson: AnyLesson, includeNotes?: boolean): PortableLesson;
export function toPortableLesson(lesson: AnyLesson, includeNotes = false): PortableLesson {
  const current = parseStoredLesson(JSON.stringify(lesson));
  if (!current || !current.reviewed || !canReview(current)) throw new Error('Confirm the supported values, update the explanation, and mark this lesson as teacher reviewed before exporting.');
  const common = { title: current.title, explanation: current.explanation, reviewed: true as const };
  let data: PortableLesson;
  if (current.version === 2) {
    if (current.explanationOrigin !== 'manual' && current.explanationOrigin !== 'template') throw new Error('This topic needs a template or teacher-edited explanation.');
    if (current.kind === 'probability') data = { ...common, version: 2, kind: 'probability', parameters: { n: current.parameters.n, p: current.parameters.p, k: current.parameters.k }, explanationOrigin: current.explanationOrigin };
    else if (current.kind === 'statistics') data = { ...common, version: 2, kind: 'statistics', parameters: { values: [...current.parameters.values] }, explanationOrigin: current.explanationOrigin };
    else data = { ...common, version: 2, kind: 'calculus', parameters: { ...current.parameters }, explanationOrigin: current.explanationOrigin };
  } else {
    data = { ...common, version: 1, parameters: { ...current.parameters }, explanationOrigin: current.explanationOrigin };
  }
  if (includeNotes) {
    data.sourceNotes = current.notes;
    data.sourceLineNumbers = current.version === 1 ? matchingSources(current.notes, current.parameters.m, current.parameters.b) : current.kind === 'statistics' ? matchingStatisticsSources(current.notes, current.parameters) : current.kind === 'probability' ? matchingProbabilitySources(current.notes, current.parameters) : matchingCalculusSources(current.notes, current.parameters);
  }
  return data;
}
export function parsePortableLesson(raw: string): PortableLesson | null {
  try {
    if (typeof raw !== 'string' || raw.length > 65536) return null;
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || ![1, 2].includes(value.version) || value.reviewed !== true ||
      typeof value.title !== 'string' || !value.title.trim() || value.title.length > 100 ||
      typeof value.explanation !== 'string' || !value.explanation.trim() || value.explanation.length > EXPLANATION_LIMIT ||
      !['manual', 'template', 'nim'].includes(value.explanationOrigin)) return null;
    const common = { title: value.title as string, explanation: value.explanation as string, reviewed: true as const };
    let data: PortableLesson;
    if (value.version === 2) {
      if (!['calculus', 'statistics', 'probability'].includes(value.kind) || !['manual', 'template'].includes(value.explanationOrigin)) return null;
      if (value.kind === 'probability') {
        if (!isValidProbabilityParameters(value.parameters)) return null;
        data = { ...common, version: 2, kind: 'probability', parameters: { n: value.parameters.n, p: value.parameters.p, k: value.parameters.k }, explanationOrigin: value.explanationOrigin };
      } else if (value.kind === 'statistics') {
        if (!isValidStatisticsValues(value.parameters?.values)) return null;
        data = { ...common, version: 2, kind: 'statistics', parameters: { values: [...value.parameters.values] }, explanationOrigin: value.explanationOrigin };
      } else {
        for (const key of ['a', 'b', 'c', 'x0'] as const) {
          if (typeof value.parameters?.[key] !== 'number' || parseCalculusValue(String(value.parameters[key]), key).error) return null;
        }
        data = { ...common, version: 2, kind: 'calculus', parameters: { a: value.parameters.a, b: value.parameters.b, c: value.parameters.c, x0: value.parameters.x0 }, explanationOrigin: value.explanationOrigin };
      }
    } else {
      if (typeof value.parameters?.m !== 'number' || typeof value.parameters?.b !== 'number' || parseCoefficient(String(value.parameters.m)).error || parseCoefficient(String(value.parameters.b)).error) return null;
      data = { ...common, version: 1, parameters: { m: value.parameters.m, b: value.parameters.b }, explanationOrigin: value.explanationOrigin };
    }
    if (Object.hasOwn(value, 'sourceNotes') || Object.hasOwn(value, 'sourceLineNumbers')) {
      if (typeof value.sourceNotes !== 'string' || !value.sourceNotes.trim() || value.sourceNotes.length > NOTES_LIMIT || !Array.isArray(value.sourceLineNumbers) || value.sourceLineNumbers.length > 50) return null;
      const analysis = data.version === 1 ? analyzeNotes(value.sourceNotes) : data.kind === 'statistics' ? analyzeStatisticsNotes(value.sourceNotes) : data.kind === 'probability' ? analyzeProbabilityNotes(value.sourceNotes) : analyzeCalculusNotes(value.sourceNotes);
      if (analysis.kind === 'empty' || analysis.kind === 'unsupported') return null;
      const matching = data.version === 1 ? matchingSources(value.sourceNotes, data.parameters.m, data.parameters.b) : data.kind === 'statistics' ? matchingStatisticsSources(value.sourceNotes, data.parameters) : data.kind === 'probability' ? matchingProbabilitySources(value.sourceNotes, data.parameters) : matchingCalculusSources(value.sourceNotes, data.parameters);
      if (value.sourceLineNumbers.length !== matching.length || value.sourceLineNumbers.some((line: unknown, index: number) => !Number.isInteger(line) || line !== matching[index])) return null;
      data.sourceNotes = value.sourceNotes; data.sourceLineNumbers = matching;
    }
    return data;
  } catch { return null; }
}
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
}
function inertJson(value: unknown): string {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, character => '\\u' + character.charCodeAt(0).toString(16).padStart(4, '0'));
}
export function makeLessonHtml(data: PortableLesson, assets: { js: string; css: string; licenses: string }): string {
  const safeData = parsePortableLesson(JSON.stringify(data));
  if (!safeData) throw new Error('The portable lesson is invalid.');
  if (typeof assets.js !== 'string' || !assets.js.trim() || assets.js.length > 12000000 || typeof assets.css !== 'string' || assets.css.length > 2000000 || typeof assets.licenses !== 'string' || assets.licenses.length > 1000000) throw new Error('The offline assets are missing or too large.');
  // Fail safely rather than rewriting executable asset semantics.
  if (/<\/style\b/i.test(assets.css)) throw new Error('The offline assets contain unsafe HTML delimiters. Rebuild the assets with escaped literals.');
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'">
<title>${escapeHtml(safeData.title)}</title>
<style>${assets.css}</style>
</head><body>
<div id="root"></div>
<noscript>This interactive lesson needs JavaScript. Open it in a browser with JavaScript enabled.</noscript>
<script id="lesson-data" type="application/json">${inertJson(safeData)}</script>
<script id="lesson-licenses" type="application/json">${inertJson(assets.licenses)}</script>
<script id="lesson-runtime" type="application/json">${inertJson(assets.js)}</script>
<script>(() => { const runtime = document.createElement("script"); runtime.textContent = JSON.parse(document.getElementById("lesson-runtime").textContent); document.body.appendChild(runtime); })();</script>
</body></html>`;
}
export function lessonFilename(title: string): string {
  const slug = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70).replace(/-+$/g, '');
  const name = slug && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(slug) ? slug : 'math-lesson';
  return name + '.html';
}




