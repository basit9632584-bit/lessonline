import test from 'node:test';import assert from 'node:assert/strict';
import {portableQuestion,parsePortableQuestion,makeQuestionHtml} from '../src/question-export.ts';
import {solveProblem} from '../src/solution.ts';import type {Problem} from '../src/problem.ts';
const original:Problem[]=[{task:'linear.solve',parameters:{m:2,b:1,t:7}}];
const current:Problem[]=[{task:'linear.solve',parameters:{m:3,b:1,t:7}}];
test('portable solution preserves independent originals/current and omits all source text by default',()=>{
 const data=portableQuestion(original,current,'PRIVATE SOURCE');assert.equal('sourceQuestion' in data,false);assert.equal(solveProblem(data.currentProblems[0]).exact,'2');assert.equal(solveProblem(data.originalProblems[0]).exact,'3');
 data.currentProblems[0].parameters.m=4;assert.equal(original[0].parameters.m,2);assert.equal(current[0].parameters.m,3);assert.equal(data.originalProblems[0].parameters.m,2);
 assert.equal(portableQuestion(original,current,'Included source',true).sourceQuestion,'Included source');
});
test('all eleven task outputs survive validated portable roundtrip',()=>{
 const examples:Problem[]=[original[0],{task:'linear.evaluate',parameters:{m:1,b:2,x:3}},...(['calculus.derivative','calculus.evaluate','calculus.tangent'] as const).map(task=>({task,parameters:{a:1,b:0,c:0,x0:1}})),...(['statistics.mean','statistics.median','statistics.range','statistics.population-sd'] as const).map(task=>({task,parameters:{values:[2,4,4,6]}})),{task:'probability.exactly-k',parameters:{n:5,p:.2,k:1}},{task:'probability.expected',parameters:{n:5,p:.2}}];
 assert.equal(examples.length,11);for(const example of examples){const data=portableQuestion([example],[example],'');const restored=parsePortableQuestion(JSON.stringify(data));assert.ok(restored);assert.deepEqual(solveProblem(restored.currentProblems[0]),solveProblem(example));}
});
test('strict schema rejects altered tasks, private extras, invalid math and inconsistent shared parameters',()=>{
 const good=portableQuestion(original,current,'');
 for(const bad of [{...good,image:'data:image/png;base64,private'},{...good,sourceQuestion:'x'.repeat(6001)},{...good,version:2},{...good,currentProblems:[]},{...good,currentProblems:[{task:'linear.evaluate',parameters:{m:2,b:1,x:7}}]},{...good,currentProblems:[{task:'linear.solve',parameters:{m:11,b:1,t:7}}]},{...good,currentProblems:[{task:'linear.solve',parameters:{m:2,b:1,t:7,notes:'private'}}]},{...good,currentProblems:[{...current[0],explanation:'untrusted'}]}])assert.equal(parsePortableQuestion(JSON.stringify(bad)),null);
 const combined:Problem[]=[{task:'statistics.mean',parameters:{values:[1,2,3]}},{task:'statistics.median',parameters:{values:[1,2,4]}}];assert.throws(()=>portableQuestion(combined,combined,''));
 assert.throws(()=>portableQuestion([original[0],original[0]],[original[0],original[0]],''));assert.equal(parsePortableQuestion('x'.repeat(65537)),null);
});
test('HTML source/runtime remain inert and network is blocked by artifact CSP',()=>{
 const hostile='</script><img src=x onerror=alert(1)>&\u2028';const data=portableQuestion(original,current,hostile,true);
 const assets={js:'console.log("</script>");',css:'.test{color:red}',licenses:'</script> LICENSE'};
 const html=makeQuestionHtml(data,assets),embedded=html.match(/<script id="question-data" type="application\/json">(.*?)<\/script>/s)?.[1];assert.ok(embedded);assert.deepEqual(JSON.parse(embedded),data);assert.ok(!/[<>&\u2028\u2029]/.test(embedded));assert.match(html,/connect-src 'none'/);assert.doesNotMatch(html,/unsafe-eval/);
 assert.equal(JSON.parse(html.match(/<script id="question-runtime" type="application\/json">(.*?)<\/script>/s)![1]),assets.js);
 assert.throws(()=>makeQuestionHtml(data,{...assets,css:'</style><script>bad</script>'}));
});
