import { useEffect, useId, useRef, useState } from 'react';
import type { StatisticsLesson } from './lesson';
import { parseStatisticValue, statisticsSummary, statisticsPracticeQuestions, formatStatisticsNumber } from './statistics';
import Practice from './Practice.tsx';
import './statistics.css';

function DotPlot({ values }: { values: number[] }) {
  const summary = statisticsSummary({ values });
  const padding = Math.max(0.02, summary.range * 0.12);
  const low = summary.min - padding, high = summary.max + padding;
  const position = (value: number) => 28 + ((value - low) / (high - low)) * 584;
  const seen = new Map<number, number>();
  const dots = values.map((value, index) => { const level = seen.get(value) ?? 0; seen.set(value, level + 1); return { value, index, level }; });
  const maxStack = Math.max(...seen.values());
  const axisY = Math.max(64, maxStack * 16 + 12) + 16;
  const plotHeight = axisY + 42;
  return <div className="statistics-dotplot" aria-hidden="true">
    <svg viewBox={`0 0 640 ${plotHeight}`} focusable="false">
      {[low, (low + high) / 2, high].map((value, index) => <line key={index} x1={position(value)} x2={position(value)} y1="12" y2={axisY} className="statistics-gridline" />)}
      <line x1="28" x2="612" y1={axisY} y2={axisY} className="statistics-axis" />
      <line x1={position(summary.mean)} x2={position(summary.mean)} y1="12" y2={axisY + 12} className="statistics-mean-line" />
      <path d={`M ${position(summary.mean) - 7} ${axisY + 19} L ${position(summary.mean)} ${axisY + 9} L ${position(summary.mean) + 7} ${axisY + 19} Z`} className="statistics-mean-arrow" />
      <line x1={position(summary.median)} x2={position(summary.median)} y1="12" y2={axisY} className="statistics-median-line" />
      <path d={`M ${position(summary.median) - 7} ${axisY + 29} L ${position(summary.median)} ${axisY + 19} L ${position(summary.median) + 7} ${axisY + 29} Z`} className="statistics-median-arrow" />
      {dots.map(dot => <circle key={dot.index} cx={position(dot.value)} cy={axisY - 16 - dot.level * 16} r="6.5" className="statistics-dot" />)}
    </svg>
    <div className="statistics-axis-labels"><span>{formatStatisticsNumber(low)}</span><span>{formatStatisticsNumber((low + high) / 2)}</span><span>{formatStatisticsNumber(high)}</span></div>
  </div>;
}

