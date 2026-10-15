import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { recognizeQuestion } from './recognition.ts';
import { formatProblem, taskIds, taskLabels } from './problem.ts';
import type { Problem, TaskId } from './problem.ts';
import { solveProblem } from './solution.ts';
import type { WorkedSolution } from './solution.ts';
import { labels, family, fields, draftsFor, candidates, boundsFor, taskHint } from './question-state.ts';
import ExpressionNumbers from './ExpressionNumbers.tsx';
import './questions.css';
const ProblemVisual = lazy(() => import('./ProblemVisual.tsx'));

const samples = [
  ['Arithmetic', 'Calculate (12 + 8) / 4.'],
  ['Fraction arithmetic', 'Calculate 1/2 + 3/4.'],
  ['Simplify a fraction', 'Simplify 12/18.'],
  ['Percentages', 'What is 20% of 150?'],
  ['Powers', 'Calculate 2 raised to the power 5.'],
  ['Linear equation', 'Solve 2x + 1 = 7.'],
  ['Quadratic derivative', 'Find the derivative of f(x) = x² at x = 1.'],
  ['Population statistics', 'Find the mean of 2, 4, 4, 4, 5, 5, 7, 9.'],
  ['Binomial probability', 'Binomial: n=5, p=0.2, k=1. Find exactly-one probability and expected successes.'],
];
export default function QuestionWorkspace() {
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const [source, setSource] = useState('');
  const [tasks, setTasks] = useState<TaskId[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [solutions, setSolutions] = useState<WorkedSolution[]>([]);
  const [originalProblems, setOriginalProblems] = useState<Problem[]>([]);
  const [currentProblems, setCurrentProblems] = useState<Problem[]>([]);
  const [exploreDrafts, setExploreDrafts] = useState<Record<string, string>>({});
  const [exploreError, setExploreError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [observationRaw, setObservationRaw] = useState<string | null>(null);
  const [solveSequence, setSolveSequence] = useState(0);
  const [status, setStatus] = useState('Paste a question or try a sample.');
  useEffect(() => {
    if (solutions.length) {
      resultsHeading.current?.focus({ preventScroll: true });
      resultsHeading.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
  }, [solveSequence]);
  const recognition = useMemo(() => recognizeQuestion(source), [source]);
  const candidate = useMemo(() => candidates(tasks, drafts), [tasks, drafts]);
  const originalDrafts = recognition.kind === 'recognized' ? Object.assign({}, ...recognition.problems.map(draftsFor)) as Record<string, string> : {};
  const edited = recognition.kind === 'recognized' && (JSON.stringify(tasks) !== JSON.stringify(recognition.problems.map((problem: Problem) => problem.task)) || fields(tasks).some(key => (drafts[key] ?? '') !== (originalDrafts[key] ?? '')));
  function changeSource(next: string) {
    setSource(next); invalidate();
    const parsed = recognizeQuestion(next);
    setTasks(parsed.kind === 'recognized' ? parsed.problems.map((problem: Problem) => problem.task) : []);
    setDrafts(parsed.kind === 'recognized' ? Object.assign({}, ...parsed.problems.map(draftsFor)) : {});
    setStatus('Question changed. Solve again to see the answer.');
  }
  function changeDraft(key: string, value: string) {
    setDrafts(previous => ({ ...previous, [key]: value })); invalidate(); setStatus('Interpretation changed. Solve again to see the answer.');
  }
  function solve() {
    if (candidate.error || !candidate.problems.length) return;
    try {
      const next = candidate.problems.map(solveProblem); setSolutions(next);
      setOriginalProblems(candidate.problems); setCurrentProblems(candidate.problems);
      setExploreDrafts(Object.assign({}, ...candidate.problems.map(draftsFor)));
      setExploreError(null); setSelectedIndex(0); setObservationRaw(null); setSolveSequence(previous => previous + 1);
      setStatus(next.map(solution => `${solution.title}: ${solution.answer}`).join('. '));
    } catch (error) { setSolutions([]); setStatus(error instanceof Error ? error.message : 'Check the interpretation and try again.'); }
  }
  function invalidate() {
    setSolutions([]); setOriginalProblems([]); setCurrentProblems([]); setExploreError(null);
  }
  function updateExploration(nextDrafts: Record<string, string>) {
    setExploreDrafts(nextDrafts);
    const next = candidates(originalProblems.map(problem => problem.task), nextDrafts);
    setExploreError(next.error);
    if (next.error) {
      setStatus('Some exploration values are invalid. The answer, steps and picture still show the last valid values.');
      return;
    }
    const nextSolutions = next.problems.map(solveProblem);
    setCurrentProblems(next.problems); setSolutions(nextSolutions);
    if ('values' in next.problems[0].parameters && selectedIndex >= next.problems[0].parameters.values.length) setSelectedIndex(0);
    setStatus(nextSolutions.map(solution => `${solution.title}: ${solution.answer}`).join('. '));
  }
  function resetExploration() {
    const originalSolutions = originalProblems.map(solveProblem);
    setCurrentProblems(originalProblems); setSolutions(originalSolutions);
    setExploreDrafts(Object.assign({}, ...originalProblems.map(draftsFor))); setExploreError(null); setSelectedIndex(0); setObservationRaw(null);
    setStatus('Restored the original confirmed interpretation. ' + originalSolutions.map(solution => solution.answer).join('. '));
  }
  const changed = JSON.stringify(currentProblems) !== JSON.stringify(originalProblems);
  const currentParameters = currentProblems.length ? Object.assign({}, ...currentProblems.map(problem => problem.parameters)) as Record<string, number | number[] | string> : undefined;
  const dataset = currentParameters && Array.isArray(currentParameters.values) ? currentParameters.values : null;
  const visualProblem = currentProblems.find(problem => problem.task === 'probability.exactly-k') ?? currentProblems[0];
  function updateObservation(raw: string) {
    setObservationRaw(raw);
    const values = dataset!.map(String); values[selectedIndex] = raw;
    updateExploration({ ...exploreDrafts, values: values.join(', ') });
  }
  return <main className="question-app" id="main-content">
    <header className="q-header"><a className="q-brand" href="?">lessonline<span>Question → reasoning</span></a><a className="q-secondary" href="?view=teacher">Lesson builder</a></header>
    <div className="q-intro"><p className="q-eyebrow">WORK THROUGH THE MATHEMATICS</p><h1>See how the answer happens.</h1><p>Paste a question. Follow each step, then change values to see the effect.</p></div>
    <div className="q-layout">
      <section className="q-composer" aria-labelledby="q-input-title"><div className="q-section-number">01 · YOUR QUESTION</div><h2 id="q-input-title">What are you working on?</h2>
        <label className="q-label" htmlFor="q-source">Mathematics question</label><textarea id="q-source" value={source} onChange={event => changeSource(event.target.value)} placeholder="For example: Solve 2x + 1 = 7." rows={6} aria-invalid={source.length > 6000} aria-describedby={recognition.kind === 'recognized' ? 'q-source-count q-supported' : 'q-source-count q-supported q-guidance-message'} />
        <p id="q-source-count" className={source.length > 6000 ? 'q-helper q-error' : 'q-helper'} aria-live={source.length > 6000 ? 'polite' : 'off'}>{source.length.toLocaleString()} / 6,000 characters{source.length > 6000 ? ' — shorten your question to continue. Your full text is preserved.' : ''}</p>
        <p id="q-supported" className="q-helper">Supported: basic arithmetic, fractions, percentages and powers, plus linear equations, quadratic calculus, population statistics and binomial probability. Check the limits shown for your task.</p>
        <div className="q-samples"><p className="q-label">Try a question</p>{samples.map(([label, text]) => <button key={label} type="button" onClick={() => changeSource(text)}>{label}<span aria-hidden="true">↗</span></button>)}</div>
      </section>
      <div className="q-work">
        <section className="q-interpretation" aria-labelledby="q-interpret-title"><div className="q-section-number">02 · CHECK THE INTERPRETATION</div><h2 id="q-interpret-title">{edited ? 'Edited interpretation' : 'What your question asks'}</h2>
          {recognition.kind !== 'recognized' ? <div className="q-guidance"><h3>{recognition.kind === 'empty' ? 'Start with a complete question' : recognition.kind === 'incomplete' ? 'Add the missing details' : recognition.kind === 'ambiguous' ? 'Check conflicting details' : 'This question is not supported yet'}</h3><p id="q-guidance-message">{recognition.message}</p><p className="q-helper">{recognition.kind === 'empty' ? 'Paste a question or choose a sample. No topic selection is needed.' : recognition.kind === 'incomplete' ? 'Edit your question to include the requested operation and the missing values. Your full text is kept.' : recognition.kind === 'ambiguous' ? 'Use one consistent set of values for the requested task. Your full text is kept; nothing has been solved.' : 'Nothing has been solved or discarded. Compare your question with the supported forms below.'}</p><div className="q-guidance-actions"><a href="#q-source">Edit question</a><details><summary>Supported question examples</summary><ul>{samples.map(([label,text]) => <li key={label}><strong>{label}</strong><span>{text}</span></li>)}</ul></details></div></div> : <>
            <p className="q-helper">{recognition.message}</p>
            {tasks.length === 1 ? <><label className="q-label" htmlFor="q-task">Task</label><select id="q-task" value={tasks[0]} onChange={event => { setTasks([event.target.value as TaskId]); invalidate(); setStatus('Task changed. Check the values and solve again.'); }}>{taskIds.filter(task => family(task) === family(tasks[0])).map(task => <option key={task} value={task}>{taskLabels[task]}</option>)}</select></> : <p className="q-task-list">Requested: {tasks.map(task => taskLabels[task]).join(' · ')}</p>}
            <p className="q-helper">{taskHint(tasks[0])}</p>
            <div className="q-fields">{fields(tasks).map(key => <div key={key} className={key === 'values' || key === 'expression' ? 'q-field q-wide' : 'q-field'}><label className="q-label" htmlFor={`q-value-${key}`}>{family(tasks[0]) === 'calculus' && key === 'b' ? 'Linear coefficient b' : labels[key]}</label>{key === 'values' || key === 'expression' ? <textarea id={`q-value-${key}`} rows={3} value={drafts[key] ?? ''} onChange={event => changeDraft(key, event.target.value)} aria-describedby="q-validation" /> : <input id={`q-value-${key}`} type="text" inputMode="decimal" value={drafts[key] ?? ''} onChange={event => changeDraft(key, event.target.value)} aria-describedby="q-validation" />}</div>)}</div>
            <p id="q-validation" aria-live="polite" className={candidate.error ? 'q-validation q-error' : 'q-validation'}>{candidate.error ?? [...new Set(candidate.problems.map(formatProblem))].join(' · ')}</p>
            <div className="q-solve-row"><button type="button" className="q-primary" disabled={Boolean(candidate.error) || !candidate.problems.length} onClick={solve}>Solve question <span aria-hidden="true">→</span></button><p className="q-helper">Solve uses the values shown above. Editing them clears the previous answer.</p></div>
          </>}
        </section>
        <section className="q-results" aria-labelledby="q-results-title"><div className="q-section-number">03 · FOLLOW THE REASONING</div><h2 id="q-results-title" ref={resultsHeading} tabIndex={-1}>Worked solution</h2>
          {solutions.length > 0 && <p className="q-result-state">{changed ? 'Current variation result' : 'Original confirmed result'}{exploreError ? ' · last valid values' : ''}</p>}
          {!solutions.length ? <div className="q-empty"><span className="q-empty-math" aria-hidden="true">x = ?</span><p>Your steps will appear here.</p><p className="q-helper">Check the interpreted question, then choose Solve question.</p></div> : solutions.map((solution, solutionIndex) => <article className="q-solution" key={solution.task}><div className="q-answer"><p className="q-eyebrow">{solution.title}</p><h3>{solution.answer}</h3><p>{solution.context}</p>{solutionIndex === 0 && <a className="q-explore-link" href="#q-explore-title">Explore these values <span aria-hidden="true">↘</span></a>}</div><ol className="q-steps">{solution.steps.map((step, index) => <li key={index}><span className="q-step-index" aria-hidden="true">{index + 1}</span><div><h3>{step.title}</h3><p className="q-math">{step.expression}</p><p>{step.reason}</p></div></li>)}</ol><div className="q-check"><h3>Check the result</h3><p>{solution.check}</p>{solution.exact && <p>Exact: {solution.exact}</p>}{solution.approximation && <p>Approximation: {solution.approximation}</p>}</div></article>)}
        </section>
        {currentProblems.length > 0 && <section className="q-exploration" aria-labelledby="q-explore-title">
          <div className="q-explore-header"><div><div className="q-section-number">04 · CHANGE A VALUE, FOLLOW THE EFFECT</div><h2 id="q-explore-title" tabIndex={-1}>Explore the mathematics</h2></div><button type="button" className="q-reset" onClick={resetExploration}>Reset to original</button></div>
          <p className="q-helper">Change these values to update the answer, steps and picture together. Your pasted question stays unchanged.</p>
          <div className="q-comparison"><div><p className="q-label">Original confirmed interpretation</p><p>{[...new Set(originalProblems.map(formatProblem))].join(' · ')}</p><p className="q-helper">{originalProblems.map(problem => taskLabels[problem.task]).join(' · ')}</p></div><div><p className="q-label">{changed ? 'Current variation' : 'Current values · original'}</p><p>{[...new Set(currentProblems.map(formatProblem))].join(' · ')}</p></div></div>
          {exploreError && <div className="q-explore-warning" role="status"><strong>{exploreError}</strong><p>The answer, steps and picture show the last valid values displayed above. Correct the draft or reset to original.</p></div>}
          <div className="q-explore-fields">{fields(originalProblems.map(problem => problem.task)).map(key => key === 'expression' ? <div className="q-wide" key={key}>
            <label className="q-label" htmlFor="q-explore-expression">Arithmetic expression</label>
            <textarea id="q-explore-expression" rows={3} value={exploreDrafts.expression ?? ''} onChange={event => updateExploration({ ...exploreDrafts, expression:event.target.value })} aria-invalid={Boolean(exploreError)} aria-describedby="q-expression-help" />
            <p id="q-expression-help" className="q-helper">{taskHint('basic.arithmetic')}</p>
            <ExpressionNumbers expression={String(currentParameters?.expression ?? '')} disabled={Boolean(exploreError)} onChange={expression => updateExploration({ ...exploreDrafts,expression })}/>
          </div> : key === 'values' ? <div className="q-wide" key={key}><label className="q-label" htmlFor="q-explore-values">Data values, in original order</label><textarea id="q-explore-values" rows={3} value={exploreDrafts.values ?? ''} onChange={event => { setObservationRaw(null); updateExploration({ ...exploreDrafts, values: event.target.value }); }} aria-invalid={Boolean(exploreError)} aria-describedby="q-explore-help" /><p id="q-explore-help" className="q-helper">3–20 values, −100 to 100, up to two decimals. Commas or spaces; keep every repeated observation.</p></div> : <div className="q-explore-control" key={key}><label className="q-label" htmlFor={`q-explore-${key}`}>{family(originalProblems[0].task) === 'calculus' && key === 'b' ? 'Linear coefficient b' : labels[key]}</label><input id={`q-explore-${key}`} type="number" {...boundsFor(key, currentProblems)} value={exploreDrafts[key] ?? ''} onChange={event => updateExploration({ ...exploreDrafts, [key]: event.target.value })} aria-describedby={`q-limit-${key}`} aria-invalid={Boolean(exploreError)} /><input type="range" {...boundsFor(key, currentProblems)} value={currentParameters?.[key] as number} aria-label={`Adjust ${family(originalProblems[0].task) === 'calculus' && key === 'b' ? 'Linear coefficient b' : labels[key]}`} onChange={event => updateExploration({ ...exploreDrafts, [key]: event.target.value })} /><p className="q-helper" id={`q-limit-${key}`}>{boundsFor(key, currentProblems).min} to {boundsFor(key, currentProblems).max}; {boundsFor(key, currentProblems).step === 1 ? 'whole numbers' : 'up to two decimals'}.</p></div>)}</div>
          {dataset && <div className="q-observation"><div><label className="q-label" htmlFor="q-observation-index">Choose an observation</label><select id="q-observation-index" value={selectedIndex} onChange={event => { setSelectedIndex(Number(event.target.value)); setObservationRaw(null); }}>{dataset.map((value, index) => <option key={index} value={index}>Observation {index + 1}: {value}</option>)}</select></div><div><label className="q-label" htmlFor="q-observation-value">Value of observation {selectedIndex + 1}</label><input id="q-observation-value" type="number" min={-100} max={100} step={.01} value={observationRaw ?? String(dataset[selectedIndex])} disabled={Boolean(exploreError) && observationRaw === null} onChange={event => updateObservation(event.target.value)} aria-describedby="q-explore-help" /><input type="range" min={-100} max={100} step={.01} value={dataset[selectedIndex]} disabled={Boolean(exploreError) && observationRaw === null} aria-label={`Adjust observation ${selectedIndex + 1}`} onChange={event => updateObservation(event.target.value)} /></div></div>}
          <div className="q-local-answers"><p className="q-label">Current requested answers{exploreError ? ' · last valid values' : ''}</p>{solutions.map(solution => <div className="q-local-answer" key={solution.task}><span>{solution.title}</span><strong>{solution.answer}</strong></div>)}<a href="#q-results-title">Read updated steps <span aria-hidden="true">↑</span></a></div>
          <Suspense fallback={<p className="q-helper" role="status">Preparing the picture…</p>}><ProblemVisual problem={visualProblem} /></Suspense>
        </section>}
      </div>
    </div><p className="q-live sr-only" role="status" aria-live="polite">{status}</p>
  </main>;
}
