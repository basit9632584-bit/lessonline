import test from 'node:test';import assert from 'node:assert/strict';import {candidates,draftsFor,boundsFor,fields} from '../src/question-state.ts';
test('shared candidate validation is atomic across requested operations and bounds',()=>{
 const tasks=['linear.solve','linear.evaluate'] as const;assert.deepEqual(fields([...tasks]),['m','b','t','x']);
 const drafts={m:'2',b:'1',t:'7',x:'3'};const valid=candidates([...tasks],drafts);assert.equal(valid.error,null);assert.equal(valid.problems.length,2);
 assert.ok(candidates([...tasks],{...drafts,x:'bad'}).error);assert.deepEqual(valid.problems[0].parameters,{m:2,b:1,t:7});
 assert.ok(candidates(['probability.exactly-k','probability.expected'],{n:'2',p:'.5',k:'3'}).error);
 assert.equal(candidates(['probability.expected'],{n:'3',p:'.5'}).error,null);
 assert.deepEqual(boundsFor('k',[{task:'probability.exactly-k',parameters:{n:2,p:.5,k:1}}]),{min:0,max:2,step:1});
 assert.deepEqual(boundsFor('values',[]),{min:-100,max:100,step:.01});
});
test('statistics and calculus controls reconstruct current values without losing order/precision',()=>{
 const result=candidates(['statistics.mean','statistics.median'],{values:'9, -2, 9, 3'});assert.equal(result.error,null);assert.deepEqual(draftsFor(result.problems[0]),{values:'9, -2, 9, 3'});
 const calculus=candidates(['calculus.tangent'],{a:'.01',b:'-1',c:'2',x0:'3'});assert.equal(calculus.error,null);assert.deepEqual(boundsFor('a',calculus.problems),{min:-5,max:5,step:.01});assert.deepEqual(boundsFor('x0',calculus.problems),{min:-3,max:3,step:.01});assert.ok(candidates(['calculus.tangent'],{a:'.001',b:'0',c:'0',x0:'1'}).error);
});
