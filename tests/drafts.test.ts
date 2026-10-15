import test from 'node:test';
import assert from 'node:assert/strict';
import { CURRENT_DRAFT_KEY, DRAFT_KEY, emptyCalculusLesson, emptyLesson, emptyStatisticsLesson, emptyProbabilityLesson } from '../src/lesson.ts';
import { draftSnapshot, readTopicDraft, saveTopicDraft, topicDraftKey } from '../src/drafts.ts';

function storage(entries: [string, string][] = []) {
  const data = new Map(entries);
  return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
}
test('saving statistics migrates the current calculus slot and preserves legacy algebra', () => {
  const calculus = emptyCalculusLesson(); calculus.notes = 'f(x) = x²'; calculus.sourceLineNumbers = [1];
  const linear = emptyLesson(); linear.notes = 'y = 2x + 1'; linear.sourceLineNumbers = [1];
  const old = JSON.stringify(linear);
  const store = storage([[CURRENT_DRAFT_KEY, JSON.stringify(calculus)], [DRAFT_KEY, old]]);
  const stats = emptyStatisticsLesson(); stats.notes = 'data: 2, 4, 4, 6, 9';
  saveTopicDraft(store, stats);
  assert.deepEqual(readTopicDraft(store, 'calculus'), calculus);
  assert.deepEqual(readTopicDraft(store, 'statistics'), stats);
  assert.deepEqual(readTopicDraft(store, 'linear'), linear);
  assert.equal(store.getItem(DRAFT_KEY), old);
});
test('each saved topic restores independently after subsequent explicit saves', () => {
  const store = storage();
  const linear = emptyLesson(), calculus = emptyCalculusLesson(), stats = emptyStatisticsLesson(), probability = emptyProbabilityLesson();
  linear.title = 'Saved line'; calculus.title = 'Saved curve'; stats.title = 'Saved dataset'; probability.title = 'Saved trials';
  for (const lesson of [linear, calculus, stats, probability]) saveTopicDraft(store, lesson);
  assert.equal(readTopicDraft(store, 'linear')?.title, 'Saved line');
  assert.equal(readTopicDraft(store, 'calculus')?.title, 'Saved curve');
  assert.equal(readTopicDraft(store, 'statistics')?.title, 'Saved dataset');
  assert.equal(readTopicDraft(store, 'probability')?.title, 'Saved trials');
});
test('reading corrupt storage does not overwrite it or mistake another topic for it', () => {
  const raw = '{broken';
  const store = storage([[topicDraftKey('statistics'), raw], [CURRENT_DRAFT_KEY, JSON.stringify(emptyCalculusLesson())]]);
  assert.equal(readTopicDraft(store, 'statistics'), null);
  assert.equal(store.getItem(topicDraftKey('statistics')), raw);
});
test('saved status survives reconstructed object order and still detects actual edits', () => {
  const lesson = emptyProbabilityLesson(), store = storage();
  const saved = saveTopicDraft(store, lesson);
  const restored = readTopicDraft(store, 'probability')!;
  assert.equal(draftSnapshot(restored), saved);
  assert.equal(draftSnapshot({ ...restored, parameters: { k: 2, p: .5, n: 4 } }), saved);
  assert.notEqual(draftSnapshot({ ...restored, title: 'New title' }), saved);
  assert.notEqual(draftSnapshot({ ...restored, coefficientDrafts: { n: '5', p: '', k: '' } }), saved);
  const statistics = emptyStatisticsLesson();
  assert.notEqual(draftSnapshot(statistics), draftSnapshot({ ...statistics, parameters: { values: [...statistics.parameters.values].reverse() } }));
});
