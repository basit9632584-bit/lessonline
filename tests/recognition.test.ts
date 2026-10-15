import assert from 'node:assert/strict';
import test from 'node:test';
import { recognizeQuestion } from '../src/recognition.ts';
import { solveProblem } from '../src/solution.ts';
import type { TaskId } from '../src/problem.ts';
import {basicDetails} from '../src/basic-math.ts';
function recognized(source:string) {
  const result=recognizeQuestion(source);
  assert.equal(result.kind,'recognized',`${source}: ${result.message}`);
  if(result.kind!=='recognized')throw new Error(result.message);
  return result.problems;
}

test('factorial notation is never discarded while ordinary sentence punctuation still works',()=>{
 for(const source of ['Calculate 3!','Calculate (2+3)!','Calculate 2^3!','Solve 2x + 1 = 7!','Calculate 3!!','Calculate 2! + 3','What is 20% of 150!']){
  const result=recognizeQuestion(source);assert.equal(result.kind,'unsupported',source);assert.equal('problems' in result,false);
 }
 for(const source of ['Calculate 2 + 3.','What is 2 + 3?'])assert.equal(solveProblem(recognized(source)[0]).exact,'5');
 assert.equal(solveProblem(recognized('Solve 2x + 1 = 7.')[0]).exact,'3');
});
test('beginner steps distinguish integer operations from actual fraction reduction',()=>{
 const details=(expression:string)=>basicDetails({task:'basic.arithmetic',parameters:{expression}});
 assert.equal(details('2+3').steps.at(-1)!.reason,'Add the two integers.');
 assert.equal(details('8-3').steps.at(-1)!.reason,'Subtract the second integer from the first.');
 assert.equal(details('3*4').steps.at(-1)!.reason,'Multiply the two integers.');
 assert.doesNotMatch(details('12/4').steps.at(-1)!.reason,/fraction|divisor of numerator|greatest common divisor/);
 assert.match(details('3/4').steps.at(-1)!.reason,/nonzero divisor 4.*fraction.*greatest common divisor/);
 assert.match(details('1/2+3/4').steps.at(-1)!.reason,/common denominator 4.*greatest common divisor/);
 assert.equal(details('2^3^2').exact,'512');assert.match(details('2^3^2').steps[1].reason,/2\^3\^2 means 2\^\(3\^2\)/);
 const line=solveProblem(recognized('Solve 2x+1=7')[0]);assert.equal(line.steps[1].title,'Subtract the constant');assert.equal(line.steps[2].title,'Divide by the nonzero coefficient of x');assert.doesNotMatch(line.steps.map(s=>s.reason).join(' '),/slope|intercept/);
});
test('whole-question recognition covers all eleven agreed tasks and their reference mathematics',()=>{
  const cases:[string,TaskId[],string[]][]=[
    ['Solve 3x − 2 = 10.',['linear.solve'],['4']],
    ['Evaluate y = -0.5x + 3 at x = 4.',['linear.evaluate'],['1']],
    ['Find the derivative, point and tangent for f(x) = -0.5x² + x + 2 at x₀ = 2.',['calculus.derivative','calculus.evaluate','calculus.tangent'],['−1','2','T(x) = −x + 4']],
    ['Find mean, median, range and population SD: 2,4,4,6.',['statistics.mean','statistics.median','statistics.range','statistics.population-sd'],['4','4','4','√(2)']],
    ['Binomial: n=5, p=0.2, k=1. Find exactly-one probability and expected successes.',['probability.exactly-k','probability.expected'],['0.4096','1']],
  ];
  const covered=new Set<TaskId>();
  for(const [source,tasks,answers] of cases){const problems=recognized(source);assert.deepEqual(problems.map(p=>p.task),tasks);problems.forEach((p,i)=>{covered.add(p.task);const solution=solveProblem(p);assert.ok(solution.answer.includes(answers[i]),solution.answer);assert.ok(solution.steps.length>=2);});}
  assert.equal(covered.size,11);
});
test('proposed bare linear equations stay explicit and exact signs/decimals survive recognition',()=>{
  const result=recognizeQuestion('2x + 1 = 7');assert.equal(result.kind,'recognized');assert.match(result.message,/Proposed task/);
  for(const [text,exact] of [['Solve -2x+1=7','-3'],['Solve 3x=1','1/3'],['Solve .1x+.2=.3','1'],['Solve -x - 1 = 2','-3'],['Solve 0.01x - 10 = 10','2000']] )assert.equal(solveProblem(recognized(text)[0]).exact,exact);
  assert.match(solveProblem(recognized('Solve 0x+2=2')[0]).answer,/Infinitely/);
  assert.match(solveProblem(recognized('Solve 0x+2=3')[0]).answer,/No solution/);
  assert.equal(solveProblem(recognized('Evaluate y = 0 at x = 10')[0]).exact,'0');
});
test('the entire question must be valid: no prefix extraction or discarded unsupported operation',()=>{
  const invalid=[
    'Solve 2x+1=7/x','Solve 2x+1=7; x=9','Solve 2x+1=7\nSolve x=2',
    'Solve 2x+1=7 then integrate sin(x)','Solve x^2+1=7','Solve 2x+1=7+1',
    'Solve 2x+1=7e0','Solve 2x+1=0x7','Solve NaNx+1=7','Solve 1.001x+1=7',
    'Solve 1 .5x+1=7','Solve 2x+1=7..','Evaluate y=2x+1 at x=4 and x=5',
    'Find the derivative of f(x)=x²+1/x at x=1','Find the tangent of f(x)=x² at x=1 and at x=2',
    'Find derivative and integral of f(x)=x² at x=1','Find mean: 1,2,3; then sample SD',
    'Find mean of 1,2,3 and 999','Find mean of 1,,2,3','Find mean of 1,2,3e0',
    'Find sample standard deviation of 2,4,4,6','Binomial: n=5,p=20%,k=1. Find exactly 1 success',
    'Binomial: n=5,p=.2,k=1. Find at least 1 success','Binomial: n=5,p=.2,k=1. Find exactly 1 success without replacement',
  ];
  for(const source of invalid)assert.notEqual(recognizeQuestion(source).kind,'recognized',source);
});
test('missing operations and coordinates ask for correction, never invent data',()=>{
  for(const source of ['Evaluate y=2x+1','Find derivative of f(x)=x²','Data: 2,4,4,6','Binomial: n=5,p=.2,k=1','Find standard deviation of 2,4,4,6','Binomial: n=5,p=.2. Find exactly-k probability'])assert.notEqual(recognizeQuestion(source).kind,'recognized',source);
  assert.equal(recognizeQuestion('').kind,'empty');assert.equal(recognizeQuestion('x'.repeat(6001)).kind,'unsupported');
});
test('binomial requests distinguish exact counts from expectation and preserve endpoint meanings',()=>{
  const p=recognized('Binomial: n=5,p=.2. Find expected successes')[0];assert.equal(p.task,'probability.expected');assert.ok(!('k' in p.parameters));assert.equal(solveProblem(p).exact,'1');
  const event=recognized('For 4 independent binomial trials with p=0.5, find the probability of exactly 2 successes.')[0];assert.match(solveProblem(event).answer,/0.375/);
  assert.equal(recognizeQuestion('Binomial: n=5,p=.2,k=2. Find exactly 1 success').kind,'ambiguous');
  for(const source of ['Binomial: n=5,p=.2,k=6. Find exactly-k probability','Binomial: n=31,p=.2,k=1. Find expected successes','Binomial: n=5,p=.001,k=1. Find exactly-k probability','For 4 independent trials with p=.5, find probability of exactly 2.5 successes'])assert.notEqual(recognizeQuestion(source).kind,'recognized',source);
  assert.equal(solveProblem(recognized('Binomial: n=1,p=0,k=0. Find exactly-k probability')[0]).exact,'1');
});
test('statistics preserve ordered duplicate values and reject invalid or unrequested operations',()=>{
  const p=recognized('Find median of [10,2,3]')[0];assert.deepEqual(p.parameters,{values:[10,2,3]});assert.equal(solveProblem(p).exact,'3');
  const tasks=recognized('Find mean and population standard deviation of 3,3,3');assert.equal(tasks.length,2);assert.match(solveProblem(tasks[1]).answer,/= 0/);
  for(const source of ['Find mean of 1,2','Find mean of 101,2,3','Find mean of 1,2,3;4','Find mean and mode of 1,2,3','Find mean of [1,2,3','Find range of 1,2,3,'])assert.notEqual(recognizeQuestion(source).kind,'recognized',source);
});
