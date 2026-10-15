import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeNotes, NOTES_LIMIT, samples } from '../src/notes.ts';

test('recognized forms produce exact bounded coefficients and actual source lines', () => {
  for (const [text, m, b] of [['y = 2x + 1',2,1], ['y = -0.5x + 3',-.5,3], ['y = x',1,0], ['y = -x - 2',-1,-2], ['y = 0x + 0',0,0], ['y = -3',0,-3], ['y = 1/2x + 3/4',.5,.75], ['Equation: y = −x + 1.',-1,1], ['y = -10x + 10',-10,10]] as const) {
    assert.deepEqual(analyzeNotes(`Introduction\n\n${text}`), {kind:'recognized',m,b,lineNumbers:[3]}, text);
  }
  assert.deepEqual(analyzeNotes('y=2x+1\n\ny = 2x + 1'), {kind:'recognized',m:2,b:1,lineNumbers:[1,3]});
  for (const sample of samples) assert.equal(analyzeNotes(sample.notes).kind,'recognized');
});
test('conflicting equations are ambiguous rather than picking the first', () => {
  assert.equal(analyzeNotes('y=2x+1\ny=-0.5x+3').kind,'ambiguous');
});
test('unsupported terms cannot be mistaken for a supported prefix', () => {
  for (const text of ['y=2x+1/x','y=2x+1+x','y=x^2','y=x²','y=sin(x)','y=2x+1 explains the graph','The line y=2x+1 is useful','y=1/3x+1','y=1/0x','y=10.01x','y=0.001x','y=2e1x','x=2','Quadratic equations','y=2x+1\ny=x^2']) assert.equal(analyzeNotes(text).kind,'unsupported',text);
});
test('empty, plain prose and oversized notes receive honest routes', () => {
  assert.equal(analyzeNotes(' \n ').kind,'empty');
  assert.equal(analyzeNotes('Slope tells us how steep a line is.').kind,'manual');
  assert.equal(analyzeNotes('a'.repeat(NOTES_LIMIT+1)).kind,'unsupported');
});

test('canonical linear notation supplies context without guessing coefficients', () => {
  assert.equal(analyzeNotes('y = mx + b').kind, 'manual');
  assert.deepEqual(analyzeNotes('General form: y = mx + b\n\ny = -0.5x + 3'), {kind:'recognized',m:-.5,b:3,lineNumbers:[3]});
  assert.equal(analyzeNotes('y = mx + b\ny = x^2').kind, 'unsupported');
  const result = analyzeNotes('Quadratic equations');
  assert.equal(result.kind, 'unsupported');
  if (result.kind === 'unsupported') {
    assert.doesNotMatch(result.message, /manually|manual coefficients/);
    assert.match(result.message, /Correct or remove/);
  }
});

test('unsupported content takes precedence over conflicting supported equations', () => {
  assert.equal(analyzeNotes('y=2x+1\ny=3x+4\ny=x^2').kind, 'unsupported');
  assert.equal(analyzeNotes('y=2x+1\ny=3x+4\nTrigonometry').kind, 'unsupported');
});
