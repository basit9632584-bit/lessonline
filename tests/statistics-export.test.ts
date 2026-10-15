import assert from 'node:assert/strict';
import test from 'node:test';
import type { StatisticsLesson } from '../src/lesson.ts';
import { makeLessonHtml, parsePortableLesson, toPortableLesson } from '../src/export.ts';
function reviewedStatistics(): StatisticsLesson {
  return {version:2,kind:'statistics',title:'Mean and median',notes:'Private teaching note\n\nData: 1, 2, 3',
    parameters:{values:[1,2,3]},datasetDraft:'1, 2, 3',confirmed:true,
    explanation:'The mean and median are both 2.', explanationOrigin:'template',
    explanationStale:false, sourceLineNumbers:[3],reviewed:true};
}
test('statistics export requires current reviewed valid dataset and draft agreement', () => {
  for (const change of [{reviewed:false},{confirmed:false},{explanationStale:true},{title:' '},{explanation:''},
    {parameters:{values:[1,2]}},{parameters:{values:[1,2,100.01]}},{parameters:{values:[1,2,.001]}},
    {datasetDraft:'1, 2, 4'},{explanationOrigin:'nim' as const}]) assert.throws(() => toPortableLesson({...reviewedStatistics(),...change}));
  assert.deepEqual(toPortableLesson(reviewedStatistics()).parameters,{values:[1,2,3]});
});
test('statistics preserves dataset order/duplicates and omits notes and draft unless opted in', () => {
  const lesson = reviewedStatistics(), data = toPortableLesson(lesson);
  assert.deepEqual(Object.keys(data).sort(),['version','kind','title','parameters','explanation','explanationOrigin','reviewed'].sort());
  assert.deepEqual(Object.keys(data.parameters),['values']);
  assert.ok(!JSON.stringify(data).includes('Private teaching note'));
  const shared = toPortableLesson(lesson,true);
  assert.equal(shared.sourceNotes,lesson.notes); assert.deepEqual(shared.sourceLineNumbers,[3]);
  assert.deepEqual(parsePortableLesson(JSON.stringify(shared)),shared);
  assert.equal(parsePortableLesson(JSON.stringify({...shared,sourceLineNumbers:[1]})),null);
  assert.equal(parsePortableLesson(JSON.stringify({...shared,sourceLineNumbers:[3,3]})),null);
  assert.equal(parsePortableLesson(JSON.stringify({...shared,sourceNotes:'Data: 1, 2, 4',sourceLineNumbers:[1]})),null);
  const ordered = {...data,parameters:{values:[3,1,3]}};
  assert.deepEqual(parsePortableLesson(JSON.stringify(ordered))?.parameters,ordered.parameters);
});
test('statistics portable validation rejects malformed datasets/kinds/NIM and discards private extras', () => {
  const data = toPortableLesson(reviewedStatistics());
  for (const change of [{kind:'probability'},{version:3},{explanationOrigin:'nim'}, {parameters:{}},
    {parameters:{values:'1,2,3'}},{parameters:{values:[1,2,'3']}},{parameters:{values:[1,2,null]}},
    {parameters:{values:[1,2,Infinity]}},{parameters:{values:[1,2,-100.01]}},{parameters:{values:[1,2,0.001]}},
    {parameters:{values:[1,2]}},{parameters:{values:Array(21).fill(0)}},
    {sourceNotes:'Data: 1, 2, 3',sourceLineNumbers:[0]}]) assert.equal(parsePortableLesson(JSON.stringify({...data,...change})),null);
  assert.deepEqual(parsePortableLesson(JSON.stringify({...data,parameters:{values:[1,2,3],apiKey:'secret'},apiKey:'secret',notes:'private',datasetDraft:'private'})),data);
  for (const values of [[-100,0,100],Array(20).fill(0),[-.25,.5,.75]]) assert.ok(parsePortableLesson(JSON.stringify({...data,parameters:{values}})));
});
test('statistics artifact holds an independent original dataset for reset and escaped offline data', () => {
  const lesson = reviewedStatistics(), data = toPortableLesson(lesson);
  data.parameters.values[0] = 9;
  assert.deepEqual(lesson.parameters.values,[1,2,3]);
  const hostile = '</script><script>alert("test")</script> & \u2028\u2029';
  const safe = toPortableLesson({...lesson,title:'</title><script>bad</script>',explanation:hostile});
  const html = makeLessonHtml(safe,{js:'(()=>{const s="</script>";})();',css:'body{color:black}',licenses:'MIT'});
  const embedded = html.match(/<script id="lesson-data" type="application\/json">([\s\S]*?)<\/script>/)![1];
  assert.deepEqual(JSON.parse(embedded),safe); assert.ok(!/[<>&\u2028\u2029]/.test(embedded));
  assert.deepEqual(JSON.parse(embedded).parameters.values,[1,2,3]);
  assert.ok(!embedded.includes('datasetDraft')); assert.match(html,/connect-src 'none'/);
});
