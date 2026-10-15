import {parseDataset} from './statistics.ts';
import {validateProblem} from './problem.ts';
import type {Problem,TaskId} from './problem.ts';
import {basicTaskIds,basicFields,basicBounds} from './basic-math.ts';
import type {BasicTaskId} from './basic-math.ts';
export const labels:Record<string,string>={expression:'Arithmetic expression',numerator:'Numerator',denominator:'Denominator',amount:'Original amount',rate:'Percentage rate',base:'Base',exponent:'Exponent',m:'Coefficient m',b:'Constant b',t:'Right side t',x:'Evaluate at x',a:'Quadratic coefficient a',c:'Constant c',x0:'Point x₀',n:'Number of trials n',p:'Success probability p',k:'Success count k',values:'Data values, in original order'};
export const family=(task:TaskId)=>task.split('.')[0];
export function fields(tasks:TaskId[]):string[]{return [...new Set(tasks.flatMap(task=>basicTaskIds.includes(task as BasicTaskId)?basicFields(task as BasicTaskId):task==='linear.solve'?['m','b','t']:task==='linear.evaluate'?['m','b','x']:family(task)==='calculus'?['a','b','c','x0']:family(task)==='statistics'?['values']:task==='probability.expected'?['n','p']:['n','p','k']))];}
export function draftsFor(problem:Problem):Record<string,string>{return Object.fromEntries(Object.entries(problem.parameters).map(([key,value])=>[key,Array.isArray(value)?value.join(', '):String(value)]));}
const decimal=/^[+-]?(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/;
export function candidates(tasks:TaskId[],drafts:Record<string,string>):{problems:Problem[];error:string|null}{
 if(!tasks.length)return {problems:[],error:'Choose a supported task.'};
 if(tasks.some(task=>family(task)!==family(tasks[0]))||new Set(tasks).size!==tasks.length)return {problems:[],error:'Use distinct requested operations from one mathematics family.'};
 const params:Record<string,number|number[]|string>={};
 for(const key of fields(tasks)){const raw=(drafts[key]??'').trim();if(key==='expression'){params[key]=raw;}else if(key==='values'){const parsed=parseDataset(raw);if(parsed.error)return {problems:[],error:parsed.error};params[key]=parsed.value!;}else{if(!decimal.test(raw))return {problems:[],error:`${labels[key]}: enter a number with up to two decimal places.`};params[key]=Number(raw);}}
 const problems=tasks.map(task=>({task,parameters:Object.fromEntries(fields([task]).map(key=>[key,params[key]]))} as Problem));
 return {problems,error:problems.map(validateProblem).find(Boolean)??null};
}
export function boundsFor(key:string,problems:Problem[]):{min:number;max:number;step:number}{
 if(['numerator','denominator','amount','rate','base','exponent'].includes(key))return basicBounds(key);
 if(key==='values')return {min:-100,max:100,step:.01};
 if(key==='n')return {min:1,max:30,step:1};if(key==='p')return {min:0,max:1,step:.01};
 if(key==='k')return {min:0,max:problems[0]&&'n' in problems[0].parameters?problems[0].parameters.n:30,step:1};
 if(key==='x0')return {min:-3,max:3,step:.01};
 return {min:problems[0]&&family(problems[0].task)==='calculus'?-5:-10,max:problems[0]&&family(problems[0].task)==='calculus'?5:10,step:.01};
}
export function taskHint(task:TaskId):string{
 if(task==='basic.arithmetic')return 'Use +, −, ×, ÷, parentheses and ^ powers. Up to 256 characters; numeric values from −10,000 to 10,000 with up to two decimals. Powers need integer exponents 0–10. Division by zero and 0^0 require correction.';
 if(task==='basic.fraction-simplify')return 'Use whole-number numerators and denominators from −100 to 100. The denominator must be nonzero.';
 if(task==='basic.power')return 'Base: −100 to 100, up to two decimals. Exponent: whole number 0–10. 0^0 requires correction.';
 if(family(task)==='basic')return 'Original amount: 0–10,000. Percentage rate: 0–100. Use up to two decimal places.';
 return family(task)==='linear'?'Values: −10 to 10, up to two decimals.':family(task)==='calculus'?'Coefficients: −5 to 5. Point x₀: −3 to 3. Use up to two decimals.':family(task)==='statistics'?'Use 3–20 values from −100 to 100, up to two decimals. Repeated values stay in the dataset.':'Trials n: integer 1–30. Probability p: 0–1, up to two decimals. Success count k, when requested: integer 0–n.';
}
