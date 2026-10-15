export const NOTES_LIMIT = 6000;
export const samples = [
  { id: 'slope', title: 'Slope and intercept', notes: 'A straight line connects x and y.\ny = 2x + 1\nThe slope is 2 and the y-intercept is 1.' },
  { id: 'falling', title: 'A falling line', notes: 'Explore a negative slope.\ny = -0.5x + 3\nEach increase of 1 in x decreases y by 0.5.' },
];
export type NotesAnalysis =
  | { kind: 'recognized'; m: number; b: number; lineNumbers: number[] }
  | { kind: 'ambiguous' | 'unsupported' | 'manual' | 'empty'; message: string };
const decimal = '(?:\\d+(?:\\.\\d{1,2})?|\\.\\d{1,2})';
const numeric = `${decimal}(?:/${decimal})?`;
const linear = new RegExp(`^y\\s*=\\s*([+-]?)(${numeric})?\\s*x(?:\\s*([+-])\\s*(${numeric}))?$`, 'i');
const constant = new RegExp(`^y\\s*=\\s*([+-]?)(${numeric})$`, 'i');
function coefficient(sign: string, raw: string): number | undefined {
  const parts = raw.split('/').map(Number);
  const value = (sign === '-' ? -1 : 1) * (parts.length === 2 ? parts[0] / parts[1] : parts[0]);
  if (!Number.isFinite(value) || Math.abs(value) > 10 || Math.abs(value * 100 - Math.round(value * 100)) > 1e-8) return;
  return value === 0 ? 0 : value;
}
export function analyzeNotes(notes: string): NotesAnalysis {
  if (!notes.trim()) return { kind: 'empty', message: 'Paste your notes or choose a sample to begin.' };
  if (notes.length > NOTES_LIMIT) return { kind: 'unsupported', message: 'Use up to 6,000 characters. Your notes have not been changed.' };
  const found: { m: number; b: number; line: number }[] = [];
  let unsupported = false;
  notes.split(/\r?\n/).forEach((original, index) => {
    const normalized = original.trim().replace(/−/g, '-');
    if (!normalized) return;
    if (/\b(quadratic|calculus|trigonometry|derivative|integral|parabola)\b|\b(sin|cos|tan|log|sqrt)\s*\(|[xX]\s*(?:\^|²|³|\*\*)/.test(normalized.toLowerCase())) unsupported = true;
    if (!/\by\s*=/i.test(normalized)) {
      if (/[=]/.test(normalized)) unsupported = true;
      return;
    }
    // An optional prose label ending in a colon is permitted; trailing prose or terms are not.
    const isolated = normalized.replace(/^[^=\n]*:\s*(?=y\s*=)/i, '').replace(/[.;]$/, '').trim();
    if (/^y\s*=\s*m\s*x\s*\+\s*b$/i.test(isolated)) return;
    const match = isolated.match(linear);
    const flat = isolated.match(constant);
    let m: number | undefined;
    let b: number | undefined;
    if (match) {
      m = coefficient(match[1], match[2] ?? '1');
      b = match[4] ? coefficient(match[3], match[4]) : 0;
    } else if (flat) {
      m = 0;
      b = coefficient(flat[1], flat[2]);
    }
    if (m === undefined || b === undefined) unsupported = true;
    else found.push({ m, b, line: index + 1 });
  });
  if (unsupported) return { kind: 'unsupported', message: 'This prototype supports an isolated numeric equation y = mx + b, with coefficients from -10 to 10 and up to two decimal places. Your notes are preserved. Correct or remove unsupported equations and topics before continuing.' };
  if (found.some(item => item.m !== found[0].m || item.b !== found[0].b)) return { kind: 'ambiguous', message: 'These notes contain different supported equations. Keep one equation for this lesson or set the coefficients manually.' };
  if (!found.length) return { kind: 'manual', message: 'No supported equation was found. Your notes are preserved; set slope and intercept manually.' };
  return { kind: 'recognized', m: found[0].m, b: found[0].b, lineNumbers: found.map(item => item.line) };
}


