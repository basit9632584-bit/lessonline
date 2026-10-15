import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeProbabilityNotes, binomialProbability, expectedSuccesses, formatProbabilityNumber, formatProbabilityPercent, isValidProbabilityParameters, matchingProbabilitySources, parseProbabilityValue, probabilityDistribution, probabilityExplanation, probabilityMass, probabilityPracticeQuestions, probabilitySamples } from '../src/probability.ts';
import { checkPracticeAnswer } from '../src/practice.ts';

test('known binomial distribution and deterministic endpoints match mathematics', () => {
  assert.deepEqual(probabilityDistribution({ n: 4, p: .5, k: 2 }), [.0625, .25, .375, .25, .0625]);
  assert.equal(probabilityMass({ n: 4, p: .5, k: 2 }), .375);
  assert.equal(expectedSuccesses({ n: 4, p: .5, k: 2 }), 2);
  assert.deepEqual(probabilityDistribution({ n: 1, p: .2, k: 1 }), [.8, .2]);
  assert.deepEqual(probabilityDistribution({ n: 3, p: 0, k: 0 }), [1, 0, 0, 0]);
  assert.deepEqual(probabilityDistribution({ n: 3, p: 1, k: 3 }), [0, 0, 0, 1]);
  assert.equal(binomialProbability(30, 1, 29), 0);
  assert.equal(expectedSuccesses({ n: 3, p: .07, k: 0 }), .21);
});
test('all supported probability distributions are finite/nonnegative and sum to one', () => {
  for (let n = 1; n <= 30; n++) for (let percent = 0; percent <= 100; percent++) {
    const probabilities = probabilityDistribution({ n, p: percent / 100, k: 0 });
    assert.equal(probabilities.length, n + 1);
    probabilities.forEach(value => assert.ok(Number.isFinite(value) && value >= 0 && value <= 1));
    assert.ok(Math.abs(probabilities.reduce((sum, value) => sum + value, 0) - 1) <= 1e-12, `n=${n}, p=${percent / 100}`);
  }
});
test('parameter parsing rejects noninteger trials/counts and invalid probability bounds', () => {
  for (const [raw, key] of [['', 'n'], ['0', 'n'], ['31', 'n'], ['2.5', 'n'], ['-1', 'k'], ['2.5', 'k'], ['1.01', 'p'], ['.001', 'p'], ['50%', 'p'], ['1/2', 'p'], ['2+2', 'n'], ['1e1', 'n'], ['NaN', 'p'], ['Infinity', 'p']] as const) assert.ok(parseProbabilityValue(raw, key, 4).error, raw);
  assert.ok(parseProbabilityValue('5', 'k', 4).error);
  assert.ok(parseProbabilityValue('0', 'k', 0).error);
  assert.equal(parseProbabilityValue('30', 'n').value, 30);
  assert.equal(parseProbabilityValue('0', 'p').value, 0);
  assert.equal(parseProbabilityValue('1.00', 'p').value, 1);
  assert.equal(isValidProbabilityParameters({ n: 4, p: .5, k: 5 }), false);
  assert.equal(isValidProbabilityParameters({ n: '4', p: .5, k: 2 }), false);
  assert.throws(() => probabilityDistribution({ n: 4, p: .5, k: 5 }));
});
test('only labelled numeric parameter lines produce local ordered provenance', () => {
  const notes = 'Fixed independent trials\rBinomial: n=4, p=0.5, k=2\rBINOMIAL: n=4, p=.50, k=2';
  assert.deepEqual(analyzeProbabilityNotes(notes), { kind: 'recognized', parameters: { n: 4, p: .5, k: 2 }, lineNumbers: [2, 3] });
  assert.deepEqual(matchingProbabilitySources(notes, { n: 4, p: .5, k: 2 }), [2, 3]);
  assert.deepEqual(matchingProbabilitySources(notes, { n: 4, p: .5, k: 1 }), []);
  assert.equal(analyzeProbabilityNotes('Independent trials with two outcomes.').kind, 'manual');
  assert.equal(analyzeProbabilityNotes(' ').kind, 'empty');
  assert.equal(analyzeProbabilityNotes('Binomial: n=4, p=.5, k=1\nBinomial: n=4, p=.5, k=2').kind, 'ambiguous');
  for (const notes of ['Binomial: n=4, p=1/2, k=2', 'Binomial: n=4, p=.5, k=5', 'Binomial: n=31, p=.5, k=2', 'Binomial: n=4, p=.001, k=2', 'Binomial: p=.5, n=4, k=2', 'Binomial: 4, .5, 2', 'Binomial: n=4, p=.5, k=2; alert(1)', 'Study the normal distribution', 'Sampling without replacement', 'x'.repeat(6001)]) assert.equal(analyzeProbabilityNotes(notes).kind, 'unsupported', notes.slice(0, 50));
  probabilitySamples.forEach(sample => assert.equal(analyzeProbabilityNotes(sample.notes).kind, 'recognized'));
});
test('tiny positive chances remain visibly positive and practice asks decimals', () => {
  const tiny = binomialProbability(30, .01, 30);
  assert.ok(tiny > 0);
  assert.notEqual(formatProbabilityNumber(tiny), '0');
  assert.notEqual(formatProbabilityPercent(tiny), '0%');
  assert.equal(formatProbabilityNumber(0), '0'); assert.equal(formatProbabilityPercent(1), '100%');
  const params = { n: 4, p: .5, k: 2 };
  const questions = probabilityPracticeQuestions(params);
  assert.deepEqual(questions.map(question => question.id), ['value', 'slope', 'intercept']);
  assert.deepEqual(questions.map(question => question.expected), [.375, 2, .0625]);
  assert.equal(checkPracticeAnswer(questions[0], '.38').status, 'correct');
  assert.equal(checkPracticeAnswer(questions[0], '37.5').status, 'invalid');
  assert.equal(checkPracticeAnswer(questions[0], '37.5%').status, 'invalid');
  assert.match(probabilityExplanation(params), /independent trials/);
  assert.match(probabilityExplanation(params), /two outcomes/);
  assert.match(probabilityExplanation(params), /constant success probability/);
});

test('practice rejects answers outside probability and count ranges before tolerance', () => {
  const zero = probabilityPracticeQuestions({ n: 4, p: 1, k: 0 });
  const one = probabilityPracticeQuestions({ n: 4, p: 0, k: 0 });
  for (const question of [zero[0], zero[2], one[0], one[2]]) {
    assert.equal(checkPracticeAnswer(question, '-0.001').status, 'invalid');
    assert.equal(checkPracticeAnswer(question, '1.001').status, 'invalid');
  }
  assert.equal(checkPracticeAnswer(zero[0], '0.005').status, 'correct');
  assert.equal(checkPracticeAnswer(one[0], '0.995').status, 'correct');
  const fractionalCount = probabilityPracticeQuestions({ n: 3, p: .5, k: 1 })[1];
  assert.equal(checkPracticeAnswer(fractionalCount, '1.5').status, 'correct');
  assert.equal(checkPracticeAnswer(fractionalCount, '1.505').status, 'correct');
  assert.equal(checkPracticeAnswer(fractionalCount, '-0.001').status, 'invalid');
  assert.equal(checkPracticeAnswer(fractionalCount, '3.001').status, 'invalid');
  assert.equal(checkPracticeAnswer(fractionalCount, '3').status, 'incorrect');
});
