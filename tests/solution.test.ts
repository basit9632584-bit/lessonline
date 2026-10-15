import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProblem, taskIds, formatProblem } from '../src/problem.ts';
import { solveProblem } from '../src/solution.ts';
test('linear solving retains exact rational answers and handles degenerate equations',()=>{
  const solve=(m:number,b:number,t:number)=>solveProblem({task:'linear.solve',parameters:{m,b,t}});
  assert.equal(solve(2,1,7).exact,'3');assert.equal(solve(-2,1,7).exact,'-3');
  assert.equal(solve(3,0,1).exact,'1/3');assert.match(solve(3,0,1).answer,/≈/);
  assert.equal(solve(.1,.2,.3).exact,'1');assert.equal(solve(.01,-10,10).exact,'2000');
  assert.equal(solve(-.01,10,-10).exact,'2000');assert.equal(solve(2,1,1).exact,'0');
  assert.match(solve(0,2,2).answer,/Infinitely/);assert.match(solve(0,2,3).answer,/No solution/);
  assert.match(solve(0,0,0).answer,/Infinitely/);assert.equal(solve(0,2,3).steps.length,2);
  assert.equal(solve(-0,0,0).approximation,undefined);
});
test('linear evaluation and calculus steps match exact decimal mathematics',()=>{
  assert.equal(solveProblem({task:'linear.evaluate',parameters:{m:-.5,b:3,x:4}}).exact,'1');
  assert.equal(solveProblem({task:'linear.evaluate',parameters:{m:10,b:10,x:10}}).exact,'110');
  const parameters={a:-.5,b:1,c:2,x0:2};
  assert.equal(solveProblem({task:'calculus.evaluate',parameters}).exact,'2');
  assert.equal(solveProblem({task:'calculus.derivative',parameters}).exact,'−1');
  assert.equal(solveProblem({task:'calculus.tangent',parameters}).answer,'T(x) = −x + 4');
  assert.equal(solveProblem({task:'calculus.derivative',parameters:{a:0,b:0,c:3,x0:-3}}).exact,'0');
  assert.equal(solveProblem({task:'calculus.evaluate',parameters:{a:.01,b:0,c:0,x0:.01}}).exact,'0.000001');
});
test('statistics retain exact mean and population variance and correct sorted medians',()=>{
  const parameters={values:[2,4,4,6]};
  assert.equal(solveProblem({task:'statistics.mean',parameters}).exact,'4');
  assert.equal(solveProblem({task:'statistics.median',parameters}).exact,'4');
  assert.equal(solveProblem({task:'statistics.range',parameters}).exact,'4');
  assert.equal(solveProblem({task:'statistics.population-sd',parameters}).exact,'√(2)');
  assert.equal(solveProblem({task:'statistics.population-sd',parameters:{values:[3,3,3]}}).answer,'Population standard deviation = 0');
  assert.equal(solveProblem({task:'statistics.mean',parameters:{values:[0,0,1]}}).exact,'1/3');
  assert.equal(solveProblem({task:'statistics.median',parameters:{values:[10,-2,3]}}).exact,'3');
  assert.deepEqual(parameters.values,[2,4,4,6]);
});
test('binomial steps preserve small positives, endpoint certainty and fractional expectation',()=>{
  const parameters={n:5,p:.2,k:1};
  assert.match(solveProblem({task:'probability.exactly-k',parameters}).answer,/0.4096/);
  assert.equal(solveProblem({task:'probability.expected',parameters}).exact,'1');
  assert.equal(solveProblem({task:'probability.expected',parameters:{n:5,p:.2}}).exact,'1');
  assert.equal(solveProblem({task:'probability.expected',parameters:{n:3,p:.5,k:0}}).exact,'1.5');
  assert.equal(solveProblem({task:'probability.exactly-k',parameters:{n:3,p:0,k:0}}).exact,'1');
  assert.equal(solveProblem({task:'probability.exactly-k',parameters:{n:3,p:1,k:0}}).exact,'0');
  assert.notEqual(solveProblem({task:'probability.exactly-k',parameters:{n:30,p:.01,k:30}}).approximation,'0');
});
test('validation rejects unsupported tasks, missing fields and each numeric boundary failure',()=>{
  assert.equal(taskIds.filter(task=>!task.startsWith('basic.')).length,11);
  for(const candidate of [null,{}, {task:'unknown',parameters:{}}, {task:'linear.solve',parameters:{m:1,b:0}}, {task:'linear.solve',parameters:{m:11,b:0,t:1}}, {task:'linear.evaluate',parameters:{m:1,b:0,x:.001}}, {task:'calculus.tangent',parameters:{a:6,b:0,c:0,x0:0}}, {task:'calculus.evaluate',parameters:{a:1,b:0,c:0,x0:4}}, {task:'statistics.mean',parameters:{values:[1,2]}}, {task:'statistics.median',parameters:{values:[1,2,Infinity]}}, {task:'probability.expected',parameters:{n:0,p:.5,k:0}}, {task:'probability.exactly-k',parameters:{n:3,p:.5,k:4}}, {task:'probability.expected',parameters:{n:3,p:.001,k:0}}, {task:'linear.solve',parameters:{m:NaN,b:0,t:1}}]) assert.ok(validateProblem(candidate));
  assert.throws(()=>solveProblem({task:'linear.solve',parameters:{m:Infinity,b:0,t:1}}));
  assert.equal(validateProblem({task:'statistics.mean',parameters:{values:Array(3)}})===null,false);
  assert.ok(validateProblem({task:'probability.expected',parameters:{n:3,p:.5,k:null}}));
  assert.ok(validateProblem({task:'probability.expected',parameters:{n:3,p:.5,k:4}}));
  assert.equal(formatProblem({task:'linear.solve',parameters:{m:3,b:-2,t:10}}),'3x − 2 = 10');
});