export default function StatisticsStudent({ lesson, compact = false, titleLevel = 2 }: { lesson: StatisticsLesson; compact?: boolean; titleLevel?: 1 | 2 }) {
  const Title = titleLevel === 1 ? 'h1' : 'h2';
  const prefix = `statistics-${useId().replace(/:/g, '')}`;
  const [values, setValues] = useState(() => [...lesson.parameters.values]);
  const [selected, setSelected] = useState(0);
  const [draft, setDraft] = useState(String(lesson.parameters.values[0]));
  const [error, setError] = useState('');
  const [predictionOpen, setPredictionOpen] = useState(false);
  const [resetCount, setResetCount] = useState(0);
  const [notice, setNotice] = useState('');
  const originalKey = lesson.parameters.values.join(',');
  useEffect(() => {
    setValues([...lesson.parameters.values]); setSelected(0); setDraft(String(lesson.parameters.values[0]));
    setError(''); setPredictionOpen(false); setNotice('');
  }, [originalKey, compact]);
  const summary = statisticsSummary({ values });
  const original = statisticsSummary(lesson.parameters);
  const exploredKey = values.join(',');
  const lastAnnounced = useRef(exploredKey);
  useEffect(() => {
    if (compact || lastAnnounced.current === exploredKey) return;
    const timer = window.setTimeout(() => {
      lastAnnounced.current = exploredKey;
      setNotice(`Dataset updated. Mean ${formatStatisticsNumber(summary.mean)}, median ${formatStatisticsNumber(summary.median)}, range ${formatStatisticsNumber(summary.range)}, population standard deviation ${formatStatisticsNumber(summary.populationStdDev)}.`);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [exploredKey, compact]);
  function selectValue(raw: string) {
    const index = Number(raw);
    if (!Number.isInteger(index) || index < 0 || index >= values.length) return;
    setSelected(index); setDraft(String(values[index])); setError('');
  }
  function updateValue(raw: string) {
    setDraft(raw);
    const parsed = parseStatisticValue(raw);
    setError(parsed.error ?? '');
    if (parsed.value !== undefined && !parsed.error) { setValues(previous => previous.map((value, index) => index === selected ? parsed.value! : value)); setNotice(''); }
  }
  function reset() {
    setValues([...lesson.parameters.values]); setSelected(0); setDraft(String(lesson.parameters.values[0]));
    setError(''); setPredictionOpen(false); setResetCount(previous => previous + 1); setNotice('Original dataset restored. Practice answers cleared.');
  }
  const practiceContext = compact ? 'Questions use this confirmed dataset. Confirming different values clears your answers.' : 'Questions follow your currently explored dataset. Changing a value or resetting clears your answers.';
  return <article className={'lesson-shell student-lesson statistics-lesson' + (compact ? ' compact-lesson' : '')} aria-label={lesson.title.trim() || 'Interactive statistics lesson'}>
    <div className="lesson-heading"><div><p className="eyebrow">Statistics / a changing dataset</p><Title className="lesson-title">{lesson.title.trim() || 'One value. A different picture.'}</Title><p className="lead">{compact ? 'One dataset, connected to its measures and picture.' : 'Change one value. Compare the centre and spread.'}</p></div></div>
    <section className="prediction" aria-labelledby={`${prefix}-prediction-heading`}><div className="prediction-icon" aria-hidden="true">?</div><div><h2 id={`${prefix}-prediction-heading`}>First, make a prediction</h2><p>If you move one value, will the mean and median change by the same amount?</p><p id={`${prefix}-prediction-answer`} className="prediction-answer" hidden={!predictionOpen}>It depends on the values and their order. Compared with the original lesson dataset, the mean changed by {formatStatisticsNumber(summary.mean - original.mean)}, and the median changed by {formatStatisticsNumber(summary.median - original.median)}. The mean uses every value; the median comes from the middle of the sorted values. A distant value is not automatically classified as an outlier here.</p></div><button className="quiet-button" aria-expanded={predictionOpen} aria-controls={`${prefix}-prediction-answer`} onClick={() => setPredictionOpen(previous => !previous)}>{predictionOpen ? 'Hide explanation' : 'Reveal explanation'}<span aria-hidden="true">{predictionOpen ? '−' : '+'}</span></button></section>
    <section className="workbench statistics-workbench" aria-labelledby={`${prefix}-explore-heading`}><div className="workbench-heading"><div><p className="eyebrow">Explore the relationship</p><h2 id={`${prefix}-explore-heading`}>The same data. Several ways to read it.</h2></div>{!compact && <button className="reset-button" onClick={reset}>Reset lesson</button>}</div>
      {!compact && <section className="statistics-value-control" aria-labelledby={`${prefix}-control-heading`}><h3 id={`${prefix}-control-heading`}>Choose a value to explore</h3><div className="statistics-edit-fields"><div><label htmlFor={`${prefix}-selected`}>Value in the original order</label><select id={`${prefix}-selected`} data-testid="statistics-selected" value={selected} onChange={event => selectValue(event.target.value)}>{values.map((value, index) => <option key={index} value={index}>Value {index + 1}: {formatStatisticsNumber(value)}</option>)}</select></div><div><label htmlFor={`${prefix}-number`}>New value</label><input id={`${prefix}-number`} data-testid="statistics-value-input" type="text" inputMode="decimal" autoComplete="off" spellCheck={false} maxLength={24} value={draft} aria-invalid={Boolean(error)} aria-describedby={`${prefix}-hint ${prefix}-error`} onChange={event => updateValue(event.target.value)} /></div></div><label className="sr-only" htmlFor={`${prefix}-slider`}>Selected value slider</label><input id={`${prefix}-slider`} data-testid="statistics-value-slider" className="value-slider" type="range" min={-100} max={100} step="0.01" value={values[selected]} aria-describedby={`${prefix}-hint`} onChange={event => updateValue(event.target.value)} /><div className="slider-hints" id={`${prefix}-hint`}><span>−100</span><span>Arrow keys or a decimal value · up to 2 decimals</span><span>100</span></div><p className="statistics-selected-context">Value {selected + 1}: original {(lesson.parameters.values[selected] === undefined ? '—' : formatStatisticsNumber(lesson.parameters.values[selected]))}, explored {formatStatisticsNumber(values[selected])}. The other values keep their current explored values.</p><p id={`${prefix}-error`} className="input-error" role="status">{error && <>{error} The dataset keeps the last valid value.</>}</p></section>}
      <figure className="graph-panel statistics-figure" aria-labelledby={`${prefix}-plot-title`} aria-describedby={`${prefix}-plot-description`}><figcaption id={`${prefix}-plot-title`} className="panel-label">The picture <span>one dot per value</span></figcaption><DotPlot values={values} /><div className="graph-legend"><span><span className="key-dot statistics-data-dot" />Dataset values</span><span><span className="statistics-legend-line statistics-mean-key" />Mean μ</span><span><span className="statistics-legend-line statistics-median-key" />Median</span></div><p className="table-note" id={`${prefix}-plot-description`}>Equal values stack vertically. The solid teal marker is the mean; the dashed rust marker is the median. Both use the same horizontal scale. The axis adjusts to the current dataset; the table lists every value.</p></figure>
      <div className="statistics-summary" aria-label="Current dataset summary"><div><span>Mean μ</span><strong className="slope-color" data-testid="statistics-mean">{formatStatisticsNumber(summary.mean)}</strong></div><div><span>Median</span><strong className="intercept-color" data-testid="statistics-median">{formatStatisticsNumber(summary.median)}</strong></div><div><span>Range · maximum − minimum</span><strong data-testid="statistics-range">{formatStatisticsNumber(summary.range)}</strong></div><div><span>Population standard deviation σ</span><strong data-testid="statistics-stddev">{formatStatisticsNumber(summary.populationStdDev)}</strong></div></div>
      <p className="statistics-summary-note">{summary.count} values · minimum {formatStatisticsNumber(summary.min)} · maximum {formatStatisticsNumber(summary.max)}. Calculated summaries are displayed to up to 6 decimal places; repeating or irrational results are rounded.</p>
      <section className="statistics-table-panel" aria-labelledby={`${prefix}-table-heading`}><h3 id={`${prefix}-table-heading`} className="panel-label">Every value <span>original order · current exploration</span></h3><table><caption className="sr-only">Current dataset, {summary.count} values in original order</caption><thead><tr><th scope="col">Position</th><th scope="col">Value</th></tr></thead><tbody>{values.map((value, index) => <tr key={index} className={index === selected && !compact ? 'statistics-selected-row' : ''}><th scope="row">{index + 1}</th><td data-testid={`statistics-data-${index}`}>{formatStatisticsNumber(value)}</td></tr>)}</tbody></table></section>
    </section>
    <section className="explanation" aria-labelledby={`${prefix}-explain-heading`}><div><p className="eyebrow">Make the connection</p><h2 id={`${prefix}-explain-heading`}>Centre and spread describe different things.</h2><p>The mean is the sum divided by N = {summary.count}. The median is the middle of the sorted dataset (or the mean of its two middle values). The range is maximum minus minimum. Population standard deviation uses all N values in the denominator.</p><p className="statistics-population-formula" role="math" aria-label="Population standard deviation sigma equals the square root of the sum of squared differences from the mean divided by N">σ = √(Σ(xᵢ − μ)² / N)</p><p>This lesson treats the dataset as the whole population and uses N, not the sample formula with N − 1. {summary.range === 0 ? 'All values are equal: mean and median coincide, and both range and population standard deviation are zero.' : 'The population standard deviation measures spread around the mean; it is not an automatic outlier rule.'}</p></div></section>
    {lesson.explanation && <section className="authored-explanation" aria-labelledby={`${prefix}-authored-heading`}><p className="eyebrow">Teacher explanation</p><h2 id={`${prefix}-authored-heading`}>Read the idea in words.</h2><p>{lesson.explanation}</p><p className="explanation-context">{lesson.explanationStale ? 'This explanation needs an update for the current notes or dataset.' : `This explanation describes the original confirmed dataset of ${lesson.parameters.values.length} values. Student exploration does not rewrite it.`}</p></section>}
    <Practice questions={statisticsPracticeQuestions({ values })} context={practiceContext} compact={compact} key={`${values.join(',')}:${resetCount}`} />
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{notice}</div><footer className="lesson-footer"><span>{compact ? 'Preview updates when you confirm the dataset.' : 'Exploration changes stay in this preview.'}</span><span>Original dataset: {lesson.parameters.values.length} values</span></footer>
  </article>;
}
