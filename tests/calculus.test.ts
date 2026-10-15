import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCalculusNotes, calculusExplanation, calculusPracticeQuestions, calculusSamples, derivativeAt, derivativeText, formatCalculusNumber, matchingCalculusSources, parseCalculusValue, quadraticAt, quadraticText, tangentAt, tangentText } from '../src/calculus.ts';
import { checkPracticeAnswer } from '../src/practice.ts';

test('quadratic, derivative and tangent agree at the evaluation point', () => {
  const params = { a: 1, b: 0, c: 0, x0: 1 };
  assert.equal(quadraticAt(params, 1), 1);
  assert.equal(derivativeAt(params, 1), 2);
  assert.equal(tangentAt(params, 2), 3);
  assert.equal(tangentText(params), 'T(x) = 2x − 1');
  assert.equal(derivativeText(params), 'f′(x) = 2x');
  assert.equal(derivativeAt({ ...params, x0: 0 }, 0), 0);
  for (const sample of [{ a: -.5, b: 1, c: 2, x0: -.25 }, { a: 0, b: -2, c: 3, x0: -3 }, { a: 0, b: 0, c: 0, x0: 0 }]) {
    assert.equal(tangentAt(sample, sample.x0), quadraticAt(sample, sample.x0));
    assert.ok(Math.abs(tangentAt(sample, sample.x0 + 1) - tangentAt(sample, sample.x0) - derivativeAt(sample, sample.x0)) < 1e-9);
  }
});
test('finite decimal bounds are explicit and numeric displays preserve small values', () => {
  for (const raw of ['', '-', 'NaN', 'Infinity', '2+3', '1/2', '1e2', '5.01', '-5.01', '.001']) assert.ok(parseCalculusValue(raw, 'a').error, raw);
  assert.ok(parseCalculusValue('3.01', 'x0').error);
  assert.equal(parseCalculusValue('-5', 'b').value, -5);
  assert.equal(parseCalculusValue('3', 'x0').value, 3);
  assert.equal(parseCalculusValue('-0', 'c').value, 0);
  assert.equal(formatCalculusNumber(quadraticAt({ a: .01, b: 0, c: 0, x0: .01 }, .01)), '0.000001');
  assert.equal(quadraticText({ a: -1, b: 1, c: -2, x0: 0 }), 'f(x) = −x² + x − 2');
  assert.equal(quadraticText({ a: 0, b: 0, c: 0, x0: 0 }), 'f(x) = 0');
  assert.match(calculusExplanation({ a: 0, b: 2, c: 1, x0: 1 }), /slope does not change/);
});
test('recognition is narrow, duplicate references are local and x0 is not extracted', () => {
  assert.deepEqual(analyzeCalculusNotes('Example:\nf(x) = -0.5x² + x + 2\ny = -0.5x^2 + 1x + 2'), { kind: 'recognized', parameters: { a: -.5, b: 1, c: 2 }, lineNumbers: [2, 3] });
  assert.deepEqual(analyzeCalculusNotes('f(x)=0x^2-2x+3'), { kind: 'recognized', parameters: { a: 0, b: -2, c: 3 }, lineNumbers: [1] });
  assert.deepEqual(matchingCalculusSources('f(x)=x^2', { a: 1, b: 0, c: 0, x0: -3 }), [1]);
  assert.deepEqual(matchingCalculusSources('f(x)=x^2', { a: 2, b: 0, c: 0, x0: -3 }), []);
  assert.equal(analyzeCalculusNotes('f(x)=x^2\nf(x)=-x^2').kind, 'ambiguous');
  assert.equal(analyzeCalculusNotes('Explore a quadratic and its derivative.').kind, 'manual');
  assert.equal(analyzeCalculusNotes('f(x)=ax²+bx+c').kind, 'manual');
  assert.equal(analyzeCalculusNotes(' ').kind, 'empty');
  calculusSamples.forEach(sample => assert.equal(analyzeCalculusNotes(sample.notes).kind, 'recognized'));
});
test('unsupported functions, precision, reorderings and trailing expressions never get guessed', () => {
  for (const notes of ['f(x)=sin(x)', 'f(x)=x^3', 'f(x)=sqrt(x)', 'f(x)=x^2+1/x', 'f(x)=x^2+2x+6', 'f(x)=.001x^2', 'f(x)=2+x^2', 'f(x)=x^2; run()', 'f(x)=x^2\nx0=1', 'Study integrals', 'f(x)=x^2\ny=x^3', 'f(x)=x^2\ng(x)=x+1', 'x'.repeat(6001)]) assert.equal(analyzeCalculusNotes(notes).kind, 'unsupported', notes.slice(0, 40));
});
test('practice distinguishes curve value, derivative and tangent value', () => {
  const params = { a: 1, b: 0, c: 0, x0: 1 };
  const questions = calculusPracticeQuestions(params);
  assert.deepEqual(questions.map(question => question.id), ['value', 'slope', 'intercept']);
  assert.deepEqual(questions.map(question => question.expected), [1, 2, 3]);
  assert.equal(checkPracticeAnswer(questions[2], '4').status, 'incorrect');
  assert.match(questions[2].reasoning, /tangent, not the curve/);
  assert.equal(checkPracticeAnswer(questions[0], '1.005').status, 'correct');
  assert.equal(checkPracticeAnswer(questions[0], '1.005001').status, 'incorrect');
  assert.equal(checkPracticeAnswer(questions[0], '1/1').status, 'invalid');
});

test('a=0 numeric linear and constant forms retain exact provenance and displayed round trips', () => {
  for (const [notes, b, c] of [['f(x)=2x+1', 2, 1], ['y=-2x', -2, 0], ['f(x)=3', 0, 3], ['f(x)=-.25x-.75', -.25, -.75], ['y=0', 0, 0]] as const) {
    const parameters = { a: 0, b, c, x0: -1 };
    assert.deepEqual(analyzeCalculusNotes('Example\n' + notes), { kind: 'recognized', parameters: { a: 0, b, c }, lineNumbers: [2] });
    assert.deepEqual(matchingCalculusSources(notes, parameters), [1]);
    assert.deepEqual(analyzeCalculusNotes(quadraticText(parameters)), { kind: 'recognized', parameters: { a: 0, b, c }, lineNumbers: [1] });
    assert.equal(tangentAt(parameters, 2), quadraticAt(parameters, 2));
  }
  assert.deepEqual(analyzeCalculusNotes('f(x)=0x²+2x+1\nf(x)=2x+1'), { kind: 'recognized', parameters: { a: 0, b: 2, c: 1 }, lineNumbers: [1, 2] });
  assert.equal(analyzeCalculusNotes('f(x)=2x+1\nf(x)=3').kind, 'ambiguous');
  assert.deepEqual(matchingCalculusSources('f(x)=2x+1', { a: 0, b: 3, c: 1, x0: 0 }), []);
  for (const notes of ['f(x)=5.01x', 'y=-5.01', 'f(x)=.001', 'f(x)=2x+1/x', 'f(x)=2+1x', 'f(x)=sin(x)', 'Study x³', 'f(x)=3x^3', 'f(x)=3; alert(1)']) assert.equal(analyzeCalculusNotes(notes).kind, 'unsupported', notes);
});
