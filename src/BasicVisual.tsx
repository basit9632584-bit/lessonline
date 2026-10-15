import { useId } from 'react';
import { basicDetails } from './basic-math.ts';
import type { BasicProblem } from './basic-math.ts';
import './basic-visual.css';
const decimal = (value: number) => String(Number(value.toPrecision(10))).replace('-', '−');
function ResultLine({ value }: { value: number }) {
  if (!Number.isFinite(value)) return <p className="bv-note">Use the exact result above; a finite decimal position is unavailable.</p>;
  const span = Math.abs(value) || 2;
  const low = Math.min(0, value) - span * .2, high = Math.max(0, value) + span * .2;
  const position = (number: number) => 28 + (number - low) / (high - low) * 584;
  return <figure className="bv-number-line"><figcaption>Result on a signed number line</figcaption><svg viewBox="0 0 640 90" aria-hidden="true" focusable="false"><line x1="28" x2="612" y1="46" y2="46" className="bv-axis"/><line x1={position(0)} x2={position(0)} y1="30" y2="62" className="bv-zero"/><line x1={position(0)} x2={position(value)} y1="46" y2="46" className="bv-result-segment"/><circle cx={position(value)} cy="46" r="7" className="bv-result-dot"/></svg><div className="bv-axis-labels"><span>{decimal(low)}</span><span>{decimal(high)}</span></div><p className="bv-note">Blue point: result {decimal(value)}. Vertical tick: zero{value === 0 ? ' (the point and tick coincide)' : ''}. The displayed interval adapts to the result; endpoint labels and positions use decimal approximations.</p></figure>;
}
export default function BasicVisual({ problem }: { problem: BasicProblem }) {
  const details = basicDetails(problem), id = `basic-visual-${useId().replace(/:/g, '')}`;
  const isPercent = problem.task === 'basic.percent-of' || problem.task === 'basic.percent-increase' || problem.task === 'basic.percent-decrease';
  return <section className="problem-visual basic-visual" aria-labelledby={`${id}-title`}>
    <header className="bv-heading"><p className="bv-eyebrow">SAME CURRENT QUESTION</p><h2 id={`${id}-title`}>See the calculation</h2><p>The picture and table use the values in your current worked solution.</p></header>
    {problem.task === 'basic.arithmetic' && <><div className="bv-calculation"><div><span className="bv-label">Expression</span><p>{problem.parameters.expression}</p></div><span className="bv-equals" aria-hidden="true">=</span><div className="bv-exact"><span className="bv-label">Exact result</span><p>{details.exact}</p></div></div><p className="bv-note">The worked steps give the order of operations. The number line places the final result; it does not represent each intermediate operation.</p><ResultLine value={details.numericResult}/></>}
    {problem.task === 'basic.fraction-simplify' && <><div className="bv-calculation"><div><span className="bv-label">Original fraction</span><div className="bv-fraction" aria-hidden="true"><span>{problem.parameters.numerator}</span><span>{problem.parameters.denominator}</span></div><span className="bv-sr-only">{problem.parameters.numerator} divided by {problem.parameters.denominator}</span></div><span className="bv-equals" aria-hidden="true">=</span><div className="bv-exact"><span className="bv-label">Reduced form · same value</span><p>{details.exact}</p></div></div><p className="bv-note">Simplifying changes the representation, not the quantity. Negative denominators, zero numerators and improper fractions use the same signed number line.</p><ResultLine value={details.numericResult}/></>}
    {isPercent && (() => {
      const p = problem.parameters as { amount: number; rate: number };
      const change = p.amount * (p.rate / 100);
      const increased = problem.task === 'basic.percent-increase', decreased = problem.task === 'basic.percent-decrease';
      const scale = increased ? p.amount + change : p.amount;
      const width = (value: number) => scale === 0 ? 0 : value / scale * 584;
      const first = decreased ? p.amount * (1 - p.rate / 100) : increased ? p.amount : change;
      const second = decreased || increased ? change : p.amount * (1 - p.rate / 100);
      const firstLabel = decreased ? 'Retained amount' : increased ? 'Original amount' : 'Requested portion';
      const secondLabel = decreased ? 'Removed portion' : increased ? 'Added portion' : 'Remaining portion';
      return <figure className="bv-percent"><figcaption>{increased ? 'Original amount and added portion' : decreased ? 'Original amount split into retained and removed portions' : 'Original amount split by the requested percentage'}</figcaption><p className="bv-label">Original amount: {p.amount} · rate: {p.rate}%</p><svg viewBox="0 0 640 110" aria-hidden="true" focusable="false"><defs><pattern id={`${id}-hatch`} width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#FFF2E9"/><path d="M -2 2 L 2 -2 M 0 8 L 8 0 M 6 10 L 10 6" stroke="#A84616" strokeWidth="2"/></pattern></defs><line x1="28" x2="612" y1="36" y2="36" className="bv-axis"/><rect x="28" y="22" width={width(p.amount)} height="28" rx="2" className="bv-reference"/><line x1="28" x2="612" y1="88" y2="88" className="bv-axis"/><rect x="28" y="74" width={width(first)} height="28" className="bv-portion"/><rect x={28 + width(first)} y="74" width={width(second)} height="28" fill={`url(#${id}-hatch)`}/></svg><div className="bv-percent-labels"><p><span className="bv-swatch bv-reference-swatch" aria-hidden="true"/>Top bar · original amount: {p.amount}</p><p><span className="bv-swatch bv-portion-swatch" aria-hidden="true"/>Bottom solid · {firstLabel.toLowerCase()}: {decimal(first)}</p><p><span className="bv-swatch bv-hatch-swatch" aria-hidden="true"/>Bottom hatched · {secondLabel.toLowerCase()}: {decimal(second)}</p></div><p className="bv-note">{p.amount === 0 ? 'The amount is zero, so every portion is zero; no quantity bars are drawn. ' : ''}{increased ? 'Both rows share a scale ending at the increased amount.' : 'Both rows share a scale ending at the original amount.'} Shared bar scale: 0 to {decimal(scale)}. Zero portions have no bar width. Bar lengths and portion labels use decimal approximations; the exact requested answer is {details.exact}.</p></figure>;
    })()}
    {problem.task === 'basic.power' && <><div className="bv-power"><p className="bv-label">{problem.parameters.exponent === 0 ? 'Zero exponent · empty product' : `${problem.parameters.exponent} ${problem.parameters.exponent === 1 ? 'factor' : 'factors'} of ${problem.parameters.base}`}</p>{problem.parameters.exponent === 0 ? <p className="bv-power-zero">A nonzero base to the power zero is 1. No multiplication factors are needed.</p> : <div className="bv-factors" role="group" aria-label="Repeated multiplication">{Array.from({ length: problem.parameters.exponent }, (_,index) => <span className="bv-factor-pair" key={index}>{index > 0 && <span className="bv-times" aria-hidden="true">×</span>}<span className="bv-factor">{problem.parameters.base < 0 ? `(${problem.parameters.base})` : problem.parameters.base}</span></span>)}</div>}<div className="bv-power-answer"><span className="bv-label">Exact result</span><p>{details.exact}</p></div></div><p className="bv-note">Each factor keeps its sign. The table gives the actual calculation values; the number line places the final result.</p><ResultLine value={details.numericResult}/></>}
    <p className="bv-answer-text"><strong>Exact requested answer:</strong> {details.exact}{details.approximation && <> · Decimal approximation: {details.approximation}</>}</p>
    <div className="bv-table-wrap" tabIndex={0} role="region" aria-label="Current calculation values"><table><caption>Current calculation values</caption><thead><tr><th scope="col">Quantity</th><th scope="col">Value</th></tr></thead><tbody>{details.table.map((row,index) => <tr key={index}><th scope="row">{row.label}</th><td>{row.value}</td></tr>)}</tbody></table></div>
  </section>;
}




