import {taskIds,validateProblem} from './problem.ts';
import type {Problem,TaskId} from './problem.ts';
import {family,fields} from './question-state.ts';
export type PortableQuestion={version:1;kind:'worked-solution';originalProblems:Problem[];currentProblems:Problem[];sourceQuestion?:string};
function problems(value:unknown):Problem[]|null{
 if(!Array.isArray(value)||value.length<1||value.length>taskIds.length)return null;
 const result:Problem[]=[];const shared:Record<string,string>={};
 for(const item of value){
  if(!item||typeof item!=='object'||Object.keys(item).sort().join(',')!=='parameters,task'||!taskIds.includes(item.task)||validateProblem(item))return null;
  const task=item.task as TaskId,keys=fields([task]);if(task==='probability.expected'&&Object.hasOwn(item.parameters,'k'))keys.push('k');
  if(Object.keys(item.parameters).some(key=>!keys.includes(key))||keys.some(key=>!Object.hasOwn(item.parameters,key)))return null;
  if(result.some(problem=>problem.task===task)||result.length&&family(task)!==family(result[0].task))return null;
  for(const key of keys){const encoded=JSON.stringify(item.parameters[key]);if(shared[key]!==undefined&&shared[key]!==encoded)return null;shared[key]=encoded;}
  result.push({task,parameters:Object.fromEntries(keys.map(key=>[key,Array.isArray(item.parameters[key])?[...item.parameters[key]]:item.parameters[key]]))} as Problem);
 }
 return result;
}
export function parsePortableQuestion(raw:string):PortableQuestion|null{
 try{
  if(typeof raw!=='string'||raw.length>65536)return null;const value=JSON.parse(raw);
  if(!value||value.version!==1||value.kind!=='worked-solution'||Object.keys(value).some(key=>!['version','kind','originalProblems','currentProblems','sourceQuestion'].includes(key)))return null;
  const original=problems(value.originalProblems),current=problems(value.currentProblems);
  if(!original||!current||original.length!==current.length||original.some((p,i)=>p.task!==current[i].task))return null;
  if(Object.hasOwn(value,'sourceQuestion')&&(typeof value.sourceQuestion!=='string'||value.sourceQuestion.length>6000))return null;
  return {version:1,kind:'worked-solution',originalProblems:original,currentProblems:current,...(Object.hasOwn(value,'sourceQuestion')?{sourceQuestion:value.sourceQuestion}:{})};
 }catch{return null;}
}
export function portableQuestion(originalProblems:Problem[],currentProblems:Problem[],source:string,includeSource=false):PortableQuestion{
 const data=parsePortableQuestion(JSON.stringify({version:1,kind:'worked-solution',originalProblems,currentProblems,...(includeSource?{sourceQuestion:source}:{})}));
 if(!data)throw new Error('The current solution or original interpretation could not be validated.');return data;
}
const inert=(value:unknown)=>JSON.stringify(value).replace(/[<>&\u2028\u2029]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
export function makeQuestionHtml(data:PortableQuestion,assets:{js:string;css:string;licenses:string}):string{
 const safe=parsePortableQuestion(JSON.stringify(data));if(!safe)throw new Error('The portable solution is invalid.');
 if(typeof assets.js!=='string'||!assets.js.trim()||assets.js.length>12000000||typeof assets.css!=='string'||assets.css.length>2000000||/<\/style\b/i.test(assets.css)||typeof assets.licenses!=='string'||assets.licenses.length>1000000)throw new Error('Portable solution assets are missing or invalid.');
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'"><title>Lessonline · worked solution</title><style>${assets.css}</style></head><body><div id="root"></div><noscript>Open this interactive worked solution in a browser with JavaScript enabled.</noscript><script id="question-data" type="application/json">${inert(safe)}</script><script id="question-licenses" type="application/json">${inert(assets.licenses)}</script><script id="question-runtime" type="application/json">${inert(assets.js)}</script><script>(()=>{const script=document.createElement('script');script.textContent=JSON.parse(document.getElementById('question-runtime').textContent);document.body.appendChild(script);})();</script></body></html>`;
}
