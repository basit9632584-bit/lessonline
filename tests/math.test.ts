import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCoefficient, equationText, yAt, describeLine } from '../src/math.ts';

test('coefficient validation protects committed math from incomplete or unsupported inputs', () => {
  for (const raw of ['', ' ', '-', 'NaN', 'Infinity', '1e309', '10.01', '-10.01', '0.001', '2+3', '0x2']) {
    assert.ok(parseCoefficient(raw).error, raw);
  }
  for (const [raw, value] of [['-10', -10], ['10', 10], ['.5', .5], ['-0', 0], ['-0.25', -.25]] as const) {
    assert.equal(parseCoefficient(raw).value, value);
  }
});

test('linear lesson facts match known answers and special equation forms', () => {
  for (const [m, b, x, expected] of [[2,1,2,5], [0,0,-2,0], [-2,-1,-2,3], [.5,-2,2,-1], [-.25,.75,2,.25], [10,10,2,30]]) {
    assert.equal(yAt(m,b,x), expected);
  }
  for (const [m,b,equation] of [[0,0,'y = 0'], [0,-2,'y = −2'], [1,0,'y = x'], [-1,0,'y = −x'], [-2,-1,'y = −2x − 1']] as const) {
    assert.equal(equationText(m,b),equation);
  }
  assert.match(describeLine(0,1),/stays the same/);
  assert.match(describeLine(-2,-1),/decreases by 2/);
});
