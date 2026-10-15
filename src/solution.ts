import { formatProblem, taskLabels, validateProblem,isBasicProblem } from './problem.ts';
import {solveBasicProblem} from './basic-math.ts';
import type { Problem, TaskId } from './problem.ts';
import { quadraticAt, derivativeAt, tangentText, derivativeText, formatCalculusNumber } from './calculus.ts';
import { statisticsSummary, formatStatisticsNumber } from './statistics.ts';
import { probabilityMass, expectedSuccesses, formatProbabilityNumber, formatProbabilityPercent } from './probability.ts';
export type WorkedSolution = {task:TaskId;title:string;answer:string;context:string;steps:{title:string;expression:string;reason:string}[];check:string;exact?:string;approximation?:string};
const cents = (x:number) => Math.round(x*100);
function rational(n:number,d:number):string {
  if (d<0) { n=-n;d=-d; }
  let a=Math.abs(n),b=d; while(b) { const remainder=a%b;a=b;b=remainder; }
  const divisor=a||1; n/=divisor;d/=divisor;
  if(d===1) return String(n);
  // Terminating rational values are rendered as exact finite decimals.
  let rest=d;while(rest%2===0)rest/=2;while(rest%5===0)rest/=5;
  return rest===1 ? String(n/d) : `${n}/${d}`;
}
export function solveProblem(problem:Problem):WorkedSolution {
  const error=validateProblem(problem);if(error)throw new Error(error);
  if(isBasicProblem(problem))return solveBasicProblem(problem);
  const result:WorkedSolution={task:problem.task,title:taskLabels[problem.task],answer:'',context:formatProblem(problem),steps:[],check:''};
  const step=(title:string,expression:string,reason:string)=>result.steps.push({title,expression,reason});
  if(problem.task==='linear.solve') {
    const {m,b,t}=problem.parameters;const M=cents(m),B=cents(b),T=cents(t);
    step('Start with the equation',result.context,'Find every real x that makes both sides equal.');
    if(M===0) {
      result.answer=B===T?'Infinitely many solutions: every real x.':'No solution.';
      step('Compare the constants',`${b} ${B===T?'=':'≠'} ${t}`,'With the coefficient of x equal to zero, the left side does not depend on x. Do not divide by zero.');
      result.check=B===T?'Every x leaves the same equal constants.':'No x can change the unequal constants.';return result;
    }
    const difference=rational(T-B,100),exact=rational(T-B,M);
    step('Subtract the constant',`${m}x = ${t} − (${b}) = ${difference}`,'Subtract the same constant from both sides.');
    step('Divide by the nonzero coefficient of x',`x = (${difference}) / (${m}) = ${exact}`,'Dividing both sides by the same nonzero coefficient of x preserves equality.');
    result.exact=exact;result.answer=`x = ${exact}`;
    if(exact.includes('/')) {result.approximation=String(Number(((T-B)/M).toPrecision(10)));result.answer+=` ≈ ${result.approximation}`;}
    result.check=`Exact substitution: (${m}) × (${exact}) + (${b}) = ${t}.`;
    step('Check by substitution',result.check,'Use the exact answer, not its rounded decimal approximation.');return result;
  }
  if(problem.task==='linear.evaluate') {
    const {m,b,x}=problem.parameters;const exact=rational(cents(m)*cents(x)+cents(b)*100,10000);
    step('Substitute x',`y = (${m}) × (${x}) + (${b})`,'Replace x with its specified value.');
    const product=rational(cents(m)*cents(x),10000);
    step('Multiply first',`(${m}) × (${x}) = ${product}`,'Calculate the slope times x before adding the intercept.');
    step('Add the intercept',`y = ${product} + (${b}) = ${exact}`,'Add the intercept to the product.');result.exact=exact;result.answer=`y = ${exact}`;result.check='The result uses exact integer-hundredths arithmetic.';return result;
  }
  if('a' in problem.parameters) {
    const p=problem.parameters,y=quadraticAt(p,p.x0),slope=derivativeAt(p,p.x0),fmt=formatCalculusNumber;
    if(problem.task==='calculus.evaluate') {
      step('Substitute the point',`f(${p.x0}) = (${p.a}) × (${p.x0})² + (${p.b}) × (${p.x0}) + (${p.c})`,'Square x₀, multiply each term, then add.');
      result.exact=fmt(y);result.answer=`f(${p.x0}) = ${fmt(y)}`;step('Combine the terms',result.answer,'All supported input products have terminating decimal values.');result.check=`The function point is (${p.x0}, ${fmt(y)}).`;return result;
    }
    step('Differentiate each term',derivativeText(p),'The derivatives of ax², bx and c are 2ax, b and 0.');
    step('Evaluate the slope',`f′(${p.x0}) = 2 × (${p.a}) × (${p.x0}) + (${p.b}) = ${fmt(slope)}`,'Substitute x₀ into the derivative.');
    if(problem.task==='calculus.derivative') {result.answer=`${derivativeText(p)}; f′(${p.x0}) = ${fmt(slope)}`;result.exact=fmt(slope);result.check=p.a===0?'With a = 0, the derivative is the constant b.':'Increasing x by 1 changes the derivative by 2a.';return result;}
    step('Find the point',`(${p.x0}, ${fmt(y)})`,'Evaluate the original function at x₀.');
    step('Use point-slope form',`T(x) = ${fmt(y)} + (${fmt(slope)}) × (x − (${p.x0}))`,'The tangent passes through the point and has the derivative as its slope.');
    result.answer=tangentText(p);result.exact=result.answer;step('Simplify',result.answer,'Expand and collect the constant terms.');result.check=`At x = ${p.x0}, T(x₀) = f(x₀) = ${fmt(y)} and the tangent slope is ${fmt(slope)}.`;return result;
  }
  if('values' in problem.parameters) {
    const values=problem.parameters.values,s=statisticsSummary(problem.parameters),C=values.map(cents),sum=C.reduce((a,b)=>a+b,0),fmt=formatStatisticsNumber;
    if(problem.task==='statistics.mean') {const exact=rational(sum,100*s.count);step('Count the observations',`N = ${s.count}`,'Each observation counts once, including repeated values.');step('Add every observation',`Sum = ${rational(sum,100)}`,'Repeated observations count separately.');step('Divide by the count',`Mean = (${rational(sum,100)}) / ${s.count} = ${exact}`,'Use every observation in the denominator.');result.exact=exact;result.answer=`Mean = ${exact}`;if(exact.includes('/')) {result.approximation=fmt(s.mean);result.answer+=` ≈ ${result.approximation}`;}result.check=`Exact mean × ${s.count} equals the sum.`;}
    else if(problem.task==='statistics.median') {const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(s.count/2);step('Sort numerically',sorted.join(', '),'Sort a copy; retain duplicates.');step('Take the middle',s.count%2?`Position (${s.count} + 1) / 2 = ${middle+1}; median = ${fmt(sorted[middle])}`:`Median = (${fmt(sorted[middle-1])} + (${fmt(sorted[middle])})) / 2 = ${fmt(s.median)}`,s.count%2?'Count sorted positions starting at 1 and take that observation.':`Average sorted positions ${middle} and ${middle+1}.`);result.answer=`Median = ${fmt(s.median)}`;result.exact=fmt(s.median);result.check='The median lies between the minimum and maximum.';}
    else if(problem.task==='statistics.range') {step('Identify the extremes',`Minimum = ${s.min}; maximum = ${s.max}`,'Order values numerically.');result.answer=`Range = ${s.max} − (${s.min}) = ${fmt(s.range)}`;step('Subtract minimum from maximum',result.answer,'Range is nonnegative.');result.exact=fmt(s.range);result.check='The range is zero exactly when all observations are equal.';}
    else {const sumSquares=C.reduce((a,b)=>a+b*b,0),numerator=sumSquares*s.count-sum*sum,variance=rational(numerator,10000*s.count*s.count),deviationSum=rational(numerator,10000*s.count),mean=rational(sum,100*s.count);step('Find the exact mean',`μ = ${mean}`,'Keep the exact mean while calculating deviations.');step('Square and sum the deviations',`Σ(xᵢ − μ)² = ${deviationSum}`,`Subtract μ from each of the ${s.count} observations and square each difference. For the first value: (${fmt(values[0])} − (${mean}))² = ${rational((C[0]*s.count-sum)**2,10000*s.count*s.count)}. Include all observations and duplicates in the sum.`);step('Divide by the population count',`σ² = (${deviationSum}) / ${s.count} = ${variance}`,'Divide by N, not N − 1.');result.exact=`√(${variance})`;result.approximation=fmt(s.populationStdDev);result.answer=s.populationStdDev===0?'Population standard deviation = 0':`Population standard deviation = ${result.exact} ≈ ${result.approximation}`;step('Take the square root',result.answer,'Standard deviation is the nonnegative square root of variance.');result.check=s.populationStdDev===0?'Every observation equals the mean.':'Squaring the exact square-root expression recovers population variance.';}
    return result;
  }
  const p=problem.parameters;result.context+='; fixed independent trials, two outcomes, constant p.';
  if(problem.task==='probability.expected') {const exact=rational(p.n*cents(p.p),100);step('Use binomial expectation','E[X] = n × p','Sum the expected success contribution p from each fixed trial.');result.exact=exact;result.answer=`E[X] = ${p.n} × ${p.p} = ${exact}`;step('Calculate',result.answer,'The long-run mean need not be an integer or a guaranteed outcome.');result.check=`Expected count ${expectedSuccesses({...p,k:p.k ?? 0})} is between 0 and ${p.n}.`;return result;}
  const k=problem.parameters.k;
  const chance=probabilityMass({...p,k});
  if(p.p===0||p.p===1) {result.exact=String(chance);result.answer=`P(X = ${p.k}) = ${chance}`;step('Handle a deterministic endpoint',result.answer,p.p===0?'Success is impossible; only zero successes has probability 1.':'Every trial succeeds; only n successes has probability 1.');}
  else {
    result.exact=`C(${p.n}, ${k}) × (${p.p})^${k} × (1 − ${p.p})^${p.n-k}`;
    step('Use the binomial formula',`P(X = ${k}) = ${result.exact}`,'Choose which trials succeed, then multiply independent success and failure probabilities.');
    let combinations=1;for(let i=1;i<=Math.min(k,p.n-k);i++)combinations=combinations*(p.n-i+1)/i;
    combinations=Math.round(combinations);
    step('Count success arrangements',`C(${p.n}, ${k}) = ${combinations}`,`There are ${combinations} ways to choose ${k} successful trials among ${p.n}.`);
    step('Calculate success and failure factors',`(${p.p})^${k} ≈ ${formatProbabilityNumber(p.p**k)}; (1 − ${p.p})^${p.n-k} ≈ ${formatProbabilityNumber((1-p.p)**(p.n-k))}`,'These displayed factors are approximate; calculate the final product from the unrounded factors.');
    result.approximation=formatProbabilityNumber(chance);result.answer=`P(X = ${k}) ≈ ${result.approximation} (${formatProbabilityPercent(chance)})`;step('Multiply the three factors',result.answer,'Multiply the arrangement count, success factor and failure factor. Decimal display is approximate; the formula is exact.');}
  result.check='The probability is between 0 and 1; all supported success counts together have total probability 1.';return result;
}
