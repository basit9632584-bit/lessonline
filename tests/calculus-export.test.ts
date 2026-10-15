import assert from 'node:assert/strict';
import test from 'node:test';
import type { CalculusLesson } from '../src/lesson.ts';
import { makeLessonHtml, parsePortableLesson, toPortableLesson } from '../src/export.ts';
function reviewedCalculus(): CalculusLesson {
  return {version:2,kind:'calculus',title:'A changing slope',notes:'Private teaching note\n\nf(x) = x^2',
    parameters:{a:1,b:0,c:0,x0:1},coefficientDrafts:{a:'1',b:'0',c:'0',x0:'1'},confirmed:true,
    explanation:'At x = 1, the value is 1 and the derivative is 2.', explanationOrigin:'template',
    explanationStale:false, sourceLineNumbers:[3],reviewed:true};
}
test('calculus exports require a current reviewed bounded lesson', () => {
  for (const change of [{reviewed:false},{confirmed:false},{explanationStale:true},{notes:'f(x) = sin(x)'},
    {parameters:{a:5.01,b:0,c:0,x0:1}},{parameters:{a:1,b:0,c:0,x0:3.01}},
    {coefficientDrafts:{a:'2',b:'0',c:'0',x0:'1'}}]) assert.throws(() => toPortableLesson({...reviewedCalculus(),...change}));
  const data = toPortableLesson(reviewedCalculus());
  assert.equal(data.version,2); assert.equal(data.kind,'calculus'); assert.equal(data.reviewed,true);
});
test('calculus sources are private by default and opt-in provenance is exact', () => {
  const lesson = reviewedCalculus(), data = toPortableLesson(lesson);
  assert.deepEqual(Object.keys(data).sort(),['version','kind','title','parameters','explanation','explanationOrigin','reviewed'].sort());
  assert.ok(!JSON.stringify(data).includes('Private teaching note'));
  const shared = toPortableLesson(lesson,true);
  assert.equal(shared.sourceNotes,lesson.notes); assert.deepEqual(shared.sourceLineNumbers,[3]);
  assert.deepEqual(parsePortableLesson(JSON.stringify(shared)),shared);
  assert.equal(parsePortableLesson(JSON.stringify({...shared,sourceLineNumbers:[1]})),null);
  assert.equal(parsePortableLesson(JSON.stringify({...shared,sourceLineNumbers:[3,3]})),null);
  assert.equal(parsePortableLesson(JSON.stringify({...shared,sourceNotes:'f(x) = 2x^2',sourceLineNumbers:[1]})),null);
});
test('malformed calculus payloads reject limits, invalid kinds, unsupported origin and private extras', () => {
  const data = toPortableLesson(reviewedCalculus());
  for (const change of [{kind:'statistics'},{version:3},{explanationOrigin:'nim'},{parameters:{a:1,b:0,c:0}},
    {parameters:{a:1,b:0,c:0,x0:'1'}},{parameters:{a:Infinity,b:0,c:0,x0:1}},
    {parameters:{a:0.001,b:0,c:0,x0:1}},{parameters:{a:-5.01,b:0,c:0,x0:1}},
    {sourceNotes:'f(x)=sin(x)',sourceLineNumbers:[]}]) assert.equal(parsePortableLesson(JSON.stringify({...data,...change})),null);
  assert.deepEqual(parsePortableLesson(JSON.stringify({...data,apiKey:'secret',notes:'private',coefficientDrafts:{a:'1'}})),data);
  for (const parameters of [{a:0,b:-5,c:5,x0:-3},{a:-.25,b:.5,c:-.75,x0:0}]) {
    assert.ok(parsePortableLesson(JSON.stringify({...data,parameters})));
  }
});
test('calculus HTML keeps hostile lesson text inert with offline CSP preserved', () => {
  const hostile = '</script><script>alert("test")</script> & \u2028\u2029';
  const data = toPortableLesson({...reviewedCalculus(),title:'</title><script>bad</script>',explanation:hostile});
  const html = makeLessonHtml(data,{js:'(()=>{const s="</script>";})();',css:'body{color:black}',licenses:'MIT'});
  const embedded = html.match(/<script id="lesson-data" type="application\/json">([\s\S]*?)<\/script>/)![1];
  assert.deepEqual(JSON.parse(embedded),data); assert.ok(!/[<>&\u2028\u2029]/.test(embedded));
  assert.match(html,/connect-src 'none'/); assert.doesNotMatch(html,/\beval\s*\(|new Function/);
});
