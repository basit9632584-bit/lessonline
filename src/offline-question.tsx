import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {parsePortableQuestion} from './question-export';
import type {PortableQuestion} from './question-export';
import {fields,labels as parameterLabels,draftsFor,candidates,boundsFor,taskHint} from './question-state';
import {formatProblem} from './problem';
import {solveProblem} from './solution';
import ProblemVisual from './ProblemVisual';
import SolutionSteps from './SolutionSteps';
import ExpressionNumbers from './ExpressionNumbers';
import './styles.css';import './questions.css';import './offline-question.css';
function OfflineQuestion({data}:{data:PortableQuestion}){
 const labels:Record<string,string>={...parameterLabels,b:data.originalProblems[0].task.startsWith('calculus.')?'Linear coefficient b':parameterLabels.b};
 const [current,setCurrent]=useState(data.currentProblems),[drafts,setDrafts]=useState<Record<string,string>>(()=>Object.assign({},...data.currentProblems.map(draftsFor))),[error,setError]=useState<string|null>(null);
 const tasks=data.originalProblems.map(p=>p.task),changed=JSON.stringify(current)!==JSON.stringify(data.originalProblems);
 function update(key:string,raw:string){const next={...drafts,[key]:raw};setDrafts(next);const candidate=candidates(tasks,next);setError(candidate.error);if(!candidate.error)setCurrent(candidate.problems);}
 function reset(){setCurrent(data.originalProblems);setDrafts(Object.assign({},...data.originalProblems.map(draftsFor)));setError(null);}
 let licenses='';try{licenses=JSON.parse(document.getElementById('question-licenses')?.textContent??'""');}catch{}
 const visual=current.find(p=>p.task==='probability.exactly-k')??current[0];
 return <><a className="skip-link" href="#portable-main">Skip to worked solution</a>
 <main className="question-app offline-question" id="portable-main" tabIndex={-1}>
  <header className="q-header"><span className="q-brand">lessonline<span>Portable worked solution</span></span></header>
  <h1>Follow the reasoning. Explore a variation.</h1><p>These worked steps use the values below. Compare them with your original question; this file cannot check its wording or an image.</p>
  <section className="q-exploration"><div className="q-explore-header"><h2>Current values</h2><button className="q-reset" type="button" onClick={reset}>Reset to original</button></div>
   <p className="q-helper">{changed?'Current variation of the confirmed interpretation.':'Original confirmed interpretation.'} Valid edits update all steps and visuals together.</p>
   <p>Original: {[...new Set(data.originalProblems.map(formatProblem))].join(' · ')}</p><p>Current: {[...new Set(current.map(formatProblem))].join(' · ')}</p>
   <div className="offline-controls">{fields(tasks).map(key=>{
    const hintId=`portable-${key}-hint`,describedBy=`${hintId} portable-validation`,bounds=boundsFor(key,current);
    const hint=key==='expression'?taskHint('basic.arithmetic'):key==='values'?'Enter 3–20 values from −100 to 100, with up to two decimal places, separated by commas or spaces.':`${bounds.min} to ${bounds.max}. ${bounds.step===1?'Whole numbers only.':'Up to two decimal places.'}${key==='p'?' Use a probability from 0 to 1, not a percent.':''}`;
    return <div key={key} className={key==='expression'?'basic-expression-field':undefined}><label htmlFor={`portable-${key}`}>{labels[key]}</label>
     {key==='expression'?<>
      <textarea id={`portable-${key}`} value={drafts[key]??''} aria-invalid={Boolean(error)} aria-describedby={describedBy} onChange={e=>update(key,e.target.value)}/>
      <ExpressionNumbers expression={current[0].task==='basic.arithmetic'?current[0].parameters.expression:''} disabled={Boolean(error)} onChange={raw=>update(key,raw)}/>
     </>:key==='values'?<textarea id={`portable-${key}`} value={drafts[key]??''} aria-invalid={Boolean(error)} aria-describedby={describedBy} onChange={e=>update(key,e.target.value)}/>:<>
      <input id={`portable-${key}`} type="text" inputMode={key==='n'||key==='k'?'numeric':'decimal'} value={drafts[key]??''} aria-invalid={Boolean(error)} aria-describedby={describedBy} onChange={e=>update(key,e.target.value)}/>
      <input type="range" aria-label={`Explore ${labels[key]}`} aria-describedby={describedBy} {...bounds} value={Number(Object.assign({},...current.map(p=>p.parameters))[key])} onChange={e=>update(key,e.target.value)}/></>}
     <p id={hintId} className="q-helper offline-field-hint">{hint}</p>
    </div>;
   })}</div>
   <p id="portable-validation" className={error?'q-explore-warning':'offline-validation'} role="status">{error&&<>{error} The steps and picture retain the last valid values. Correct the draft or reset.</>}</p>
  </section>
  <section aria-labelledby="portable-worked-heading"><h2 id="portable-worked-heading">Worked solution</h2>{current.map(p=><SolutionSteps key={p.task} solution={solveProblem(p)}/>)}</section>
  <ProblemVisual problem={visual}/><section className="offline-source"><h2>Original question context</h2>{data.sourceQuestion!==undefined?<><p>The author included this text explicitly. It is original context, not the recomputed current solution. No source image is included.</p><pre>{data.sourceQuestion}</pre></>:<p>Raw question text and images are not included. The file contains confirmed structured mathematics, including arithmetic expressions, and original/current values.</p>}</section>
  <details className="offline-licenses"><summary>Open-source license notices</summary><pre>{licenses}</pre></details>
 </main></>;
}
const root=document.getElementById('root'),data=parsePortableQuestion(document.getElementById('question-data')?.textContent??'');
if(root&&data)createRoot(root).render(<OfflineQuestion data={data}/>);else if(root)root.textContent='This worked solution file could not be read. Download a fresh copy from the question app.';
