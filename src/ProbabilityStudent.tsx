import { useEffect, useId, useRef, useState } from 'react';
import type { ProbabilityLesson } from './lesson';
import { parseProbabilityValue, probabilityDistribution, probabilityMass, expectedSuccesses, formatProbabilityNumber, formatProbabilityPercent, probabilityPracticeQuestions } from './probability';
import type { ProbabilityKey, ProbabilityParameters } from './probability';
import Practice from './Practice.tsx';
import './probability.css';

const keys: ProbabilityKey[] = ['n', 'p', 'k'];
const labels = { n: 'Number of trials', p: 'Success chance per trial', k: 'Chosen success count' };
const draftsFor = (params: ProbabilityParameters) => ({ n: String(params.n), p: String(params.p), k: String(params.k) });
const emptyErrors = () => ({ n: '', p: '', k: '' });

function Distribution({ parameters, distribution }: { parameters: ProbabilityParameters; distribution: number[] }) {
  const maximum = Math.max(...distribution);
  const column = 600 / distribution.length;
  const tickValues = [...new Set([0, Math.floor(parameters.n / 2), parameters.n])];
  const center = (k: number) => 20 + (k + 0.5) * column;
  return <div className="probability-chart" aria-hidden="true"><svg viewBox="0 0 640 220" preserveAspectRatio="none" focusable="false">
    <line x1="20" x2="620" y1="190" y2="190" className="probability-axis" />
    {[0.5, 1].map(fraction => <line key={fraction} x1="20" x2="620" y1={190 - fraction * 160} y2={190 - fraction * 160} className="probability-gridline" />)}
    {distribution.map((chance, k) => { const height = chance === 0 ? 0 : Math.max(1, (chance / maximum) * 160); return <rect key={k} x={20 + k * column + column * 0.1} y={190 - height} width={column * 0.8} height={height} className={k === parameters.k ? 'probability-bar selected' : 'probability-bar'} />; })}
    <path d={`M ${center(parameters.k) - 5} 202 L ${center(parameters.k)} 194 L ${center(parameters.k) + 5} 202 Z`} className="probability-selection-marker" />
  </svg><div className="probability-axis-labels">{tickValues.map(k => <span key={k} style={{ left: `${(center(k) / 640) * 100}%` }}>{k}</span>)}</div></div>;
}

