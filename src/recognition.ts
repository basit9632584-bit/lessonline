import { parseCoefficient } from './math.ts';
import { parseCalculusValue } from './calculus.ts';
import { parseDataset } from './statistics.ts';
import { parseProbabilityValue } from './probability.ts';
import { validateProblem } from './problem.ts';
import type { Problem, TaskId } from './problem.ts';
import {recognizeBasicQuestion} from './basic-math.ts';

export type QuestionRecognition =
  | { kind:'recognized'; problems:Problem[]; message:string }
  | { kind:'empty'|'incomplete'|'ambiguous'|'unsupported'; message:string };
const unsigned = '(?:\\d+(?:\\.\\d+)?|\\.\\d+)';
const signed = `[+-]?${unsigned}`;
const decimal = (raw:string) => /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(raw) && (raw.split('.')[1]?.length ?? 0) <= 2;
const issue = (kind:'empty'|'incomplete'|'ambiguous'|'unsupported', message:string):QuestionRecognition => ({kind,message});
const unsupported = (message='Use one of the supported question forms below. The whole question must describe the same task and values.') => issue('unsupported',message);
function accepted(problems:Problem[],message='Check the task and values, then solve this question.'):QuestionRecognition {
  for(const problem of problems) { const error=validateProblem(problem); if(error) return unsupported(error); }
  return {kind:'recognized',problems,message};
}
function linearTerms(raw:string,bound:'linear'|'calculus'):{m:number;b:number}|null {
  if(/\d\s+\d|\d\s+\.|\.\s+\d/.test(raw)) return null;
  const text=raw.replace(/\s/g,'');
  const match=text.match(new RegExp(`^([+-]?)(${unsigned})?\\*?x(?:([+-])(${unsigned}))?$`,'i'));
  if(!match) return null;
  const mRaw=(match[1]==='-'?'-':'')+(match[2]??'1');
  const bRaw=match[3]?(match[3]==='-'?'-':'')+match[4]:'0';
  if(!decimal(mRaw)||!decimal(bRaw)) return null;
  const m=bound==='linear'?parseCoefficient(mRaw):parseCalculusValue(mRaw,'b');
  const b=bound==='linear'?parseCoefficient(bRaw):parseCalculusValue(bRaw,'c');
  return m.error||b.error?null:{m:m.value!,b:b.value!};
}
function polynomial(raw:string):{a:number;b:number;c:number}|null {
  if(/\d\s+\d|\d\s+\.|\.\s+\d/.test(raw)) return null;
  const text=raw.replace(/\s/g,'');
  const q=text.match(new RegExp(`^([+-]?)(${unsigned})?\\*?x\\^2(?:([+-])(${unsigned})?\\*?x)?(?:([+-])(${unsigned}))?$`,'i'));
  if(q) {
    const raws=[(q[1]==='-'?'-':'')+(q[2]??'1'),q[3]?(q[3]==='-'?'-':'')+(q[4]??'1'):'0',q[5]?(q[5]==='-'?'-':'')+q[6]:'0'];
    if(raws.some(raw=>!decimal(raw))) return null;
    const values=raws.map((raw,i)=>parseCalculusValue(raw,(['a','b','c'] as const)[i]));
    return values.some(p=>p.error)?null:{a:values[0].value!,b:values[1].value!,c:values[2].value!};
  }
  const line=linearTerms(raw,'calculus'); if(line) return {a:0,b:line.m,c:line.b};
  if(decimal(text)) { const c=parseCalculusValue(text,'c'); if(!c.error)return {a:0,b:0,c:c.value!}; }
  return null;
}
const operationParts=(text:string)=>text.toLowerCase().split(/\s*,\s*|\s+and\s+|\s*&\s*/).map(t=>t.trim().replace(/^the\s+/,''));
function calculusTasks(raw:string):TaskId[]|null {
  const result:TaskId[]=[];
  for(const part of operationParts(raw)) {
    const id=/^(?:derivative|slope)$/.test(part)?'calculus.derivative':/^(?:value|point|function value)$/.test(part)?'calculus.evaluate':/^(?:tangent|tangent line)$/.test(part)?'calculus.tangent':null;
    if(!id)return null;if(!result.includes(id))result.push(id);
  }
  return result;
}
function statisticsTasks(raw:string):TaskId[]|null {
  const result:TaskId[]=[];
  for(const part of operationParts(raw)) {
    const id=part==='mean'?'statistics.mean':part==='median'?'statistics.median':part==='range'?'statistics.range':/^population (?:standard deviation|sd)$/.test(part)?'statistics.population-sd':null;
    if(!id)return null;if(!result.includes(id))result.push(id);
  }
  return result;
}
const countWords:Record<string,number>={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
function probabilityTasks(raw:string):{tasks:('probability.exactly-k'|'probability.expected')[];count?:number}|null {
  const tasks:('probability.exactly-k'|'probability.expected')[]=[];let count:number|undefined;
  for(const part of operationParts(raw)) {
    if(/^(?:expected (?:number of )?(?:successes|success count)|expected count|expectation)$/.test(part)) {if(!tasks.includes('probability.expected'))tasks.push('probability.expected');continue;}
    const exact=part.match(new RegExp(`^(?:(?:probability|chance)(?: of)? )?exactly(?:-|\\s+)(k|${unsigned}|zero|one|two|three|four|five|six|seven|eight|nine|ten)(?: (?:success(?:es)?|probability))?$`));
    if(!exact)return null;
    if(exact[1]!=='k') {
      if(!/^[a-z]+$/.test(exact[1])&&!decimal(exact[1]))return null;
      const value=countWords[exact[1]]??Number(exact[1]);
      if(count!==undefined&&count!==value)return null;count=value;
    }
    if(!tasks.includes('probability.exactly-k'))tasks.push('probability.exactly-k');
  }
  return {tasks,count};
}
function binomial(nRaw:string,pRaw:string,kRaw:string|undefined,operations:string):QuestionRecognition {
  const parsed=probabilityTasks(operations);
  if(!parsed)return unsupported('For binomial questions, request exactly-k probability and/or expected successes. At-least, at-most and other distributions are outside this version.');
  if(!decimal(nRaw)||!decimal(pRaw)||(kRaw!==undefined&&!decimal(kRaw)))return unsupported('Use ordinary decimal numbers with at most two decimal places, not percentages or expressions.');
  const n=parseProbabilityValue(nRaw,'n');const p=parseProbabilityValue(pRaw,'p');
  if(n.error||p.error)return unsupported(n.error??p.error!);
  const k=kRaw===undefined?parsed.count:Number(kRaw);
  if(k!==undefined&&parsed.count!==undefined&&k!==parsed.count)return issue('ambiguous','The requested success count disagrees with k. Keep one success count.');
  if(parsed.tasks.includes('probability.exactly-k')&&k===undefined)return issue('incomplete','Exactly-k probability needs the requested success count k.');
  if(k!==undefined){const checked=parseProbabilityValue(String(k),'k',n.value!);if(checked.error)return unsupported(checked.error);}
  return accepted(parsed.tasks.map(task=>({task,parameters:{n:n.value!,p:p.value!,...(k!==undefined?{k}:{})}} as Problem)),'This binomial model assumes fixed independent trials, two outcomes and the same success probability. Check these assumptions and the values before solving.');
}

/** A bounded, whole-question recognizer. It never executes expressions or extracts a valid prefix. */
export function recognizeQuestion(source:string):QuestionRecognition {
  if(!source.trim())return issue('empty','Paste one mathematics question, or try an example.');
  if(source.length>6000)return unsupported('Use up to 6,000 characters for one question.');
  let text=source.trim().replace(/−/g,'-').replace(/²/g,'^2').replace(/³/g,'^3').replace(/₀/g,'0').replace(/×/g,'*');
  if(/\.\.$/.test(text))return unsupported('Check the punctuation and decimal numbers.');
  // ! can mean factorial: never discard it as sentence punctuation.
  if(text.includes('!'))return unsupported('Factorial notation is outside this version. Keep the complete question and choose a supported operation.');
  text=text.replace(/[.?]$/,'').trim();
  const basic=recognizeBasicQuestion(text);if(basic)return basic;
  if(/\b(?:sample\s+(?:standard deviation|sd|variance)|integrals?|integrate|regression|bayes|poisson|without replacement|not independent|dependent trials|at least|at most|more than|less than)\b/i.test(text))return unsupported('That operation or model is outside the supported question forms. Your question is preserved.');
  if(/\d\s+\d|\d\s+\.|\.\s+\d/.test(text))return unsupported('Keep each numeric value together; use ordinary decimals, such as -0.5.');
  // Linear evaluation must carry the coordinate. No default evaluation point is supplied.
  const lineEval=text.match(new RegExp(`^(?:evaluate|(?:find|calculate)\\s+(?:the\\s+)?value\\s+of)\\s+(?:y|f\\s*\\(\\s*x\\s*\\))\\s*=\\s*(.+?)\\s+(?:at|when)\\s+x\\s*=\\s*(${signed})$`,'i'));
  if(lineEval) {
    let terms=linearTerms(lineEval[1],'linear');const x=parseCoefficient(lineEval[2]);
    const constant=lineEval[1].trim();
    if(!terms&&decimal(constant)){const b=parseCoefficient(constant);if(!b.error)terms={m:0,b:b.value!};}
    if(terms&&!x.error&&decimal(lineEval[2]))return accepted([{task:'linear.evaluate',parameters:{...terms,x:x.value!}}]);
    // A quadratic or constant f(x) is handled by the calculus-evaluation form below.
    if(!/\^2/.test(lineEval[1])&&!decimal(lineEval[1].replace(/\s/g,'')))return unsupported('Use y = mx + b with values from -10 to 10 and an explicit x, with at most two decimals.');
  }
  const solve=text.match(/^(?:(solve)(?:\s+(?:the\s+)?equation)?(?:\s+for\s+x)?\s*:?\s*)?(.+?)(?:\s+for\s+x)?$/i);
  if(solve) {
    const eq=solve[2].match(new RegExp(`^(.+?)\\s*=\\s*(${signed})$`,'i'));
    if(eq) {
      const terms=linearTerms(eq[1],'linear');const target=parseCoefficient(eq[2]);
      if(terms&&!target.error&&decimal(eq[2]))return accepted([{task:'linear.solve',parameters:{...terms,t:target.value!}}],solve[1]?'Check the equation and its values, then solve for x.':'Proposed task: solve for x. Check the task and values before choosing Solve question.');
      if(solve[1])return unsupported('Use a numeric equation mx + b = t, with m, b and t from -10 to 10 and at most two decimals.');
    }
  }
  const calc=text.match(new RegExp(`^(?:(?:find|calculate)\\s+(?:the\\s+)?(.+?)\\s+(?:of|for|to)|evaluate)\\s*(?:f\\s*\\(\\s*x\\s*\\)|y)\\s*=\\s*(.+?)\\s+(?:at|when)\\s+x(?:0|_0)?\\s*=\\s*(${signed})$`,'i'));
  if(calc) {
    const tasks=calc[1]?calculusTasks(calc[1]):['calculus.evaluate' as const];
    if(!tasks)return unsupported('Request the derivative, value/point, or tangent of one numeric quadratic.');
    const coefficients=polynomial(calc[2]);const x0=parseCalculusValue(calc[3],'x0');
    if(!coefficients||x0.error||!decimal(calc[3]))return unsupported('Use f(x) = ax² + bx + c, coefficients -5 to 5 and x₀ -3 to 3, with at most two decimals. Linear and constant functions are also supported.');
    return accepted(tasks.map(task=>({task,parameters:{...coefficients,x0:x0.value!}} as Problem)));
  }
  const stats=text.match(/^(?:find|calculate)\s+(?:the\s+)?(.+?)\s*(?:\s+of\s+|:\s*)(.+)$/i);
  if(stats) {
    const tasks=statisticsTasks(stats[1]);
    if(tasks) {
      let raw=stats[2].trim();
      if((raw.startsWith('[')&&raw.endsWith(']'))||(raw.startsWith('(')&&raw.endsWith(')')))raw=raw.slice(1,-1);
      const values=parseDataset(raw);
      if(values.error)return unsupported(values.error);
      return accepted(tasks.map(task=>({task,parameters:{values:values.value!}} as Problem)));
    }
    if(/\b(?:standard deviation|sd)\b/i.test(stats[1])&&!/population/i.test(stats[1]))return issue('incomplete','Specify population standard deviation. Sample standard deviation is outside this version.');
  }
  const binomialFirst=text.match(new RegExp(`^binomial\\s*:\\s*n\\s*=\\s*(${signed})\\s*,\\s*p\\s*=\\s*(${signed})(?:\\s*,\\s*k\\s*=\\s*(${signed}))?\\s*[.;]?\\s*(?:find|calculate)\\s+(?:the\\s+)?(.+)$`,'i'));
  if(binomialFirst)return binomial(binomialFirst[1],binomialFirst[2],binomialFirst[3],binomialFirst[4]);
  const taskFirst=text.match(new RegExp(`^(?:find|calculate)\\s+(?:the\\s+)?(.+?)\\s*(?:[.;,]|\\s+for)\\s*binomial\\s*:?\\s*n\\s*=\\s*(${signed})\\s*,\\s*p\\s*=\\s*(${signed})(?:\\s*,\\s*k\\s*=\\s*(${signed}))?$`,'i'));
  if(taskFirst)return binomial(taskFirst[2],taskFirst[3],taskFirst[4],taskFirst[1]);
  const trials=text.match(new RegExp(`^for\\s+(${signed})\\s+independent\\s+(?:binomial\\s+)?trials\\s+with\\s+p\\s*=\\s*(${signed})\\s*,\\s*(?:find|calculate)\\s+(?:the\\s+)?(.+)$`,'i'));
  if(trials)return binomial(trials[1],trials[2],undefined,trials[3]);
  if(/^solve\b/i.test(text))return /=(?:\s*)$/.test(text)||!text.includes('=')?issue('incomplete','Include the complete numeric equation mx + b = t.'):unsupported('Use one complete numeric equation mx + b = t. Extra terms, equations and unsupported numbers cannot be discarded.');
  if(/^evaluate\b/i.test(text)&&!/\s+(?:at|when)\s+x\s*=/i.test(text))return issue('incomplete','Include the complete equation and an explicit x value.');
  if(/\b(?:derivative|tangent|function value)\b/i.test(text)&&!/(?:at|when)\s+x(?:0|_0)?\s*=\s*\S/i.test(text))return issue('incomplete','Include one numeric function and its point, such as f(x) = x² at x = 1.');
  if(/^\s*(?:data|values|binomial)\s*:/i.test(text))return issue('incomplete','Specify what to find, as well as the data or parameters.');
  return unsupported();
}