test('worked steps expose arithmetic intermediates and avoid endpoint zero powers',()=>{
  const line=solveProblem({task:'linear.evaluate',parameters:{m:-.5,b:3,x:4}});
  assert.equal(line.steps[1].expression,'(-0.5) × (4) = -2');
  assert.equal(line.steps[2].expression,'y = -2 + (3) = 1');
  const even=solveProblem({task:'statistics.median',parameters:{values:[9,1,3,5]}});
  assert.equal(even.steps[1].expression,'Median = (3 + (5)) / 2 = 4');
  const odd=solveProblem({task:'statistics.median',parameters:{values:[9,1,3]}});
  assert.match(odd.steps[1].expression,/Position \(3 \+ 1\) \/ 2 = 2; median = 3/);
  const sd=solveProblem({task:'statistics.population-sd',parameters:{values:[2,4,4,6]}});
  assert.equal(sd.steps[1].expression,'Σ(xᵢ − μ)² = 8');
  assert.equal(sd.steps[2].expression,'σ² = (8) / 4 = 2');
  assert.match(sd.steps[1].reason,/\(2 − \(4\)\)² = 4/);
  const fractional=solveProblem({task:'statistics.population-sd',parameters:{values:[0,0,1]}});
  assert.equal(fractional.steps[1].expression,'Σ(xᵢ − μ)² = 2/3');
  assert.equal(fractional.steps[2].expression,'σ² = (2/3) / 3 = 2/9');
  const chance=solveProblem({task:'probability.exactly-k',parameters:{n:5,p:.2,k:1}});
  assert.equal(chance.steps[1].expression,'C(5, 1) = 5');
  assert.equal(chance.steps[2].expression,'(0.2)^1 ≈ 0.2; (1 − 0.2)^4 ≈ 0.4096');
  for(const p of [0,1])for(const k of [0,3]) {
    const endpoint=solveProblem({task:'probability.exactly-k',parameters:{n:3,p,k}});
    assert.equal(endpoint.steps.length,1);
    assert.doesNotMatch(JSON.stringify(endpoint.steps),/\^0|binomial formula/);
  }
  assert.equal(solveProblem({task:'statistics.mean',parameters:{values:[1,2,2]}}).steps[0].expression,'N = 3');
});
