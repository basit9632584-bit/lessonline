import {useEffect,useRef,useState} from 'react';
import type {Problem} from './problem';
import {family} from './question-state';
import './portable-solution.css';
export default function PortableSolution({originalProblems,currentProblems,source,disabled}:{originalProblems:Problem[];currentProblems:Problem[];source:string;disabled:boolean}){
 const [include,setInclude]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const identity=JSON.stringify({originalProblems,currentProblems,source,include,disabled}),latest=useRef(identity);latest.current=identity;
 const mounted=useRef(true),pending=useRef<AbortController|null>(null);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;latest.current='unmounted';pending.current?.abort();};},[]);
 async function download(){if(disabled||busy)return;const snapshot=identity;setBusy(true);setNotice('Preparing the portable worked solution…');const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 pending.current=controller;
 try{const {portableQuestion,makeQuestionHtml}=await import('./question-export');const data=portableQuestion(originalProblems,currentProblems,source,include);
 const [js,css,licenses]=await Promise.all(['question.js','question.css','licenses.txt'].map(async name=>{const response=await fetch(import.meta.env.BASE_URL+'portable/'+name,{signal:controller.signal});if(!response.ok)throw new Error('Portable files could not load. Rebuild the app and try again.');return response.text();}));
 if(!mounted.current||latest.current!==snapshot)throw new Error('The question, values or source-sharing choice changed. Download the current solution again.');
 const html=makeQuestionHtml(data,{js,css,licenses}),url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'})),anchor=document.createElement('a');anchor.href=url;anchor.download=`lessonline-${family(data.currentProblems[0].task)}-solution.html`;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);if(mounted.current)setNotice('Download started. Open the HTML file in a browser; the solution and exploration work without internet.');
 }catch(error){if(mounted.current)setNotice(error instanceof Error?error.message:'The portable solution could not be downloaded.');}finally{clearTimeout(timer);controller.abort();pending.current=null;if(mounted.current)setBusy(false);}}
 return <section className="portable-solution" aria-label="Save a portable worked solution"><h2>Keep this worked solution</h2><p>Download the current valid values, steps and picture. Reset in the file restores your original confirmed interpretation.</p><label><input type="checkbox" checked={include} onChange={e=>{setInclude(e.target.checked);latest.current='changed';setNotice('');}}/> Include the original question text</label><p className="portable-help">{include?'Anyone with the file can read the included question text. Images are never included.':'Question text stays private. Only confirmed structured mathematics and original/current values are included, including arithmetic expressions. Raw question text and images are excluded.'}</p>{disabled&&<p className="portable-help">Correct the exploration values or reset to original before downloading.</p>}<button type="button" disabled={disabled||busy} onClick={download}>{busy?'Preparing…':'Download worked solution'}</button><p role="status" className="portable-help">{notice}</p></section>;
}
