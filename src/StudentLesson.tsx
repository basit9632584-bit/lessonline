import { lazy, Suspense, useEffect, useState } from 'react';
import { LIMIT, TABLE_X, parseCoefficient, formatNumber, yAt, equationText, describeLine } from './math';
import type { Lesson } from './lesson';
import Practice from './Practice.tsx';

const Graph = lazy(() => import('./Graph'));
type Coefficient = 'm' | 'b';

function Equation({ m, b }: { m: number; b: number }) {
  return <div className="equation" role="math" aria-label={equationText(m, b)} data-testid="equation">
    <span aria-hidden="true"><i>y</i> = {m !== 0 && <><span className="slope-color">{m === -1 ? '−' : m === 1 ? '' : formatNumber(m)}</span><i>x</i></>}
      {b !== 0 && <>{m !== 0 && <span className="equation-sign">{b < 0 ? ' − ' : ' + '}</span>}<span className="intercept-color">{m === 0 ? formatNumber(b) : formatNumber(Math.abs(b))}</span></>}
      {m === 0 && b === 0 && <span className="intercept-color">0</span>}</span>
  </div>;
}

export default function StudentLesson({ lesson, compact = false, titleLevel = 2 }: { lesson: Lesson; compact?: boolean; titleLevel?: 1 | 2 }) {
  const Title = titleLevel === 1 ? 'h1' : 'h2';
  const [values, setValues] = useState(lesson.parameters);
  const [drafts, setDrafts] = useState({ m: String(lesson.parameters.m), b: String(lesson.parameters.b) });
  const [errors, setErrors] = useState({ m: '', b: '' });
  const [predictionOpen, setPredictionOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [practiceReset, setPracticeReset] = useState(0);
  const { m, b } = values;
  useEffect(() => {
    setValues(lesson.parameters);
    setDrafts({ m: String(lesson.parameters.m), b: String(lesson.parameters.b) });
    setErrors({ m: '', b: '' }); setPredictionOpen(false);
  }, [lesson.parameters.m, lesson.parameters.b, compact]);

  function changeNumber(key: Coefficient, raw: string) {
    setDrafts(previous => ({ ...previous, [key]: raw }));
    const parsed = parseCoefficient(raw);
    setErrors(previous => ({ ...previous, [key]: parsed.error ?? '' }));
    if (!parsed.error && parsed.value !== undefined) {
      setValues(previous => ({ ...previous, [key]: parsed.value }));
      setNotice('');
    }
  }
  function changeSlider(key: Coefficient, raw: string) {
    const value = Number(raw);
    setValues(previous => ({ ...previous, [key]: value }));
    setDrafts(previous => ({ ...previous, [key]: String(value) }));
    setErrors(previous => ({ ...previous, [key]: '' }));
    setNotice('');
  }
  function reset() {
    setPracticeReset(previous => previous + 1);
    setValues(lesson.parameters); setDrafts({ m: String(lesson.parameters.m), b: String(lesson.parameters.b) }); setErrors({ m: '', b: '' });
    setPredictionOpen(false); setNotice('Lesson values restored.');
  }
  const hiddenPoint = Math.abs(b + m) > 12;

  return <article className={'lesson-shell student-lesson' + (compact ? ' compact-lesson' : '')} aria-label={lesson.title.trim() || 'Interactive mathematics lesson'}>
      <div className="lesson-heading">
        <div><p className="eyebrow">Algebra / straight-line graphs</p><Title className="lesson-title">{lesson.title.trim() || 'Untitled line lesson'}</Title><p className="lead">{compact ? 'One equation, connected to its picture and numbers.' : 'Change two values. Watch one idea connect.'}</p></div>
        <div className="topic-tag"><span aria-hidden="true">↗</span> Slope &amp; intercept</div>
      </div>

      <section className="prediction" aria-labelledby="prediction-heading">
        <div className="prediction-icon" aria-hidden="true">?</div>
        <div><h2 id="prediction-heading">First, make a prediction</h2><p>If you increase <span className="intercept-color">b</span> and keep <span className="slope-color">m</span> the same, what happens to the line?</p>
          <p id="prediction-answer" className="prediction-answer" hidden={!predictionOpen}>It shifts upward. Every y-value increases by the same amount, so the slope stays the same.</p></div>
        <button className="quiet-button" aria-expanded={predictionOpen} aria-controls="prediction-answer" onClick={() => setPredictionOpen(open => !open)}>{predictionOpen ? 'Hide explanation' : 'Reveal explanation'}<span aria-hidden="true">{predictionOpen ? '−' : '+'}</span></button>
      </section>

      <section className="workbench" aria-labelledby="explore-heading">
        <div className="workbench-heading"><div><p className="eyebrow">Explore the relationship</p><h2 id="explore-heading">One equation. Three ways to see it.</h2></div>{!compact && <button className="reset-button" title="Reset lesson" onClick={reset}><svg aria-hidden="true" viewBox="0 0 20 20"><path d="M3 8a7 7 0 1 1 0 5M3 3v5h5" /></svg>Reset lesson</button>}</div>
        <div className="equation-row"><Equation m={m} b={b} /><p className="equation-key"><span><span className="key-dot slope-dot" /> <strong>m</strong> sets the slope</span><span><span className="key-dot intercept-dot" /> <strong>b</strong> sets the crossing</span></p></div>

        <div className="representations">
          <figure className="graph-panel" aria-labelledby="graph-title" aria-describedby="line-description graph-window">
            <figcaption id="graph-title" className="panel-label">The picture <span>y against x</span></figcaption>
            <div className="graph-frame"><Suspense fallback={<div className="graph-unavailable" role="status">Loading the graph…</div>}><Graph m={m} b={b} /></Suspense></div>
            <div className="graph-legend"><span><span className="key-dot slope-dot" />Your line</span><span><span className="key-dot intercept-dot" />y-intercept (0, {formatNumber(b)})</span></div>
          </figure>
          <section className="table-panel" aria-labelledby="table-title"><h3 id="table-title" className="panel-label">The numbers <span>same line</span></h3>
            <table><caption className="sr-only">Five points on {equationText(m, b)}</caption><thead><tr><th scope="col">x</th><th scope="col">y</th></tr></thead><tbody>{TABLE_X.map(x => <tr key={x} className={x === 0 ? 'intercept-row' : ''}><th scope="row">{formatNumber(x)}</th><td data-testid={`y-${x}`}>{formatNumber(yAt(m, b, x))}</td></tr>)}</tbody></table>
            <p className="table-note"><span aria-hidden="true">↳</span> At x = 0, y = <span className="intercept-color">{formatNumber(b)}</span>. That's your intercept.</p>
          </section>
        </div>

        {!compact && <div className="coefficient-controls">
          {(['m', 'b'] as const).map(key => <section className={`coefficient ${key === 'm' ? 'slope-control' : 'intercept-control'}`} key={key} aria-labelledby={`${key}-heading`}>
            <div className="coefficient-top"><div><h3 id={`${key}-heading`}><span className="coefficient-symbol">{key}</span>{key === 'm' ? 'Slope' : 'Intercept'}</h3><p>{key === 'm' ? 'How much y changes for each step in x.' : 'Where the line crosses the y-axis.'}</p></div>
              <div className="numeric-wrap"><label className="sr-only" htmlFor={`${key}-number`}>{key === 'm' ? 'Slope value' : 'Intercept value'}</label><input id={`${key}-number`} type="text" inputMode="decimal" autoComplete="off" spellCheck={false} value={drafts[key]} aria-invalid={Boolean(errors[key])} aria-describedby={`${key}-hint ${key}-error`} onChange={event => changeNumber(key, event.target.value)} /></div></div>
            <label className="sr-only" htmlFor={`${key}-slider`}>{key === 'm' ? 'Slope slider' : 'Intercept slider'}</label><input id={`${key}-slider`} className="value-slider" type="range" min={-LIMIT} max={LIMIT} step="0.01" value={values[key]} aria-describedby={`${key}-hint`} onChange={event => changeSlider(key, event.target.value)} />
            <div className="slider-hints" id={`${key}-hint`}><span>−10</span><span>Use the arrows or type a value · up to 2 decimals</span><span>10</span></div>
            <p id={`${key}-error`} className="input-error" role="status">{errors[key] && <>{errors[key]} The lesson keeps the last valid value.</>}</p>
          </section>)}
        </div>}
      </section>

      <section className="explanation" aria-labelledby="explain-heading"><div className="explanation-mark" aria-hidden="true">∴</div><div><p className="eyebrow">Make the connection</p><h2 id="explain-heading">{m === 0 ? 'No rise. A horizontal line.' : m > 0 ? 'Move right. The line rises.' : 'Move right. The line falls.'}</h2><p id="line-description">{describeLine(m, b)}</p></div><div className="step-fact"><span>For a step of 1 in x</span><strong className="slope-color">Δy = {formatNumber(m)}</strong></div></section>
      <p className="window-note" id="graph-window">Fixed graph window: x from −4 to 4, y from −12 to 12. {hiddenPoint ? 'Part of the one-step marker is outside this window; the table still shows the values.' : 'The dotted marker shows a step of 1 in x and the corresponding change in y.'}</p>
      {lesson.explanation && <section className="authored-explanation" aria-labelledby="authored-heading"><p className="eyebrow">Teacher explanation</p><h2 id="authored-heading">Read the idea in words.</h2><p>{lesson.explanation}</p><p className="explanation-context">{lesson.explanationStale ? 'This explanation needs an update for the current notes or values.' : 'This explanation describes the lesson’s original values: ' + equationText(lesson.parameters.m, lesson.parameters.b) + '.'}</p></section>}
      <Practice key={`${m}:${b}:${practiceReset}`} m={m} b={b} compact={compact} />
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{notice}</div>
      <footer className="lesson-footer"><span>{compact ? 'Preview updates when you confirm values.' : 'Exploration changes stay in this preview.'}</span><span>Original: {equationText(lesson.parameters.m, lesson.parameters.b)}</span></footer>
    </article>;
}

