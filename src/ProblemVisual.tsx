import { lazy,Suspense,useId } from 'react';
import type { Problem } from './problem';
import { explorationModel } from './exploration';
import { equationText } from './math';
import { quadraticText,derivativeText,tangentText,formatCalculusNumber } from './calculus';
import { formatStatisticsNumber } from './statistics';
import { formatProbabilityNumber,formatProbabilityPercent } from './probability';
import './problem-visual.css';
import BasicVisual from './BasicVisual';
const LinearGraph=lazy(()=>import('./LinearQuestionGraph'));
const CalculusGraph=lazy(()=>import('./CalculusGraph'));
const number=(value:number)=>String(Number(value.toPrecision(9))).replace('-','−');
export default function ProblemVisual({problem}:{problem:Problem}) {
  const model=explorationModel(problem),id=`problem-visual-${useId().replace(/:/g,'')}`;
  if(model.kind==='basic')return <BasicVisual problem={model.problem}/>;
  return <section className="problem-visual" aria-labelledby={`${id}-title`}>
    <div className="problem-visual-heading"><p className="eyebrow">Same current question</p><h2 id={`${id}-title`}>See the mathematics</h2><p>The picture and numbers follow the values used in your worked solution.</p></div>
    {model.kind==='linear'&&<>
      <p className="pv-formula">{equationText(model.m,model.b)}{model.target!==undefined&&<> · target y = {number(model.target)}</>}</p>
      <div className="pv-graph"><Suspense fallback={<p role="status">Loading the graph…</p>}><LinearGraph model={model}/></Suspense></div>
      <p className="pv-legend"><span>Teal: current line</span>{model.target!==undefined&&<span>Dashed orange: target</span>}{model.point&&<span>Blue: {model.status==='unique'?'intersection':'evaluation point'}</span>}</p>
      <p className="pv-fact" data-testid="visual-linear-result">{model.point?`${model.status==='unique'?'Intersection':'Evaluation point'}: (${number(model.point.x)}, ${number(model.point.y)}). Coordinates shown as decimal approximations when necessary.`:model.status==='infinite'?'The line and target coincide. Every real x is a solution; there is no unique intersection.':'The line and target are parallel and distinct. No solution; no intersection point exists.'}</p>
      <p className="pv-note">The axes adapt to include the origin and current point. x: {number(model.bounds[0])} to {number(model.bounds[2])}; y: {number(model.bounds[3])} to {number(model.bounds[1])}. Scale may change when you edit values.</p>
      <div className="pv-table-wrap" tabIndex={0} role="region" aria-label="Current numeric values"><table><caption>Current line values · displayed decimals</caption><thead><tr><th>x</th><th>y</th></tr></thead><tbody>{model.table.map((row,index)=><tr key={index}><td>{number(row.x)}</td><td>{number(row.y)}</td></tr>)}</tbody></table></div>
    </>}
    {model.kind==='calculus'&&<>
      <div className="pv-facts"><p>{quadraticText(model.parameters)}</p><p>{derivativeText(model.parameters)}</p><p>{tangentText(model.parameters)}</p></div>
      <div className="pv-graph"><Suspense fallback={<p role="status">Loading the curve…</p>}><CalculusGraph parameters={model.parameters}/></Suspense></div>
      <p className="pv-legend"><span>Teal: function</span><span>Dashed orange: tangent</span><span>Blue: evaluation point</span></p>
      <p className="pv-fact">Point ({formatCalculusNumber(model.point.x)}, {formatCalculusNumber(model.point.y)}); local slope {formatCalculusNumber(model.slope)}.</p>
      <p className="pv-note">Curve window: x −4 to 4; vertical bounds adapt to coefficients. Tangent sections can lie outside the frame. The nearby table gives their values; clipping does not change the mathematics.</p>
      <div className="pv-table-wrap" tabIndex={0} role="region" aria-label="Current numeric values"><table><caption>Nearby function and tangent values</caption><thead><tr><th>x</th><th>f(x)</th><th>T(x)</th></tr></thead><tbody>{model.table.map(row=><tr key={row.x}><td>{formatCalculusNumber(row.x)}</td><td>{formatCalculusNumber(row.y)}</td><td>{formatCalculusNumber(row.tangent)}</td></tr>)}</tbody></table></div>
    </>}
    {model.kind==='statistics'&&(()=>{
      const position=(v:number)=>28+(v-model.axis.low)/(model.axis.high-model.axis.low)*584,axisY=Math.max(80,model.maxStack*16+28),height=axisY+42,s=model.summary;
      return <><figure><figcaption>One dot per observation; repeated values stack.</figcaption><svg className="pv-dots" viewBox={`0 0 640 ${height}`} aria-hidden="true" focusable="false"><line x1="28" x2="612" y1={axisY} y2={axisY} className="pv-axis"/><line x1={position(s.mean)} x2={position(s.mean)} y1="12" y2={axisY+12} className="pv-mean"/><line x1={position(s.median)} x2={position(s.median)} y1="12" y2={axisY+24} className="pv-median"/>{model.dots.map(dot=><circle key={dot.index} cx={position(dot.value)} cy={axisY-16-dot.level*16} r="6" className="pv-dot"/>)}</svg><div className="pv-axis-labels"><span>{formatStatisticsNumber(model.axis.low)}</span><span>{formatStatisticsNumber((model.axis.low+model.axis.high)/2)}</span><span>{formatStatisticsNumber(model.axis.high)}</span></div></figure>
      <p className="pv-legend"><span>Blue solid: mean</span><span>Orange dashed: median</span></p>
      <p className="pv-note">Plot context: these auxiliary summaries describe the current dataset. Your worked solution above answers only the requested operation.</p>
      <dl className="pv-summary">{[['Count',s.count],['Mean',s.mean],['Median',s.median],['Range',s.range],['Population SD',s.populationStdDev]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{formatStatisticsNumber(Number(value))}</dd></div>)}</dl>
      <p className="pv-note">Population spread divides by {s.count}, not N − 1. Summary decimals are rounded to at most six places. No automatic outlier rule is applied.</p>
      <div className="pv-table-wrap" tabIndex={0} role="region" aria-label="Current numeric values"><table><caption>All observations in original order</caption><thead><tr><th>Observation</th><th>Value</th></tr></thead><tbody>{model.values.map((v,i)=><tr key={i}><td>{i+1}</td><td>{formatStatisticsNumber(v)}</td></tr>)}</tbody></table></div></>;
    })()}
    {model.kind==='probability'&&<>
      <p className="pv-fact">n = {model.n}; p = {model.p}; expected successes = {formatProbabilityNumber(model.expected)}.{model.selectedK!==undefined&&` Selected event: exactly ${model.selectedK} ${model.selectedK===1?'success':'successes'}.`}</p>
      <figure><figcaption>Binomial outcomes · success count on the horizontal axis{model.selectedK!==undefined&&` · triangle marks chosen count ${model.selectedK}`}</figcaption><svg className="pv-bars" viewBox="0 0 640 210" preserveAspectRatio="none" aria-hidden="true" focusable="false"><line x1="24" x2="616" y1="190" y2="190" className="pv-axis"/>{model.distribution.map((chance,k)=>{const col=592/model.distribution.length,h=chance===0?0:Math.max(1,chance/model.maximum*160);return <rect key={k} x={24+k*col+col*.1} y={190-h} width={col*.8} height={h} className={k===model.selectedK?'pv-bar pv-selected':'pv-bar'}/>;})}{model.selectedK!==undefined&&(()=>{const center=24+(model.selectedK+.5)*592/model.distribution.length;return <path className="pv-chosen-marker" d={`M ${center-6} 203 L ${center} 193 L ${center+6} 203 Z`}/>;})()}</svg><div className="pv-probability-ticks" aria-hidden="true">{[...new Set([0,Math.floor(model.n/2),model.n])].map(k=><span key={k} style={{left:`${(24+(k+.5)*592/model.distribution.length)/640*100}%`}}>{k}</span>)}</div></figure>
      <p className="pv-note">Bars are scaled relative to the largest probability ({formatProbabilityNumber(model.maximum)}). Tiny positive bars have a minimum visible height; exact zero has none. The table gives each probability; decimals and percentages are approximate. Fixed trials, independent outcomes, two outcomes per trial, constant p.</p>
      <div className="pv-table-wrap" tabIndex={0} role="region" aria-label="Current numeric values"><table><caption>Every possible success count</caption><thead><tr><th>Successes</th><th>Probability</th><th>Percent</th></tr></thead><tbody>{model.distribution.map((chance,k)=><tr key={k} className={k===model.selectedK?'pv-selected-row':undefined}><td>{k}{k===model.selectedK?' (chosen)':''}</td><td>{formatProbabilityNumber(chance)}</td><td>{formatProbabilityPercent(chance)}</td></tr>)}</tbody></table></div>
    </>}
  </section>;
}

