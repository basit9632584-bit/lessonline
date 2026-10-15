import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyLesson, emptyCalculusLesson, isCalculusLesson, DRAFT_KEY, CURRENT_DRAFT_KEY, canReview, matchingSources, parseStoredLesson, templateExplanation } from '../src/lesson.ts';

test('draft loading rejects corrupt or oversized math and preserves valid lesson edits', () => {
  const lesson = emptyLesson();
  lesson.notes = 'Slope and intercept\ny = -0.5x + 3';
  lesson.parameters = { m: -0.5, b: 3 };
  lesson.coefficientDrafts = { m: '-0.5', b: '3' };
  lesson.confirmed = true;
  lesson.explanation = 'Move one step right; y decreases by 0.5.';
  lesson.reviewed = true;
  lesson.sourceLineNumbers = [2];
  assert.deepEqual(parseStoredLesson(JSON.stringify(lesson)), lesson);
  assert.equal(parseStoredLesson('{broken'), null);
  assert.equal(parseStoredLesson(JSON.stringify({ ...lesson, version: 99 })), null);
  assert.equal(parseStoredLesson(JSON.stringify({ ...lesson, parameters: { m: 100, b: 3 } })), null);
  assert.equal(parseStoredLesson(JSON.stringify({ ...lesson, sourceLineNumbers: [20] })), null);
  assert.equal(parseStoredLesson(JSON.stringify({ ...lesson, notes: 'x'.repeat(6001) })), null);
  const invalidDraft = parseStoredLesson(JSON.stringify({ ...lesson, coefficientDrafts: { m: '-', b: '3' } }))!;
  assert.equal(invalidDraft.coefficientDrafts.m, '-');
  assert.equal(invalidDraft.confirmed, false);
  assert.equal(invalidDraft.reviewed, false);
});

test('review and source context require confirmed values and supported notes', () => {
  const lesson = emptyLesson();
  assert.equal(canReview(lesson), false);
  assert.deepEqual(matchingSources('Example\ny = 2x + 1', 2, 1), [2]);
  assert.deepEqual(matchingSources('Example\ny = 2x + 1', 3, 1), []);
  lesson.notes = 'y = x^2';
  lesson.confirmed = true;
  lesson.explanation = 'A draft';
  assert.equal(canReview(lesson), false);
  assert.match(templateExplanation(0, -2), /y stays the same/);
  assert.match(templateExplanation(-0.5, 3), /decreases by 0.5/);
});

test('maximum valid text survives JSON escaping during draft persistence', () => {
  const lesson = emptyLesson();
  lesson.notes = '"'.repeat(6000);
  lesson.explanation = '"'.repeat(2400);
  const raw = JSON.stringify(lesson);
  assert.ok(raw.length > 16000);
  assert.deepEqual(parseStoredLesson(raw), lesson);
});

test('v2 calculus storage preserves v1 contract and distinct recovery keys', () => {
  assert.equal(DRAFT_KEY, 'lessonline-draft-v1');
  assert.equal(CURRENT_DRAFT_KEY, 'lessonline-draft-v2');
  const lesson = emptyCalculusLesson();
  lesson.notes = 'A changing slope\nf(x) = x^2';
  lesson.coefficientDrafts = { a: '1', b: '0', c: '0', x0: '1' };
  lesson.confirmed = true;
  lesson.explanation = 'At position 1, the exact tangent slope is 2.';
  lesson.reviewed = true;
  lesson.sourceLineNumbers = [2];
  const restored = parseStoredLesson(JSON.stringify(lesson));
  assert.deepEqual(restored, lesson);
  assert.ok(restored && isCalculusLesson(restored));
  assert.equal(canReview(lesson), true);
  const changedPoint = { ...lesson, parameters: { ...lesson.parameters, x0: -1 }, coefficientDrafts: { ...lesson.coefficientDrafts, x0: '-1' } };
  assert.deepEqual(parseStoredLesson(JSON.stringify(changedPoint))?.sourceLineNumbers, [2]);
});
test('calculus restores only validated fields and revokes stale or unsupported review', () => {
  const lesson = emptyCalculusLesson();
  lesson.notes = 'f(x)=x^2'; lesson.confirmed = true; lesson.reviewed = true;
  lesson.explanation = 'A draft'; lesson.coefficientDrafts = { a: '1', b: '0', c: '0', x0: '1' };
  for (const changed of [{ kind: 'unknown' }, { explanationOrigin: 'nim' }, { parameters: { ...lesson.parameters, a: 5.01 } }, { parameters: { ...lesson.parameters, x0: 3.01 } }, { sourceLineNumbers: [2] }, { sourceLineNumbers: [0] }]) assert.equal(parseStoredLesson(JSON.stringify({ ...lesson, ...changed })), null);
  const invalidDraft = parseStoredLesson(JSON.stringify({ ...lesson, coefficientDrafts: { ...lesson.coefficientDrafts, x0: '-' } }))!;
  assert.equal(invalidDraft.confirmed, false); assert.equal(invalidDraft.reviewed, false);
  const stale = parseStoredLesson(JSON.stringify({ ...lesson, explanationStale: true }))!;
  assert.equal(stale.reviewed, false);
  const unsupported = parseStoredLesson(JSON.stringify({ ...lesson, notes: 'f(x)=sin(x)' }))!;
  assert.equal(unsupported.reviewed, false);
  const withExtra = parseStoredLesson(JSON.stringify({ ...lesson, unexpected: 'ignored', parameters: { ...lesson.parameters, unknown: 123 } }))!;
  assert.equal(Object.hasOwn(withExtra, 'unexpected'), false);
  assert.equal(Object.hasOwn(withExtra.parameters, 'unknown'), false);
});
