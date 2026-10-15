import { useId, useState } from 'react';
import { checkPracticeAnswer, practiceQuestions } from './practice.ts';
import type { AnswerResult, PracticeId, PracticeQuestion } from './practice.ts';
import './practice.css';

export default function Practice({ m = 2, b = 1, compact = false, questions, context }: { m?: number; b?: number; compact?: boolean; questions?: PracticeQuestion[]; context?: string }) {
  const prefix = `practice-${useId().replace(/:/g, '')}`;
  const [answers, setAnswers] = useState<Record<PracticeId, string>>({ value: '', slope: '', intercept: '' });
  const [feedback, setFeedback] = useState<Partial<Record<PracticeId, AnswerResult>>>({});
  return <section className="practice-section" aria-labelledby={`${prefix}-heading`}>
    <div className="practice-heading"><div><p className="eyebrow">Try the idea yourself</p><h2 id={`${prefix}-heading`}>Three small checks.</h2></div></div>
    <p className="practice-context">{context ?? (compact ? 'Questions use these confirmed values. Confirming a different slope or intercept clears your answers.' : 'Questions follow your current exploration. Changing the slope or intercept, or resetting the lesson, clears your answers.')}</p>
    <p className="practice-rounding" id={`${prefix}-hint`}>Use decimal numbers. Round to 2 decimal places; answers within 0.005 of the exact value are accepted.</p>
    <div className="practice-grid">{(questions ?? practiceQuestions(m, b)).map((question, index) => {
      const result = feedback[question.id];
      const id = `${prefix}-${question.id}`;
      return <form className="practice-card" key={question.id} aria-labelledby={`${id}-heading`} onSubmit={event => {
        event.preventDefault(); setFeedback(previous => ({ ...previous, [question.id]: checkPracticeAnswer(question, answers[question.id]) }));
      }}>
        <div className="practice-card-heading"><span className="practice-number" aria-hidden="true">0{index + 1}</span><h3 id={`${id}-heading`}>{question.title}</h3></div>
        <label id={`${id}-prompt`} htmlFor={`${id}-answer`}>{question.prompt}</label>
        <div className="practice-answer-row"><input id={`${id}-answer`} data-testid={`practice-${question.id}-input`} type="text" inputMode="decimal" autoComplete="off" spellCheck={false} maxLength={128} value={answers[question.id]} aria-invalid={result?.status === 'invalid'} aria-describedby={`${prefix}-hint ${id}-feedback`} onChange={event => {
          const raw = event.target.value;
          setAnswers(previous => ({ ...previous, [question.id]: raw }));
          setFeedback(previous => ({ ...previous, [question.id]: undefined }));
        }} /><button type="submit" aria-label={`Check answer: ${question.title}`} aria-describedby={`${id}-prompt ${prefix}-hint`} data-testid={`practice-${question.id}-check`}>Check answer</button></div>
        <p id={`${id}-feedback`} data-testid={`practice-${question.id}-feedback`} className={`practice-feedback ${result?.status ?? ''}`} role="status" aria-live="polite" aria-atomic="true">{result?.message ?? 'Your answer stays here until the explored values change.'}</p>
      </form>;
    })}</div>
  </section>;
}

