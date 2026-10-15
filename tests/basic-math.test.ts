import test from 'node:test';import assert from 'node:assert/strict';
import {basicDetails,basicLiterals,recognizeBasicQuestion,solveBasicProblem,validateBasicProblem,basicTaskIds} from '../src/basic-math.ts';
const expression=(expression:string)=>basicDetails({task:'basic.arithmetic',parameters:{expression}});
test('exact arithmetic obeys precedence, right-associative powers and unary signs',()=>{
 assert.equal(expression('0.1 + 0.2').exact,'3/10');assert.equal(expression('1/2 + 3/4').exact,'5/4');assert.match(expression('1/2+3/4').steps.at(-1)!.reason,/common denominator 4/);
 assert.equal(expression('2+3*4').exact,'14');assert.equal(expression('(2+3)*4').exact,'20');assert.equal(expression('2^3^2').exact,'512');assert.equal(expression('-3^2').exact,'-9');assert.equal(expression('(-3)^2').exact,'9');assert.equal(expression('10-3-2').exact,'5');assert.equal(expression('12/3/2').exact,'2');assert.equal(expression('3*-2').exact,'-6');assert.equal(expression('0^2').exact,'0');
});
test('arithmetic bounds reject unsafe or excessive input without evaluating it',()=>{
 for(const raw of ['1/0','0^0','2^-1','2^1.5','2^11','10001+1','.001+1','alert(1)','1+2;globalThis.x=1','Math.pow(2,3)','2x','(2+3','2(3)',Array(14).join('(')+'1'+Array(14).join(')'),Array(100).fill('1').join('+'),'1'.repeat(257),'(10000^10)^10'])assert.throws(()=>expression(raw),raw);
 assert.equal(expression('10000^10').exact,'1'+'0'.repeat(40));assert.equal(expression('-0').exact,'0');
});
test('fractions simplify gcd and normalize signs with actual equivalent cross-products',()=>{
 assert.equal(basicDetails({task:'basic.fraction-simplify',parameters:{numerator:12,denominator:18}}).exact,'2/3');
 assert.equal(basicDetails({task:'basic.fraction-simplify',parameters:{numerator:12,denominator:-18}}).exact,'-2/3');
 assert.equal(basicDetails({task:'basic.fraction-simplify',parameters:{numerator:0,denominator:-18}}).exact,'0');
 assert.ok(validateBasicProblem({task:'basic.fraction-simplify',parameters:{numerator:1,denominator:0}}));assert.ok(validateBasicProblem({task:'basic.fraction-simplify',parameters:{numerator:101,denominator:2}}));
});
test('percentages retain exact portions and correctly add/subtract from original amount',()=>{
 for(const [task,expected] of [['basic.percent-of','30'],['basic.percent-increase','230'],['basic.percent-decrease','170']] as const){const amount=task==='basic.percent-of'?150:200,rate=task==='basic.percent-of'?20:15;assert.equal(basicDetails({task,parameters:{amount,rate}}).exact,expected);}
 assert.equal(basicDetails({task:'basic.percent-decrease',parameters:{amount:200,rate:100}}).exact,'0');assert.equal(basicDetails({task:'basic.percent-increase',parameters:{amount:200,rate:0}}).exact,'200');assert.equal(basicDetails({task:'basic.percent-of',parameters:{amount:.1,rate:20}}).exact,'1/50');
 assert.ok(validateBasicProblem({task:'basic.percent-of',parameters:{amount:-1,rate:20}}));assert.ok(validateBasicProblem({task:'basic.percent-of',parameters:{amount:1,rate:101}}));
});
test('standalone powers handle signs and zero rules within distinct bounds',()=>{
 assert.equal(basicDetails({task:'basic.power',parameters:{base:-3,exponent:4}}).exact,'81');assert.equal(basicDetails({task:'basic.power',parameters:{base:-3,exponent:3}}).exact,'-27');assert.equal(basicDetails({task:'basic.power',parameters:{base:.5,exponent:2}}).exact,'1/4');assert.equal(basicDetails({task:'basic.power',parameters:{base:3,exponent:0}}).exact,'1');assert.ok(validateBasicProblem({task:'basic.power',parameters:{base:0,exponent:0}}));assert.ok(validateBasicProblem({task:'basic.power',parameters:{base:101,exponent:1}}));
});
test('whole-question recognizer preserves operation direction and rejects malicious tails',()=>{
 for(const [raw,expected] of [['Add 12 and 8','20'],['Subtract 8 from 12','4'],['Multiply 12 by 4','48'],['Divide 12 by 4','3'],['Simplify 12/18','2/3'],['What is 20% of 150?','30'],['Increase 200 by 15%','230'],['Decrease 200 by 15%','170'],['Calculate (-3)^4','81'],['0.1+0.2','3/10'],['2 to the power of 3','8']] as const){const recognized=recognizeBasicQuestion(raw);assert.equal(recognized?.kind,'recognized',raw);if(recognized?.kind==='recognized')assert.equal(solveBasicProblem(recognized.problems[0]).exact,expected);}
 assert.equal(recognizeBasicQuestion('Calculate 1+2; alert(1)')?.kind,'unsupported');assert.equal(recognizeBasicQuestion('Calculate')?.kind,'incomplete');assert.equal(recognizeBasicQuestion('Find the derivative of f(x)=x² at x=1'),null);assert.equal(recognizeBasicQuestion('Solve 2x + 1 = 7'),null);assert.equal(basicTaskIds.length,6);
});
test('dedicated power form and literal spans preserve grammar/signs for optional numeric controls',()=>{
 const recognized=recognizeBasicQuestion('Calculate 2 raised to the power 5.');assert.equal(recognized?.kind,'recognized');if(recognized?.kind==='recognized')assert.deepEqual(recognized.problems[0],{task:'basic.power',parameters:{base:2,exponent:5}});
 const source='-0.5 + (-3)^2';const spans=basicLiterals(source);assert.deepEqual(spans.map(s=>s.raw),['0.5','3','2']);for(const span of spans)assert.equal(source.slice(span.start,span.end),span.raw);assert.throws(()=>basicLiterals('2x+1'));
});
