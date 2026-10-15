import test from 'node:test';
import assert from 'node:assert/strict';
import { canReview, emptyProbabilityLesson, isProbabilityLesson, parseStoredLesson } from '../src/lesson.ts';
import { probabilityExplanation } from '../src/probability.ts';
function reviewed() {
  const lesson = emptyProbabilityLesson(); lesson.notes = 'Independent trials\nBinomial: n=4, p=0.5, k=2';
  lesson.coefficientDrafts = { n: '4', p: '.5', k: '2' }; lesson.confirmed = true;
  lesson.explanation = probabilityExplanation(lesson.parameters); lesson.explanationOrigin = 'template'; lesson.reviewed = true; lesson.sourceLineNumbers = [2];
  return lesson;
}
test('probability storage restores known fields and locally reconstructs source references', () => {
  const lesson = reviewed(); assert.equal(canReview(lesson), true);
  assert.deepEqual(parseStoredLesson(JSON.stringify(lesson)), lesson);
  const loaded = parseStoredLesson(JSON.stringify({ ...lesson, privateField: 'do not retain', parameters: { ...lesson.parameters, privateField: 7 }, sourceLineNumbers: [1] }))!;
  assert.ok(isProbabilityLesson(loaded));
  assert.equal(Object.hasOwn(loaded, 'privateField'), false);
  assert.equal(Object.hasOwn(loaded.parameters, 'privateField'), false);
  assert.deepEqual(loaded.sourceLineNumbers, [2]);
});
test('invalid parameters/NIM are rejected and stale/mismatched confirmation revoked', () => {
  const lesson = reviewed();
  for (const change of [{ kind: 'unknown' }, { explanationOrigin: 'nim' }, { parameters: { n: 4, p: .5, k: 5 } }, { parameters: { n: 0, p: .5, k: 0 } }, { parameters: { n: 4, p: .001, k: 2 } }, { parameters: { n: 4.5, p: .5, k: 2 } }, { sourceLineNumbers: [99] }]) assert.equal(parseStoredLesson(JSON.stringify({ ...lesson, ...change })), null);
  for (const coefficientDrafts of [{ n: '3', p: '.5', k: '2' }, { n: '4', p: '.6', k: '2' }, { n: '4', p: '.5', k: '5' }, { n: '', p: '.5', k: '2' }]) {
    assert.equal(canReview({ ...lesson, coefficientDrafts }), false);
    const loaded = parseStoredLesson(JSON.stringify({ ...lesson, coefficientDrafts }))!;
    assert.equal(loaded.confirmed, false); assert.equal(loaded.reviewed, false);
  }
  assert.equal(parseStoredLesson(JSON.stringify({ ...lesson, explanationStale: true }))?.reviewed, false);
  assert.equal(parseStoredLesson(JSON.stringify({ ...lesson, notes: 'Notes\nBinomial: n=4, p=.5, k=9' }))?.reviewed, false);
});
