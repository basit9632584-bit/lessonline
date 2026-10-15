import type {WorkedSolution} from './solution.ts';
export const basicTaskIds=['basic.arithmetic','basic.fraction-simplify','basic.percent-of','basic.percent-increase','basic.percent-decrease','basic.power'] as const;
export type BasicTaskId=typeof basicTaskIds[number];
export type BasicProblem=
 |{task:'basic.arithmetic';parameters:{expression:string}}
 |{task:'basic.fraction-simplify';parameters:{numerator:number;denominator:number}}
 |{task:'basic.percent-of'|'basic.percent-increase'|'basic.percent-decrease';parameters:{amount:number;rate:number}}
 |{task:'basic.power';parameters:{base:number;exponent:number}};
export const basicTaskLabels:Record<BasicTaskId,string>={'basic.arithmetic':'Calculate the expression','basic.fraction-simplify':'Simplify the fraction','basic.percent-of':'Find a percentage','basic.percent-increase':'Increase by a percentage','basic.percent-decrease':'Decrease by a percentage','basic.power':'Calculate the power'};
export function basicFields(task:BasicTaskId):string[]{return task==='basic.arithmetic'?['expression']:task==='basic.fraction-simplify'?['numerator','denominator']:task==='basic.power'?['base','exponent']:['amount','rate'];}
export function basicBounds(key:string):{min:number;max:number;step:number}{return key==='amount'?{min:0,max:10000,step:.01}:key==='rate'?{min:0,max:100,step:.01}:key==='exponent'?{min:0,max:10,step:1}:{min:-100,max:100,step:key==='base'?.01:1};}
type Rational={n:bigint;d:bigint};
type Step={title:string;expression:string;reason:string};
export type BasicDetails={exact:string;approximation:string;steps:Step[];check:string;table:{label:string;value:string}[];numericResult:number};
const abs=(n:bigint)=>n<0n?-n:n;
function gcd(a:bigint,b:bigint):bigint{a=abs(a);b=abs(b);while(b){const r=a%b;a=b;b=r;}return a;}
function rational(n:bigint,d=1n):Rational{
 if(d===0n)throw new Error('Division by zero is not defined.');if(d<0n){n=-n;d=-d;}
 const common=gcd(n,d)||1n;n/=common;d/=common;
 if(abs(n).toString().length>48||d.toString().length>48)throw new Error('The exact calculation exceeds the 48-digit limit. Use a smaller expression.');
 return {n,d};
}
const exact=(r:Rational)=>r.d===1n?String(r.n):`${r.n}/${r.d}`;
function decimal(raw:string):Rational{
 const sign=raw.startsWith('-')?-1n:1n,clean=raw.replace(/^[+-]/,''),[whole='',fraction='']=clean.split('.');
 if(!/^[+-]?(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(raw))throw new Error('Use numeric values with up to two decimal places.');
 if(!Number.isFinite(Number(raw))||Math.abs(Number(raw))>10000)throw new Error('Numeric literals must be from −10,000 to 10,000.');
 return rational(sign*BigInt((whole||'0')+fraction),10n**BigInt(fraction.length));
}
const add=(a:Rational,b:Rational)=>rational(a.n*b.d+b.n*a.d,a.d*b.d);
const subtract=(a:Rational,b:Rational)=>rational(a.n*b.d-b.n*a.d,a.d*b.d);
const multiply=(a:Rational,b:Rational)=>rational(a.n*b.n,a.d*b.d);
const divide=(a:Rational,b:Rational)=>rational(a.n*b.d,a.d*b.n);
function power(a:Rational,b:Rational):Rational{
 if(b.d!==1n||b.n<0n||b.n>10n)throw new Error('Powers require a whole-number exponent from 0 to 10.');
 if(a.n===0n&&b.n===0n)throw new Error('0^0 is outside this activity and is not assigned a value.');
 return rational(a.n**b.n,a.d**b.n);
}
function parseArithmetic(expression:string):{value:Rational;steps:Step[]}{
 if(typeof expression!=='string'||!expression.trim()||expression.length>256)throw new Error('Enter a numeric expression of up to 256 characters.');
 const source=expression.replace(/[−–]/g,'-').replace(/[×·]/g,'*').replace(/÷/g,'/');
 const tokens:string[]=[];let index=0;
 while(index<source.length){if(/\s/.test(source[index])){index++;continue;}const token=source.slice(index).match(/^(?:\d+(?:\.\d+)?|\.\d+|[+*/^()\-])/);if(!token)throw new Error('Use only numbers, +, −, ×, ÷, ^ and parentheses. No variables, functions or extra text.');tokens.push(token[0]);index+=token[0].length;if(tokens.length>96)throw new Error('Use at most 96 expression tokens.');}
 let position=0,depth=0;const steps:Step[]=[];
 const peek=()=>tokens[position],take=()=>tokens[position++];
 const operation=(a:Rational,b:Rational,operator:string):Rational=>{
  const value=operator==='+'?add(a,b):operator==='-'?subtract(a,b):operator==='*'?multiply(a,b):operator==='/'?divide(a,b):power(a,b);
  let reason:string;
  if(a.d===1n&&b.d===1n&&operator!=='^'){
   reason=operator==='+'?'Add the two integers.':operator==='-'?'Subtract the second integer from the first.':operator==='*'?'Multiply the two integers.':`Divide the first integer by the nonzero divisor ${exact(b)}.${value.d!==1n?' Write the result as a fraction and reduce by the greatest common divisor.':''}`;
  }else if(operator==='+'||operator==='-'){
   const common=a.d/gcd(a.d,b.d)*b.d;
   reason=`Use common denominator ${common}: ${a.n*(common/a.d)}/${common} ${operator} ${b.n*(common/b.d)}/${common}, then reduce by the greatest common divisor of numerator and denominator.`;
  }else if(operator==='*')reason='Multiply numerators and denominators, then reduce by their greatest common divisor.';
  else if(operator==='/')reason=`Divide by the nonzero fraction ${exact(b)}: multiply by its reciprocal ${exact(rational(b.d,b.n))}.`;
  else reason=b.n===0n?'A nonzero base to exponent 0 equals 1.':`Multiply the base by itself ${b.n} times. Calculate powers before applying a leading sign. Consecutive powers group from the right: 2^3^2 means 2^(3^2).`;
  steps.push({title:operator==='^'?'Calculate the power':operator==='*'?'Multiply':operator==='/'?'Divide':operator==='+'?'Add':'Subtract',expression:`(${exact(a)}) ${operator} (${exact(b)}) = ${exact(value)}`,reason});return value;
 };
 function primary():Rational{
  if(peek()==='('){take();if(++depth>12)throw new Error('Use at most 12 nested parentheses.');const value=sum();if(take()!==')')throw new Error('Close every opening parenthesis.');depth--;return value;}
  const token=take();if(!token||!/^(?:\d|\.)/.test(token))throw new Error('A number or parenthesized expression is missing.');return decimal(token);
 }
 function raised():Rational{let value=primary();if(peek()==='^'){take();value=operation(value,unary(),'^');}return value;}
 function unary():Rational{if(peek()==='+'||peek()==='-'){const sign=take(),value=unary();if(sign==='+')return value;const result=rational(-value.n,value.d);steps.push({title:'Apply the unary minus',expression:`−(${exact(value)}) = ${exact(result)}`,reason:'Apply the sign after any power within this operand.'});return result;}return raised();}
 function product():Rational{let value=unary();while(peek()==='*'||peek()==='/'){const operator=take();value=operation(value,unary(),operator);}return value;}
 function sum():Rational{let value=product();while(peek()==='+'||peek()==='-'){const operator=take();value=operation(value,product(),operator);}return value;}
 const value=sum();if(position!==tokens.length)throw new Error('Use one complete expression with explicit operators between values.');
 if(!steps.length)steps.push({title:'Read the numeric value',expression:`${expression.trim()} = ${exact(value)}`,reason:'The value is represented exactly as a reduced fraction or integer.'});
 return {value,steps};
}
function numeric(value:unknown,min:number,max:number,integer=false):boolean{return typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max&&(integer?Number.isInteger(value):/^[+-]?(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(String(value)));}
export function validateBasicProblem(value:unknown):string|null{
 try{
  if(!value||typeof value!=='object'||Array.isArray(value))return 'Choose a supported basic mathematics question.';
  const p=value as BasicProblem;if(!basicTaskIds.includes(p.task))return 'Choose a supported basic mathematics task.';
  if(!p.parameters||typeof p.parameters!=='object'||Array.isArray(p.parameters))return 'Enter the required numeric values.';
  if(p.task==='basic.arithmetic'){parseArithmetic(p.parameters.expression);return null;}
  if(p.task==='basic.fraction-simplify')return numeric(p.parameters.numerator,-100,100,true)&&numeric(p.parameters.denominator,-100,100,true)&&p.parameters.denominator!==0?null:'Use whole-number numerator and nonzero denominator from −100 to 100.';
  if(p.task==='basic.power'){if(!numeric(p.parameters.base,-100,100)||!numeric(p.parameters.exponent,0,10,true))return 'Use a base from −100 to 100 with up to two decimals and whole-number exponent 0–10.';power(decimal(String(p.parameters.base)),rational(BigInt(p.parameters.exponent)));return null;}
  return numeric(p.parameters.amount,0,10000)&&numeric(p.parameters.rate,0,100)?null:'Use amount 0–10,000 and rate 0–100, both with up to two decimals.';
 }catch(error){return error instanceof Error?error.message:'The calculation could not be validated.';}
}
export function formatBasicProblem(problem:BasicProblem):string{
 const error=validateBasicProblem(problem);if(error)throw new Error(error);
 if(problem.task==='basic.arithmetic')return `Calculate ${problem.parameters.expression}`;
 if(problem.task==='basic.fraction-simplify')return `Simplify ${problem.parameters.numerator}/${problem.parameters.denominator}`;
 if(problem.task==='basic.power')return `Calculate (${problem.parameters.base})^${problem.parameters.exponent}`;
 const {amount,rate}=problem.parameters;return problem.task==='basic.percent-of'?`Find ${rate}% of ${amount}`:`${problem.task==='basic.percent-increase'?'Increase':'Decrease'} ${amount} by ${rate}%`;
}
export function basicDetails(problem:BasicProblem):BasicDetails{
 const error=validateBasicProblem(problem);if(error)throw new Error(error);
 let value:Rational,steps:Step[]=[],check='',table:{label:string;value:string}[]=[];
 if(problem.task==='basic.arithmetic'){
  const parsed=parseArithmetic(problem.parameters.expression);value=parsed.value;steps=[{title:'Follow the order of operations',expression:problem.parameters.expression,reason:'Parentheses first; powers next (group consecutive powers from the right); then leading signs. Multiply and divide from left to right, then add and subtract from left to right.'},...parsed.steps];
  check='Every operation used exact reduced rational arithmetic. Division used only nonzero divisors; decimal approximations are not intermediate inputs.';
  table=[{label:'Expression',value:problem.parameters.expression}];
 }else if(problem.task==='basic.fraction-simplify'){
  const {numerator,denominator}=problem.parameters,common=gcd(BigInt(numerator),BigInt(denominator));value=rational(BigInt(numerator),BigInt(denominator));
  steps=[{title:'Find the greatest common divisor',expression:`Greatest common divisor of |${numerator}| and |${denominator}| = ${common}`,reason:'A common divisor can divide numerator and denominator without changing the fraction.'},{title:'Divide both parts',expression:`(${numerator} ÷ ${common}) / (${denominator} ÷ ${common}) = ${exact(value)}`,reason:'Reduce both parts by their greatest common divisor and put any negative sign in the numerator.'}];
  check=`Cross-products agree: ${numerator} × ${value.d} = ${denominator} × (${value.n}) = ${BigInt(numerator)*value.d}.`;
  table=[{label:'Original fraction',value:`${numerator}/${denominator}`},{label:'Greatest common divisor',value:String(common)}];
 }else if(problem.task==='basic.power'){
  const {base,exponent}=problem.parameters,a=decimal(String(base));value=power(a,rational(BigInt(exponent)));
  steps=[{title:'Interpret the exponent',expression:exponent===0?`(${base})^0 = 1`:Array(exponent).fill(`(${base})`).join(' × '),reason:exponent===0?'A nonzero base to exponent 0 is 1.':`The exponent counts ${exponent} copies of the base, including each negative sign.`},{title:'Calculate exactly',expression:`(${base})^${exponent} = ${exact(value)}`,reason:'Multiply the exact rational base; reduce the final fraction.'}];
  check=base<0?`A negative base gives ${exponent%2?'a negative':'a positive'} result for this ${exponent%2?'odd':'even'} exponent.`:exponent===0?'The base is nonzero, so the zero-exponent rule applies.':'Multiplication uses the stated number of copies of the base.';
  table=[{label:'Base',value:String(base)},{label:'Exponent',value:String(exponent)}];
 }else{
  const {amount,rate}=problem.parameters,a=decimal(String(amount)),r=decimal(String(rate)),fraction=divide(r,rational(100n)),portion=multiply(a,fraction);
  steps=[{title:'Convert percent to a fraction',expression:`${rate}% = (${exact(r)}) / 100 = ${exact(fraction)}`,reason:'Percent means per hundred.'},{title:'Calculate the percentage portion',expression:`(${exact(a)}) × (${exact(fraction)}) = ${exact(portion)}`,reason:'Multiply the original amount by the rate divided by 100.'}];
  value=problem.task==='basic.percent-of'?portion:problem.task==='basic.percent-increase'?add(a,portion):subtract(a,portion);
  if(problem.task!=='basic.percent-of')steps.push({title:problem.task==='basic.percent-increase'?'Add the portion':'Subtract the portion',expression:`(${exact(a)}) ${problem.task==='basic.percent-increase'?'+':'−'} (${exact(portion)}) = ${exact(value)}`,reason:'Apply the percentage to the original amount, then add or subtract that portion.'});
  check=problem.task==='basic.percent-of'?'For a rate between 0% and 100%, the portion is between zero and the original amount.':problem.task==='basic.percent-increase'?'For a rate between 0% and 100%, the result is between the original amount and twice that amount.':'For a rate between 0% and 100%, the result is between zero and the original amount.';
  table=[{label:'Original amount',value:exact(a)},{label:'Rate',value:`${rate}%`},{label:'Percentage portion',value:exact(portion)}];
 }
 const numericResult=Number(value.n)/Number(value.d);if(!Number.isFinite(numericResult))throw new Error('The result cannot be displayed as a finite number.');
 const approximation=String(Number(numericResult.toPrecision(12))),result=exact(value);table.push({label:'Exact result',value:result});
 return {exact:result,approximation,steps,check,table,numericResult};
}
export function solveBasicProblem(problem:BasicProblem):Omit<WorkedSolution,'task'>&{task:BasicTaskId}{const details=basicDetails(problem);return {task:problem.task,title:basicTaskLabels[problem.task],context:formatBasicProblem(problem),answer:details.exact.includes('/')?`${details.exact} ≈ ${details.approximation}`:details.exact,steps:details.steps,check:details.check,exact:details.exact,...(details.exact.includes('/')?{approximation:details.approximation}:{})};}
export type BasicRecognition=null|{kind:'recognized';problems:BasicProblem[];message:string}|{kind:'unsupported'|'incomplete';message:string};
export function basicLiterals(expression:string):{start:number;end:number;raw:string}[]{
 parseArithmetic(expression);return [...expression.matchAll(/(?:\d+(?:\.\d+)?|\.\d+)/g)].map(match=>({start:match.index,end:match.index+match[0].length,raw:match[0]}));
}
export function recognizeBasicQuestion(text:string):BasicRecognition{
 if(typeof text!=='string'||!text.trim())return null;
 let raw=text.trim().replace(/[−–]/g,'-');if(raw.length>6000)return {kind:'unsupported',message:'Use one question with up to 6,000 characters.'};
 raw=raw.replace(/[?]$/,'').trim().replace(/[.]$/,'').trim();
 const num='([+-]?(?:\\d+(?:\\.\\d{1,2})?|\\.\\d{1,2}))';let match:RegExpMatchArray|null,problem:BasicProblem|undefined;
 if((match=raw.match(new RegExp(`^(?:what is\\s+|find\\s+)?${num}\\s*%\\s+of\\s+${num}$`,'i'))))problem={task:'basic.percent-of',parameters:{rate:Number(match[1]),amount:Number(match[2])}};
 else if((match=raw.match(new RegExp(`^(increase|decrease)\\s+${num}\\s+by\\s+${num}\\s*%$`,'i'))))problem={task:match[1].toLowerCase()==='increase'?'basic.percent-increase':'basic.percent-decrease',parameters:{amount:Number(match[2]),rate:Number(match[3])}};
 else if((match=raw.match(/^simplify\s+([+-]?\d+)\s*\/\s*([+-]?\d+)$/i)))problem={task:'basic.fraction-simplify',parameters:{numerator:Number(match[1]),denominator:Number(match[2])}};
 else if((match=raw.match(new RegExp(`^(?:calculate\\s+|evaluate\\s+|what is\\s+)?${num}\\s+(?:to the power(?: of)?|raised to(?: the power(?: of)?)?)\\s+${num}$`,'i'))))problem={task:'basic.power',parameters:{base:Number(match[1]),exponent:Number(match[2])}};
 else if((match=raw.match(new RegExp(`^(add|subtract|multiply|divide)\\s+${num}\\s+(and|from|by)\\s+${num}$`,'i')))){
  const verb=match[1].toLowerCase(),link=match[3].toLowerCase(),first=match[2],second=match[4];
  if(verb==='add'&&link==='and')problem={task:'basic.arithmetic',parameters:{expression:`(${first}) + (${second})`}};
  else if(verb==='subtract'&&link==='from')problem={task:'basic.arithmetic',parameters:{expression:`(${second}) - (${first})`}};
  else if((verb==='multiply'||verb==='divide')&&link==='by')problem={task:'basic.arithmetic',parameters:{expression:`(${first}) ${verb==='multiply'?'*':'/'} (${second})`}};
  else return {kind:'unsupported',message:'Use Add A and B, Subtract A from B, Multiply A by B, or Divide A by B.'};
 }else{
  const prefixed=/^(?:calculate|evaluate|what is)\b/i.test(raw),expression=raw.replace(/^(?:calculate|evaluate|what is)\s*:?\s*/i,'');
  if(!expression.trim()&&prefixed)return {kind:'incomplete',message:'Include the numeric expression to calculate.'};
  if(/^[\d.+\-()]/.test(expression)&&(!/[A-Za-z]/.test(expression)||prefixed))problem={task:'basic.arithmetic',parameters:{expression}};
  else if(/^(?:add|subtract|multiply|divide|simplify|increase|decrease)\b/i.test(raw))return {kind:'incomplete',message:'Include the complete supported numeric question and all required values.'};
  else return null;
 }
 const error=validateBasicProblem(problem);return error?{kind:'unsupported',message:error}:{kind:'recognized',problems:[problem],message:'Check the basic mathematics operation and values before solving.'};
}
