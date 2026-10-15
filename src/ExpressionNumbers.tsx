import { useId, useMemo } from 'react';
import { basicLiterals } from './basic-math.ts';
import './basic-visual.css';
type Props = { expression: string; disabled: boolean; onChange: (expression: string) => void };
export default function ExpressionNumbers({ expression, disabled, onChange }: Props) {
  const id = `expression-numbers-${useId().replace(/:/g, '')}`;
  const matches = useMemo(() => { try { return basicLiterals(expression); } catch { return []; } }, [expression]);
  const literals = matches.slice(0, 12);
  return <section className="expression-numbers" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Adjust numbers in the expression</h3>
    <p id={`${id}-help`}>Each slider changes a number's magnitude. Its minus sign and the surrounding operators stay in place: −3 becomes −4, not +4. Edit the full expression above to change signs, operators or decimal precision.</p>
    <p className="en-count">{matches.length > 12 ? `Showing the first 12 of ${matches.length} numbers. Edit any remaining numbers in the full expression.` : `${matches.length} ${matches.length === 1 ? 'number' : 'numbers'} in the current valid expression.`}</p>
    {disabled && <p className="en-disabled" role="status">Correct the full expression draft before using these sliders. They still show the last valid expression.</p>}
    <div className="en-grid">{literals.map((match,index) => {
      const { raw, start, end } = match, decimal = raw.includes('.');
      return <div className="en-control" key={index}><label htmlFor={`${id}-${index}`}>Number {index + 1} · <span>{raw}</span></label><input id={`${id}-${index}`} type="range" min={0} max={10000} step={decimal ? .01 : 1} value={Number(raw)} disabled={disabled} aria-describedby={`${id}-help ${id}-${index}-precision`} aria-valuetext={`Magnitude ${raw}; surrounding signs and operators are unchanged`} onChange={event => { if (disabled) return; const replacement = Number(event.target.value).toFixed(decimal ? 2 : 0); onChange(expression.slice(0,start) + replacement + expression.slice(end)); }} /><p id={`${id}-${index}-precision`}>0 to 10,000 · {decimal ? 'steps of 0.01' : 'whole-number steps'}</p></div>;
    })}</div>
  </section>;
}

