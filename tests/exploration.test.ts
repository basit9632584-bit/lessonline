import test from 'node:test';import assert from 'node:assert/strict';
import { explorationModel } from '../src/exploration.ts';
test('linear solve window includes extreme answers and distinguishes all degenerate cases',()=>{
 const model=explorationModel({task:'linear.solve',parameters:{m:.01,b:-10,t:10}});assert.equal(model.kind,'linear');if(model.kind!=='linear')return;
 assert.deepEqual(model.point,{x:2000,y:10});assert.ok(model.bounds[0]<0&&model.bounds[2]>2000);assert.ok(model.bounds[3]<10&&model.bounds[1]>10);assert.ok(model.table.some(row=>row.x===2000&&row.y===10));
 for(const [b,t,status] of [[2,2,'infinite'],[2,3,'none']] as const){const m=explorationModel({task:'linear.solve',parameters:{m:0,b,t}});assert.equal(m.kind,'linear');if(m.kind==='linear'){assert.equal(m.status,status);assert.equal(m.point,null);}}
});
test('linear evaluation and calculus nearby values derive from the current parameters',()=>{
 const line=explorationModel({task:'linear.evaluate',parameters:{m:10,b:10,x:10}});if(line.kind!=='linear')throw Error();assert.deepEqual(line.point,{x:10,y:110});assert.ok(line.bounds[1]>110);
 const model=explorationModel({task:'calculus.tangent',parameters:{a:1,b:0,c:0,x0:1}});if(model.kind!=='calculus')throw Error();assert.equal(model.slope,2);assert.deepEqual(model.point,{x:1,y:1});assert.deepEqual(model.table.at(-1),{x:2,y:4,tangent:3});
});
test('statistics preserve original-order observations, numeric scale and duplicate stacks',()=>{
 const model=explorationModel({task:'statistics.mean',parameters:{values:[10,-2,10,3]}});if(model.kind!=='statistics')throw Error();assert.deepEqual(model.values,[10,-2,10,3]);assert.equal(model.summary.mean,5.25);assert.equal(model.summary.median,6.5);assert.equal(model.dots[2].level,1);assert.ok(model.axis.low< -2&&model.axis.high>10);
 const constant=explorationModel({task:'statistics.population-sd',parameters:{values:[0,0,0]}});if(constant.kind!=='statistics')throw Error();assert.equal(constant.summary.populationStdDev,0);assert.equal(constant.maxStack,3);assert.ok(constant.axis.high>constant.axis.low);
});
test('probability tables include every outcome, exact endpoints and no invented expected event',()=>{
 const expected=explorationModel({task:'probability.expected',parameters:{n:4,p:.5}});if(expected.kind!=='probability')throw Error();assert.equal(expected.selectedK,undefined);assert.deepEqual(expected.distribution,[.0625,.25,.375,.25,.0625]);assert.equal(expected.expected,2);
 const zero=explorationModel({task:'probability.exactly-k',parameters:{n:3,p:0,k:0}});if(zero.kind!=='probability')throw Error();assert.deepEqual(zero.distribution,[1,0,0,0]);assert.equal(zero.selectedK,0);
 const tiny=explorationModel({task:'probability.exactly-k',parameters:{n:30,p:.01,k:30}});if(tiny.kind!=='probability')throw Error();assert.ok(tiny.distribution[30]>0);assert.equal(tiny.distribution.length,31);
 assert.throws(()=>explorationModel({task:'linear.solve',parameters:{m:11,b:0,t:0}}));
});
