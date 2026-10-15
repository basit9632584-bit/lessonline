import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProbabilityLesson } from '../src/lesson.ts';
import { makeLessonHtml, parsePortableLesson, toPortableLesson } from '../src/export.ts';
function reviewedProbability(): ProbabilityLesson {
  return {version:2,kind:'probability',title:'Independent trials',notes:'Private teaching note\n\nBinomial: n=4, p=0.5, k=2',
    parameters:{n:4,p:.5,k:2},coefficientDrafts:{n:'4',p:'0.5',k:'2'},confirmed:true,
    explanation:'Four independent trials use the same success probability.', explanationOrigin:'template',
    explanationStale:false, sourceLineNumbers:[3],reviewed:true};
}
test('probability export requires current reviewed settings and agreement with drafts', () => {
  for (const change of [{reviewed:false},{confirmed:false},{explanationStale:true},{title:' '},{explanation:''},
    {parameters:{n:31,p:.5,k:2}},{parameters:{n:4,p:.501,k:2}},{parameters:{n:4,p:.5,k:5}},
    {coefficientDrafts:{n:'5',p:'0.5',k:'2'}},{explanationOrigin:'nim' as const}]) assert.throws(() => toPortableLesson({...reviewedProbability(),...change}));
  assert.deepEqual(toPortableLesson(reviewedProbability()).parameters,{n:4,p:.5,k:2});
});
test('probability defaults are private and exact opt-in source references are rederived', () => {
  const lesson = reviewedProbability(), data = toPortableLesson(lesson);
  assert.deepEqual(Object.keys(data).sort(),['version','kind','title','parameters','explanation','explanationOrigin','reviewed'].sort());
  assert.deepEqual(Object.keys(data.parameters).sort(),['n','p','k'].sort());
  assert.ok(!JSON.stringify(data).includes('Private teaching note'));
  const shared = toPortableLesson(lesson,true);
  assert.equal(shared.sourceNotes,lesson.notes); assert.deepEqual(shared.sourceLineNumbers,[3]);
  assert.deepEqual(parsePortableLesson(JSON.stringify(shared)),shared);
  assert.equal(parsePortableLesson(JSON.stringify({...shared,sourceLineNumbers:[1]})),null);
  assert.equal(parsePortableLesson(JSON.stringify({...shared,sourceLineNumbers:[3,3]})),null);
  assert.equal(parsePortableLesson(JSON.stringify({...shared,sourceNotes:'Binomial: n=5, p=0.5, k=2',sourceLineNumbers:[1]})),null);
});
test('probability portable validation rejects invalid n p k kind origin and strips unknown fields', () => {
  const data = toPortableLesson(reviewedProbability());
  for (const change of [{kind:'unknown'},{version:3},{explanationOrigin:'nim'}, {parameters:{}},
    {parameters:{n:'4',p:.5,k:2}}, {parameters:{n:0,p:.5,k:0}},{parameters:{n:31,p:.5,k:2}},
    {parameters:{n:4.5,p:.5,k:2}},{parameters:{n:4,p:-.01,k:2}},{parameters:{n:4,p:1.01,k:2}},
    {parameters:{n:4,p:.001,k:2}},{parameters:{n:4,p:null,k:2}},{parameters:{n:4,p:Infinity,k:2}},
    {parameters:{n:4,p:.5,k:-1}},{parameters:{n:4,p:.5,k:5}},{parameters:{n:4,p:.5,k:1.5}}]) assert.equal(parsePortableLesson(JSON.stringify({...data,...change})),null);
  assert.deepEqual(parsePortableLesson(JSON.stringify({...data,parameters:{n:4,p:.5,k:2,apiKey:'secret'},apiKey:'secret',notes:'private',coefficientDrafts:{n:'4'}})),data);
  for (const parameters of [{n:1,p:0,k:0},{n:1,p:1,k:1},{n:30,p:.99,k:30}]) assert.ok(parsePortableLesson(JSON.stringify({...data,parameters})));
});
test('probability artifact preserves independent original settings and safely escapes text', () => {
  const lesson = reviewedProbability(), data = toPortableLesson(lesson);
  data.parameters.n = 5;
  assert.deepEqual(lesson.parameters,{n:4,p:.5,k:2});
  const hostile = '</script><script>alert("test")</script> & \u2028\u2029';
  const safe = toPortableLesson({...lesson,title:'</title><script>bad</script>',explanation:hostile});
  const html = makeLessonHtml(safe,{js:'(()=>{const s="</script>";})();',css:'body{color:black}',licenses:'MIT'});
  const embedded = html.match(/<script id="lesson-data" type="application\/json">([\s\S]*?)<\/script>/)![1];
  assert.deepEqual(JSON.parse(embedded),safe); assert.ok(!/[<>&\u2028\u2029]/.test(embedded));
  assert.deepEqual(JSON.parse(embedded).parameters,{n:4,p:.5,k:2});
  assert.ok(!embedded.includes('coefficientDrafts')); assert.match(html,/connect-src 'none'/);
});
