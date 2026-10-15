import test from 'node:test';
import assert from 'node:assert/strict';
import { canReview, emptyStatisticsLesson, isStatisticsLesson, parseStoredLesson } from '../src/lesson.ts';
import { statisticsExplanation } from '../src/statistics.ts';

function reviewed() {
  const lesson = emptyStatisticsLesson();
  lesson.notes = 'Example\nData: 2, 4, 4, 4, 5, 5, 7, 9';
  lesson.datasetDraft = '2, 4, 4, 4, 5, 5, 7, 9';
  lesson.confirmed = true; lesson.reviewed = true; lesson.explanationOrigin = 'template';
  lesson.explanation = statisticsExplanation(lesson.parameters); lesson.sourceLineNumbers = [2];
  return lesson;
}
test('statistics draft restores validated values and only known fields', () => {
  const lesson = reviewed();
  assert.equal(canReview(lesson), true);
  assert.deepEqual(parseStoredLesson(JSON.stringify(lesson)), lesson);
  const loaded = parseStoredLesson(JSON.stringify({ ...lesson, coefficientDrafts: { m: 'secret unrelated field' }, parameters: { ...lesson.parameters, extra: 4 } }))!;
  assert.ok(isStatisticsLesson(loaded));
  assert.equal(Object.hasOwn(loaded, 'coefficientDrafts'), false);
  assert.equal(Object.hasOwn(loaded.parameters, 'extra'), false);
  const forgedSource = parseStoredLesson(JSON.stringify({ ...lesson, sourceLineNumbers: [1] }))!;
  assert.deepEqual(forgedSource.sourceLineNumbers, [2]);
});
test('bad statistics storage is rejected and confirmed mismatch/stale review revoked', () => {
  const lesson = reviewed();
  for (const change of [{ parameters: { values: [1, 2] } }, { parameters: { values: [1, 2, 100.01] } }, { parameters: { values: [1, 2, .001] } }, { parameters: { values: ['1', 2, 3] } }, { explanationOrigin: 'nim' }, { sourceLineNumbers: [99] }, { datasetDraft: 'x'.repeat(513) }]) assert.equal(parseStoredLesson(JSON.stringify({ ...lesson, ...change })), null);
  for (const change of [{ datasetDraft: '1,2,3' }, { datasetDraft: 'bad' }, { explanationStale: true }, { notes: 'Example\nData: 1,2,1000' }]) {
    const restored = parseStoredLesson(JSON.stringify({ ...lesson, ...change }))!;
    assert.equal(restored.reviewed, false);
    if ('datasetDraft' in change) assert.equal(restored.confirmed, false);
  }
});

test('review readiness requires the exact confirmed ordered dataset draft', () => {
  const lesson = reviewed();
  assert.equal(canReview({ ...lesson, datasetDraft: 'bad' }), false);
  assert.equal(canReview({ ...lesson, datasetDraft: '2,4,4,4,5,5,7,10' }), false);
  assert.equal(canReview({ ...lesson, datasetDraft: '9,7,5,5,4,4,4,2' }), false);
  assert.equal(canReview({ ...lesson, datasetDraft: '2 4 4 4 5 5 7 9' }), true);
});
