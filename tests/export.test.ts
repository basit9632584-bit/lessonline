import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyLesson } from '../src/lesson.ts';
import { lessonFilename, makeLessonHtml, parsePortableLesson, toPortableLesson } from '../src/export.ts';
function reviewedLesson() {
  return { ...emptyLesson(), title:'Slope and intercept', notes:'Private teacher note\n\ny=2x+1', coefficientDrafts:{m:'2',b:'1'}, confirmed:true, reviewed:true, explanation:'An increase of 1 in x increases y by 2.', explanationOrigin:'manual' as const, sourceLineNumbers:[3] };
}
const assets = {js:'(() => { window.lessonReady = true; })();', css:'body { color: black; }', licenses:'MIT license notice'};
test('only current, confirmed, reviewed and bounded lessons can export', () => {
  for (const change of [{confirmed:false}, {reviewed:false}, {explanationStale:true}, {title:' '}, {explanation:''}, {notes:'y=x^2'}, {parameters:{m:11,b:1}}, {coefficientDrafts:{m:'3',b:'1'}}, {title:'a'.repeat(101)}]) assert.throws(() => toPortableLesson({...reviewedLesson(), ...change}));
  assert.equal(toPortableLesson(reviewedLesson()).reviewed,true);
});
test('source remains private unless explicitly included, with actual matching references', () => {
  const lesson = reviewedLesson(), privateData = toPortableLesson(lesson);
  assert.deepEqual(Object.keys(privateData).sort(),['version','title','parameters','explanation','explanationOrigin','reviewed'].sort());
  assert.ok(!JSON.stringify(privateData).includes('Private teacher note'));
  assert.deepEqual(toPortableLesson(lesson,true).sourceLineNumbers,[3]);
  assert.equal(toPortableLesson(lesson,true).sourceNotes,lesson.notes);
  const manual = {...lesson, notes:'Explain slope using these teacher-entered values.', sourceLineNumbers:[]};
  assert.deepEqual(toPortableLesson(manual,true).sourceLineNumbers,[]);
  assert.deepEqual(parsePortableLesson(JSON.stringify(toPortableLesson(lesson,true))),toPortableLesson(lesson,true));
});
test('HTML escapes hostile text while preserving JSON contents exactly', () => {
  const hostile = '</script><script>alert("test")</script> & < > \u2028\u2029';
  const lesson = {...reviewedLesson(),title:'</title><script>bad</script>',explanation:hostile, notes:'y=2x+1\n</script><style>bad</style>',sourceLineNumbers:[1]};
  const data = toPortableLesson(lesson,true), html = makeLessonHtml(data,{...assets,licenses:hostile});
  assert.match(html,/<html lang="en">/); assert.match(html,/id="root"/);
  assert.match(html,/<title>&lt;\/title&gt;&lt;script&gt;bad&lt;\/script&gt;<\/title>/);
  const embedded = html.match(/<script id="lesson-data" type="application\/json">([\s\S]*?)<\/script>/)![1];
  assert.ok(!/[<>&\u2028\u2029]/.test(embedded)); assert.deepEqual(JSON.parse(embedded),data);
  const notices = html.match(/<script id="lesson-licenses" type="application\/json">([\s\S]*?)<\/script>/)![1];
  assert.equal(JSON.parse(notices),hostile); assert.equal((html.match(/<script\b/g) ?? []).length,4); assert.match(html,/connect-src 'none'/);
  for (const bad of [{css:'</style><script>bad</script>'}]) assert.throws(() => makeLessonHtml(data,{...assets,...bad}),/unsafe HTML delimiters/);
});
test('malformed portable data is rejected and unknown private fields are discarded', () => {
  const data = toPortableLesson(reviewedLesson());
  for (const change of [{version:2},{reviewed:false},{title:''},{explanation:' '},{explanationOrigin:'unknown'}, {parameters:{m:'2',b:1}},{parameters:{m:Infinity,b:1}},{parameters:{m:0.001,b:1}}, {sourceLineNumbers:[1]},{sourceNotes:'y=2x+1',sourceLineNumbers:[2]}, {sourceNotes:'y=x^2',sourceLineNumbers:[]},{sourceNotes:'y=3x+1',sourceLineNumbers:[1]}, {sourceNotes:'y=2x+1',sourceLineNumbers:[1,1]}]) assert.equal(parsePortableLesson(JSON.stringify({...data,...change})),null,JSON.stringify(change));
  for (const raw of ['null','{','[]','a'.repeat(65537)]) assert.equal(parsePortableLesson(raw),null);
  assert.deepEqual(parsePortableLesson(JSON.stringify({...data,apiKey:'secret',coefficientDrafts:{m:'2',b:'1'},notes:'private'})),data);
});
test('filenames are portable, bounded and cannot contain paths or device names', () => {
  assert.equal(lessonFilename('Slope & intercept'),'slope-intercept.html'); assert.equal(lessonFilename('../../CON'),'math-lesson.html'); assert.equal(lessonFilename('...'),'math-lesson.html'); assert.equal(lessonFilename('Café lesson'),'cafe-lesson.html'); assert.ok(lessonFilename('a'.repeat(1000)).length<=75);
});


test('trusted runtime delimiters survive exact inert JSON roundtrip without active HTML injection', () => {
  const runtime = '(() => { const a = "</script><script>bad</script>"; const b = "<!--<script>"; })();';
  const html = makeLessonHtml(toPortableLesson(reviewedLesson()), {...assets, js:runtime});
  const embedded = html.match(/<script id="lesson-runtime" type="application\/json">([\s\S]*?)<\/script>/)![1];
  assert.equal(JSON.parse(embedded), runtime);
  assert.ok(!/[<>&\u2028\u2029]/.test(embedded));
  assert.equal((html.match(/<script\b/g) ?? []).length,4);
  assert.match(html,/runtime\.textContent = JSON\.parse\(document\.getElementById\("lesson-runtime"\)\.textContent\)/);
  assert.doesNotMatch(html,/\beval\s*\(|new Function/);
});
