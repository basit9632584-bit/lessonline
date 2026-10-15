import { lazy, Suspense, useEffect, useId, useState } from 'react';
import type { CalculusLesson } from './lesson';
import { parseCalculusValue, quadraticAt, derivativeAt, tangentAt, quadraticText, derivativeText, tangentText, calculusPracticeQuestions, formatCalculusNumber } from './calculus';
import type { CalculusKey, CalculusParameters } from './calculus';
import Practice from './Practice.tsx';
import './calculus.css';

const CalculusGraph = lazy(() => import('./CalculusGraph'));
const keys: CalculusKey[] = ['a', 'b', 'c', 'x0'];
const labels = { a: 'Quadratic coefficient', b: 'Linear coefficient', c: 'Constant term', x0: 'Evaluation point' };
const draftsFor = (p: CalculusParameters) => ({ a: String(p.a), b: String(p.b), c: String(p.c), x0: String(p.x0) });
const noErrors = () => ({ a: '', b: '', c: '', x0: '' });

export default function CalculusStudent({ lesson, compact = false, titleLevel = 2 }: { lesson: CalculusLesson; compact?: boolean; titleLevel?: 1 | 2 }) {
  const Title = titleLevel === 1 ? 'h1' : 'h2';
  const id = `calculus-${useId().replace(/:/g, '')}`;
  const [values, setValues] = useState(lesson.parameters);
  const [drafts, setDrafts] = useState(draftsFor(lesson.parameters));
  const [errors, setErrors] = useState(noErrors);
  const [predictionOpen, setPredictionOpen] = useState(false);
  const [resetCount, setResetCount] = useState(0);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    setValues(lesson.parameters); setDrafts(draftsFor(lesson.parameters)); setErrors(noErrors());
    setPredictionOpen(false); setNotice('');
  }, [lesson.parameters.a, lesson.parameters.b, lesson.parameters.c, lesson.parameters.x0, compact]);
  function update(key: CalculusKey, raw: string) {
    setDrafts(previous => ({ ...previous, [key]: raw }));
    const parsed = parseCalculusValue(raw, key);
    setErrors(previous => ({ ...previous, [key]: parsed.error ?? '' }));
    if (parsed.value !== undefined && !parsed.error) {
      setValues(previous => ({ ...previous, [key]: parsed.value! })); setNotice('');
    }
  }
  function reset() {
    setValues(lesson.parameters); setDrafts(draftsFor(lesson.parameters)); setErrors(noErrors());
    setResetCount(previous => previous + 1); setPredictionOpen(false); setNotice('Original calculus values restored.');
  }
  const pointY = quadraticAt(values, values.x0);
  const slope = derivativeAt(values, values.x0);
  const prediction = values.a === 0 ? 'The slope stays the same. When a = 0, the derivative is the constant b, so the tangent coincides with the straight-line function.' : values.a > 0 ? 'The slope increases as the point moves right. The derivative is 2ax + b, and 2a is positive.' : 'The slope decreases as the point moves right. The derivative is 2ax + b, and 2a is negative.';
  function control(key: CalculusKey) {
    const limit = key === 'x0' ? 3 : 5;
    const fieldId = `${id}-${key}`;
    return <section className={'calculus-control' + (key === 'x0' ? ' calculus-point-control' : '')} key={key} aria-labelledby={`${fieldId}-heading`}>
      <div className="coefficient-top"><div><h3 id={`${fieldId}-heading`}><span className="coefficient-symbol">{key === 'x0' ? <>x<sub>0</sub></> : key}</span>{labels[key]}</h3>{key === 'x0' && <p>Move the point. Compare the tangent slope.</p>}</div><div className="numeric-wrap"><label className="sr-only" htmlFor={`${fieldId}-number`}>{labels[key]} value</label><input id={`${fieldId}-number`} data-testid={`calculus-${key}-input`} type="text" inputMode="decimal" autoComplete="off" spellCheck={false} maxLength={24} value={drafts[key]} aria-invalid={Boolean(errors[key])} aria-describedby={`${fieldId}-hint ${fieldId}-error`} onChange={event => update(key, event.target.value)} /></div></div>
      <label className="sr-only" htmlFor={`${fieldId}-slider`}>{labels[key]} slider</label><input id={`${fieldId}-slider`} className="value-slider" data-testid={`calculus-${key}-slider`} type="range" min={-limit} max={limit} step="0.01" value={values[key]} aria-describedby={`${fieldId}-hint`} onChange={event => update(key, event.target.value)} />
      <div className="slider-hints" id={`${fieldId}-hint`}><span>−{limit}</span><span>Arrow keys or a decimal value · up to 2 decimals</span><span>{limit}</span></div><p className="input-error" id={`${fieldId}-error`} role="status">{errors[key] && <>{errors[key]} The lesson keeps the last valid value.</>}</p>
    </section>;
  }
  return <article className={'lesson-shell student-lesson calculus-lesson' + (compact ? ' compact-lesson' : '')} aria-label={lesson.title.trim() || 'Interactive calculus lesson'}>
    <div className="lesson-heading"><div><p className="eyebrow">Calculus / quadratic tangents</p><Title className="lesson-title">{lesson.title.trim() || 'A curve and its tangent'}</Title><p className="lead">{compact ? 'A confirmed function and its local rate of change.' : 'Move a point. See the slope at that moment.'}</p></div></div>
    <section className="prediction" aria-labelledby={`${id}-prediction-heading`}><div className="prediction-icon" aria-hidden="true">?</div><div><h2 id={`${id}-prediction-heading`}>First, make a prediction</h2><p>As the evaluation point moves right, does the tangent slope increase, decrease, or stay the same?</p><p id={`${id}-prediction-answer`} className="prediction-answer" hidden={!predictionOpen}>{prediction}</p></div><button className="quiet-button" aria-expanded={predictionOpen} aria-controls={`${id}-prediction-answer`} onClick={() => setPredictionOpen(previous => !previous)}>{predictionOpen ? 'Hide explanation' : 'Reveal explanation'}<span aria-hidden="true">{predictionOpen ? '−' : '+'}</span></button></section>
    <section className="workbench calculus-workbench" aria-labelledby={`${id}-explore-heading`}><div className="workbench-heading"><div><p className="eyebrow">Explore the relationship</p><h2 id={`${id}-explore-heading`}>One curve. A slope at every point.</h2></div>{!compact && <button className="reset-button" onClick={reset}>Reset lesson</button>}</div>
      <div className="calculus-formulas"><div><span className="panel-label">The function</span><p className="calculus-formula slope-color" role="math" aria-label={quadraticText(values)} data-testid="calculus-equation">{quadraticText(values)}</p></div><div><span className="panel-label">The derivative</span><p className="calculus-formula" role="math" aria-label={derivativeText(values)} data-testid="calculus-derivative">{derivativeText(values)}</p></div></div>
      <figure className="graph-panel" aria-labelledby={`${id}-graph-title`} aria-describedby={`${id}-point-description ${id}-window`}><figcaption className="panel-label" id={`${id}-graph-title`}>The picture <span>function and tangent</span></figcaption><div className="graph-frame calculus-graph-frame"><Suspense fallback={<div className="graph-unavailable" role="status">Loading the curve…</div>}><CalculusGraph parameters={values} /></Suspense></div><div className="graph-legend"><span><span className="key-dot slope-dot" />Function f(x)</span><span><span className="key-dot intercept-dot" />Tangent at x₀</span><span><span className="key-dot calculus-point-dot" />Evaluation point</span></div></figure>
      <div className="calculus-point-facts" id={`${id}-point-description`}><div><span>Evaluation point</span><strong data-testid="calculus-point">({formatCalculusNumber(values.x0)}, {formatCalculusNumber(pointY)})</strong></div><div><span>Tangent slope f′(x₀)</span><strong className="slope-color" data-testid="calculus-slope">{formatCalculusNumber(slope)}</strong></div></div>
      <p className="calculus-tangent-formula intercept-color" role="math" aria-label={tangentText(values)} data-testid="calculus-tangent">{tangentText(values)}</p>
      {!compact && <div className="calculus-controls">{control('x0')}<div className="calculus-coefficients">{keys.filter(key => key !== 'x0').map(control)}</div></div>}
      <section className="calculus-table-panel" aria-labelledby={`${id}-table-heading`}><h3 className="panel-label" id={`${id}-table-heading`}>Compare nearby values <span>same function and tangent</span></h3><table><caption className="sr-only">Function and tangent values around x zero equals {formatCalculusNumber(values.x0)}</caption><thead><tr><th scope="col">x</th><th scope="col">f(x)</th><th scope="col">Tangent y</th></tr></thead><tbody>{[-1, -0.5, 0, 0.5, 1].map(offset => { const x = values.x0 + offset; return <tr key={offset} className={offset === 0 ? 'calculus-active-row' : ''}><th scope="row">{formatCalculusNumber(x)}</th><td data-testid={`calculus-f-${offset}`}>{formatCalculusNumber(quadraticAt(values, x))}</td><td data-testid={`calculus-t-${offset}`}>{formatCalculusNumber(tangentAt(values, x))}</td></tr>; })}</tbody></table><p className="table-note">At x₀ the two values agree. Away from it, the tangent is a local approximation{values.a === 0 ? '; with a = 0 it matches the function everywhere.' : ', not the same curve.'}</p></section>
    </section>
    <section className="explanation" aria-labelledby={`${id}-explain-heading`}><div><p className="eyebrow">Make the connection</p><h2 id={`${id}-explain-heading`}>{slope === 0 ? 'At this point, the tangent is horizontal.' : slope > 0 ? 'At this point, the tangent rises.' : 'At this point, the tangent falls.'}</h2><p>The derivative gives the tangent slope: f′(x₀) = 2a × x₀ + b = {formatCalculusNumber(slope)}. The tangent passes through ({formatCalculusNumber(values.x0)}, {formatCalculusNumber(pointY)}). {values.a === 0 ? 'The quadratic term is zero, so the function is a straight line and its tangent matches it everywhere.' : 'The tangent describes the rate of change at the selected point; it does not describe every point on the curve.'}</p></div></section>
    <p className="window-note" id={`${id}-window`}>Graph x from −4 to 4. The vertical window adapts when coefficients change and stays fixed as x₀ moves. Tangent portions outside the frame are clipped; the table gives nearby function and tangent values.</p>
    {lesson.explanation && <section className="authored-explanation" aria-labelledby={`${id}-authored-heading`}><p className="eyebrow">Teacher explanation</p><h2 id={`${id}-authored-heading`}>Read the idea in words.</h2><p>{lesson.explanation}</p><p className="explanation-context">{lesson.explanationStale ? 'This explanation needs an update for the current notes or values.' : `This explanation describes the original ${quadraticText(lesson.parameters)} at x₀ = ${formatCalculusNumber(lesson.parameters.x0)}.`}</p></section>}
    <Practice questions={calculusPracticeQuestions(values)} context={compact ? 'Questions use the confirmed calculus values. Confirming different values clears your answers.' : 'Questions follow the current function and evaluation point. Changing values or resetting clears your answers.'} compact={compact} key={`${values.a}:${values.b}:${values.c}:${values.x0}:${resetCount}`} />
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{notice}</div><footer className="lesson-footer"><span>{compact ? 'Preview updates when you confirm values.' : 'Exploration changes stay in this preview.'}</span><span>Original point x₀ = {formatCalculusNumber(lesson.parameters.x0)}</span></footer>
  </article>;
}