export default function ProbabilityStudent({ lesson, compact = false, titleLevel = 2 }: { lesson: ProbabilityLesson; compact?: boolean; titleLevel?: 1 | 2 }) {
  const Title = titleLevel === 1 ? 'h1' : 'h2';
  const prefix = `probability-${useId().replace(/:/g, '')}`;
  const [values, setValues] = useState(lesson.parameters);
  const [drafts, setDrafts] = useState(draftsFor(lesson.parameters));
  const [errors, setErrors] = useState(emptyErrors);
  const [predictionOpen, setPredictionOpen] = useState(false);
  const [resetCount, setResetCount] = useState(0);
  const [notice, setNotice] = useState('');
  const [clampNotice, setClampNotice] = useState('');
  useEffect(() => {
    setValues(lesson.parameters); setDrafts(draftsFor(lesson.parameters)); setErrors(emptyErrors());
    setPredictionOpen(false); setNotice(''); setClampNotice('');
  }, [lesson.parameters.n, lesson.parameters.p, lesson.parameters.k, compact]);
  const distribution = probabilityDistribution(values);
  const chance = probabilityMass(values);
  const expected = expectedSuccesses(values);
  const explorationKey = `${values.n}:${values.p}:${values.k}`;
  const lastAnnounced = useRef(explorationKey);
  useEffect(() => {
    if (compact || lastAnnounced.current === explorationKey) return;
    const timer = window.setTimeout(() => { lastAnnounced.current = explorationKey; setNotice(`For ${values.n} trials with success chance ${formatProbabilityNumber(values.p)}, the chance of exactly ${values.k} successes is ${formatProbabilityNumber(chance)}, or ${formatProbabilityPercent(chance)}. Expected successes ${formatProbabilityNumber(expected)}.`); }, 500);
    return () => window.clearTimeout(timer);
  }, [explorationKey, compact]);
  function update(key: ProbabilityKey, raw: string) {
    setDrafts(previous => ({ ...previous, [key]: raw }));
    const parsed = parseProbabilityValue(raw, key, values.n);
    setErrors(previous => ({ ...previous, [key]: parsed.error ?? '' }));
    if (parsed.value === undefined || parsed.error) return;
    const next = { ...values, [key]: parsed.value };
    if (key === 'n' && next.k > next.n) {
      const previousK = next.k; next.k = next.n;
      setDrafts(previous => ({ ...previous, k: String(next.k) })); setErrors(previous => ({ ...previous, k: '' }));
      const message = `Trials decreased to ${next.n}. The explored success count changed from ${previousK} to ${next.k} so it stays within the trial count. Your confirmed teacher lesson is unchanged.`;
      setClampNotice(message); setNotice(message);
    } else { setClampNotice(''); setNotice(''); }
    setValues(next);
  }
  function reset() {
    setValues(lesson.parameters); setDrafts(draftsFor(lesson.parameters)); setErrors(emptyErrors());
    setPredictionOpen(false); setClampNotice(''); setResetCount(previous => previous + 1); setNotice('Original binomial values restored. Practice answers cleared.');
  }
  function control(key: ProbabilityKey) {
    const min = key === 'n' ? 1 : 0, max = key === 'n' ? 30 : key === 'p' ? 1 : values.n;
    const step = key === 'p' ? 0.01 : 1;
    const id = `${prefix}-${key}`;
    return <section className={'probability-control probability-control-' + key} key={key} aria-labelledby={`${id}-heading`}><div className="coefficient-top"><div><h3 id={`${id}-heading`}><span className="coefficient-symbol">{key}</span>{labels[key]}</h3>{key === 'p' && <p>Use a decimal between 0 and 1, not a percentage.</p>}</div><div className="numeric-wrap"><label className="sr-only" htmlFor={`${id}-number`}>{labels[key]} value</label><input id={`${id}-number`} data-testid={`probability-${key}-input`} type="text" inputMode={key === 'p' ? 'decimal' : 'numeric'} autoComplete="off" spellCheck={false} maxLength={24} value={drafts[key]} aria-invalid={Boolean(errors[key])} aria-describedby={`${id}-hint ${id}-error`} onChange={event => update(key, event.target.value)} /></div></div><label className="sr-only" htmlFor={`${id}-slider`}>{labels[key]} slider</label><input id={`${id}-slider`} className="value-slider" data-testid={`probability-${key}-slider`} type="range" min={min} max={max} step={step} value={values[key]} aria-describedby={`${id}-hint`} onChange={event => update(key, event.target.value)} /><div className="slider-hints" id={`${id}-hint`}><span>{min}</span><span>{key === 'p' ? 'Arrow keys or a decimal · up to 2 decimals' : 'Arrow keys or a whole number'}</span><span>{max}</span></div><p id={`${id}-error`} className="input-error" role="status">{errors[key] && <>{errors[key]} The lesson keeps the last valid values.</>}</p></section>;
  }
  return <article className={'lesson-shell student-lesson probability-lesson' + (compact ? ' compact-lesson' : '')} aria-label={lesson.title.trim() || 'Interactive binomial lesson'}>
    <div className="lesson-heading"><div><p className="eyebrow">Probability / binomial outcomes</p><Title className="lesson-title">{lesson.title.trim() || 'A chance for every outcome'}</Title><p className="lead">{compact ? 'Confirmed trials, success chance, and chosen outcome.' : 'Change a chance. See how the outcomes shift.'}</p></div></div>
    <section className="prediction" aria-labelledby={`${prefix}-prediction-heading`}><div className="prediction-icon" aria-hidden="true">?</div><div><h2 id={`${prefix}-prediction-heading`}>First, make a prediction</h2><p>If you increase p, must the chance of exactly k successes increase?</p><p id={`${prefix}-prediction-answer`} className="prediction-answer" hidden={!predictionOpen}>No. With a fixed trial count, increasing p shifts probability toward larger success counts. The chance of zero successes decreases, and the chance of all successes increases. For a count between them, the chance rises to a peak and then falls. Check the highlighted outcome rather than assuming every bar rises.</p></div><button className="quiet-button" aria-expanded={predictionOpen} aria-controls={`${prefix}-prediction-answer`} onClick={() => setPredictionOpen(previous => !previous)}>{predictionOpen ? 'Hide explanation' : 'Reveal explanation'}<span aria-hidden="true">{predictionOpen ? '−' : '+'}</span></button></section>
    <section className="workbench probability-workbench" aria-labelledby={`${prefix}-explore-heading`}><div className="workbench-heading"><div><p className="eyebrow">Explore the relationship</p><h2 id={`${prefix}-explore-heading`}>One experiment. Every possible count.</h2></div>{!compact && <button className="reset-button" onClick={reset}>Reset lesson</button>}</div>
      {!compact && <div className="probability-controls">{keys.map(control)}{clampNotice && <p className="probability-clamp-notice">{clampNotice}</p>}</div>}
      <div className="probability-readout"><div><span>Chance of exactly {values.k} successes</span><strong className="intercept-color" data-testid="probability-chance">{formatProbabilityNumber(chance)}</strong><span className="probability-percent" data-testid="probability-percent">{formatProbabilityPercent(chance)}</span></div><div><span>Expected success count np</span><strong className="slope-color" data-testid="probability-expected">{formatProbabilityNumber(expected)}</strong><span className="probability-readout-help">An average across repetitions; it can be fractional.</span></div></div>
      <figure className="graph-panel probability-figure" aria-labelledby={`${prefix}-chart-title`} aria-describedby={`${prefix}-chart-description`}><figcaption id={`${prefix}-chart-title`} className="panel-label">The picture <span>success counts 0 through {values.n}</span></figcaption><Distribution parameters={values} distribution={distribution} /><div className="graph-legend"><span><span className="key-dot probability-distribution-dot" />Other success counts</span><span><span className="key-dot intercept-dot" />Chosen count k = {values.k}</span></div><p className="table-note" id={`${prefix}-chart-description`}>Bar height shows probability on a shared scale from 0 to {formatProbabilityNumber(Math.max(...distribution))}. The scale adjusts when n or p changes. Very small positive bars use a minimum visible height; their precise displayed chances are in the table. Zero probability has no bar height. No random trials are simulated.</p></figure>
      <section className="probability-table-panel" aria-labelledby={`${prefix}-table-heading`}><h3 id={`${prefix}-table-heading`} className="panel-label">Every outcome <span>decimal chance and percentage</span></h3><table><caption className="sr-only">Binomial probabilities for {values.n} independent trials with constant success chance {formatProbabilityNumber(values.p)}</caption><thead><tr><th scope="col">Successes</th><th scope="col">P(X = count)</th><th scope="col">Percent</th></tr></thead><tbody>{distribution.map((probability, k) => <tr key={k} className={k === values.k ? 'probability-selected-row' : ''}><th scope="row">{k}{k === values.k && <span className="sr-only">, chosen outcome</span>}</th><td data-testid={`probability-mass-${k}`}>{formatProbabilityNumber(probability)}</td><td>{formatProbabilityPercent(probability)}</td></tr>)}</tbody></table></section>
    </section>
    <section className="explanation" aria-labelledby={`${prefix}-explain-heading`}><div><p className="eyebrow">Make the connection</p><h2 id={`${prefix}-explain-heading`}>A binomial model needs four assumptions.</h2><ul className="probability-assumptions"><li>A fixed number of trials: n = {values.n}.</li><li>Two outcomes per trial: success or failure.</li><li>Trials are independent.</li><li>The success chance stays constant: p = {formatProbabilityNumber(values.p)}.</li></ul><p className="probability-formula" role="math" aria-label="Probability of X equals k is n choose k times p to the power k times one minus p to the power n minus k">P(X = k) = C(n, k) pᵏ (1 − p)ⁿ⁻ᵏ</p><p>C(n, k) counts the ways to choose k successes among n trials. With p = 0, only zero successes has probability 1; with p = 1, only n successes has probability 1. A tiny positive chance remains positive even when ordinary rounding would show zero.</p></div></section>
    {lesson.explanation && <section className="authored-explanation" aria-labelledby={`${prefix}-authored-heading`}><p className="eyebrow">Teacher explanation</p><h2 id={`${prefix}-authored-heading`}>Read the idea in words.</h2><p>{lesson.explanation}</p><p className="explanation-context">{lesson.explanationStale ? 'This explanation needs an update for the current notes or parameters.' : `This explanation describes the original n = ${lesson.parameters.n}, p = ${formatProbabilityNumber(lesson.parameters.p)}, k = ${lesson.parameters.k}. Student exploration does not rewrite it.`}</p></section>}
    <Practice questions={probabilityPracticeQuestions(values)} context={compact ? 'Questions use these confirmed binomial values. Enter chances as decimals from 0 to 1, not percentages.' : 'Questions follow the current explored values. Enter chances as decimals from 0 to 1, not percentages. Changing values or resetting clears answers. Very small positive chances can round to 0 under the practice tolerance; the main display still shows them as positive.'} compact={compact} key={`${explorationKey}:${resetCount}`} />
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{notice}</div><footer className="lesson-footer"><span>{compact ? 'Preview updates when you confirm values.' : 'Exploration changes stay in this preview.'}</span><span>Original: n = {lesson.parameters.n}, p = {formatProbabilityNumber(lesson.parameters.p)}, k = {lesson.parameters.k}</span></footer>
  </article>;
}
