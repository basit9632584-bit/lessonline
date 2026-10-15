export const SAMPLE = { m: 2, b: 1 };
export const LIMIT = 10;
export const TABLE_X = [-2, -1, 0, 1, 2];

export function parseCoefficient(raw: string): { value: number; error?: never } | { error: string; value?: never } {
  if (!raw.trim()) return { error: 'Enter a value from −10 to 10.' };
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw.trim())) {
    return { error: 'Use a number, such as −2 or 0.5.' };
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || Math.abs(value) > LIMIT) return { error: 'Use a value from −10 to 10.' };
  if ((raw.trim().split('.')[1]?.length ?? 0) > 2) return { error: 'Use up to two decimal places.' };
  return { value: Object.is(value, -0) ? 0 : value };
}

export function formatNumber(value: number): string {
  return String(Number(value.toFixed(4))).replace('-', '−');
}

export function yAt(m: number, b: number, x: number): number {
  return Number((m * x + b).toFixed(4));
}

export function equationText(m: number, b: number): string {
  const term = m === 0 ? '' : m === 1 ? 'x' : m === -1 ? '−x' : `${formatNumber(m)}x`;
  const intercept = b === 0 ? '' : `${term ? (b < 0 ? ' − ' : ' + ') : (b < 0 ? '−' : '')}${formatNumber(Math.abs(b))}`;
  return `y = ${term}${intercept}`.trim() === 'y =' ? 'y = 0' : `y = ${term}${intercept}`;
}

export function describeLine(m: number, b: number): string {
  const change = m === 0 ? 'y stays the same' : `y ${m > 0 ? 'increases' : 'decreases'} by ${formatNumber(Math.abs(m))}`;
  return `When x increases by 1, ${change}. The line crosses the y-axis at ${formatNumber(b)}.`;
}
