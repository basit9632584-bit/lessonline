import test from 'node:test';
import assert from 'node:assert/strict';
import {recognizeQuestion} from '../src/recognition.ts';
import {solveProblem} from '../src/solution.ts';
import {validateProblem} from '../src/problem.ts';
import type {Problem,TaskId} from '../src/problem.ts';
import {candidates} from '../src/question-state.ts';
import {portableQuestion,parsePortableQuestion,makeQuestionHtml} from '../src/question-export.ts';
function recognized(source:string):Problem {const result=recognizeQuestion(source);assert.equal(result.kind,'recognized',source);if(result.kind!=='recognized')throw Error(source);assert.equal(result.problems.length,1);return result.problems[0];}
test('six basic routes recognize whole canonical questions and solve independent exact examples',()=>{
 const cases:[string,TaskId,string][]=[['Calculate (12+8)/4','basic.arithmetic','5'],['Simplify 12/18','basic.fraction-simplify','2/3'],['What is 20% of 150?','basic.percent-of','30'],['Increase 200 by 15%','basic.percent-increase','230'],['Decrease 200 by 15%','basic.percent-decrease','170'],['Calculate 2 raised to the power 5.','basic.power','32']];
 for(const [source,task,exact] of cases){const problem=recognized(source);assert.equal(problem.task,task);assert.equal(solveProblem(problem).exact,exact);const restored=parsePortableQuestion(JSON.stringify(portableQuestion([problem],[problem],source)));assert.ok(restored);assert.deepEqual(solveProblem(restored.currentProblems[0]),solveProblem(problem));}
 for(const [source,exact] of [['1/3+0.1','13/30'],['-2^2','-4'],['(-2)^2','4'],['2^3^2','512'],['0.1+0.2','3/10']])assert.equal(solveProblem(recognized(source)).exact,exact);
});
test('basic recognition rejects tails, malformed expressions and bounds without partial extraction',()=>{
 for(const source of ['Calculate 2+3; then solve x=5','Simplify 12/18 and 1/2','What is 20% of 150 plus 10?','Increase 200 by 15%; decrease by 5%','Calculate 2 raised to the power 5 and 6','2+3<script>','2(3+4)','Math.random()','1e2+3','0x10+1','1.001+2','1/0','0^0','2^-1','2^0.5','2^11','10001+1'])assert.notEqual(recognizeQuestion(source).kind,'recognized',source);
});
test('candidate validation keeps expressions as strings and percentage shared values atomic',()=>{
 const arithmetic=candidates(['basic.arithmetic'],{expression:'1/2+3/4'});assert.equal(arithmetic.error,null);assert.equal(solveProblem(arithmetic.problems[0]).exact,'5/4');assert.ok(candidates(['basic.arithmetic'],{expression:'1/0'}).error);
 const tasks:TaskId[]=['basic.percent-of','basic.percent-increase','basic.percent-decrease'];const good=candidates(tasks,{amount:'200',rate:'15'});assert.equal(good.error,null);assert.deepEqual(good.problems.map(p=>solveProblem(p).exact),['30','230','170']);
 for(const drafts of [{amount:'200',rate:'101'},{amount:'-1',rate:'15'},{amount:'200',rate:'15.001'}])assert.ok(candidates(tasks,drafts).error);
 assert.ok(candidates(['basic.fraction-simplify'],{numerator:'12',denominator:'0'}).error);assert.ok(candidates(['basic.power'],{base:'0',exponent:'0'}).error);
});
test('portable arithmetic retains necessary expression but omits private source by default',()=>{
 const original=recognized('Calculate 1/2+3/4'),current=recognized('Calculate 1/3+0.1');const privateSource='PRIVATE CONTEXT </script><img src=x onerror=1>';
 const data=portableQuestion([original],[current],privateSource);assert.equal('sourceQuestion' in data,false);assert.equal((data.originalProblems[0].parameters as {expression:string}).expression,'1/2+3/4');assert.equal(solveProblem(data.currentProblems[0]).exact,'13/30');
 (data.currentProblems[0].parameters as {expression:string}).expression='2+2';assert.equal(solveProblem(original).exact,'5/4');assert.equal(solveProblem(data.originalProblems[0]).exact,'5/4');assert.equal(solveProblem(current).exact,'13/30');
 const included=portableQuestion([original],[current],privateSource,true);const html=makeQuestionHtml(included,{js:'console.log("</script>")',css:'body{}',licenses:'MIT'});const encoded=html.match(/<script id="question-data" type="application\/json">(.*?)<\/script>/s)?.[1];assert.ok(encoded);assert.deepEqual(JSON.parse(encoded),included);assert.ok(!encoded.includes('<img'));
});
test('portable schema rejects malformed basic types, private extras and inconsistent percent fields',()=>{
 const original=recognized('Calculate 1+2'),good=portableQuestion([original],[original],'');
 for(const parameters of [{expression:3},{expression:['1+2']},{expression:'1+2',notes:'private'},{expression:'1+2;alert(1)'},{expression:'1/0'}])assert.equal(parsePortableQuestion(JSON.stringify({...good,currentProblems:[{task:'basic.arithmetic',parameters}]})),null);
 for(const value of [{task:'basic.power',parameters:{base:'2',exponent:3}},{task:'basic.fraction-simplify',parameters:{numerator:1.5,denominator:2}},{task:'basic.percent-of',parameters:{amount:200,rate:Infinity}}])assert.ok(validateProblem(value));
 const conflicting:Problem[]=[{task:'basic.percent-of',parameters:{amount:200,rate:15}},{task:'basic.percent-increase',parameters:{amount:200,rate:20}}];assert.throws(()=>portableQuestion(conflicting,conflicting,''));
});
test('legacy recognized routes retain independent known answers and portable behavior',()=>{
 for(const [source,exact] of [['Solve 2x+1=7','3'],['Evaluate y=-0.5x+3 at x=4','1'],['Find the mean of 2,4,4,6','4'],['Binomial: n=5,p=0.2. Find expected successes','1']]){const p=recognized(source);assert.equal(solveProblem(p).exact,exact);const data=portableQuestion([p],[p],'private');assert.equal('sourceQuestion' in data,false);assert.deepEqual(solveProblem(parsePortableQuestion(JSON.stringify(data))!.currentProblems[0]),solveProblem(p));}
 const calculus=recognized('Find tangent for f(x)=-0.5x^2+x+2 at x0=2');assert.equal(solveProblem(calculus).exact,'T(x) = −x + 4');
});
