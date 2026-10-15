import test from 'node:test';
import assert from 'node:assert/strict';
import { ANSWER_TOLERANCE, checkPracticeAnswer, parsePracticeAnswer, practiceQuestions } from '../src/practice.ts';

test('three templates calculate from the current shared coefficients', () => {
  for (const [m, b, expected] of [[2, 1, 5], [-2, -1, -5], [0, 0, 0], [-.25, .75, .25], [10, 10, 30], [-10, -10, -30], [.29, -.13, .45]]) {
    const questions = practiceQuestions(m, b);
    assert.deepEqual(questions.map(question => question.id), ['value', 'slope', 'intercept']);
    assert.deepEqual(questions.map(question => question.expected), [expected, m, b]);
    questions.forEach(question => assert.equal(checkPracticeAnswer(question, String(question.expected)).status, 'correct'));
  }
});
test('strict decimal parsing rejects expressions, empty and nonfinite inputs', () => {
  for (const raw of ['', ' ', '-', 'NaN', 'Infinity', '1e2', '2+3', '1/2', '0x10', '1,2', '9'.repeat(129)]) {
    assert.equal(parsePracticeAnswer(raw), null, raw);
    assert.equal(checkPracticeAnswer(practiceQuestions(2, 1)[0], raw).status, 'invalid', raw);
  }
  for (const [raw, expected] of [['-0.25', -.25], ['.5', .5], ['+2', 2], [' 0 ', 0], ['2.00', 2]] as const) assert.equal(parsePracticeAnswer(raw), expected);
});
test('half-hundredth absolute tolerance includes boundaries without scale-dependent acceptance', () => {
  assert.equal(ANSWER_TOLERANCE, .005);
  const question = practiceQuestions(0, 0)[0];
  for (const raw of ['0.005', '-0.005', '0.0049']) assert.equal(checkPracticeAnswer(question, raw).status, 'correct');
  for (const raw of ['0.005001', '-0.005001', '1000000000000000']) assert.equal(checkPracticeAnswer(question, raw).status, 'incorrect');
  const decimalQuestion = practiceQuestions(.29, -.13)[0];
  assert.equal(checkPracticeAnswer(decimalQuestion, '0.455').status, 'correct');
  assert.equal(checkPracticeAnswer(decimalQuestion, '0.455001').status, 'incorrect');
});
test('feedback explains supported mathematics and separates invalid input', () => {
  const questions = practiceQuestions(-.25, .75);
  assert.match(checkPracticeAnswer(questions[0], '0').message, /Substitute x = 2/);
  assert.match(checkPracticeAnswer(questions[1], '-0.25').message, /negative sign/);
  assert.match(checkPracticeAnswer(questions[2], '.75').message, /x = 0/);
  assert.match(checkPracticeAnswer(practiceQuestions(0, 1)[1], '0').message, /horizontal line/);
  assert.match(checkPracticeAnswer(questions[0], '').message, /not been marked incorrect/);
});
