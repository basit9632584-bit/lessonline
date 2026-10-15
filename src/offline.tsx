import { createRoot } from 'react-dom/client';
import StudentLesson from './StudentLesson';
import CalculusStudent from './CalculusStudent';
import StatisticsStudent from './StatisticsStudent';
import ProbabilityStudent from './ProbabilityStudent';
import { parsePortableLesson } from './export';
import type { AnyLesson } from './lesson';
import './styles.css';
import './offline.css';

const root = document.getElementById('root');
const data = parsePortableLesson(document.getElementById('lesson-data')?.textContent ?? '');
if (root && data) {
  const common = { title: data.title, notes: data.sourceNotes ?? '', confirmed: true,
    explanation: data.explanation, explanationStale: false,
    sourceLineNumbers: data.sourceLineNumbers ?? [], reviewed: data.reviewed };
  let lesson: AnyLesson;
  if (data.version === 1) lesson = {
    ...common, version: 1, parameters: { ...data.parameters },
    coefficientDrafts: { m: String(data.parameters.m), b: String(data.parameters.b) }, explanationOrigin: data.explanationOrigin,
  };
  else if (data.kind === 'statistics') lesson = {
    ...common, version: 2, kind: 'statistics', parameters: { values: [...data.parameters.values] },
    datasetDraft: data.parameters.values.join(', '), explanationOrigin: data.explanationOrigin,
  };
  else if (data.kind === 'probability') lesson = {
    ...common, version: 2, kind: 'probability', parameters: { n: data.parameters.n, p: data.parameters.p, k: data.parameters.k },
    coefficientDrafts: { n: String(data.parameters.n), p: String(data.parameters.p), k: String(data.parameters.k) }, explanationOrigin: data.explanationOrigin,
  };
  else lesson = {
    ...common, version: 2, kind: 'calculus', parameters: { ...data.parameters },
    coefficientDrafts: { a: String(data.parameters.a), b: String(data.parameters.b), c: String(data.parameters.c), x0: String(data.parameters.x0) }, explanationOrigin: data.explanationOrigin,
  };
  const licenses = document.getElementById('lesson-licenses')?.textContent ?? '';
  let licenseText = licenses;
  try { const value: unknown = JSON.parse(licenses); if (typeof value === 'string') licenseText = value; } catch { /* plain text */ }
  const sourceLabel = lesson.version === 1 ? 'equation' : lesson.kind === 'statistics' ? 'dataset' : lesson.kind === 'probability' ? 'trial settings' : 'equation';
  createRoot(root).render(<>
    <a className="skip-link" href="#lesson">Skip to lesson</a>
    <header className="site-header"><a className="brand" href="#lesson">lesson<span>line</span></a><span className="sample-tag">Offline lesson</span></header>
    <main id="lesson" tabIndex={-1} className="offline-shell">
      <div className="offline-review"><span className="offline-review-label">Original lesson · teacher reviewed</span><p>The teacher reviewed the saved {sourceLabel} and explanation. This records their review, not a mathematical proof. Exploring other values below does not change the original lesson.</p></div>
      {lesson.version === 1 ? <StudentLesson lesson={lesson} titleLevel={1} /> : lesson.kind === 'statistics' ? <StatisticsStudent lesson={lesson} titleLevel={1} /> : lesson.kind === 'probability' ? <ProbabilityStudent lesson={lesson} titleLevel={1} /> : <CalculusStudent lesson={lesson} titleLevel={1} />}
      <section className="offline-source" aria-labelledby="source-heading"><h2 id="source-heading">Source context</h2>
        {data.sourceNotes !== undefined ? <><p>Source notes included by the teacher. {lesson.sourceLineNumbers.length ? 'The confirmed ' + sourceLabel + (lesson.version === 2 && lesson.kind === 'probability' ? ' match line' : ' matches line') + (lesson.sourceLineNumbers.length === 1 ? ' ' : 's ') + lesson.sourceLineNumbers.join(', ') + '.' : 'Values were confirmed manually; no matching ' + sourceLabel + ' line is identified.'} Source context helps inspection; it is not proof.</p><details><summary>Read the shared source notes</summary><pre>{data.sourceNotes}</pre></details></> : <p>{lesson.version === 1 ? 'The teacher confirmed the slope and intercept.' : lesson.kind === 'statistics' ? 'The teacher confirmed the dataset.' : lesson.kind === 'probability' ? 'The teacher confirmed the trial settings.' : 'The teacher confirmed the function coefficients and tangent point.'} Their source notes are private and are not included in this file.</p>}
      </section>
      <details className="offline-licenses"><summary>Open-source license notices</summary><pre>{licenseText}</pre></details>
    </main>
  </>);
} else if (root) {
  root.textContent = 'This lesson file could not be read. Ask the teacher to download a fresh copy.';
}


